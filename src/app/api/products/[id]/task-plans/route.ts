import { NextResponse } from "next/server";
import {
  createAutoCoverageTaskPlan,
  createCompetitorCoverageTaskPlan,
  createImportedTaskPlan,
  materializeCompetitorCoveragePlan,
  readWorkspaceTaskPlans,
} from "@/lib/workspace-task-plans";
import { readSaasOperationalInsights } from "@/lib/saas-operational-insights";
import type { WorkspaceTaskPlanGranularity } from "@/lib/workspace-task-plans-types";
import { createClient } from "@/lib/supabase-server";

function isGranularity(value: string): value is WorkspaceTaskPlanGranularity {
  return value === "batch" || value === "per_target";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const plans = await readWorkspaceTaskPlans({
    productId: id,
    userId: user.id,
  });

  return NextResponse.json({ plans });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, user_id, name, url, description")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        rawList?: string;
        competitorList?: string;
        granularity?: string;
        planId?: string;
      }
    | null;

  if (!body?.action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  if (body.action === "create_auto_coverage") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();
    const { data: submissions } = await supabase
      .from("submissions")
      .select("channel")
      .eq("product_id", id);

    const operationalInsights = await readSaasOperationalInsights();
    const plan = await createAutoCoverageTaskPlan({
      product,
      actor: {
        userId: user.id,
        userEmail: user.email || null,
      },
      plan: subscription?.plan || "free",
      submissions: submissions || [],
      operationalInsights,
    });

    return NextResponse.json({ plan });
  }

  if (body.action === "import_target_list") {
    const granularity: WorkspaceTaskPlanGranularity = isGranularity(
      body.granularity || ""
    )
      ? (body.granularity as WorkspaceTaskPlanGranularity)
      : "batch";

    try {
      const plan = await createImportedTaskPlan({
        product,
        actor: {
          userId: user.id,
          userEmail: user.email || null,
        },
        rawList: body.rawList || "",
        granularity,
      });

      return NextResponse.json({ plan });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not import the target list.",
        },
        { status: 400 }
      );
    }
  }

  if (body.action === "create_competitor_plan") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();
    const { data: submissions } = await supabase
      .from("submissions")
      .select("channel")
      .eq("product_id", id);

    try {
      const plan = await createCompetitorCoverageTaskPlan({
        product,
        actor: {
          userId: user.id,
          userEmail: user.email || null,
        },
        rawCompetitorList: body.competitorList || "",
        plan: subscription?.plan || "free",
        submissions: submissions || [],
        operationalInsights: await readSaasOperationalInsights(),
      });

      return NextResponse.json({ plan });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not create the competitor coverage plan.",
        },
        { status: 400 }
      );
    }
  }

  if (body.action === "materialize_competitor_plan") {
    if (!body.planId?.trim()) {
      return NextResponse.json({ error: "Missing planId." }, { status: 400 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .single();
    const currentPlan =
      subscription?.status === "active" ? subscription.plan || "starter" : "free";

    if (currentPlan === "free") {
      return NextResponse.json(
        { error: "Upgrade to Starter before turning this competitor gap into live tasks." },
        { status: 400 }
      );
    }

    const { data: submissions } = await supabase
      .from("submissions")
      .select("channel")
      .eq("product_id", id);

    try {
      const result = await materializeCompetitorCoveragePlan({
        product,
        actor: {
          userId: user.id,
          userEmail: user.email || null,
        },
        planId: body.planId.trim(),
        currentPlan,
        submissions: submissions || [],
        operationalInsights: await readSaasOperationalInsights(),
      });

      if (result.launchChannelIds.length > 0) {
        const { error } = await supabase.from("submissions").insert(
          result.launchChannelIds.map((channelId) => ({
            user_id: user.id,
            product_id: id,
            channel: channelId,
            status: "queued",
          }))
        );

        if (error) {
          return NextResponse.json(
            { error: error.message || "Could not queue follow-up submissions." },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not materialize the competitor plan.",
        },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

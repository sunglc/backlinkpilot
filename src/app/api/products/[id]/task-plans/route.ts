import { NextResponse } from "next/server";
import {
  createAutoCoverageTaskPlan,
  createCompetitorCoverageTaskPlan,
  createImportedTaskPlan,
  materializeCompetitorCoveragePlan,
  readWorkspaceTaskPlans,
} from "@/lib/workspace-task-plans";
import { readSaasCapabilityContract } from "@/lib/saas-capability-contract";
import { readSaasCapabilityHistory } from "@/lib/saas-capability-history";
import { readSaasCapabilityReviewState } from "@/lib/saas-capability-review-state";
import { readSaasOperationalInsights } from "@/lib/saas-operational-insights";
import type { WorkspaceTaskPlanGranularity } from "@/lib/workspace-task-plans-types";
import {
  buildWorkspaceSupplySnapshot,
  getWorkspaceAutoCoverageError,
  getWorkspaceBuildoutSupplyError,
} from "@/lib/workspace-supply-policy";
import {
  buildWorkspacePolicySnapshot,
  getWorkspacePolicyError,
} from "@/lib/workspace-policy";
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
      .select("plan, status")
      .eq("user_id", user.id)
      .single();
    const currentPlan =
      subscription?.status === "active" ? subscription.plan || "starter" : "free";
    const { data: userProducts } = await supabase
      .from("products")
      .select("id, name")
      .eq("user_id", user.id);
    const products = Array.from(
      new Map(
        (userProducts || [])
          .concat({ id: product.id, name: product.name || "" })
          .map((item) => [item.id, { id: item.id, name: item.name || "" }])
      ).values()
    );
    const productIds = products.map((item) => item.id);
    const { data: workspaceSubmissions } = await supabase
      .from("submissions")
      .select("product_id, channel, status, success_sites")
      .in("product_id", productIds);
    const workspacePolicy = await buildWorkspacePolicySnapshot({
      userId: user.id,
      currentPlan,
      products,
      submissions: (workspaceSubmissions || []).map((submission) => ({
        product_id: submission.product_id,
        status: submission.status,
        success_sites: submission.success_sites,
      })),
    });
    const operationalInsights = await readSaasOperationalInsights();
    const capabilityContract = await readSaasCapabilityContract();
    const capabilityHistory = await readSaasCapabilityHistory();
    const capabilityReviewState = await readSaasCapabilityReviewState({
      userId: user.id,
      currentFingerprint: capabilityContract.capability_fingerprint,
    });
    const workspaceSupply = buildWorkspaceSupplySnapshot({
      currentPlan,
      reviewPending: capabilityReviewState.reviewPending,
      capabilityContract,
      capabilityHistory,
      operationalInsights,
      workspacePolicy,
    });
    const autoCoverageError = getWorkspaceAutoCoverageError({
      snapshot: workspaceSupply,
      productId: id,
    });

    if (autoCoverageError) {
      return NextResponse.json({ error: autoCoverageError }, { status: 409 });
    }

    const plan = await createAutoCoverageTaskPlan({
      product,
      actor: {
        userId: user.id,
        userEmail: user.email || null,
      },
      plan: currentPlan,
      submissions: (workspaceSubmissions || [])
        .filter((submission) => submission.product_id === id)
        .map((submission) => ({
          channel: submission.channel,
        })),
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

    const { data: userProducts } = await supabase
      .from("products")
      .select("id, name")
      .eq("user_id", user.id);
    const products = Array.from(
      new Map(
        (userProducts || [])
          .concat({ id: product.id, name: product.name || "" })
          .map((item) => [item.id, { id: item.id, name: item.name || "" }])
      ).values()
    );
    const productIds = products.map((item) => item.id);
    const { data: submissions } = await supabase
      .from("submissions")
      .select("product_id, channel, status, success_sites")
      .in("product_id", productIds);
    const workspacePolicy = await buildWorkspacePolicySnapshot({
      userId: user.id,
      currentPlan,
      products,
      submissions: submissions || [],
    });
    const submissionPolicyError = getWorkspacePolicyError(
      workspacePolicy,
      "submission",
      id
    );
    if (submissionPolicyError) {
      return NextResponse.json({ error: submissionPolicyError }, { status: 409 });
    }
    const capabilityContract = await readSaasCapabilityContract();
    const capabilityHistory = await readSaasCapabilityHistory();
    const capabilityReviewState = await readSaasCapabilityReviewState({
      userId: user.id,
      currentFingerprint: capabilityContract.capability_fingerprint,
    });
    const operationalInsights = await readSaasOperationalInsights();
    const workspaceSupply = buildWorkspaceSupplySnapshot({
      currentPlan,
      reviewPending: capabilityReviewState.reviewPending,
      capabilityContract,
      capabilityHistory,
      operationalInsights,
      workspacePolicy,
    });
    const buildoutSupplyError = getWorkspaceBuildoutSupplyError({
      snapshot: workspaceSupply,
      productId: id,
    });
    if (buildoutSupplyError) {
      return NextResponse.json({ error: buildoutSupplyError }, { status: 409 });
    }

    try {
      const result = await materializeCompetitorCoveragePlan({
        product,
        actor: {
          userId: user.id,
          userEmail: user.email || null,
        },
        planId: body.planId.trim(),
        currentPlan,
        maxLaunchCount: workspacePolicy.capacity.lanes.submission.remaining,
        submissions: (submissions || [])
          .filter((submission) => submission.product_id === id)
          .map((submission) => ({
            channel: submission.channel,
          })),
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
      const message =
        error instanceof Error
          ? error.message
          : "Could not materialize the competitor plan.";

      return NextResponse.json(
        { error: message },
        {
          status:
            message.includes("submission limit") ||
            message.includes("submission slots")
              ? 409
              : 400,
        }
      );
    }
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

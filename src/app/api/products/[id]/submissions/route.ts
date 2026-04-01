import { NextResponse } from "next/server";

import { channelById } from "@/lib/execution-contract";
import { isAutoExecutableChannel } from "@/lib/distribution-safety";
import {
  buildWorkspacePolicySnapshot,
  getWorkspacePolicyError,
} from "@/lib/workspace-policy";
import { createClient } from "@/lib/supabase-server";

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
    .select("id, user_id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        channelId?: string;
      }
    | null;

  if (!body?.channelId) {
    return NextResponse.json({ error: "Missing channelId." }, { status: 400 });
  }

  const channel = channelById(body.channelId);

  if (!channel) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }

  if (!isAutoExecutableChannel(channel.id) || channel.support_status !== "live") {
    return NextResponse.json(
      {
        error:
          "This route is not part of default customer execution. Use manual review or keep it out of the standard flow.",
      },
      { status: 409 }
    );
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  const currentPlan =
    subscription?.status === "active" ? subscription.plan || "starter" : "free";

  if (!channel.plans.includes(currentPlan)) {
    return NextResponse.json(
      {
        error:
          currentPlan === "free"
            ? "Upgrade your plan before opening live submission."
            : `Your current plan does not unlock ${channel.name} yet.`,
      },
      { status: 403 }
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

  const { data: workspaceSubmissions } = await supabase
    .from("submissions")
    .select("product_id, status, success_sites, created_at")
    .in("product_id", productIds);

  const workspacePolicy = await buildWorkspacePolicySnapshot({
    userId: user.id,
    currentPlan,
    products,
    submissions: (workspaceSubmissions || []).map((submission) => ({
      product_id: submission.product_id,
      status: submission.status,
      success_sites: submission.success_sites,
      created_at: submission.created_at,
    })),
  });

  const policyError = getWorkspacePolicyError(workspacePolicy, "submission", product.id);

  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 409 });
  }

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      user_id: user.id,
      product_id: product.id,
      channel: channel.id,
      status: "queued",
    })
    .select("id, product_id, channel, status")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not create the submission." },
      { status: 400 }
    );
  }

  return NextResponse.json({ submission }, { status: 201 });
}

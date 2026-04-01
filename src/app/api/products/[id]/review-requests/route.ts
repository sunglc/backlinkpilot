import { NextResponse } from "next/server";

import { channelById } from "@/lib/execution-contract";
import {
  isDisabledChannel,
  requiresManualReviewChannel,
} from "@/lib/distribution-safety";
import {
  queueChannelReviewRequest,
  readChannelReviewRequests,
} from "@/lib/channel-review-requests";
import { createClient } from "@/lib/supabase-server";

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
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const requests = await readChannelReviewRequests({
    productId: product.id,
    userId: user.id,
  });

  return NextResponse.json({ requests });
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
        note?: string;
      }
    | null;

  if (!body?.channelId) {
    return NextResponse.json({ error: "Missing channelId." }, { status: 400 });
  }

  const channel = channelById(body.channelId);

  if (!channel) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }

  if (isDisabledChannel(channel.id)) {
    return NextResponse.json(
      {
        error:
          "This route is removed from default customer execution because the platform risk is too high.",
      },
      { status: 409 }
    );
  }

  if (!requiresManualReviewChannel(channel.id)) {
    return NextResponse.json(
      {
        error:
          "This route does not need manual review. Use the normal execution flow instead.",
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
            ? "Upgrade your plan before requesting manual review for this route."
            : `Your current plan does not unlock ${channel.name} yet.`,
      },
      { status: 403 }
    );
  }

  const reviewRequest = await queueChannelReviewRequest({
    product: {
      id: product.id,
      name: product.name || "",
    },
    actor: {
      userId: user.id,
      userEmail: user.email || null,
    },
    channelId: channel.id,
    channelName: channel.name,
    note: body.note || null,
  });

  return NextResponse.json({ reviewRequest }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getManagedInboxLiveActivity } from "@/lib/managed-inbox-live-activity";
import {
  activateManagedInbox,
  configureBringYourOwnSender,
  getManagedInboxRecord,
  queueManagedProofTask,
  queueManagedOutreachBatch,
  reconcileManagedInboxRecordWithSendLog,
} from "@/lib/managed-inbox-server";
import type { ManagedInboxProofTaskType } from "@/lib/managed-inbox-types";
import { createClient } from "@/lib/supabase-server";

const MANAGED_INBOX_PLAN_SET = new Set(["growth", "scale"]);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isProofTaskType(value: string): value is ManagedInboxProofTaskType {
  return [
    "verify_result",
    "protect_publication",
    "send_materials",
    "review_commercial",
    "follow_up",
    "push_receipts",
  ].includes(value);
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
    .select("id, user_id, name, url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const baseRecord = await getManagedInboxRecord({
    productId: product.id,
    userId: user.id,
  });
  const record = await reconcileManagedInboxRecordWithSendLog({
    record: baseRecord,
    product: {
      id: product.id,
      name: product.name || "",
      url: product.url || "",
      description: "",
    },
  });
  const liveActivity = await getManagedInboxLiveActivity({
    name: product.name || "",
    url: product.url || "",
  });

  return NextResponse.json({ record, liveActivity });
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

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = subscription?.plan || "free";
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        senderEmail?: string;
        senderName?: string;
        taskType?: string;
      }
    | null;

  if (!body?.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  if (body.action === "save_byo") {
    const senderEmail = body.senderEmail?.trim() || "";
    if (!isValidEmail(senderEmail)) {
      return NextResponse.json({ error: "Enter a valid sender email." }, { status: 400 });
    }

    const record = await configureBringYourOwnSender({
      product,
      actor: {
        userId: user.id,
        userEmail: user.email || null,
      },
      senderEmail,
      senderName: body.senderName || null,
    });

    const liveActivity = await getManagedInboxLiveActivity({
      name: product.name || "",
      url: product.url || "",
    });

    return NextResponse.json({ record, liveActivity });
  }

  if (body.action === "activate_managed") {
    if (!MANAGED_INBOX_PLAN_SET.has(plan)) {
      return NextResponse.json(
        { error: "Managed inbox is unlocked on Growth and Scale." },
        { status: 403 }
      );
    }

    const record = await activateManagedInbox({
      product,
      actor: {
        userId: user.id,
        userEmail: user.email || null,
      },
      plan,
    });

    const liveActivity = await getManagedInboxLiveActivity({
      name: product.name || "",
      url: product.url || "",
    });

    return NextResponse.json({ record, liveActivity });
  }

  if (body.action === "launch_batch") {
    if (!MANAGED_INBOX_PLAN_SET.has(plan)) {
      return NextResponse.json(
        { error: "Managed inbox is unlocked on Growth and Scale." },
        { status: 403 }
      );
    }

    const existingRecord = await getManagedInboxRecord({
      productId: product.id,
      userId: user.id,
    });

    if (existingRecord.senderMode !== "managed" || !existingRecord.mailboxIdentity) {
      return NextResponse.json(
        { error: "Activate the managed inbox before queueing the first batch." },
        { status: 409 }
      );
    }

    const liveActivity = await getManagedInboxLiveActivity({
      name: product.name || "",
      url: product.url || "",
    });
    const record = await queueManagedOutreachBatch({
      product,
      actor: {
        userId: user.id,
        userEmail: user.email || null,
      },
      plan,
      liveActivity,
    });

    return NextResponse.json({ record, liveActivity });
  }

  if (body.action === "queue_proof_task") {
    if (!body.taskType || !isProofTaskType(body.taskType)) {
      return NextResponse.json({ error: "Unsupported proof task type." }, { status: 400 });
    }

    const record = await queueManagedProofTask({
      product,
      actor: {
        userId: user.id,
        userEmail: user.email || null,
      },
      taskType: body.taskType,
    });
    const liveActivity = await getManagedInboxLiveActivity({
      name: product.name || "",
      url: product.url || "",
    });

    return NextResponse.json({ record, liveActivity });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

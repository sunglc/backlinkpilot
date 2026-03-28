import { NextResponse } from "next/server";
import { getManagedInboxLiveActivity } from "@/lib/managed-inbox-live-activity";
import {
  activateManagedInbox,
  configureBringYourOwnSender,
  getManagedInboxRecord,
} from "@/lib/managed-inbox-server";
import { createClient } from "@/lib/supabase-server";

const MANAGED_INBOX_PLAN_SET = new Set(["growth", "scale"]);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  const record = await getManagedInboxRecord({
    productId: product.id,
    userId: user.id,
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

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

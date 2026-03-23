import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerClient } from "@supabase/ssr";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;
      const subscriptionId = session.subscription as string;

      if (userId && plan) {
        await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            plan,
            status: "active",
            current_period_end: new Date(
              ((await getStripe().subscriptions.retrieve(subscriptionId)) as unknown as { current_period_end: number }).current_period_end * 1000
            ).toISOString(),
          }, { onConflict: "user_id" });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription & { current_period_end: number };
      await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

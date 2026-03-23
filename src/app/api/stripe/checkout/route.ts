import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";

const PLANS: Record<string, { priceId: string; name: string }> = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    name: "Starter",
  },
  growth: {
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || "price_growth",
    name: "Growth",
  },
  scale: {
    priceId: process.env.STRIPE_SCALE_PRICE_ID || "price_scale",
    name: "Scale",
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const planKey = searchParams.get("plan");

  if (!planKey || !PLANS[planKey]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const plan = PLANS[planKey];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    metadata: {
      user_id: user.id,
      plan: planKey,
    },
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
  });

  return NextResponse.redirect(session.url!);
}

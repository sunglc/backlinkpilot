import { redirect } from "next/navigation";
import { loginHrefForNext } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import DashboardClient from "./dashboard-client";

type DashboardSearchParams = Promise<{
  checkout?: string | string[];
}>;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const checkoutParam = Array.isArray(resolvedSearchParams.checkout)
    ? resolvedSearchParams.checkout[0]
    : resolvedSearchParams.checkout;
  const checkoutState =
    checkoutParam === "success" || checkoutParam === "cancelled"
      ? checkoutParam
      : null;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = checkoutState
      ? `/dashboard?checkout=${checkoutState}`
      : "/dashboard";
    redirect(loginHrefForNext(nextPath));
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const productIds = (products || []).map((product) => product.id);
  const { data: submissions } = productIds.length
    ? await supabase
        .from("submissions")
        .select(
          "id, product_id, channel, status, total_sites, completed_sites, success_sites, created_at"
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <DashboardClient
      locale={locale}
      user={user}
      subscription={subscription}
      products={products || []}
      submissions={submissions || []}
      checkoutState={checkoutState}
    />
  );
}

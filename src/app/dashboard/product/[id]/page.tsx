import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import ProductDetail from "./product-detail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!product) {
    redirect("/dashboard");
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <ProductDetail
      locale={locale}
      user={user}
      product={product}
      submissions={submissions || []}
      plan={subscription?.plan || "free"}
    />
  );
}

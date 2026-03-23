import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardClient from "./dashboard-client";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  return (
    <DashboardClient
      user={user}
      subscription={subscription}
      products={products || []}
    />
  );
}

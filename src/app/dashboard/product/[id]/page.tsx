import { readFile } from "node:fs/promises";
import path from "node:path";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import ProductDetail from "./product-detail";

interface HighQualityOutreachSource {
  source_id: string;
  root_domain: string;
  fit_score: number;
  article_title: string;
  source_type: string;
  reuse_segment: string;
  article_url: string;
}

interface HighQualityOutreachLibrary {
  root_domain_count: number;
  source_count: number;
  sources: HighQualityOutreachSource[];
}

interface OperationalInsights {
  reply_action_count: number;
  host_public_verified_count: number;
  today_action_count: number;
  today_action_root_domain_count: number;
  today_quality_result_count: number;
  source_library_root_domain_count: number;
}

const EMPTY_OUTREACH_LIBRARY: HighQualityOutreachLibrary = {
  root_domain_count: 0,
  source_count: 0,
  sources: [],
};

const EMPTY_OPERATIONAL_INSIGHTS: OperationalInsights = {
  reply_action_count: 0,
  host_public_verified_count: 0,
  today_action_count: 0,
  today_action_root_domain_count: 0,
  today_quality_result_count: 0,
  source_library_root_domain_count: 0,
};

const HIGH_QUALITY_OUTREACH_LIBRARY_PATH = path.join(
  process.cwd(),
  "src/lib/high-quality-outreach-sources.json"
);
const OPERATIONAL_INSIGHTS_PATH = path.join(
  process.cwd(),
  "src/lib/operational-insights.json"
);

async function readJsonIfPresent<T>(absolutePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(absolutePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

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

  const [outreachLibrary, operationalInsights] = await Promise.all([
    readJsonIfPresent<HighQualityOutreachLibrary>(
      HIGH_QUALITY_OUTREACH_LIBRARY_PATH,
      EMPTY_OUTREACH_LIBRARY
    ),
    readJsonIfPresent<OperationalInsights>(
      OPERATIONAL_INSIGHTS_PATH,
      EMPTY_OPERATIONAL_INSIGHTS
    ),
  ]);

  return (
    <ProductDetail
      locale={locale}
      user={user}
      product={product}
      submissions={submissions || []}
      plan={subscription?.plan || "free"}
      outreachLibrary={outreachLibrary}
      operationalInsights={operationalInsights}
    />
  );
}

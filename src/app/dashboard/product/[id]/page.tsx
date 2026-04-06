import { readFile } from "node:fs/promises";
import path from "node:path";

import { redirect } from "next/navigation";
import { getManagedInboxLiveActivity } from "@/lib/managed-inbox-live-activity";
import { createClient } from "@/lib/supabase-server";
import {
  getManagedInboxRecord,
  reconcileManagedInboxRecordWithSendLog,
} from "@/lib/managed-inbox-server";
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
  today_quality_root_domain_count: number;
  source_library_root_domain_count: number;
  discovery_target_new_worthy_root_domains: number;
  discovery_counted_new_worthy_root_domain_count: number;
  discovery_remaining_to_target: number;
  discovery_target_reached: boolean;
  paid_target_backlog_count: number;
  paid_target_root_domain_count: number;
  paid_target_new_today_count: number;
  paid_target_new_today_root_domain_count: number;
  top_paid_targets: Array<{
    opportunity_id: string;
    platform_name: string;
    platform_url: string;
    submit_url: string;
    root_domain: string;
    platform_language: string;
    recommended_action: string;
    why_now: string;
    discovery_source: string;
  }>;
  source_segments: Record<string, number>;
  playbook: {
    updated_at: string;
    learned_from_live_execution: boolean;
    source_campaign: string;
    north_star_metric: string;
    north_star_target: number;
    measurement_status: string;
    current_domain_rating: number | null;
    remaining_gap: number | null;
    quality_bar_ids: string[];
    recommended_lane_ids: string[];
    anti_pattern_ids: string[];
    proof_snapshot: {
      host_public_verified_count: number;
      today_action_root_domain_count: number;
      reusable_root_domain_count: number;
    };
    raw: {
      operating_principles: string[];
      winning_patterns: string[];
      anti_patterns: string[];
      lane_labels: Record<string, string>;
      anti_pattern_labels: Record<string, string>;
    };
  };
}

interface CapabilityUpgradeFeed {
  generated_at: string;
  capability_fingerprint: string;
  capabilities_changed: boolean;
  change_summary: {
    requires_saas_review: boolean;
    added_capability_ids: string[];
    removed_capability_ids: string[];
  };
  reusable_capability_ids: string[];
  market_tiers: {
    proven_languages: string[];
    buildout_languages: string[];
    watchlist_languages: string[];
    detected_language_counts: Array<{
      language: string;
      total_opportunity_count: number;
      today_opportunity_count: number;
    }>;
  };
  product_claim_policy: {
    rule: string;
    distribution_model: string;
    anchor_markets: string[];
  };
  product_surfaces_to_sync: Array<{
    id: string;
    label: string;
    audience: string;
    summary: string;
  }>;
  copy_update_guidance: {
    customer_summary: string;
    public_claim_guardrail: string;
    sales_enablement_note: string;
    localized_copy_note: string;
    operator_note: string;
  };
  required_saas_actions: Array<{
    id: string;
    area: string;
    priority: string;
    required: boolean;
    action: string;
    why: string;
  }>;
  team_handoff_summary: {
    one_line: string;
    current_focus: string;
  };
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
  today_quality_root_domain_count: 0,
  source_library_root_domain_count: 0,
  discovery_target_new_worthy_root_domains: 0,
  discovery_counted_new_worthy_root_domain_count: 0,
  discovery_remaining_to_target: 0,
  discovery_target_reached: false,
  paid_target_backlog_count: 0,
  paid_target_root_domain_count: 0,
  paid_target_new_today_count: 0,
  paid_target_new_today_root_domain_count: 0,
  top_paid_targets: [],
  source_segments: {},
  playbook: {
    updated_at: "",
    learned_from_live_execution: false,
    source_campaign: "",
    north_star_metric: "",
    north_star_target: 0,
    measurement_status: "",
    current_domain_rating: null,
    remaining_gap: null,
    quality_bar_ids: [],
    recommended_lane_ids: [],
    anti_pattern_ids: [],
    proof_snapshot: {
      host_public_verified_count: 0,
      today_action_root_domain_count: 0,
      reusable_root_domain_count: 0,
    },
    raw: {
      operating_principles: [],
      winning_patterns: [],
      anti_patterns: [],
      lane_labels: {},
      anti_pattern_labels: {},
    },
  },
};

const EMPTY_CAPABILITY_UPGRADE_FEED: CapabilityUpgradeFeed = {
  generated_at: "",
  capability_fingerprint: "",
  capabilities_changed: false,
  change_summary: {
    requires_saas_review: false,
    added_capability_ids: [],
    removed_capability_ids: [],
  },
  reusable_capability_ids: [],
  market_tiers: {
    proven_languages: [],
    buildout_languages: [],
    watchlist_languages: [],
    detected_language_counts: [],
  },
  product_claim_policy: {
    rule: "",
    distribution_model: "",
    anchor_markets: [],
  },
  product_surfaces_to_sync: [],
  copy_update_guidance: {
    customer_summary: "",
    public_claim_guardrail: "",
    sales_enablement_note: "",
    localized_copy_note: "",
    operator_note: "",
  },
  required_saas_actions: [],
  team_handoff_summary: {
    one_line: "",
    current_focus: "",
  },
};

const HIGH_QUALITY_OUTREACH_LIBRARY_PATH = path.join(
  process.cwd(),
  "src/lib/high-quality-outreach-sources.json"
);
const OPERATIONAL_INSIGHTS_PATH = path.join(
  process.cwd(),
  "src/lib/operational-insights.json"
);
const CAPABILITY_UPGRADE_FEED_PATH = path.join(
  process.cwd(),
  "src/lib/capability-upgrade-feed.json"
);

async function readJsonIfPresent<T>(absolutePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(absolutePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ priority?: string }>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
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

  const [outreachLibrary, operationalInsights, capabilityUpgradeFeed] = await Promise.all([
    readJsonIfPresent<HighQualityOutreachLibrary>(
      HIGH_QUALITY_OUTREACH_LIBRARY_PATH,
      EMPTY_OUTREACH_LIBRARY
    ),
    readJsonIfPresent<OperationalInsights>(
      OPERATIONAL_INSIGHTS_PATH,
      EMPTY_OPERATIONAL_INSIGHTS
    ),
    readJsonIfPresent<CapabilityUpgradeFeed>(
      CAPABILITY_UPGRADE_FEED_PATH,
      EMPTY_CAPABILITY_UPGRADE_FEED
    ),
  ]);
  const initialManagedInboxRecord = await getManagedInboxRecord({
    productId: product.id,
    userId: user.id,
  });
  const managedInboxRecord = await reconcileManagedInboxRecordWithSendLog({
    record: initialManagedInboxRecord,
    product: {
      id: product.id,
      name: product.name,
      url: product.url,
      description: product.description || "",
    },
  });
  const managedInboxLiveActivity = await getManagedInboxLiveActivity({
    name: product.name,
    url: product.url,
  });

  return (
    <ProductDetail
      locale={locale}
      user={user}
      product={product}
      submissions={submissions || []}
      plan={subscription?.plan || "free"}
      managedInboxRecord={managedInboxRecord}
      managedInboxLiveActivity={managedInboxLiveActivity}
      outreachLibrary={outreachLibrary}
      operationalInsights={operationalInsights}
      capabilityUpgradeFeed={capabilityUpgradeFeed}
      priorityContext={resolvedSearchParams?.priority === "1"}
    />
  );
}

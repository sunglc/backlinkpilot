import { readFile } from "node:fs/promises";
import path from "node:path";

export interface OperationalInsightsPaidTarget {
  opportunity_id: string;
  platform_name: string;
  platform_url: string;
  submit_url: string;
  root_domain: string;
  platform_language: string;
  recommended_action: string;
  why_now: string;
  discovery_source: string;
}

export interface OperationalInsights {
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
  top_paid_targets: OperationalInsightsPaidTarget[];
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

export const EMPTY_OPERATIONAL_INSIGHTS: OperationalInsights = {
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

const OPERATIONAL_INSIGHTS_PATH = path.join(
  process.cwd(),
  "src/lib/operational-insights.json"
);

export async function readSaasOperationalInsights() {
  try {
    const content = await readFile(OPERATIONAL_INSIGHTS_PATH, "utf8");
    return JSON.parse(content) as OperationalInsights;
  } catch {
    return EMPTY_OPERATIONAL_INSIGHTS;
  }
}

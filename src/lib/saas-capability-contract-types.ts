export interface CapabilityMarketCount {
  language: string;
  total_opportunity_count: number;
  today_opportunity_count: number;
}

export interface CapabilityContractAction {
  id: string;
  area: string;
  priority: string;
  required: boolean;
  action: string;
  why: string;
  source_fields?: string[];
  source_files?: string[];
}

export interface SaasCapabilityContract {
  generated_at: string;
  contract_version: string;
  capability_fingerprint: string;
  previous_capability_fingerprint: string;
  capabilities_changed: boolean;
  change_summary: {
    added_capability_ids: string[];
    removed_capability_ids: string[];
    requires_saas_review: boolean;
  };
  reusable_capability_ids: string[];
  market_tiers: {
    proven_languages: string[];
    buildout_languages: string[];
    watchlist_languages: string[];
    detected_language_counts: CapabilityMarketCount[];
  };
  product_claim_policy: {
    rule: string;
    distribution_model: string;
    anchor_markets: string[];
  };
  required_saas_actions: CapabilityContractAction[];
  ready_to_consume_files: string[];
  team_handoff_summary: {
    one_line: string;
    current_focus: string;
  };
}

export const EMPTY_SAAS_CAPABILITY_CONTRACT: SaasCapabilityContract = {
  generated_at: "",
  contract_version: "",
  capability_fingerprint: "",
  previous_capability_fingerprint: "",
  capabilities_changed: false,
  change_summary: {
    added_capability_ids: [],
    removed_capability_ids: [],
    requires_saas_review: false,
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
  required_saas_actions: [],
  ready_to_consume_files: [],
  team_handoff_summary: {
    one_line: "",
    current_focus: "",
  },
};

export function capabilityContractNeedsReview(
  contract: SaasCapabilityContract
) {
  return (
    contract.capabilities_changed ||
    contract.change_summary.requires_saas_review ||
    contract.capability_fingerprint !== contract.previous_capability_fingerprint
  );
}

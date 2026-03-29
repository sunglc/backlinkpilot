export interface SaasCapabilityHistoryEntry {
  generated_at: string;
  capability_fingerprint: string;
  product_version: string;
  release_channel: string;
  latest_state_snapshot_id: string;
  latest_state_snapshot_at: string;
  capabilities_changed: boolean;
  added_capability_ids: string[];
  removed_capability_ids: string[];
  requires_saas_review: boolean;
  current_focus: string;
  proven_languages: string[];
  buildout_languages: string[];
  watchlist_languages: string[];
}

export interface SaasCapabilityHistory {
  generated_at: string;
  history: SaasCapabilityHistoryEntry[];
}

export const EMPTY_SAAS_CAPABILITY_HISTORY: SaasCapabilityHistory = {
  generated_at: "",
  history: [],
};

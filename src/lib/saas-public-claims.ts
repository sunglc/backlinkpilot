import type { SaasCapabilityContract } from "@/lib/saas-capability-contract-types";
import type {
  OperationalInsights,
  OperationalInsightsDiscoveryMarket,
} from "@/lib/saas-operational-insights-types";

function marketLabels(
  markets: OperationalInsightsDiscoveryMarket[],
  fallbackLanguages: string[],
  limit: number
) {
  const labels =
    markets.length > 0
      ? markets.map((market) => market.market_label)
      : fallbackLanguages.map((language) => language.toUpperCase());

  if (labels.length <= limit) {
    return labels;
  }

  return [...labels.slice(0, limit), `+${labels.length - limit}`];
}

export interface SaasPublicClaims {
  claimRule: string;
  currentFocus: string;
  anchorMarkets: string[];
  provenMarkets: string[];
  buildoutMarkets: string[];
  watchlistMarkets: string[];
  hasLanguageAdaptiveCopy: boolean;
}

export function buildSaasPublicClaims(args: {
  capabilityContract: SaasCapabilityContract;
  operationalInsights: OperationalInsights;
}): SaasPublicClaims {
  return {
    claimRule:
      args.operationalInsights.discovery_market_claim_rule ||
      args.capabilityContract.product_claim_policy.rule,
    currentFocus:
      args.capabilityContract.team_handoff_summary.current_focus ||
      args.capabilityContract.team_handoff_summary.one_line,
    anchorMarkets:
      args.operationalInsights.discovery_anchor_markets.length > 0
        ? args.operationalInsights.discovery_anchor_markets
        : args.capabilityContract.product_claim_policy.anchor_markets,
    provenMarkets: marketLabels(
      args.operationalInsights.discovery_proven_markets,
      args.capabilityContract.market_tiers.proven_languages,
      4
    ),
    buildoutMarkets: marketLabels(
      args.operationalInsights.discovery_priority_buildout_markets,
      args.capabilityContract.market_tiers.buildout_languages,
      6
    ),
    watchlistMarkets: marketLabels(
      args.operationalInsights.discovery_watchlist_markets,
      args.capabilityContract.market_tiers.watchlist_languages,
      5
    ),
    hasLanguageAdaptiveCopy: args.capabilityContract.reusable_capability_ids.includes(
      "language_adaptive_submission_copy"
    ),
  };
}

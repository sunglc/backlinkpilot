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
  customerSummary: string;
  claimGuardrail: string;
  salesEnablementNote: string;
  localizedCopyNote: string;
  customerFacingSurfaces: string[];
}

export function buildSaasPublicClaims(args: {
  capabilityContract: SaasCapabilityContract;
  operationalInsights: OperationalInsights;
}): SaasPublicClaims {
  const customerFacingSurfaces = (
    args.capabilityContract.product_surfaces_to_sync || []
  )
    .filter((surface) => surface.audience === "customer")
    .map((surface) => surface.label)
    .filter(Boolean);

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
    customerSummary: args.capabilityContract.copy_update_guidance.customer_summary,
    claimGuardrail:
      args.capabilityContract.copy_update_guidance.public_claim_guardrail,
    salesEnablementNote:
      args.capabilityContract.copy_update_guidance.sales_enablement_note,
    localizedCopyNote:
      args.capabilityContract.copy_update_guidance.localized_copy_note,
    customerFacingSurfaces,
  };
}

function mergeDescription(base: string, extras: string[], maxLength: number) {
  let description = base.trim();
  for (const extra of extras) {
    const snippet = extra.trim();
    if (!snippet) continue;
    const candidate = description ? `${description} ${snippet}` : snippet;
    if (candidate.length > maxLength) {
      continue;
    }
    description = candidate;
  }
  return description;
}

function marketLead(locale: "zh" | "en", markets: string[]) {
  if (markets.length === 0) {
    return locale === "zh" ? "当前 proven 供给会按合同实时更新" : "Current proven supply follows the live contract";
  }

  const shortlist = markets.slice(0, 2).join(locale === "zh" ? "、" : ", ");
  return locale === "zh"
    ? `当前 proven 供给以 ${shortlist} 为主`
    : `Current proven supply centers on ${shortlist}`;
}

export function buildClaimAwareDescription(args: {
  locale: "zh" | "en";
  baseDescription: string;
  publicClaims: SaasPublicClaims;
}) {
  const coverageSentence =
    args.locale === "zh"
      ? `${marketLead(args.locale, args.publicClaims.provenMarkets)}，其他市场按 buildout/watchlist 诚实标注。`
      : `${marketLead(args.locale, args.publicClaims.provenMarkets)} while buildout and watchlist lanes stay clearly labeled.`;
  const adaptiveSentence = args.publicClaims.hasLanguageAdaptiveCopy
    ? args.locale === "zh"
      ? "已支持目标语言自适应文案。"
      : "Target-language adaptive copy is live."
    : "";

  return mergeDescription(args.baseDescription, [coverageSentence, adaptiveSentence], 185);
}

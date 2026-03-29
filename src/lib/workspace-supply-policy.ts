import type { SaasCapabilityContract } from "@/lib/saas-capability-contract-types";
import type {
  OperationalInsights,
  OperationalInsightsDiscoveryMarket,
} from "@/lib/saas-operational-insights-types";
import type {
  WorkspacePolicyProductSnapshot,
  WorkspacePolicySnapshot,
} from "@/lib/workspace-policy-types";
import type {
  WorkspaceSupplyOwnerSummary,
  WorkspaceSupplyReason,
  WorkspaceSupplySnapshot,
  WorkspaceSupplyTier,
} from "@/lib/workspace-supply-policy-types";

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

function submissionOwnerScore(product: WorkspacePolicyProductSnapshot) {
  const laneWeight = {
    build: 140,
    watch: 110,
    premium: 80,
    prove: 30,
  }[product.lane];

  return (
    laneWeight +
    (product.openSubmissionCount === 0 ? 80 : -product.openSubmissionCount * 36) +
    (product.receiptCount === 0 ? 36 : Math.max(0, 28 - product.receiptCount * 3)) -
    product.activeProofTaskCount * 32 -
    product.verifyCount * 18 -
    product.closeCount * 12 -
    Math.floor(product.proofScore / 24)
  );
}

function buildoutOwnerScore(product: WorkspacePolicyProductSnapshot) {
  const laneWeight = {
    watch: 130,
    build: 110,
    premium: 90,
    prove: 40,
  }[product.lane];

  return (
    laneWeight +
    Math.min(product.receiptCount, 8) * 16 +
    Math.floor(product.proofScore / 28) -
    product.activeProofTaskCount * 28 -
    product.openSubmissionCount * 18
  );
}

function premiumOwnerScore(product: WorkspacePolicyProductSnapshot) {
  return (
    product.proofScore +
    product.receiptCount * 18 +
    (product.premiumCandidate ? 60 : 0) -
    product.activeProofTaskCount * 14
  );
}

function ownerReason(args: {
  product: WorkspacePolicyProductSnapshot;
  tier: WorkspaceSupplyTier;
}): WorkspaceSupplyReason {
  if (args.tier === "premium") {
    return "managed_inbox_ready";
  }

  if (args.tier === "buildout") {
    if (args.product.receiptCount > 0 || args.product.proofScore > 0) {
      return "has_receipt_base";
    }

    if (args.product.activeProofTaskCount > 0) {
      return "proof_in_motion";
    }

    return "idle_lane";
  }

  if (args.product.receiptCount === 0 && args.product.openSubmissionCount === 0) {
    return "needs_first_signal";
  }

  if (args.product.activeProofTaskCount > 0) {
    return "proof_in_motion";
  }

  return "idle_lane";
}

function toOwnerSummary(args: {
  product: WorkspacePolicyProductSnapshot;
  tier: WorkspaceSupplyTier;
  recommendedMarkets: string[];
}): WorkspaceSupplyOwnerSummary {
  return {
    productId: args.product.productId,
    productName: args.product.productName,
    workspaceLane: args.product.lane,
    tier: args.tier,
    recommendedMarkets: args.recommendedMarkets,
    reason: ownerReason({
      product: args.product,
      tier: args.tier,
    }),
    openSubmissionCount: args.product.openSubmissionCount,
    receiptCount: args.product.receiptCount,
    proofScore: args.product.proofScore,
    activeProofTaskCount: args.product.activeProofTaskCount,
  };
}

function pickBestOwner(args: {
  products: WorkspacePolicyProductSnapshot[];
  recommendedMarkets: string[];
  tier: WorkspaceSupplyTier;
  score: (product: WorkspacePolicyProductSnapshot) => number;
}) {
  if (args.products.length === 0 || args.recommendedMarkets.length === 0) {
    return null;
  }

  const product = args.products
    .slice()
    .sort((left, right) => args.score(right) - args.score(left))[0];

  if (!product) {
    return null;
  }

  return toOwnerSummary({
    product,
    tier: args.tier,
    recommendedMarkets: args.recommendedMarkets,
  });
}

export function buildWorkspaceSupplySnapshot(args: {
  currentPlan: string;
  reviewPending: boolean;
  capabilityContract: SaasCapabilityContract;
  operationalInsights: OperationalInsights;
  workspacePolicy: WorkspacePolicySnapshot;
}): WorkspaceSupplySnapshot {
  const provenMarkets = marketLabels(
    args.operationalInsights.discovery_proven_markets,
    args.capabilityContract.market_tiers.proven_languages,
    4
  );
  const buildoutMarkets = marketLabels(
    args.operationalInsights.discovery_priority_buildout_markets,
    args.capabilityContract.market_tiers.buildout_languages,
    5
  );
  const submissionOwners = args.workspacePolicy.laneOwners.submission
    .map((productId) =>
      args.workspacePolicy.products.find(
        (product) => product.productId === productId
      )
    )
    .filter((product): product is WorkspacePolicyProductSnapshot => Boolean(product));
  const premiumOwners = args.workspacePolicy.laneOwners.premium
    .map((productId) =>
      args.workspacePolicy.products.find(
        (product) => product.productId === productId
      )
    )
    .filter((product): product is WorkspacePolicyProductSnapshot => Boolean(product));

  const provenOwner = pickBestOwner({
    products: submissionOwners,
    recommendedMarkets: provenMarkets,
    tier: "proven",
    score: submissionOwnerScore,
  });

  const buildoutUnlocked =
    (args.currentPlan === "growth" || args.currentPlan === "scale") &&
    args.workspacePolicy.capacity.lanes.submission.remaining > 1;
  const buildoutOwner = buildoutUnlocked
    ? pickBestOwner({
        products: submissionOwners,
        recommendedMarkets: buildoutMarkets,
        tier: "buildout",
        score: buildoutOwnerScore,
      })
    : null;

  const premiumOwner =
    args.operationalInsights.paid_target_backlog_count > 0
      ? pickBestOwner({
          products: premiumOwners,
          recommendedMarkets: args.operationalInsights.top_paid_targets
            .slice(0, 3)
            .map((target) => target.platform_name),
          tier: "premium",
          score: premiumOwnerScore,
        })
      : null;

  let focus: WorkspaceSupplySnapshot["focus"] = "hold_supply";

  if (args.reviewPending) {
    focus = "review_contract";
  } else if (args.currentPlan === "free") {
    focus = "unlock_plan";
  } else if (args.workspacePolicy.laneOwners.proof.length > 0) {
    focus = "push_proof";
  } else if (
    buildoutOwner &&
    provenOwner &&
    provenOwner.receiptCount > 0
  ) {
    focus = "expand_buildout";
  } else if (provenOwner) {
    focus = "feed_proven";
  } else if (premiumOwner) {
    focus = "prepare_premium";
  }

  const shouldOpenAutoCoverage =
    !args.reviewPending &&
    args.workspacePolicy.capacity.lanes.submission.remaining > 0 &&
    focus !== "push_proof" &&
    focus !== "hold_supply";

  return {
    currentPlan: args.currentPlan,
    reviewPending: args.reviewPending,
    discovery: {
      target: args.operationalInsights.discovery_target_new_worthy_root_domains,
      counted:
        args.operationalInsights.discovery_counted_new_worthy_root_domain_count,
      remaining: args.operationalInsights.discovery_remaining_to_target,
      reached: args.operationalInsights.discovery_target_reached,
    },
    focus,
    recommendedAutoCoverageProductId: shouldOpenAutoCoverage
      ? provenOwner?.productId || buildoutOwner?.productId || null
      : null,
    provenOwner,
    buildoutOwner,
    premiumOwner,
  };
}

export function getWorkspaceAutoCoverageError(args: {
  snapshot: WorkspaceSupplySnapshot;
  productId: string;
}) {
  if (args.snapshot.reviewPending) {
    return "The capability contract changed. Review the required SaaS actions before routing fresh discovery supply into new plans.";
  }

  if (args.snapshot.focus === "push_proof") {
    return "This workspace should push current proof work forward before opening another auto-generated discovery plan.";
  }

  const owner = args.snapshot.provenOwner;
  if (!owner || !args.snapshot.recommendedAutoCoverageProductId) {
    return null;
  }

  if (owner.productId === args.productId) {
    return null;
  }

  return `Fresh discovery supply is currently routed to ${owner.productName}. Let that product absorb the next auto-coverage plan first.`;
}

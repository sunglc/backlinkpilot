import type { SaasCapabilityContract } from "@/lib/saas-capability-contract-types";
import type { SaasCapabilityHistory } from "@/lib/saas-capability-history-types";
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
  WorkspaceSupplyReleaseState,
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

function releaseState(args: {
  open: boolean;
  reason: WorkspaceSupplyReleaseState["reason"];
  recommendedProductId: string | null;
}): WorkspaceSupplyReleaseState {
  return {
    open: args.open,
    reason: args.reason,
    recommendedProductId: args.recommendedProductId,
  };
}

function buildCapabilityStability(args: {
  capabilityContract: SaasCapabilityContract;
  capabilityHistory: SaasCapabilityHistory;
}) {
  const history = Array.isArray(args.capabilityHistory.history)
    ? args.capabilityHistory.history
    : [];
  const currentFingerprint = String(
    args.capabilityContract.capability_fingerprint || ""
  ).trim();
  let stableFingerprintStreak = 0;

  for (const row of history) {
    if (String(row.capability_fingerprint || "").trim() !== currentFingerprint) {
      break;
    }

    stableFingerprintStreak += 1;
  }

  const recentWindow = history.slice(0, 4);
  const recentChangeCount = recentWindow.filter(
    (row) =>
      Boolean(row.capabilities_changed) ||
      Boolean(row.requires_saas_review) ||
      String(row.capability_fingerprint || "").trim() !== currentFingerprint
  ).length;
  const lastChangedAt =
    recentWindow.find(
      (row) =>
        Boolean(row.capabilities_changed) ||
        Boolean(row.requires_saas_review) ||
        String(row.capability_fingerprint || "").trim() !== currentFingerprint
    )?.generated_at || null;
  const buildoutRequiredStreak = history.length >= 2 ? 2 : 1;
  const premiumRequiredStreak = history.length >= 3 ? 3 : history.length >= 2 ? 2 : 1;

  return {
    recentSnapshotCount: recentWindow.length,
    stableFingerprintStreak,
    recentChangeCount,
    lastChangedAt,
    buildoutReady: stableFingerprintStreak >= buildoutRequiredStreak,
    premiumReady: stableFingerprintStreak >= premiumRequiredStreak,
  };
}

export function buildWorkspaceSupplySnapshot(args: {
  currentPlan: string;
  reviewPending: boolean;
  capabilityContract: SaasCapabilityContract;
  capabilityHistory: SaasCapabilityHistory;
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
  const workspaceTotals = args.workspacePolicy.products.reduce(
    (totals, product) => ({
      receipts: totals.receipts + product.receiptCount,
      close: totals.close + product.closeCount,
      verify: totals.verify + product.verifyCount,
      activeProofTasks: totals.activeProofTasks + product.activeProofTaskCount,
    }),
    {
      receipts: 0,
      close: 0,
      verify: 0,
      activeProofTasks: 0,
    }
  );
  const capabilityStability = buildCapabilityStability({
    capabilityContract: args.capabilityContract,
    capabilityHistory: args.capabilityHistory,
  });

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
  const buildoutBaseReady =
    workspaceTotals.verify > 0 ||
    workspaceTotals.close > 0 ||
    workspaceTotals.receipts >= 3;
  const premiumBaseReady =
    workspaceTotals.verify > 0 ||
    workspaceTotals.close > 0 ||
    workspaceTotals.receipts >= 6;
  const proofPriority = args.workspacePolicy.laneOwners.proof.length > 0;
  const provenRelease = args.reviewPending
    ? releaseState({
        open: false,
        reason: "review_pending",
        recommendedProductId: null,
      })
    : args.currentPlan === "free"
      ? releaseState({
          open: false,
          reason: "unlock_required",
          recommendedProductId: null,
        })
      : args.workspacePolicy.capacity.lanes.submission.remaining <= 0
        ? releaseState({
            open: false,
            reason: "capacity_full",
            recommendedProductId: null,
          })
        : proofPriority
          ? releaseState({
              open: false,
              reason: "proof_priority",
              recommendedProductId: null,
            })
          : provenOwner
            ? releaseState({
                open: true,
                reason: "ready",
                recommendedProductId: provenOwner.productId,
              })
            : releaseState({
                open: false,
                reason: "missing_owner",
                recommendedProductId: null,
              });
  const buildoutRelease = args.reviewPending
    ? releaseState({
        open: false,
        reason: "review_pending",
        recommendedProductId: null,
      })
    : args.currentPlan !== "growth" && args.currentPlan !== "scale"
      ? releaseState({
          open: false,
          reason: "unlock_required",
          recommendedProductId: null,
        })
      : args.workspacePolicy.capacity.lanes.submission.remaining <= 1
        ? releaseState({
            open: false,
            reason: "capacity_full",
            recommendedProductId: null,
          })
        : proofPriority
          ? releaseState({
              open: false,
              reason: "proof_priority",
              recommendedProductId: null,
            })
          : !capabilityStability.buildoutReady
            ? releaseState({
                open: false,
                reason: "history_unstable",
                recommendedProductId: null,
              })
          : !buildoutBaseReady
            ? releaseState({
                open: false,
                reason: "awaiting_proven_base",
                recommendedProductId: null,
              })
            : buildoutOwner
              ? releaseState({
                  open: true,
                  reason: "ready",
                  recommendedProductId: buildoutOwner.productId,
                })
              : releaseState({
                  open: false,
                  reason: "missing_owner",
                  recommendedProductId: null,
                });
  const premiumRelease = args.reviewPending
    ? releaseState({
        open: false,
        reason: "review_pending",
        recommendedProductId: null,
      })
    : args.currentPlan !== "growth" && args.currentPlan !== "scale"
      ? releaseState({
          open: false,
          reason: "unlock_required",
          recommendedProductId: null,
        })
      : args.workspacePolicy.capacity.lanes.premium.remaining <= 0
        ? releaseState({
            open: false,
            reason: "capacity_full",
            recommendedProductId: null,
          })
        : proofPriority
          ? releaseState({
              open: false,
              reason: "proof_priority",
              recommendedProductId: null,
            })
          : !capabilityStability.premiumReady
            ? releaseState({
                open: false,
                reason: "history_unstable",
                recommendedProductId: null,
              })
          : !premiumBaseReady
            ? releaseState({
                open: false,
                reason: "awaiting_premium_base",
                recommendedProductId: null,
              })
            : premiumOwner
              ? releaseState({
                  open: true,
                  reason: "ready",
                  recommendedProductId: premiumOwner.productId,
                })
              : releaseState({
                  open: false,
                  reason: "missing_owner",
                  recommendedProductId: null,
                });

  let focus: WorkspaceSupplySnapshot["focus"] = "hold_supply";

  if (args.reviewPending) {
    focus = "review_contract";
  } else if (args.currentPlan === "free") {
    focus = "unlock_plan";
  } else if (proofPriority) {
    focus = "push_proof";
  } else if (buildoutRelease.open) {
    focus = "expand_buildout";
  } else if (provenRelease.open) {
    focus = "feed_proven";
  } else if (premiumRelease.open) {
    focus = "prepare_premium";
  }

  return {
    currentPlan: args.currentPlan,
    reviewPending: args.reviewPending,
    capabilityStability,
    discovery: {
      target: args.operationalInsights.discovery_target_new_worthy_root_domains,
      counted:
        args.operationalInsights.discovery_counted_new_worthy_root_domain_count,
      remaining: args.operationalInsights.discovery_remaining_to_target,
      reached: args.operationalInsights.discovery_target_reached,
    },
    focus,
    recommendedAutoCoverageProductId: buildoutRelease.open
      ? buildoutRelease.recommendedProductId
      : provenRelease.open
        ? provenRelease.recommendedProductId
        : null,
    release: {
      proven: provenRelease,
      buildout: buildoutRelease,
      premium: premiumRelease,
    },
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

  const owner =
    (args.snapshot.provenOwner &&
      args.snapshot.provenOwner.productId ===
        args.snapshot.recommendedAutoCoverageProductId
      ? args.snapshot.provenOwner
      : null) ||
    (args.snapshot.buildoutOwner &&
      args.snapshot.buildoutOwner.productId ===
        args.snapshot.recommendedAutoCoverageProductId
      ? args.snapshot.buildoutOwner
      : null);
  if (
    !owner ||
    !args.snapshot.recommendedAutoCoverageProductId
  ) {
    return null;
  }

  if (owner.productId === args.productId) {
    return null;
  }

  return `Fresh discovery supply is currently routed to ${owner.productName}. Let that product absorb the next auto-coverage plan first.`;
}

export function getWorkspaceBuildoutSupplyError(args: {
  snapshot: WorkspaceSupplySnapshot;
  productId: string;
}) {
  if (args.snapshot.release.buildout.open) {
    if (
      !args.snapshot.release.buildout.recommendedProductId ||
      args.snapshot.release.buildout.recommendedProductId === args.productId
    ) {
      return null;
    }

    const owner = args.snapshot.buildoutOwner;
    if (!owner) {
      return null;
    }

    return `Buildout supply is currently routed to ${owner.productName}. Let that product absorb the next buildout wave first.`;
  }

  return {
    review_pending:
      "The capability contract changed. Adopt the required SaaS actions before opening buildout supply.",
    unlock_required:
      "Buildout supply unlocks on Growth or Scale after the live execution layer is ready.",
    capacity_full:
      "There is not enough submission capacity left to open the buildout lane right now.",
    proof_priority:
      "Push the current proof path first before opening the next buildout wave.",
    history_unstable:
      "The recent capability history is still moving. Let the current contract settle before opening the next buildout wave.",
    missing_owner:
      "No product is ready to absorb buildout supply right now.",
    awaiting_proven_base:
      "Buildout stays closed until the workspace has a stronger proven proof base.",
    awaiting_premium_base:
      "Buildout supply is waiting on a stronger premium-proof base.",
    ready: null,
  }[args.snapshot.release.buildout.reason];
}

export function getWorkspacePremiumSupplyError(args: {
  snapshot: WorkspaceSupplySnapshot;
  productId: string;
}) {
  if (args.snapshot.release.premium.open) {
    if (
      !args.snapshot.release.premium.recommendedProductId ||
      args.snapshot.release.premium.recommendedProductId === args.productId
    ) {
      return null;
    }

    const owner = args.snapshot.premiumOwner;
    if (!owner) {
      return null;
    }

    return `Premium supply is currently routed to ${owner.productName}. Let that product use the premium lane first.`;
  }

  return {
    review_pending:
      "The capability contract changed. Adopt the required SaaS actions before opening premium supply.",
    unlock_required:
      "Premium supply stays closed until the workspace is on Growth or Scale.",
    capacity_full:
      "The premium lane is already full right now.",
    proof_priority:
      "Finish the current proof pushes before opening premium work.",
    history_unstable:
      "The recent capability history is still moving. Let the current contract settle before opening premium work.",
    missing_owner:
      "No product is ready to absorb premium supply right now.",
    awaiting_proven_base:
      "Premium supply is still waiting on a stronger standard proof base.",
    awaiting_premium_base:
      "Premium supply stays closed until the workspace has a stronger proof and receipt base.",
    ready: null,
  }[args.snapshot.release.premium.reason];
}

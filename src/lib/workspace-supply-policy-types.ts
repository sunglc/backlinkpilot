import type { WorkspacePolicyProductLane } from "@/lib/workspace-policy-types";

export type WorkspaceSupplyTier = "proven" | "buildout" | "premium";

export type WorkspaceSupplyReleaseReason =
  | "review_pending"
  | "unlock_required"
  | "capacity_full"
  | "proof_priority"
  | "history_unstable"
  | "missing_owner"
  | "awaiting_proven_base"
  | "awaiting_premium_base"
  | "ready";

export type WorkspaceSupplyFocus =
  | "review_contract"
  | "unlock_plan"
  | "push_proof"
  | "feed_proven"
  | "expand_buildout"
  | "prepare_premium"
  | "hold_supply";

export type WorkspaceSupplyReason =
  | "needs_first_signal"
  | "idle_lane"
  | "has_receipt_base"
  | "proof_in_motion"
  | "managed_inbox_ready";

export interface WorkspaceSupplyOwnerSummary {
  productId: string;
  productName: string;
  workspaceLane: WorkspacePolicyProductLane;
  tier: WorkspaceSupplyTier;
  recommendedMarkets: string[];
  reason: WorkspaceSupplyReason;
  openSubmissionCount: number;
  receiptCount: number;
  proofScore: number;
  activeProofTaskCount: number;
}

export interface WorkspaceSupplyReleaseState {
  open: boolean;
  reason: WorkspaceSupplyReleaseReason;
  recommendedProductId: string | null;
}

export interface WorkspaceSupplyCapabilityStability {
  recentSnapshotCount: number;
  stableFingerprintStreak: number;
  recentChangeCount: number;
  lastChangedAt: string | null;
  buildoutReady: boolean;
  premiumReady: boolean;
}

export interface WorkspaceSupplySnapshot {
  currentPlan: string;
  reviewPending: boolean;
  capabilityStability: WorkspaceSupplyCapabilityStability;
  discovery: {
    target: number;
    counted: number;
    remaining: number;
    reached: boolean;
  };
  focus: WorkspaceSupplyFocus;
  recommendedAutoCoverageProductId: string | null;
  release: Record<WorkspaceSupplyTier, WorkspaceSupplyReleaseState>;
  provenOwner: WorkspaceSupplyOwnerSummary | null;
  buildoutOwner: WorkspaceSupplyOwnerSummary | null;
  premiumOwner: WorkspaceSupplyOwnerSummary | null;
}

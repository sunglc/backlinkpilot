import type { WorkspaceCapacity } from "@/lib/workspace-capacity";
import type { WorkspaceStrategyMode } from "@/lib/workspace-strategy";

export type WorkspacePolicyLane = "submission" | "proof" | "premium";
export type WorkspacePolicyProductLane =
  | "build"
  | "watch"
  | "prove"
  | "premium";

export interface WorkspacePolicyProductSnapshot {
  productId: string;
  productName: string;
  lane: WorkspacePolicyProductLane;
  lastSignalAt: string | null;
  openSubmissionCount: number;
  receiptCount: number;
  repliedThreadCount: number;
  closeCount: number;
  verifyCount: number;
  proofScore: number;
  activeProofTaskCount: number;
  premiumCandidate: boolean;
}

export type WorkspacePolicyLaneOwners = Record<WorkspacePolicyLane, string[]>;
export type WorkspacePolicyAllowances = Record<
  string,
  Record<WorkspacePolicyLane, boolean>
>;

export interface WorkspacePolicySnapshot {
  currentPlan: string;
  strategyMode: WorkspaceStrategyMode;
  loads: {
    submission: number;
    proof: number;
    premium: number;
  };
  capacity: WorkspaceCapacity;
  products: WorkspacePolicyProductSnapshot[];
  laneOwners: WorkspacePolicyLaneOwners;
  allowances: WorkspacePolicyAllowances;
}

export interface WorkspacePolicyLaneOwnerSummary {
  productId: string;
  productName: string;
  workspaceLane: WorkspacePolicyProductLane;
  proofScore: number;
  openSubmissionCount: number;
  receiptCount: number;
  repliedThreadCount: number;
  closeCount: number;
  verifyCount: number;
  activeProofTaskCount: number;
}

export interface WorkspacePolicyClientSnapshot {
  currentPlan: string;
  strategyMode: WorkspaceStrategyMode;
  loads: WorkspacePolicySnapshot["loads"];
  capacity: WorkspaceCapacity;
  laneOwners: Record<WorkspacePolicyLane, WorkspacePolicyLaneOwnerSummary[]>;
  allowances: WorkspacePolicyAllowances;
}

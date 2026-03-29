import "server-only";

import {
  buildWorkspaceCapacity,
  type WorkspaceCapacity,
} from "@/lib/workspace-capacity";
import { getManagedInboxRecord } from "@/lib/managed-inbox-server";
import { readWorkspaceTaskPlans } from "@/lib/workspace-task-plans";

type WorkspaceStrategyMode = "unlock" | "upgrade" | "prove" | "watch" | "build";
type WorkspacePolicyLane = "submission" | "proof" | "premium";

interface WorkspaceSubmissionSnapshot {
  product_id: string;
  status: string;
  success_sites: number;
}

export interface WorkspacePolicySnapshot {
  currentPlan: string;
  strategyMode: WorkspaceStrategyMode;
  loads: {
    submission: number;
    proof: number;
    premium: number;
  };
  capacity: WorkspaceCapacity;
}

function isPremiumTaskPlan(plan: {
  mode: string;
  sourcePlanId?: string | null;
  successCost: number;
  failureCost: number;
}) {
  return (
    plan.mode === "import_list" &&
    Boolean(plan.sourcePlanId) &&
    plan.successCost === 1 &&
    plan.failureCost === 1
  );
}

function isOpenSubmission(submission: WorkspaceSubmissionSnapshot) {
  return (
    submission.status === "queued" ||
    submission.status === "running" ||
    submission.status === "completed" ||
    submission.status === "failed" ||
    submission.success_sites > 0
  );
}

function deriveStrategyMode(args: {
  currentPlan: string;
  submissionLoad: number;
  proofLoad: number;
  premiumLoad: number;
}): WorkspaceStrategyMode {
  if (args.currentPlan === "free") {
    return "unlock";
  }

  if (
    args.currentPlan === "starter" &&
    args.submissionLoad >= 3 &&
    (args.proofLoad > 0 || args.premiumLoad > 0)
  ) {
    return "upgrade";
  }

  if (args.proofLoad > 0) {
    return "prove";
  }

  if (args.submissionLoad > 0 || args.premiumLoad > 0) {
    return "watch";
  }

  return "build";
}

export async function buildWorkspacePolicySnapshot(args: {
  userId: string;
  currentPlan: string;
  productIds: string[];
  submissions: WorkspaceSubmissionSnapshot[];
}) {
  const taskPlansByProduct = await Promise.all(
    args.productIds.map((productId) =>
      readWorkspaceTaskPlans({
        productId,
        userId: args.userId,
      })
    )
  );
  const managedInboxRecords = await Promise.all(
    args.productIds.map((productId) =>
      getManagedInboxRecord({
        productId,
        userId: args.userId,
      })
    )
  );

  const submissionLoad = args.submissions.filter(isOpenSubmission).length;
  const proofLoad = managedInboxRecords.filter((record) =>
    record.proofTasks.some(
      (task) => task.status === "queued" || task.status === "in_progress"
    )
  ).length;
  const premiumTaskPlanLoad = taskPlansByProduct
    .flat()
    .filter(isPremiumTaskPlan).length;
  const premiumManagedLoad = managedInboxRecords.filter(
    (record) => record.senderMode === "managed" && Boolean(record.launchRequest)
  ).length;
  const premiumLoad = premiumTaskPlanLoad + premiumManagedLoad;
  const strategyMode = deriveStrategyMode({
    currentPlan: args.currentPlan,
    submissionLoad,
    proofLoad,
    premiumLoad,
  });
  const capacity = buildWorkspaceCapacity({
    currentPlan: args.currentPlan,
    strategyMode,
    submissionLoad,
    proofLoad,
    premiumLoad,
  });

  return {
    currentPlan: args.currentPlan,
    strategyMode,
    loads: {
      submission: submissionLoad,
      proof: proofLoad,
      premium: premiumLoad,
    },
    capacity,
  } satisfies WorkspacePolicySnapshot;
}

export function getWorkspacePolicyError(
  snapshot: WorkspacePolicySnapshot,
  lane: WorkspacePolicyLane
) {
  const laneState = snapshot.capacity.lanes[lane];
  if (laneState.remaining > 0) {
    return null;
  }

  if (lane === "submission") {
    return "This workspace is already at the suggested submission limit for this week. Let current work land before opening more submission tasks.";
  }

  if (lane === "proof") {
    return "This workspace is already at the suggested proof limit for this week. Finish the current proof pushes before queuing another one.";
  }

  return "This workspace is already at the suggested premium limit right now. Keep premium work separate until the standard proof path is clearer.";
}

import "server-only";

import {
  buildWorkspaceCapacity,
} from "@/lib/workspace-capacity";
import { getManagedInboxRecord } from "@/lib/managed-inbox-server";
import type { WorkspaceStrategyMode } from "@/lib/workspace-strategy";
import { readWorkspaceTaskPlans } from "@/lib/workspace-task-plans";
import type {
  WorkspacePolicyAllowances,
  WorkspacePolicyLane,
  WorkspacePolicyLaneOwners,
  WorkspacePolicyProductLane,
  WorkspacePolicyReclaimReason,
  WorkspacePolicyProductSnapshot,
  WorkspacePolicySnapshot,
} from "@/lib/workspace-policy-types";

interface WorkspaceSubmissionSnapshot {
  product_id: string;
  status: string;
  success_sites: number;
  created_at?: string | null;
}

interface WorkspacePolicyProductInput {
  id: string;
  name: string;
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

function deriveProductLane(
  product: Omit<WorkspacePolicyProductSnapshot, "lane">
): WorkspacePolicyProductLane {
  if (
    product.activeProofTaskCount > 0 ||
    product.verifyCount > 0 ||
    product.closeCount > 0 ||
    product.repliedThreadCount > 0
  ) {
    return "prove";
  }

  if (product.openSubmissionCount > 0 || product.receiptCount > 0) {
    return "watch";
  }

  if (product.premiumCandidate) {
    return "premium";
  }

  return "build";
}

function latestTimestamp(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] || null
  );
}

function ageInDays(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.floor((Date.now() - parsed) / 86_400_000);
}

function isSettledProof(product: WorkspacePolicyProductSnapshot) {
  return (
    product.verifyCount > 0 &&
    product.activeProofTaskCount === 0 &&
    product.openSubmissionCount === 0
  );
}

function isStalledPipeline(product: WorkspacePolicyProductSnapshot) {
  const ageDays = ageInDays(product.lastSignalAt);

  return (
    ageDays !== null &&
    ageDays >= 10 &&
    product.openSubmissionCount > 0 &&
    product.activeProofTaskCount === 0 &&
    product.verifyCount === 0 &&
    product.closeCount === 0
  );
}

function reclaimReasonForProduct(
  product: WorkspacePolicyProductSnapshot
): WorkspacePolicyReclaimReason | null {
  if (isSettledProof(product)) {
    return "settled_proof";
  }

  if (isStalledPipeline(product)) {
    return "stalled_pipeline";
  }

  return null;
}

function eligibleProductsForLane(args: {
  products: WorkspacePolicyProductSnapshot[];
  lane: WorkspacePolicyLane;
}) {
  return args.products.filter((product) => {
    if (reclaimReasonForProduct(product)) {
      return false;
    }

    if (args.lane === "proof") {
      return product.activeProofTaskCount === 0;
    }

    if (args.lane === "premium") {
      return product.premiumCandidate;
    }

    return true;
  });
}

function submissionCandidateScore(product: WorkspacePolicyProductSnapshot) {
  const laneWeight = {
    build: 420,
    watch: 220,
    prove: 120,
    premium: 60,
  }[product.lane];
  const settledPenalty = isSettledProof(product) ? 420 : 0;
  const stalledPenalty = isStalledPipeline(product) ? 300 : 0;

  return (
    laneWeight +
    (product.openSubmissionCount === 0 ? 90 : -product.openSubmissionCount * 35) +
    (product.receiptCount === 0 ? 24 : 0) -
    product.activeProofTaskCount * 18 -
    product.proofScore * 0.18 -
    settledPenalty -
    stalledPenalty
  );
}

function proofCandidateScore(product: WorkspacePolicyProductSnapshot) {
  const settledPenalty = isSettledProof(product) ? 360 : 0;
  const stalledPenalty = isStalledPipeline(product) ? 240 : 0;

  return (
    product.proofScore +
    product.verifyCount * 90 +
    product.closeCount * 45 +
    product.repliedThreadCount * 16 -
    product.openSubmissionCount * 6 -
    settledPenalty -
    stalledPenalty
  );
}

function premiumCandidateScore(product: WorkspacePolicyProductSnapshot) {
  const settledPenalty = isSettledProof(product) ? 320 : 0;
  const stalledPenalty = isStalledPipeline(product) ? 260 : 0;

  return (
    product.proofScore +
    product.receiptCount * 4 +
    (product.lane === "premium" ? 40 : 0) -
    product.activeProofTaskCount * 15 -
    settledPenalty -
    stalledPenalty
  );
}

function allowProductsForLane(args: {
  products: WorkspacePolicyProductSnapshot[];
  lane: WorkspacePolicyLane;
  remaining: number;
}) {
  if (args.remaining <= 0 || args.products.length === 0) {
    return [] as string[];
  }

  const eligibleProducts = eligibleProductsForLane(args);

  if (eligibleProducts.length === 0) {
    return [] as string[];
  }

  if (args.lane === "submission") {
    const primaryCandidates = eligibleProducts.filter(
      (product) => product.openSubmissionCount === 0
    );
    const fallbackCandidates =
      primaryCandidates.length > 0 ? primaryCandidates : eligibleProducts;

    return fallbackCandidates
      .slice()
      .sort(
        (left, right) =>
          submissionCandidateScore(right) - submissionCandidateScore(left)
      )
      .slice(0, args.remaining)
      .map((product) => product.productId);
  }

  if (args.lane === "proof") {
    return eligibleProducts
      .filter((product) => product.proofScore > 0 || product.receiptCount > 0)
      .slice()
      .sort((left, right) => proofCandidateScore(right) - proofCandidateScore(left))
      .slice(0, args.remaining)
      .map((product) => product.productId);
  }

  return eligibleProducts
    .slice()
    .sort(
      (left, right) => premiumCandidateScore(right) - premiumCandidateScore(left)
    )
    .slice(0, args.remaining)
    .map((product) => product.productId);
}

function buildAllowances(args: {
  products: WorkspacePolicyProductSnapshot[];
  laneOwners: WorkspacePolicyLaneOwners;
}) {
  const allowances: WorkspacePolicyAllowances = {};

  args.products.forEach((product) => {
    allowances[product.productId] = {
      submission: args.laneOwners.submission.includes(product.productId),
      proof: args.laneOwners.proof.includes(product.productId),
      premium: args.laneOwners.premium.includes(product.productId),
    };
  });

  return allowances;
}

export async function buildWorkspacePolicySnapshot(args: {
  userId: string;
  currentPlan: string;
  products: WorkspacePolicyProductInput[];
  submissions: WorkspaceSubmissionSnapshot[];
}) {
  const taskPlansByProduct = await Promise.all(
    args.products.map((product) =>
      readWorkspaceTaskPlans({
        productId: product.id,
        userId: args.userId,
      })
    )
  );
  const managedInboxRecords = await Promise.all(
    args.products.map((product) =>
      getManagedInboxRecord({
        productId: product.id,
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

  const products = args.products.map((product, index) => {
    const record = managedInboxRecords[index];
    const productSubmissions = args.submissions.filter(
      (submission) => submission.product_id === product.id
    );
    const packets = record.launchRequest?.packets || [];
    const repliedThreadCount = packets.filter(
      (packet) => packet.replyStatus === "replied"
    ).length;
    const closeCount = packets.filter(
      (packet) => packet.threadStage === "publication_ready"
    ).length;
    const verifyCount = packets.filter(
      (packet) => packet.threadStage === "published"
    ).length;
    const proofScore =
      verifyCount * 70 +
      closeCount * 40 +
      repliedThreadCount * 18 +
      productSubmissions.reduce(
        (sum, submission) => sum + submission.success_sites,
        0
      ) *
        4;
    const lastSignalAt = latestTimestamp([
      ...productSubmissions.map((submission) => submission.created_at || null),
      ...record.proofTasks.map((task) => task.updatedAt || task.createdAt || null),
      ...packets.map((packet) => packet.lastReplyAt || packet.sentAt || null),
      record.launchRequest?.createdAt || null,
      record.updatedAt || null,
    ]);
    const snapshot = {
      productId: product.id,
      productName: product.name,
      lastSignalAt,
      reclaimReason: null,
      openSubmissionCount: productSubmissions.filter(isOpenSubmission).length,
      receiptCount: productSubmissions.reduce(
        (sum, submission) => sum + submission.success_sites,
        0
      ),
      repliedThreadCount,
      closeCount,
      verifyCount,
      proofScore,
      activeProofTaskCount: record.proofTasks.filter(
        (task) => task.status === "queued" || task.status === "in_progress"
      ).length,
      premiumCandidate:
        record.senderMode === "managed" &&
        Boolean(record.mailboxIdentity) &&
        !record.launchRequest,
    };

    const lane = deriveProductLane(snapshot);

    return {
      ...snapshot,
      lane,
      reclaimReason: reclaimReasonForProduct({
        ...snapshot,
        lane,
      }),
    } satisfies WorkspacePolicyProductSnapshot;
  });

  const laneOwners = {
    submission: allowProductsForLane({
      products,
      lane: "submission",
      remaining: capacity.lanes.submission.remaining,
    }),
    proof: allowProductsForLane({
      products,
      lane: "proof",
      remaining: capacity.lanes.proof.remaining,
    }),
    premium: allowProductsForLane({
      products,
      lane: "premium",
      remaining: capacity.lanes.premium.remaining,
    }),
  } satisfies WorkspacePolicyLaneOwners;

  return {
    currentPlan: args.currentPlan,
    strategyMode,
    loads: {
      submission: submissionLoad,
      proof: proofLoad,
      premium: premiumLoad,
    },
    capacity,
    products,
    laneOwners,
    allowances: buildAllowances({
      products,
      laneOwners,
    }),
  } satisfies WorkspacePolicySnapshot;
}

export function getWorkspacePolicyError(
  snapshot: WorkspacePolicySnapshot,
  lane: WorkspacePolicyLane,
  productId?: string
) {
  const laneState = snapshot.capacity.lanes[lane];
  if (laneState.remaining <= 0) {
    if (lane === "submission") {
      return "This workspace is already at the suggested submission limit for this week. Let current work land before opening more submission tasks.";
    }

    if (lane === "proof") {
      return "This workspace is already at the suggested proof limit for this week. Finish the current proof pushes before queuing another one.";
    }

    return "This workspace is already at the suggested premium limit right now. Keep premium work separate until the standard proof path is clearer.";
  }

  if (!productId) {
    return null;
  }

  if (snapshot.allowances[productId]?.[lane]) {
    return null;
  }

  const reservedProductNames = snapshot.laneOwners[lane]
    .map((ownerId) =>
      snapshot.products.find((product) => product.productId === ownerId)?.productName
    )
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);

  if (reservedProductNames.length === 0) {
    return null;
  }

  const reservedLabel = reservedProductNames.join(" and ");

  if (lane === "submission") {
    return `This week's remaining submission slots are currently reserved for ${reservedLabel}. Let those products move first before opening another submission task here.`;
  }

  if (lane === "proof") {
    return `This week's remaining proof slot is currently reserved for ${reservedLabel}. Push proof there first before queueing another proof task here.`;
  }

  return `This workspace is reserving the remaining premium slot for ${reservedLabel} first. Keep premium work separate here until that lane is used or released.`;
}

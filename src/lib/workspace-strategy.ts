import type { ProductProofPriority } from "@/lib/proof-pipeline";

export type WorkspaceStrategyDecisionKey =
  | "build_queue"
  | "watch_effect"
  | "prove_first"
  | "upgrade_now"
  | "hold_premium";

export type WorkspaceStrategyMode =
  | "unlock"
  | "upgrade"
  | "prove"
  | "watch"
  | "build";

export type WorkspaceStrategyLaneKey =
  | "prove"
  | "watch"
  | "build"
  | "premium";

export interface WorkspaceStrategyProductInput {
  productId: string;
  productName: string;
  weeklyBurn: number;
  budgetDecision: WorkspaceStrategyDecisionKey;
  proofPriority: ProductProofPriority;
  proofCounts: {
    receipts: number;
    threads: number;
    close: number;
    verify: number;
  };
}

export interface WorkspaceStrategyLaneProduct {
  productId: string;
  productName: string;
  weeklyBurn: number;
  budgetDecision: WorkspaceStrategyDecisionKey;
}

export interface WorkspaceStrategyLaneSummary {
  key: WorkspaceStrategyLaneKey;
  productCount: number;
  estimatedBurn: number;
  products: WorkspaceStrategyLaneProduct[];
}

export interface WorkspaceStrategy {
  mode: WorkspaceStrategyMode;
  leadProductId: string | null;
  totalWeeklyBurn: number;
  upgradeProductIds: string[];
  allocation: Record<WorkspaceStrategyLaneKey, number>;
  lanes: Record<WorkspaceStrategyLaneKey, WorkspaceStrategyLaneSummary>;
}

function laneForProduct(
  input: WorkspaceStrategyProductInput
): WorkspaceStrategyLaneKey {
  if (input.budgetDecision === "hold_premium") {
    return "premium";
  }

  if (input.budgetDecision === "prove_first") {
    return "prove";
  }

  if (input.budgetDecision === "watch_effect") {
    return "watch";
  }

  if (input.budgetDecision === "upgrade_now") {
    if (
      input.proofPriority !== "build_signal" ||
      input.proofCounts.verify > 0 ||
      input.proofCounts.close > 0 ||
      input.proofCounts.threads > 0
    ) {
      return "prove";
    }

    return "watch";
  }

  return "build";
}

function lanePriorityScore(
  lane: WorkspaceStrategyLaneKey,
  input: WorkspaceStrategyProductInput
) {
  const proofSignal =
    input.proofCounts.verify * 70 +
    input.proofCounts.close * 40 +
    input.proofCounts.threads * 18 +
    input.proofCounts.receipts * 4;

  if (lane === "prove") {
    return proofSignal + input.weeklyBurn * 8;
  }

  if (lane === "watch") {
    return input.weeklyBurn * 14 + proofSignal * 0.4;
  }

  if (lane === "premium") {
    return 50 + input.weeklyBurn * 6 + proofSignal * 0.35;
  }

  return 30 + Math.max(0, 10 - input.weeklyBurn) * 4 - proofSignal * 0.1;
}

function allocationWeightsForLane(lane: WorkspaceStrategyLaneKey) {
  if (lane === "prove") {
    return { prove: 70, watch: 20, build: 10, premium: 0 };
  }

  if (lane === "watch") {
    return { prove: 20, watch: 65, build: 15, premium: 0 };
  }

  if (lane === "premium") {
    return { prove: 45, watch: 15, build: 0, premium: 40 };
  }

  return { prove: 10, watch: 15, build: 75, premium: 0 };
}

function allocationIntensity(input: WorkspaceStrategyProductInput) {
  return Math.max(
    1,
    input.weeklyBurn,
    input.proofCounts.verify * 1.5 +
      input.proofCounts.close +
      input.proofCounts.threads * 0.75
  );
}

export function buildWorkspaceStrategy(args: {
  currentPlan: string;
  products: WorkspaceStrategyProductInput[];
}): WorkspaceStrategy {
  const laneEntries: Record<
    WorkspaceStrategyLaneKey,
    Array<WorkspaceStrategyProductInput & { score: number }>
  > = {
    prove: [],
    watch: [],
    build: [],
    premium: [],
  };
  const rawAllocation = {
    prove: 0,
    watch: 0,
    build: 0,
    premium: 0,
  };
  const upgradeCandidates: string[] = [];
  let totalWeeklyBurn = 0;

  args.products.forEach((product) => {
    const lane = laneForProduct(product);
    const score = lanePriorityScore(lane, product);
    laneEntries[lane].push({ ...product, score });

    if (product.budgetDecision === "upgrade_now") {
      upgradeCandidates.push(product.productId);
    }

    totalWeeklyBurn += product.weeklyBurn;

    const laneWeights = allocationWeightsForLane(lane);
    const intensity = allocationIntensity(product);
    rawAllocation.prove += laneWeights.prove * intensity;
    rawAllocation.watch += laneWeights.watch * intensity;
    rawAllocation.build += laneWeights.build * intensity;
    rawAllocation.premium += laneWeights.premium * intensity;
  });

  const sortedLanes = {
    prove: laneEntries.prove.slice().sort((left, right) => right.score - left.score),
    watch: laneEntries.watch.slice().sort((left, right) => right.score - left.score),
    build: laneEntries.build.slice().sort((left, right) => right.score - left.score),
    premium: laneEntries.premium
      .slice()
      .sort((left, right) => right.score - left.score),
  };

  const allocationTotal =
    rawAllocation.prove +
    rawAllocation.watch +
    rawAllocation.build +
    rawAllocation.premium;

  const allocation =
    allocationTotal > 0
      ? {
          prove: Math.round((rawAllocation.prove / allocationTotal) * 100),
          watch: Math.round((rawAllocation.watch / allocationTotal) * 100),
          build: Math.round((rawAllocation.build / allocationTotal) * 100),
          premium: Math.round((rawAllocation.premium / allocationTotal) * 100),
        }
      : {
          prove: 0,
          watch: 0,
          build: 100,
          premium: 0,
        };

  const allocationRemainder =
    100 -
    allocation.prove -
    allocation.watch -
    allocation.build -
    allocation.premium;
  if (allocationRemainder !== 0) {
    if (allocationRemainder > 0) {
      allocation.build += allocationRemainder;
    } else {
      const laneToReduce = ([
        "build",
        "prove",
        "watch",
        "premium",
      ] as WorkspaceStrategyLaneKey[]).sort(
        (left, right) => allocation[right] - allocation[left]
      )[0];
      allocation[laneToReduce] = Math.max(
        0,
        allocation[laneToReduce] + allocationRemainder
      );
    }
  }

  let mode: WorkspaceStrategyMode = "build";
  let leadProductId: string | null = null;

  if (args.currentPlan === "free" && args.products.length > 0) {
    mode = "unlock";
    leadProductId =
      sortedLanes.build[0]?.productId ||
      sortedLanes.prove[0]?.productId ||
      args.products[0]?.productId ||
      null;
  } else if (upgradeCandidates.length > 0) {
    mode = "upgrade";
    leadProductId =
      args.products
        .filter((product) => product.budgetDecision === "upgrade_now")
        .slice()
        .sort((left, right) => {
          if (right.weeklyBurn !== left.weeklyBurn) {
            return right.weeklyBurn - left.weeklyBurn;
          }
          return (
            lanePriorityScore("prove", right) - lanePriorityScore("prove", left)
          );
        })[0]?.productId || null;
  } else if (sortedLanes.prove.length > 0) {
    mode = "prove";
    leadProductId = sortedLanes.prove[0]?.productId || null;
  } else if (sortedLanes.watch.length > 0) {
    mode = "watch";
    leadProductId = sortedLanes.watch[0]?.productId || null;
  } else if (sortedLanes.build.length > 0) {
    mode = "build";
    leadProductId = sortedLanes.build[0]?.productId || null;
  }

  return {
    mode,
    leadProductId,
    totalWeeklyBurn: Math.round(totalWeeklyBurn * 10) / 10,
    upgradeProductIds: upgradeCandidates,
    allocation,
    lanes: {
      prove: {
        key: "prove",
        productCount: sortedLanes.prove.length,
        estimatedBurn:
          Math.round(
            sortedLanes.prove.reduce((sum, product) => sum + product.weeklyBurn, 0) *
              10
          ) / 10,
        products: sortedLanes.prove.map((product) => ({
          productId: product.productId,
          productName: product.productName,
          weeklyBurn: product.weeklyBurn,
          budgetDecision: product.budgetDecision,
        })),
      },
      watch: {
        key: "watch",
        productCount: sortedLanes.watch.length,
        estimatedBurn:
          Math.round(
            sortedLanes.watch.reduce((sum, product) => sum + product.weeklyBurn, 0) *
              10
          ) / 10,
        products: sortedLanes.watch.map((product) => ({
          productId: product.productId,
          productName: product.productName,
          weeklyBurn: product.weeklyBurn,
          budgetDecision: product.budgetDecision,
        })),
      },
      build: {
        key: "build",
        productCount: sortedLanes.build.length,
        estimatedBurn:
          Math.round(
            sortedLanes.build.reduce((sum, product) => sum + product.weeklyBurn, 0) *
              10
          ) / 10,
        products: sortedLanes.build.map((product) => ({
          productId: product.productId,
          productName: product.productName,
          weeklyBurn: product.weeklyBurn,
          budgetDecision: product.budgetDecision,
        })),
      },
      premium: {
        key: "premium",
        productCount: sortedLanes.premium.length,
        estimatedBurn:
          Math.round(
            sortedLanes.premium.reduce((sum, product) => sum + product.weeklyBurn, 0) *
              10
          ) / 10,
        products: sortedLanes.premium.map((product) => ({
          productId: product.productId,
          productName: product.productName,
          weeklyBurn: product.weeklyBurn,
          budgetDecision: product.budgetDecision,
        })),
      },
    },
  };
}

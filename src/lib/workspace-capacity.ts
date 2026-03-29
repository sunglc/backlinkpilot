import type { WorkspaceStrategyMode } from "@/lib/workspace-strategy";

export type WorkspaceCapacityLaneKey = "submission" | "proof" | "premium";

export interface WorkspaceCapacityInput {
  currentPlan: string;
  strategyMode: WorkspaceStrategyMode;
  submissionLoad: number;
  proofLoad: number;
  premiumLoad: number;
}

export interface WorkspaceCapacityLane {
  key: WorkspaceCapacityLaneKey;
  limit: number;
  used: number;
  remaining: number;
  overLimit: number;
}

export interface WorkspaceCapacity {
  policy: "unlock" | "tighten" | "balanced" | "expand";
  lanes: Record<WorkspaceCapacityLaneKey, WorkspaceCapacityLane>;
}

function planBaseLimits(plan: string) {
  if (plan === "scale") {
    return {
      submission: 10,
      proof: 6,
      premium: 3,
    };
  }

  if (plan === "growth") {
    return {
      submission: 6,
      proof: 4,
      premium: 1,
    };
  }

  if (plan === "starter") {
    return {
      submission: 3,
      proof: 2,
      premium: 0,
    };
  }

  return {
    submission: 0,
    proof: 1,
    premium: 0,
  };
}

function applyStrategyMode(
  base: Record<WorkspaceCapacityLaneKey, number>,
  mode: WorkspaceStrategyMode,
  plan: string
) {
  if (mode === "unlock") {
    return {
      submission: 0,
      proof: 0,
      premium: 0,
    };
  }

  if (mode === "upgrade") {
    return {
      submission: Math.max(base.submission - 1, base.submission > 0 ? 1 : 0),
      proof: base.proof,
      premium: Math.min(base.premium, 1),
    };
  }

  if (mode === "prove") {
    return {
      submission: Math.max(base.submission - 2, plan === "starter" ? 1 : 2),
      proof: base.proof + 1,
      premium: 0,
    };
  }

  if (mode === "watch") {
    return {
      submission: Math.max(base.submission - 1, plan === "starter" ? 1 : 2),
      proof: base.proof,
      premium: Math.min(base.premium, 1),
    };
  }

  return {
    submission: base.submission,
    proof: Math.max(base.proof - 1, plan === "free" ? 0 : 1),
    premium: base.premium,
  };
}

function laneState(
  key: WorkspaceCapacityLaneKey,
  limit: number,
  used: number
): WorkspaceCapacityLane {
  const remaining = Math.max(0, limit - used);
  const overLimit = Math.max(0, used - limit);

  return {
    key,
    limit,
    used,
    remaining,
    overLimit,
  };
}

export function buildWorkspaceCapacity(
  input: WorkspaceCapacityInput
): WorkspaceCapacity {
  const base = planBaseLimits(input.currentPlan);
  const limits = applyStrategyMode(base, input.strategyMode, input.currentPlan);
  const lanes = {
    submission: laneState("submission", limits.submission, input.submissionLoad),
    proof: laneState("proof", limits.proof, input.proofLoad),
    premium: laneState("premium", limits.premium, input.premiumLoad),
  };

  let policy: WorkspaceCapacity["policy"] = "balanced";

  if (input.strategyMode === "unlock") {
    policy = "unlock";
  } else if (
    lanes.submission.overLimit > 0 ||
    lanes.proof.overLimit > 0 ||
    lanes.premium.overLimit > 0
  ) {
    policy = "tighten";
  } else if (input.strategyMode === "build") {
    policy = "expand";
  }

  return {
    policy,
    lanes,
  };
}

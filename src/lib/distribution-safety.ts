import type { Locale } from "@/lib/locale-config";

export type ChannelSafetyTier = "green" | "yellow" | "red";
export type ChannelExecutionMode = "auto" | "manual_review" | "disabled";

export interface ChannelSafetyPolicy {
  tier: ChannelSafetyTier;
  executionMode: ChannelExecutionMode;
  reason: string;
}

const DEFAULT_POLICY: ChannelSafetyPolicy = {
  tier: "yellow",
  executionMode: "manual_review",
  reason: "Unknown channels default to manual review until they are explicitly approved.",
};

const CHANNEL_SAFETY_POLICIES: Record<string, ChannelSafetyPolicy> = {
  directory: {
    tier: "green",
    executionMode: "auto",
    reason: "Directory submission is the lowest-risk default path because these properties explicitly accept listings.",
  },
  stealth: {
    tier: "red",
    executionMode: "disabled",
    reason: "Evasion-oriented submission paths should not stay in the default product flow.",
  },
  community: {
    tier: "red",
    executionMode: "disabled",
    reason: "Community and developer platforms should not be treated as default backlink automation targets.",
  },
  resource_page: {
    tier: "yellow",
    executionMode: "manual_review",
    reason: "Editorial outreach should be reviewed manually for relevance and legitimacy before sending.",
  },
  social: {
    tier: "yellow",
    executionMode: "manual_review",
    reason: "Social distribution needs manual intent and platform-fit review before it is worth pushing.",
  },
  editorial: {
    tier: "yellow",
    executionMode: "manual_review",
    reason: "Editorial outreach should stay in manual review until the product has a strong, relevant reason to pitch.",
  },
};

export function getChannelSafetyPolicy(channelId: string): ChannelSafetyPolicy {
  return CHANNEL_SAFETY_POLICIES[channelId] || DEFAULT_POLICY;
}

export function isAutoExecutableChannel(channelId: string): boolean {
  return getChannelSafetyPolicy(channelId).executionMode === "auto";
}

export function requiresManualReviewChannel(channelId: string): boolean {
  return getChannelSafetyPolicy(channelId).executionMode === "manual_review";
}

export function isDisabledChannel(channelId: string): boolean {
  return getChannelSafetyPolicy(channelId).executionMode === "disabled";
}

export function getChannelLaunchGuardMessage(args: {
  locale: Locale;
  channelId: string;
  channelName: string;
}): string | null {
  const policy = getChannelSafetyPolicy(args.channelId);

  if (policy.executionMode === "auto") {
    return null;
  }

  if (args.locale === "zh") {
    if (policy.executionMode === "manual_review") {
      return `${args.channelName} 不再默认自动执行。先走人工审核，再决定要不要推进。`;
    }

    return `${args.channelName} 因平台风险过高，已经从默认自动执行里移除。`;
  }

  if (policy.executionMode === "manual_review") {
    return `${args.channelName} no longer runs by default. Send it through manual review before deciding whether it should move forward.`;
  }

  return `${args.channelName} is removed from default execution because the platform risk is too high.`;
}

import contract from "./execution-contract.json";
import {
  isAutoExecutableChannel,
  isDisabledChannel,
  requiresManualReviewChannel,
} from "./distribution-safety";

export type ChannelSupportStatus = "live" | "planned";

export interface ChannelContract {
  id: string;
  name: string;
  icon: string;
  desc: string;
  plans: string[];
  support_status: ChannelSupportStatus;
  site_config_glob: string | null;
}

export const CHANNELS = contract.channels as ChannelContract[];
export const SUBMISSION_STATUSES = contract.submission_statuses as string[];
export const LIVE_CHANNELS = CHANNELS.filter((channel) => channel.support_status === "live");
export const PLANNED_CHANNELS = CHANNELS.filter((channel) => channel.support_status !== "live");
export const LIVE_CHANNEL_COUNT = LIVE_CHANNELS.length;
export const TOTAL_CHANNEL_COUNT = CHANNELS.length;
export const DEFAULT_EXECUTION_CHANNELS = LIVE_CHANNELS.filter((channel) =>
  isAutoExecutableChannel(channel.id)
);
export const DEFAULT_EXECUTION_CHANNEL_COUNT = DEFAULT_EXECUTION_CHANNELS.length;
export const REVIEW_REQUIRED_CHANNELS = CHANNELS.filter((channel) =>
  requiresManualReviewChannel(channel.id)
);
export const BLOCKED_CHANNELS = CHANNELS.filter((channel) =>
  isDisabledChannel(channel.id)
);

export function channelById(id: string): ChannelContract | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}

export function isChannelLive(id: string): boolean {
  return channelById(id)?.support_status === "live";
}

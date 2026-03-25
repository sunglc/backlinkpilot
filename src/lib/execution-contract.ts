import contract from "./execution-contract.json";

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

export function channelById(id: string): ChannelContract | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}

export function isChannelLive(id: string): boolean {
  return channelById(id)?.support_status === "live";
}

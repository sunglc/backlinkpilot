export type ChannelReviewRequestStatus = "queued" | "approved" | "rejected";

export interface ChannelReviewRequest {
  version: 1;
  id: string;
  productId: string;
  userId: string;
  channelId: string;
  channelName: string;
  status: ChannelReviewRequestStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  decisionNote: string | null;
}

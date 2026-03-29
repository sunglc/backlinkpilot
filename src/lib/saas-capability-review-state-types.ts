export interface SaasCapabilityReviewState {
  userId: string;
  currentFingerprint: string;
  acknowledgedFingerprint: string;
  acknowledgedAt: string;
  reviewPending: boolean;
}

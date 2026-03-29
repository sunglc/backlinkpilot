export type SenderMode = "bring_your_own" | "managed";

export type ManagedInboxStatus = "idle" | "bring_your_own" | "pilot_assigned";

export type ManagedInboxEventKind =
  | "system"
  | "brief"
  | "outbound"
  | "reply"
  | "note";

export type ManagedInboxEventState =
  | "ready"
  | "queued"
  | "sent"
  | "replied"
  | "needs_followup"
  | "logged";

export interface ManagedInboxIdentity {
  label: string;
  email: string;
  domain: string;
  assignmentMode: "pilot_assigned";
  assignedAt: string;
}

export interface BringYourOwnSender {
  senderEmail: string;
  senderName: string | null;
  updatedAt: string;
}

export interface ManagedInboxOpsBrief {
  referenceId: string;
  path: string;
  relativePath: string;
  createdAt: string;
  status: "queued" | "updated";
}

export interface ManagedInboxLaunchTarget {
  id: string;
  lane: "resource_page" | "editorial_contact";
  title: string;
  domain: string;
  url: string;
  contactMethod: string;
  contactValue: string | null;
  sourceReferencePath: string | null;
  score: number;
  status: string;
  reason: string;
}

export type ManagedInboxLaunchPacketState = "prepared" | "claimed" | "sent";
export type ManagedInboxLaunchPacketReplyStatus = "none" | "awaiting" | "replied";
export type ManagedInboxLaunchPacketThreadStage =
  | "thread_open"
  | "needs_materials"
  | "commercial_review"
  | "under_review"
  | "publication_ready"
  | "published";

export interface ManagedInboxLaunchPacket {
  id: string;
  targetId: string;
  targetDomain: string;
  targetUrl: string;
  targetContactValue: string | null;
  syncedSendId: string | null;
  path: string;
  relativePath: string;
  title: string;
  subject: string;
  opening: string;
  nextStep: string;
  sourceReferencePath: string | null;
  state: ManagedInboxLaunchPacketState;
  claimedAt: string | null;
  claimedBy: string | null;
  sentAt: string | null;
  sendReceiptPath: string | null;
  replyStatus: ManagedInboxLaunchPacketReplyStatus;
  lastReplyAt: string | null;
  lastReplyFrom: string | null;
  lastReplySubject: string | null;
  lastReplySnippet: string | null;
  threadStage: ManagedInboxLaunchPacketThreadStage | null;
  threadStageReason: string | null;
}

export interface ManagedInboxLaunchRequest {
  referenceId: string;
  path: string;
  relativePath: string;
  queuePath: string;
  queueRelativePath: string;
  createdAt: string;
  status: "queued" | "updated";
  summary: string;
  shortlist: ManagedInboxLaunchTarget[];
  packets: ManagedInboxLaunchPacket[];
}

export type ManagedInboxProofTaskType =
  | "verify_result"
  | "protect_publication"
  | "send_materials"
  | "review_commercial"
  | "follow_up"
  | "push_receipts";

export type ManagedInboxProofTaskStatus = "queued" | "updated";

export interface ManagedInboxProofTask {
  id: string;
  type: ManagedInboxProofTaskType;
  status: ManagedInboxProofTaskStatus;
  createdAt: string;
  path: string;
  relativePath: string;
  summary: string;
}

export interface ManagedInboxTimelineEvent {
  id: string;
  kind: ManagedInboxEventKind;
  state: ManagedInboxEventState;
  direction: "internal" | "outbound" | "inbound";
  title: string;
  body: string;
  actor: "system" | "ops" | "customer";
  createdAt: string;
}

export interface ManagedInboxLiveActivity {
  outboundCount: number;
  replyCount: number;
  awaitingReplyCount: number;
  lastActivityAt: string | null;
  timeline: ManagedInboxTimelineEvent[];
}

export interface ManagedInboxRecord {
  version: 1;
  productId: string;
  userId: string;
  senderMode: SenderMode;
  status: ManagedInboxStatus;
  mailboxIdentity: ManagedInboxIdentity | null;
  bringYourOwn: BringYourOwnSender | null;
  opsBrief: ManagedInboxOpsBrief | null;
  launchRequest: ManagedInboxLaunchRequest | null;
  proofTasks: ManagedInboxProofTask[];
  timeline: ManagedInboxTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

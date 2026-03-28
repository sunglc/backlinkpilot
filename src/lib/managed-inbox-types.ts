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

export interface ManagedInboxLaunchRequest {
  referenceId: string;
  path: string;
  relativePath: string;
  queuePath: string;
  queueRelativePath: string;
  createdAt: string;
  status: "queued" | "updated";
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
  timeline: ManagedInboxTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

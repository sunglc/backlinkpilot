import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateManagedInboxLaunchPackets } from "@/lib/managed-inbox-launch-packets";
import { getManagedInboxLaunchShortlist } from "@/lib/managed-inbox-launch-shortlist";
import {
  getManagedInboxRelevantSendRows,
  parseLogDate,
  type ManagedInboxSendLogRow,
} from "@/lib/managed-inbox-live-activity";
import { runtimeConfig } from "@/lib/runtime-config";
import type {
  BringYourOwnSender,
  ManagedInboxEventState,
  ManagedInboxLaunchRequest,
  ManagedInboxLaunchPacket,
  ManagedInboxRecord,
  ManagedInboxTimelineEvent,
} from "@/lib/managed-inbox-types";

interface ProductSnapshot {
  id: string;
  name: string;
  url: string;
  description: string;
}

interface ActorSnapshot {
  userId: string;
  userEmail: string | null;
}

const STORAGE_DIR = path.join(
  runtimeConfig.workspaceDataRoot,
  "backlinkpilot-managed-inbox"
);
const PRODUCT_DIR = path.join(STORAGE_DIR, "products");
const BRIEF_DIR = path.join(STORAGE_DIR, "briefs");
const LAUNCH_REQUEST_DIR = path.join(STORAGE_DIR, "launch-requests");
const LAUNCH_QUEUE_DIR = path.join(STORAGE_DIR, "launch-queue");
const PRIMARY_EMAIL_CONFIG = "/root/.config/backlink_sender/email_sender.json";

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeHost(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

function sanitizeFragment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function recordPath(productId: string) {
  return path.join(PRODUCT_DIR, `${productId}.json`);
}

function briefReferenceId(productId: string) {
  return `mi-${productId.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
}

function defaultRecord(productId: string, userId: string): ManagedInboxRecord {
  const timestamp = nowIso();
  return {
    version: 1,
    productId,
    userId,
    senderMode: "bring_your_own",
    status: "idle",
    mailboxIdentity: null,
    bringYourOwn: null,
    opsBrief: null,
    launchRequest: null,
    timeline: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function ensureStorage() {
  await mkdir(PRODUCT_DIR, { recursive: true });
  await mkdir(BRIEF_DIR, { recursive: true });
  await mkdir(LAUNCH_REQUEST_DIR, { recursive: true });
  await mkdir(LAUNCH_QUEUE_DIR, { recursive: true });
}

async function readManagedInboxDomainFromConfig() {
  try {
    const content = await readFile(PRIMARY_EMAIL_CONFIG, "utf8");
    const parsed = JSON.parse(content) as { from_email?: string; username?: string };
    const email = (parsed.from_email || parsed.username || "").trim();
    const [, domain] = email.split("@");
    return domain?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

async function resolveManagedInboxDomain() {
  const configured = process.env.BACKLINKPILOT_MANAGED_INBOX_DOMAIN?.trim();
  if (configured) {
    return configured.replace(/^@/, "").toLowerCase();
  }
  return (await readManagedInboxDomainFromConfig()) || "managed.backlinkpilot.local";
}

function createTimelineEvent(
  event: Omit<ManagedInboxTimelineEvent, "id" | "createdAt">
): ManagedInboxTimelineEvent {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso(),
    ...event,
  };
}

async function writeRecord(record: ManagedInboxRecord) {
  await ensureStorage();
  await writeFile(recordPath(record.productId), JSON.stringify(record, null, 2));
}

async function readRecord(productId: string) {
  try {
    const content = await readFile(recordPath(productId), "utf8");
    return JSON.parse(content) as Partial<ManagedInboxRecord>;
  } catch {
    return null;
  }
}

function normalizeRecord(
  input: Partial<ManagedInboxRecord>,
  productId: string,
  userId: string
): ManagedInboxRecord {
  const base = defaultRecord(productId, userId);
  return {
    ...base,
    ...input,
    productId,
    userId,
    mailboxIdentity: input.mailboxIdentity || null,
    bringYourOwn: input.bringYourOwn || null,
    opsBrief: input.opsBrief || null,
    launchRequest: input.launchRequest
      ? {
          ...input.launchRequest,
          shortlist: Array.isArray(input.launchRequest.shortlist)
            ? input.launchRequest.shortlist.map((item) => ({
                ...item,
                sourceReferencePath: item.sourceReferencePath || null,
              }))
            : [],
          packets: Array.isArray(input.launchRequest.packets)
            ? input.launchRequest.packets.map((packet) => ({
                ...packet,
                targetDomain: packet.targetDomain || normalizeHost(packet.title || ""),
                targetUrl: packet.targetUrl || "",
                targetContactValue: packet.targetContactValue || null,
                sourceReferencePath: packet.sourceReferencePath || null,
                state: packet.state || "prepared",
                claimedAt: packet.claimedAt || null,
                claimedBy: packet.claimedBy || null,
                sentAt: packet.sentAt || null,
                sendReceiptPath: packet.sendReceiptPath || null,
              }))
            : [],
        }
      : null,
    timeline: Array.isArray(input.timeline) ? input.timeline : [],
    createdAt: input.createdAt || base.createdAt,
    updatedAt: input.updatedAt || base.updatedAt,
  };
}

function mergePacketProgress(
  previousPackets: ManagedInboxLaunchPacket[],
  nextPackets: ManagedInboxLaunchPacket[]
) {
  const previousByTarget = new Map(previousPackets.map((packet) => [packet.targetId, packet]));
  return nextPackets.map((packet) => {
    const previous = previousByTarget.get(packet.targetId);
    if (!previous) {
      return packet;
    }
  return {
    ...packet,
    state: previous.state,
    claimedAt: previous.claimedAt,
    claimedBy: previous.claimedBy,
    sentAt: previous.sentAt,
    sendReceiptPath: previous.sendReceiptPath,
  };
  });
}

function isSuccessfulSendResult(resultStatus: string) {
  return normalizeText(resultStatus) === "sent_pending_review";
}

function packetMatchesSendRow(
  packet: ManagedInboxLaunchPacket,
  row: ManagedInboxSendLogRow
) {
  const packetDomain = normalizeHost(packet.targetDomain || packet.targetUrl || packet.title);
  const packetUrl = normalizeText(packet.targetUrl || "");
  const packetContact = normalizeText(packet.targetContactValue || "");
  const rowPlatformUrl = normalizeText(row.platform_url || "");
  const rowPlatformHost = normalizeHost(row.platform_url || "");
  const rowRecipient = normalizeText(row.recipient_email || "");
  const rowHaystack = normalizeText(
    [
      row.platform_name,
      row.platform_url,
      row.recipient_email,
      row.subject,
      row.pack_path,
      row.eml_path,
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (packetContact && rowRecipient && packetContact === rowRecipient) {
    return true;
  }

  if (packetUrl && rowPlatformUrl && packetUrl === rowPlatformUrl) {
    return true;
  }

  if (packetDomain && rowPlatformHost && packetDomain === rowPlatformHost) {
    return true;
  }

  if (packetDomain && rowRecipient.endsWith(`@${packetDomain}`)) {
    return true;
  }

  return Boolean(packetDomain && rowHaystack.includes(packetDomain));
}

export async function reconcileManagedInboxRecordWithSendLog(args: {
  record: ManagedInboxRecord;
  product: ProductSnapshot;
}) {
  if (!args.record.launchRequest || args.record.launchRequest.packets.length === 0) {
    return args.record;
  }

  const relevantSendRows = await getManagedInboxRelevantSendRows({
    name: args.product.name,
    url: args.product.url,
  });

  if (relevantSendRows.length === 0) {
    return args.record;
  }

  const launchCreatedAt = args.record.launchRequest.createdAt;
  const eligibleSendRows = relevantSendRows.filter((row) => {
    const sentAt = parseLogDate(row.sent_at || "");
    return Boolean(sentAt && sentAt >= launchCreatedAt && isSuccessfulSendResult(row.result_status || ""));
  }).sort((left, right) => {
    const leftDate = parseLogDate(left.sent_at || "") || "";
    const rightDate = parseLogDate(right.sent_at || "") || "";
    return leftDate.localeCompare(rightDate);
  });

  if (eligibleSendRows.length === 0) {
    return args.record;
  }

  const autoTimeline: ManagedInboxTimelineEvent[] = [];
  let changed = false;
  const nextPackets = args.record.launchRequest.packets.map((packet) => {
    if (packet.state === "sent" && packet.sendReceiptPath) {
      return packet;
    }

    const matchingRow = eligibleSendRows.find((row) => packetMatchesSendRow(packet, row));
    if (!matchingRow) {
      return packet;
    }

    const sentAt = parseLogDate(matchingRow.sent_at || "") || nowIso();
    const nextPacket: ManagedInboxLaunchPacket = {
      ...packet,
      state: "sent",
      claimedAt: packet.claimedAt || sentAt,
      claimedBy: packet.claimedBy,
      sentAt: packet.sentAt || sentAt,
      sendReceiptPath:
        packet.sendReceiptPath || matchingRow.eml_path || matchingRow.pack_path || null,
      nextStep: "Monitor for replies and log any inbound movement back into BacklinkPilot.",
    };

    if (
      nextPacket.state !== packet.state ||
      nextPacket.sentAt !== packet.sentAt ||
      nextPacket.sendReceiptPath !== packet.sendReceiptPath
    ) {
      changed = true;
      autoTimeline.push(
        createTimelineEvent({
          kind: "outbound",
          state: "sent",
          direction: "outbound",
          actor: "system",
          title: `Packet synced from live send log for ${packet.title}`,
          body: `${matchingRow.subject || "No subject"}\nRecipient: ${matchingRow.recipient_email || "unknown"}\nSend ID: ${matchingRow.send_id || "unknown"}${
            nextPacket.sendReceiptPath ? `\nReceipt: ${nextPacket.sendReceiptPath}` : ""
          }`,
        })
      );
    }

    return nextPacket;
  });

  if (!changed) {
    return args.record;
  }

  const nextRecord: ManagedInboxRecord = {
    ...args.record,
    launchRequest: {
      ...args.record.launchRequest,
      packets: nextPackets,
    },
    timeline: [...autoTimeline, ...args.record.timeline].slice(0, 40),
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

function buildManagedIdentity(product: ProductSnapshot, domain: string) {
  const productSlug = sanitizeFragment(product.name || product.url || "product") || "product";
  const localPart = `bp-${productSlug}-${product.id.slice(0, 6)}`.slice(0, 48);
  return {
    label: `${product.name} managed inbox`,
    email: `${localPart}@${domain}`,
    domain,
    assignmentMode: "pilot_assigned" as const,
    assignedAt: nowIso(),
  };
}

async function writeOpsBrief(args: {
  referenceId: string;
  product: ProductSnapshot;
  actor: ActorSnapshot;
  mailboxEmail: string;
  plan: string;
  status?: "queued" | "updated";
}) {
  await ensureStorage();
  const filename = `${args.referenceId}.md`;
  const absolutePath = path.join(BRIEF_DIR, filename);
  const content = `# Managed Inbox Launch Brief

- reference_id: ${args.referenceId}
- created_at: ${nowIso()}
- plan: ${args.plan}
- customer_user_id: ${args.actor.userId}
- customer_email: ${args.actor.userEmail || "unknown"}
- product_id: ${args.product.id}
- product_name: ${args.product.name}
- product_url: ${args.product.url}
- assigned_sender_identity: ${args.mailboxEmail}

## Product snapshot

- name: ${args.product.name}
- url: ${args.product.url}
- description: ${args.product.description || "No description saved yet."}

## Ops checklist

1. Confirm the managed sender identity that should be used for this product.
2. Prepare the first outreach targets that fit the product's current launch stage.
3. Send the first live outreach batch on behalf of the customer.
4. Log outbound and reply events back into BacklinkPilot so the customer can see thread progress.

## Timeline handoff

- Use \`node scripts/log-managed-inbox-event.mjs --product-id ${args.product.id} --kind outbound --state sent --title "First outreach batch sent"\`
- Use \`node scripts/log-managed-inbox-event.mjs --product-id ${args.product.id} --kind reply --state replied --title "Publisher replied"\`
`;

  await writeFile(absolutePath, content);

  return {
    referenceId: args.referenceId,
    path: absolutePath,
    relativePath: path.relative(STORAGE_DIR, absolutePath),
    createdAt: nowIso(),
    status: args.status || ("queued" as const),
  };
}

async function writeLaunchRequest(args: {
  referenceId: string;
  product: ProductSnapshot;
  actor: ActorSnapshot;
  mailboxEmail: string;
  plan: string;
  opsBriefReferenceId: string;
  opsBriefRelativePath: string;
  liveActivity?: {
    outboundCount: number;
    replyCount: number;
    awaitingReplyCount: number;
    lastActivityAt: string | null;
  };
  shortlist: ManagedInboxLaunchRequest["shortlist"];
  packets: ManagedInboxLaunchRequest["packets"];
  previousStatus?: "queued" | "updated";
}) {
  await ensureStorage();
  const markdownPath = path.join(LAUNCH_REQUEST_DIR, `${args.referenceId}.md`);
  const queuePath = path.join(LAUNCH_QUEUE_DIR, `${args.product.id}.json`);
  const shortlistSummary = args.shortlist.length
    ? `${args.shortlist.length} current targets, led by ${args.shortlist
        .slice(0, 3)
        .map((item) => item.domain)
        .join(", ")}`
    : "no target shortlist yet";
  const packetSummary = args.packets.length
    ? `${args.packets.length} prepared outreach packets`
    : "no packets prepared yet";
  const summary = `Prepare the first deterministic managed outreach batch for ${args.product.name} using ${args.mailboxEmail}. Shortlist: ${shortlistSummary}. Packets: ${packetSummary}.`;
  const liveActivitySnapshot = {
    outboundCount: args.liveActivity?.outboundCount || 0,
    replyCount: args.liveActivity?.replyCount || 0,
    awaitingReplyCount: args.liveActivity?.awaitingReplyCount || 0,
    lastActivityAt: args.liveActivity?.lastActivityAt || null,
  };

  const markdown = `# Managed Outreach Launch Request

- reference_id: ${args.referenceId}
- created_at: ${nowIso()}
- request_status: ${args.previousStatus ? "updated" : "queued"}
- plan: ${args.plan}
- customer_user_id: ${args.actor.userId}
- customer_email: ${args.actor.userEmail || "unknown"}
- product_id: ${args.product.id}
- product_name: ${args.product.name}
- product_url: ${args.product.url}
- assigned_sender_identity: ${args.mailboxEmail}
- ops_brief_reference: ${args.opsBriefReferenceId}
- ops_brief_path: ${args.opsBriefRelativePath}

## Launch objective

Queue the first managed outreach batch for this product through the email/manual lane.

## Product snapshot

- name: ${args.product.name}
- url: ${args.product.url}
- description: ${args.product.description || "No description saved yet."}

## Live activity snapshot

- live_outbound_count: ${liveActivitySnapshot.outboundCount}
- live_reply_count: ${liveActivitySnapshot.replyCount}
- live_awaiting_reply_count: ${liveActivitySnapshot.awaitingReplyCount}
- last_live_activity_at: ${liveActivitySnapshot.lastActivityAt || "none"}

## Required next steps

1. Review the product snapshot and confirm the dedicated sender identity.
2. Start with the first-batch shortlist below and confirm the best immediate targets.
3. Prepare deterministic packs for the approved targets.
4. Send the first batch through \`operations/backlinks/scripts/send_email_submission.py\`.
5. Monitor replies and write activity back into BacklinkPilot.

## First-batch shortlist

${args.shortlist.length > 0
    ? args.shortlist
        .map(
          (item, index) =>
            `${index + 1}. [${item.lane}] ${item.domain} - ${item.title}\n   - contact: ${item.contactMethod}${item.contactValue ? ` (${item.contactValue})` : ""}\n   - score: ${item.score}\n   - reason: ${item.reason}`
        )
        .join("\n")
    : "- No deterministic shortlist was available yet. Ops should build the first batch manually from the current queue landscape."}

## Prepared outreach packets

${args.packets.length > 0
    ? args.packets
        .map(
          (packet, index) =>
            `${index + 1}. ${packet.title}\n   - subject: ${packet.subject}\n   - opening: ${packet.opening}\n   - packet_path: ${packet.relativePath}`
        )
        .join("\n")
    : "- No prepared packets yet."}

## Workflow references

- queue builder: \`operations/backlinks/scripts/build_email_submission_queue.py\`
- send entrypoint: \`operations/backlinks/scripts/send_email_submission.py\`
- reply monitor: \`operations/backlinks/scripts/monitor_email_replies.py\`
- workflow: \`operations/backlinks/runbooks/email-submission-workflow.md\`
`;

  const queuePayload = {
    type: "managed_outreach_launch",
    referenceId: args.referenceId,
    status: args.previousStatus || "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    product: {
      id: args.product.id,
      name: args.product.name,
      url: args.product.url,
      description: args.product.description,
    },
    customer: {
      userId: args.actor.userId,
      userEmail: args.actor.userEmail,
    },
    senderIdentity: args.mailboxEmail,
    plan: args.plan,
    objective: "first_managed_outreach_batch",
    opsBrief: {
      referenceId: args.opsBriefReferenceId,
      relativePath: args.opsBriefRelativePath,
    },
    liveActivity: liveActivitySnapshot,
    shortlist: args.shortlist,
    packets: args.packets,
    nextStep:
      "Ops should prepare the first deterministic email/manual outreach batch and write send/reply activity back into BacklinkPilot.",
  };

  await writeFile(markdownPath, markdown);
  await writeFile(queuePath, JSON.stringify(queuePayload, null, 2));

  return {
    referenceId: args.referenceId,
    path: markdownPath,
    relativePath: path.relative(STORAGE_DIR, markdownPath),
    queuePath,
    queueRelativePath: path.relative(STORAGE_DIR, queuePath),
    createdAt: nowIso(),
    status: args.previousStatus || ("queued" as const),
    summary,
    shortlist: args.shortlist,
    packets: args.packets,
  } satisfies ManagedInboxLaunchRequest;
}

export async function getManagedInboxRecord(args: {
  productId: string;
  userId: string;
}) {
  const record = await readRecord(args.productId);
  if (record && record.userId === args.userId) {
    return normalizeRecord(record, args.productId, args.userId);
  }
  return defaultRecord(args.productId, args.userId);
}

export async function configureBringYourOwnSender(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  senderEmail: string;
  senderName?: string | null;
}) {
  const record = await getManagedInboxRecord({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const sender: BringYourOwnSender = {
    senderEmail: args.senderEmail.trim(),
    senderName: args.senderName?.trim() || null,
    updatedAt: nowIso(),
  };

  const timeline = [
    createTimelineEvent({
      kind: "system",
      state: "ready",
      direction: "internal",
      actor: "customer",
      title: "Bring-your-own sender saved",
      body: `The customer will use ${sender.senderEmail} as the sender identity for this product.`,
    }),
    ...record.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...record,
    senderMode: "bring_your_own",
    status: "bring_your_own",
    bringYourOwn: sender,
    timeline,
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

export async function activateManagedInbox(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  plan: string;
}) {
  const record = await getManagedInboxRecord({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const domain = await resolveManagedInboxDomain();
  const identity = record.mailboxIdentity || buildManagedIdentity(args.product, domain);
  const referenceId = briefReferenceId(args.product.id);
  const opsBrief = await writeOpsBrief({
    referenceId,
    product: args.product,
    actor: args.actor,
    mailboxEmail: identity.email,
    plan: args.plan,
    status: record.opsBrief ? "updated" : "queued",
  });

  const timeline = [
    createTimelineEvent({
      kind: "brief",
      state: "queued",
      direction: "internal",
      actor: "system",
      title: "Managed inbox brief queued for ops",
      body: `Ops brief ${opsBrief.referenceId} is ready. The first managed outreach batch can now be prepared for ${args.product.name}.`,
    }),
    createTimelineEvent({
      kind: "system",
      state: "ready",
      direction: "internal",
      actor: "system",
      title: "Dedicated sender identity assigned",
      body: `${identity.email} is now reserved as the pilot managed sender identity for this product.`,
    }),
    ...record.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...record,
    senderMode: "managed",
    status: "pilot_assigned",
    mailboxIdentity: identity,
    opsBrief,
    launchRequest: record.launchRequest || null,
    timeline,
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

export async function queueManagedOutreachBatch(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  plan: string;
  liveActivity?: {
    outboundCount: number;
    replyCount: number;
    awaitingReplyCount: number;
    lastActivityAt: string | null;
  };
}) {
  const record = await getManagedInboxRecord({
    productId: args.product.id,
    userId: args.actor.userId,
  });

  if (record.senderMode !== "managed" || !record.mailboxIdentity) {
    throw new Error("Activate the managed inbox before launching the first batch.");
  }

  const opsBriefReferenceId = record.opsBrief?.referenceId || briefReferenceId(args.product.id);
  const opsBrief = await writeOpsBrief({
    referenceId: opsBriefReferenceId,
    product: args.product,
    actor: args.actor,
    mailboxEmail: record.mailboxIdentity.email,
    plan: args.plan,
    status: record.opsBrief ? "updated" : "queued",
  });
  const shortlist = await getManagedInboxLaunchShortlist({
    name: args.product.name,
    url: args.product.url,
    description: args.product.description,
  });
  const launchReferenceId = `ml-${args.product.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
  const packets = await generateManagedInboxLaunchPackets({
    launchReferenceId,
    product: args.product,
    senderEmail: record.mailboxIdentity.email,
    shortlist,
  });
  const packetsWithProgress = mergePacketProgress(
    record.launchRequest?.packets || [],
    packets
  );

  const launchRequest = await writeLaunchRequest({
    referenceId: launchReferenceId,
    product: args.product,
    actor: args.actor,
    mailboxEmail: record.mailboxIdentity.email,
    plan: args.plan,
    opsBriefReferenceId: opsBrief.referenceId,
    opsBriefRelativePath: opsBrief.relativePath,
    liveActivity: args.liveActivity,
    shortlist,
    packets: packetsWithProgress,
    previousStatus: record.launchRequest ? "updated" : "queued",
  });

  const timeline = [
    createTimelineEvent({
      kind: "brief",
      state: "queued",
      direction: "internal",
      actor: "customer",
      title: record.launchRequest
        ? "Managed outreach request refreshed"
        : "First managed outreach batch queued",
      body: `${launchRequest.summary}\nReference: ${launchRequest.referenceId}\nQueue: ${launchRequest.queueRelativePath}`,
    }),
    ...record.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...record,
    opsBrief,
    launchRequest,
    timeline,
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

export async function updateManagedLaunchPacket(args: {
  productId: string;
  packetId: string;
  action: "claim" | "mark_sent";
  actor: string;
  note?: string | null;
  receiptPath?: string | null;
}) {
  const record = await readRecord(args.productId);
  if (!record) {
    throw new Error("Managed inbox record not found");
  }
  const normalizedRecord = normalizeRecord(
    record,
    record.productId || args.productId,
    record.userId || ""
  );
  const launchRequest = normalizedRecord.launchRequest;
  if (!launchRequest) {
    throw new Error("Managed launch request not found");
  }

  let targetTitle = "";
  let targetSubject = "";
  const nextPackets = launchRequest.packets.map((packet) => {
    if (packet.id !== args.packetId) {
      return packet;
    }

    targetTitle = packet.title;
    targetSubject = packet.subject;
    if (args.action === "claim") {
      return {
        ...packet,
        state: "claimed" as const,
        claimedAt: new Date().toISOString(),
        claimedBy: args.actor,
        nextStep: "Finish the send from the dedicated managed sender identity and then mark the packet as sent.",
      };
    }

    return {
      ...packet,
      state: "sent" as const,
      claimedAt: packet.claimedAt || new Date().toISOString(),
      claimedBy: packet.claimedBy || args.actor,
      sentAt: new Date().toISOString(),
      sendReceiptPath: args.receiptPath?.trim() || packet.sendReceiptPath || null,
      nextStep: "Monitor for replies and log any inbound movement back into BacklinkPilot.",
    };
  });

  if (!targetTitle) {
    throw new Error("Managed launch packet not found");
  }

  const timeline = [
    createTimelineEvent({
      kind: args.action === "mark_sent" ? "outbound" : "note",
      state: args.action === "mark_sent" ? "sent" : "logged",
      direction: args.action === "mark_sent" ? "outbound" : "internal",
      actor: "ops",
      title:
        args.action === "mark_sent"
          ? `Packet sent for ${targetTitle}`
          : `Packet claimed for ${targetTitle}`,
      body:
        args.action === "mark_sent"
          ? `${targetSubject}\nActor: ${args.actor}${args.receiptPath ? `\nReceipt: ${args.receiptPath}` : ""}${args.note ? `\nNote: ${args.note}` : ""}`
          : `${targetSubject}\nActor: ${args.actor}${args.note ? `\nNote: ${args.note}` : ""}`,
    }),
    ...normalizedRecord.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...normalizedRecord,
    launchRequest: {
      ...launchRequest,
      packets: nextPackets,
    },
    timeline,
    updatedAt: new Date().toISOString(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

export async function appendManagedInboxTimelineEvent(args: {
  productId: string;
  kind: ManagedInboxTimelineEvent["kind"];
  state: ManagedInboxEventState;
  direction: ManagedInboxTimelineEvent["direction"];
  title: string;
  body: string;
  actor?: ManagedInboxTimelineEvent["actor"];
}) {
  const record = await readRecord(args.productId);
  if (!record) {
    throw new Error("Managed inbox record not found");
  }
  const normalizedRecord = normalizeRecord(record, record.productId || args.productId, record.userId || "");

  const timeline = [
    createTimelineEvent({
      kind: args.kind,
      state: args.state,
      direction: args.direction,
      title: args.title.trim(),
      body: args.body.trim(),
      actor: args.actor || "ops",
    }),
    ...normalizedRecord.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...normalizedRecord,
    timeline,
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

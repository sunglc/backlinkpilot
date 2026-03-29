import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateManagedInboxLaunchPackets } from "@/lib/managed-inbox-launch-packets";
import { getManagedInboxLaunchShortlist } from "@/lib/managed-inbox-launch-shortlist";
import {
  getManagedInboxReplyRows,
  getManagedInboxRelevantSendRows,
  parseLogDate,
  type ManagedInboxReplyLogRow,
  type ManagedInboxSendLogRow,
} from "@/lib/managed-inbox-live-activity";
import { runtimeConfig } from "@/lib/runtime-config";
import type {
  BringYourOwnSender,
  ManagedInboxEventState,
  ManagedInboxProofTask,
  ManagedInboxProofTaskStatus,
  ManagedInboxProofTaskType,
  ManagedInboxLaunchRequest,
  ManagedInboxLaunchPacket,
  ManagedInboxLaunchPacketThreadStage,
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
const PROOF_TASK_DIR = path.join(STORAGE_DIR, "proof-tasks");
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

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function classifyReplyThread(args: {
  subject: string;
  snippet: string;
}): {
  stage: ManagedInboxLaunchPacketThreadStage;
  reason: string;
  nextStep: string;
} {
  const haystack = normalizeText(`${args.subject}\n${args.snippet}`);

  if (
    includesAny(haystack, [
      "went live",
      "is live",
      "now live",
      "already live",
      "published",
      "has been published",
      "featured you",
      "added your tool",
      "we added",
      "you are listed",
      "listing is live",
    ])
  ) {
    return {
      stage: "published",
      reason: "The reply sounds like the placement is already live or published.",
      nextStep:
        "Verify the live placement, capture proof, and move this thread into the proof/result layer.",
    };
  }

  if (
    includesAny(haystack, [
      "will add",
      "can add",
      "happy to include",
      "happy to add",
      "approved",
      "scheduled",
      "queued for publication",
      "going live",
      "plan to publish",
      "should be live soon",
      "we can feature",
    ])
  ) {
    return {
      stage: "publication_ready",
      reason: "The reply indicates the target is leaning toward inclusion or publication.",
      nextStep:
        "Confirm the final details, keep the thread warm, and watch for the placement to go live.",
    };
  }

  if (
    includesAny(haystack, [
      "sponsored",
      "sponsorship",
      "paid placement",
      "rate card",
      "pricing",
      "price",
      "cost",
      "budget",
      "payment",
      "invoice",
      "fee",
    ])
  ) {
    return {
      stage: "commercial_review",
      reason: "The reply is asking about payment, sponsorship, or commercial terms.",
      nextStep:
        "Decide whether this opportunity is worth paying for and respond with clear commercial boundaries.",
    };
  }

  if (
    includesAny(haystack, [
      "send over",
      "please send",
      "could you send",
      "can you send",
      "need a logo",
      "need logo",
      "screenshot",
      "screenshots",
      "more details",
      "more info",
      "more information",
      "description",
      "one-liner",
      "bio",
      "assets",
      "media kit",
      "category",
      "blurb",
    ])
  ) {
    return {
      stage: "needs_materials",
      reason: "The reply is asking for assets, copy, or structured product details.",
      nextStep:
        "Prepare the requested materials fast so the thread keeps moving toward inclusion.",
    };
  }

  if (
    includesAny(haystack, [
      "review",
      "take a look",
      "take a closer look",
      "editorial team",
      "consider",
      "queue",
      "queued",
      "pass this along",
      "circle back",
      "follow up",
      "will discuss",
      "team will check",
    ])
  ) {
    return {
      stage: "under_review",
      reason: "The reply suggests the opportunity is in review rather than blocked or closed.",
      nextStep:
        "Keep the thread warm, set a follow-up reminder, and wait for the editor to come back with a decision.",
    };
  }

  return {
    stage: "thread_open",
    reason: "A real reply arrived, but it does not yet fit a stronger execution bucket.",
    nextStep:
      "Read the thread, respond clearly, and steer it toward assets, approval, or publication.",
  };
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
    proofTasks: [],
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
  await mkdir(PROOF_TASK_DIR, { recursive: true });
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
                syncedSendId: packet.syncedSendId || null,
                sourceReferencePath: packet.sourceReferencePath || null,
                state: packet.state || "prepared",
                claimedAt: packet.claimedAt || null,
                claimedBy: packet.claimedBy || null,
                sentAt: packet.sentAt || null,
                sendReceiptPath: packet.sendReceiptPath || null,
                replyStatus: packet.replyStatus || "none",
                lastReplyAt: packet.lastReplyAt || null,
                lastReplyFrom: packet.lastReplyFrom || null,
                lastReplySubject: packet.lastReplySubject || null,
                lastReplySnippet: packet.lastReplySnippet || null,
                threadStage: packet.threadStage || null,
                threadStageReason: packet.threadStageReason || null,
              }))
            : [],
        }
      : null,
    proofTasks: Array.isArray(input.proofTasks)
      ? input.proofTasks.map((task) => ({
          ...task,
          status: normalizeProofTaskStatus(task.status),
          updatedAt: task.updatedAt || task.createdAt || base.updatedAt,
          completedAt: task.completedAt || null,
          note: task.note || null,
        }))
      : [],
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
      syncedSendId: previous.syncedSendId,
      replyStatus: previous.replyStatus,
      lastReplyAt: previous.lastReplyAt,
      lastReplyFrom: previous.lastReplyFrom,
      lastReplySubject: previous.lastReplySubject,
      lastReplySnippet: previous.lastReplySnippet,
      threadStage: previous.threadStage,
      threadStageReason: previous.threadStageReason,
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

function packetReplyRows(
  packet: ManagedInboxLaunchPacket,
  replyRows: ManagedInboxReplyLogRow[]
) {
  if (!packet.syncedSendId) {
    return [] as ManagedInboxReplyLogRow[];
  }

  return replyRows
    .filter((row) => normalizeText(row.send_id || "") === normalizeText(packet.syncedSendId || ""))
    .sort((left, right) => {
      const leftDate = parseLogDate(left.reply_date || left.check_date || "") || "";
      const rightDate = parseLogDate(right.reply_date || right.check_date || "") || "";
      return rightDate.localeCompare(leftDate);
    });
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

  const launchCreatedAt = args.record.launchRequest.createdAt;
  const eligibleSendRows = relevantSendRows.filter((row) => {
    const sentAt = parseLogDate(row.sent_at || "");
    return Boolean(sentAt && sentAt >= launchCreatedAt && isSuccessfulSendResult(row.result_status || ""));
  }).sort((left, right) => {
    const leftDate = parseLogDate(left.sent_at || "") || "";
    const rightDate = parseLogDate(right.sent_at || "") || "";
    return leftDate.localeCompare(rightDate);
  });

  const autoTimeline: ManagedInboxTimelineEvent[] = [];
  let changed = false;
  const sentSyncedPackets = args.record.launchRequest.packets.map((packet) => {
    if (eligibleSendRows.length === 0) {
      return packet;
    }
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
      syncedSendId: packet.syncedSendId || matchingRow.send_id || null,
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

  const replyRows = await getManagedInboxReplyRows();
  const nextPackets = sentSyncedPackets.map((packet) => {
    const matchingReplyRows = packetReplyRows(packet, replyRows);
    if (matchingReplyRows.length === 0) {
      if (packet.state === "sent" && packet.replyStatus === "none") {
        const awaitingPacket = {
          ...packet,
          replyStatus: "awaiting" as const,
          threadStage: null,
          threadStageReason: null,
        };
        changed = true;
        return awaitingPacket;
      }
      return packet;
    }

    const latestReplyRow = matchingReplyRows[0];
    const normalizedOutcome = normalizeText(latestReplyRow.outcome || "");
    if (normalizedOutcome === "reply_received") {
      const replyAt =
        parseLogDate(latestReplyRow.reply_date || latestReplyRow.check_date || "") || nowIso();
      const threadSummary = classifyReplyThread({
        subject: latestReplyRow.reply_subject || "",
        snippet: latestReplyRow.reply_snippet || "",
      });
      const repliedPacket: ManagedInboxLaunchPacket = {
        ...packet,
        replyStatus: "replied",
        lastReplyAt: replyAt,
        lastReplyFrom: latestReplyRow.reply_from || null,
        lastReplySubject: latestReplyRow.reply_subject || null,
        lastReplySnippet: latestReplyRow.reply_snippet || null,
        threadStage: threadSummary.stage,
        threadStageReason: threadSummary.reason,
        nextStep: threadSummary.nextStep,
      };

      if (
        repliedPacket.replyStatus !== packet.replyStatus ||
        repliedPacket.lastReplyAt !== packet.lastReplyAt ||
        repliedPacket.lastReplySnippet !== packet.lastReplySnippet ||
        repliedPacket.threadStage !== packet.threadStage
      ) {
        changed = true;
        autoTimeline.push(
          createTimelineEvent({
            kind: "reply",
            state: "replied",
            direction: "inbound",
          actor: "system",
          title: `Reply synced from live monitor for ${packet.title}`,
          body: `${latestReplyRow.reply_subject || "No subject"}\nFrom: ${
              latestReplyRow.reply_from || "unknown"
            }\nStage: ${threadSummary.stage}\n${latestReplyRow.reply_snippet || "Reply received and synced from the monitor."}`,
          })
        );
      }

      return repliedPacket;
    }

    if (normalizedOutcome === "no_reply_yet" && packet.replyStatus === "none") {
      changed = true;
      return {
        ...packet,
        replyStatus: "awaiting" as const,
        threadStage: null,
        threadStageReason: null,
      };
    }

    return packet;
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

function proofTaskCopy(taskType: ManagedInboxProofTaskType) {
  const copy = {
    verify_result: {
      title: "Verify the likely-live result",
      summary:
        "Check whether the strongest likely-live placement is now publicly visible, capture proof, and move it into the result layer.",
    },
    protect_publication: {
      title: "Protect the publication-ready thread",
      summary:
        "Keep the publication-ready thread moving, confirm final details, and prevent the opportunity from stalling before launch.",
    },
    send_materials: {
      title: "Send the missing materials",
      summary:
        "Package the requested assets, screenshots, and product copy so the reply thread can keep moving toward inclusion.",
    },
    review_commercial: {
      title: "Review the commercial terms",
      summary:
        "Evaluate whether the commercial thread is worth paying for, then either advance it cleanly or drop it fast.",
    },
    follow_up: {
      title: "Follow up on the active thread",
      summary:
        "Keep the under-review thread warm with a clear follow-up so the opportunity does not go cold.",
    },
    push_receipts: {
      title: "Push receipts toward public proof",
      summary:
        "Take the strongest submission receipts and push them toward something publicly verifiable instead of leaving them as internal success logs.",
    },
  } as const;

  return copy[taskType];
}

function normalizeProofTaskStatus(
  status: string | null | undefined
): ManagedInboxProofTaskStatus {
  if (
    status === "queued" ||
    status === "in_progress" ||
    status === "proved" ||
    status === "dropped"
  ) {
    return status;
  }

  return "queued";
}

function isOpenProofTask(task: ManagedInboxProofTask) {
  return task.status === "queued" || task.status === "in_progress";
}

async function writeProofTaskPayload(args: {
  task: ManagedInboxProofTask;
  product: ProductSnapshot;
  actor: ActorSnapshot;
  senderIdentity: string | null;
  launchReferenceId: string | null;
  candidateThreads: Array<{
    title: string;
    threadStage: ManagedInboxLaunchPacket["threadStage"];
    nextStep: string;
    lastReplyAt: string | null;
  }>;
}) {
  const payload = {
    type: "managed_proof_task",
    taskId: args.task.id,
    taskType: args.task.type,
    status: args.task.status,
    createdAt: args.task.createdAt,
    updatedAt: args.task.updatedAt,
    completedAt: args.task.completedAt,
    product: {
      id: args.product.id,
      name: args.product.name,
      url: args.product.url,
      description: args.product.description,
    },
    actor: {
      userId: args.actor.userId,
      userEmail: args.actor.userEmail,
    },
    senderIdentity: args.senderIdentity,
    summary: args.task.summary,
    note: args.task.note,
    candidateThreads: args.candidateThreads,
    launchReferenceId: args.launchReferenceId,
    nextStep:
      args.task.status === "proved"
        ? "Capture the public proof cleanly and keep it visible inside BacklinkPilot."
        : args.task.status === "dropped"
          ? "The current proof path was dropped. Re-open only if a stronger signal appears."
          : "Ops should pick up this proof task, move the strongest candidate forward, and log the result back into BacklinkPilot.",
  };

  await ensureStorage();
  await writeFile(args.task.path, JSON.stringify(payload, null, 2));
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

export async function queueManagedProofTask(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  taskType: ManagedInboxProofTaskType;
}) {
  const record = await getManagedInboxRecord({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const existingOpenTask = record.proofTasks.find(
    (task) => task.type === args.taskType && isOpenProofTask(task)
  );
  if (existingOpenTask) {
    return record;
  }
  const taskId = `pt-${args.product.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
  const filename = `${taskId}.json`;
  const absolutePath = path.join(PROOF_TASK_DIR, filename);
  const copy = proofTaskCopy(args.taskType);
  const createdAt = nowIso();
  const latestPackets = record.launchRequest?.packets || [];
  const candidateThreads = latestPackets
    .filter((packet) => packet.replyStatus === "replied")
    .slice()
    .sort((left, right) => {
      const leftDate = left.lastReplyAt || left.sentAt || "";
      const rightDate = right.lastReplyAt || right.sentAt || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 3)
    .map((packet) => ({
      title: packet.title,
      threadStage: packet.threadStage,
      nextStep: packet.nextStep,
      lastReplyAt: packet.lastReplyAt,
    }));
  const task: ManagedInboxProofTask = {
    id: taskId,
    type: args.taskType,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    path: absolutePath,
    relativePath: path.relative(STORAGE_DIR, absolutePath),
    summary: copy.summary,
    note: null,
  };

  await writeProofTaskPayload({
    task,
    product: args.product,
    actor: args.actor,
    senderIdentity: record.mailboxIdentity?.email || null,
    launchReferenceId: record.launchRequest?.referenceId || null,
    candidateThreads,
  });

  const timeline = [
    createTimelineEvent({
      kind: "note",
      state: "queued",
      direction: "internal",
      actor: "customer",
      title: `${copy.title} queued`,
      body: `${copy.summary}\nReference: ${task.id}\nTask: ${task.relativePath}`,
    }),
    ...record.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...record,
    proofTasks: [task, ...record.proofTasks].slice(0, 12),
    timeline,
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

export async function updateManagedProofTask(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  taskId: string;
  taskAction: "start" | "prove" | "drop";
}) {
  const record = await getManagedInboxRecord({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const targetTask = record.proofTasks.find((task) => task.id === args.taskId);

  if (!targetTask) {
    throw new Error("Proof task not found.");
  }

  const timestamp = nowIso();
  const nextStatus: ManagedInboxProofTaskStatus =
    args.taskAction === "start"
      ? "in_progress"
      : args.taskAction === "prove"
        ? "proved"
        : "dropped";
  const nextNote =
    args.taskAction === "start"
      ? "The proof path is actively being worked now."
      : args.taskAction === "prove"
        ? "The proof path was confirmed and moved into the result layer."
        : "The current proof path was dropped because the signal was not strong enough.";
  const candidateThreads = (record.launchRequest?.packets || [])
    .filter((packet) => packet.replyStatus === "replied")
    .slice()
    .sort((left, right) => {
      const leftDate = left.lastReplyAt || left.sentAt || "";
      const rightDate = right.lastReplyAt || right.sentAt || "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 3)
    .map((packet) => ({
      title: packet.title,
      threadStage: packet.threadStage,
      nextStep: packet.nextStep,
      lastReplyAt: packet.lastReplyAt,
    }));
  const nextProofTasks = record.proofTasks
    .map((task) =>
      task.id === args.taskId
        ? {
            ...task,
            status: nextStatus,
            updatedAt: timestamp,
            completedAt:
              nextStatus === "proved" || nextStatus === "dropped" ? timestamp : null,
            note: nextNote,
          }
        : task
    )
    .sort((left, right) => {
      const leftDate = left.updatedAt || left.createdAt;
      const rightDate = right.updatedAt || right.createdAt;
      return rightDate.localeCompare(leftDate);
    });
  const nextTask = nextProofTasks.find((task) => task.id === args.taskId);

  if (!nextTask) {
    throw new Error("Proof task not found.");
  }

  await writeProofTaskPayload({
    task: nextTask,
    product: args.product,
    actor: args.actor,
    senderIdentity: record.mailboxIdentity?.email || null,
    launchReferenceId: record.launchRequest?.referenceId || null,
    candidateThreads,
  });

  const actionTitle =
    args.taskAction === "start"
      ? "Proof task moved into progress"
      : args.taskAction === "prove"
        ? "Proof task marked as proved"
        : "Proof task dropped";
  const timeline = [
    createTimelineEvent({
      kind: "note",
      state: "logged",
      direction: "internal",
      actor: "ops",
      title: `${actionTitle}: ${proofTaskCopy(targetTask.type).title}`,
      body: `${nextTask.summary}\nReference: ${nextTask.id}\nTask: ${nextTask.relativePath}`,
    }),
    ...record.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...record,
    proofTasks: nextProofTasks,
    timeline,
    updatedAt: timestamp,
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
      replyStatus:
        packet.replyStatus === "replied"
          ? ("replied" as const)
          : ("awaiting" as const),
      lastReplyAt: packet.replyStatus === "replied" ? packet.lastReplyAt : null,
      lastReplyFrom: packet.replyStatus === "replied" ? packet.lastReplyFrom : null,
      lastReplySubject: packet.replyStatus === "replied" ? packet.lastReplySubject : null,
      lastReplySnippet: packet.replyStatus === "replied" ? packet.lastReplySnippet : null,
      threadStage: packet.replyStatus === "replied" ? packet.threadStage : null,
      threadStageReason: packet.replyStatus === "replied" ? packet.threadStageReason : null,
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

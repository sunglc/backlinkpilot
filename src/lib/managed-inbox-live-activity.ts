import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ManagedInboxLiveActivity,
  ManagedInboxTimelineEvent,
} from "@/lib/managed-inbox-types";
import { runtimeConfig } from "@/lib/runtime-config";

interface ProductSnapshot {
  name: string;
  url: string;
}

type CsvRow = Record<string, string>;
export type ManagedInboxSendLogRow = CsvRow;

const RECORDS_ROOT = path.join(
  runtimeConfig.workspaceDataRoot,
  "operations/backlinks/records"
);
const EMAIL_SEND_LOG_PATH = path.join(RECORDS_ROOT, "email-submission-log.csv");
const EMAIL_REPLY_LOG_PATH = path.join(RECORDS_ROOT, "email-reply-monitor-log.csv");

function emptyActivity(): ManagedInboxLiveActivity {
  return {
    outboundCount: 0,
    replyCount: 0,
    awaitingReplyCount: 0,
    lastActivityAt: null,
    timeline: [],
  };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const [header, ...dataRows] = rows;
  return dataRows.map((values) =>
    Object.fromEntries(
      header.map((key, columnIndex) => [key, values[columnIndex] || ""])
    )
  );
}

async function readCsvRows(csvPath: string) {
  try {
    const content = await readFile(csvPath, "utf8");
    return parseCsv(content);
  } catch {
    return [] as CsvRow[];
  }
}

async function readSmallText(absolutePath: string) {
  try {
    return await readFile(absolutePath, "utf8");
  } catch {
    return "";
  }
}

export function parseLogDate(value: string) {
  const normalized = value.trim().replace(" ", "T");
  if (!normalized) {
    return null;
  }
  const candidate = normalized.endsWith("Z") ? normalized : `${normalized}Z`;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function resultState(resultStatus: string): ManagedInboxTimelineEvent["state"] {
  const normalized = normalizeText(resultStatus);
  if (normalized === "sent_pending_review") {
    return "sent";
  }
  if (normalized === "prepared" || normalized === "dry_run") {
    return "queued";
  }
  if (normalized.startsWith("failed")) {
    return "needs_followup";
  }
  return "logged";
}

function includesProductSignal(content: string, product: ProductSnapshot) {
  const haystack = normalizeText(content);
  const productName = normalizeText(product.name);
  const productUrl = normalizeText(product.url);
  const productHost = normalizeText(
    product.url.replace(/^https?:\/\//i, "").split("/")[0] || ""
  );

  return (
    (productName && haystack.includes(productName)) ||
    (productUrl && haystack.includes(productUrl)) ||
    (productHost && haystack.includes(productHost))
  );
}

async function isRelevantSendRow(row: CsvRow, product: ProductSnapshot) {
  const immediateSignals = [
    row.subject,
    row.platform_url,
    row.platform_name,
    row.recipient_email,
    row.sender_email,
    row.notes,
  ]
    .filter(Boolean)
    .join("\n");

  if (includesProductSignal(immediateSignals, product)) {
    return true;
  }

  const [packText, emlText] = await Promise.all([
    row.pack_path ? readSmallText(row.pack_path) : Promise.resolve(""),
    row.eml_path ? readSmallText(row.eml_path) : Promise.resolve(""),
  ]);

  return includesProductSignal(`${packText}\n${emlText}`, product);
}

export async function getManagedInboxRelevantSendRows(product: ProductSnapshot) {
  const sendRows = await readCsvRows(EMAIL_SEND_LOG_PATH);
  if (sendRows.length === 0) {
    return [] as ManagedInboxSendLogRow[];
  }

  const matchingPairs = await Promise.all(
    sendRows.map(async (row) => ({
      row,
      matches: await isRelevantSendRow(row, product),
    }))
  );

  return matchingPairs
    .filter((item) => item.matches)
    .map((item) => item.row)
    .sort((left, right) => {
      const leftDate = parseLogDate(left.sent_at || "") || "";
      const rightDate = parseLogDate(right.sent_at || "") || "";
      return rightDate.localeCompare(leftDate);
    });
}

function buildOutboundEvent(row: CsvRow): ManagedInboxTimelineEvent {
  const platform = row.platform_name || row.recipient_email || "unknown target";
  const result = row.result_status || "logged";
  return {
    id: row.send_id || `${row.sent_at}-${platform}`,
    kind: "outbound",
    state: resultState(result),
    direction: "outbound",
    actor: "ops",
    title: `Sent outreach to ${platform}`,
    body: `${row.subject || "No subject"}\nRecipient: ${row.recipient_email || "unknown"}\nSender: ${row.sender_email || "unknown"}\nStatus: ${result}`,
    createdAt: parseLogDate(row.sent_at) || new Date(0).toISOString(),
  };
}

function buildReplyEvent(row: CsvRow): ManagedInboxTimelineEvent | null {
  const outcome = normalizeText(row.outcome);
  if (outcome !== "reply_received") {
    return null;
  }

  return {
    id: row.reply_message_id || row.check_id || `${row.reply_date}-${row.platform_name}`,
    kind: "reply",
    state: "replied",
    direction: "inbound",
    actor: "ops",
    title: `Reply received from ${row.platform_name || row.reply_from || "target"}`,
    body: `${row.reply_subject || "No subject"}\n${row.reply_snippet || "Reply received and logged in the monitor."}`,
    createdAt:
      parseLogDate(row.reply_date || row.check_date) || new Date(0).toISOString(),
  };
}

export async function getManagedInboxLiveActivity(product: ProductSnapshot) {
  const [matchingSendRows, replyRows] = await Promise.all([
    getManagedInboxRelevantSendRows(product),
    readCsvRows(EMAIL_REPLY_LOG_PATH),
  ]);

  if (matchingSendRows.length === 0) {
    return emptyActivity();
  }

  const matchingSendIds = new Set(
    matchingSendRows.map((row) => row.send_id).filter(Boolean)
  );
  const matchingReplyRows = replyRows.filter(
    (row) => row.send_id && matchingSendIds.has(row.send_id)
  );

  const outboundTimeline = matchingSendRows.map(buildOutboundEvent);
  const replyTimeline = matchingReplyRows
    .map(buildReplyEvent)
    .filter((event): event is ManagedInboxTimelineEvent => Boolean(event));
  const combinedTimeline = [...outboundTimeline, ...replyTimeline]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 12);

  const awaitingReplyCount = matchingReplyRows.filter(
    (row) => normalizeText(row.outcome) === "no_reply_yet"
  ).length;

  return {
    outboundCount: outboundTimeline.length,
    replyCount: replyTimeline.length,
    awaitingReplyCount,
    lastActivityAt: combinedTimeline[0]?.createdAt || null,
    timeline: combinedTimeline,
  } satisfies ManagedInboxLiveActivity;
}

import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ManagedInboxLaunchTarget } from "@/lib/managed-inbox-types";
import { runtimeConfig } from "@/lib/runtime-config";

interface ProductSnapshot {
  name: string;
  url: string;
  description: string;
}

type CsvRow = Record<string, string>;

const QUEUE_ROOT = path.join(
  runtimeConfig.workspaceDataRoot,
  "operations/backlinks/queue"
);
const RESOURCE_QUEUE_PATH = path.join(QUEUE_ROOT, "resource-page-outreach-queue.csv");
const EDITORIAL_QUEUE_PATH = path.join(QUEUE_ROOT, "editorial-contact-queue.csv");

const STOP_WORDS = new Set([
  "about",
  "after",
  "among",
  "app",
  "apps",
  "best",
  "build",
  "for",
  "from",
  "home",
  "into",
  "page",
  "site",
  "that",
  "them",
  "this",
  "tool",
  "tools",
  "with",
  "your",
  "www",
]);

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

function toInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeHost(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

function productTokens(product: ProductSnapshot) {
  const urlBits = normalizeHost(product.url)
    .split(".")
    .filter(Boolean)
    .join(" ");
  const text = `${product.name} ${product.description} ${urlBits}`.toLowerCase();
  return Array.from(
    new Set(
      text
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 4 &&
            !STOP_WORDS.has(token) &&
            !/^\d+$/.test(token)
        )
    )
  );
}

function overlapScore(tokens: string[], haystack: string) {
  const normalized = haystack.toLowerCase();
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

function contactMethodLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "email_direct") return "Direct email";
  if (normalized === "contact_form") return "Contact form";
  if (normalized === "email_via_site") return "Site-routed email";
  if (normalized === "external_submit_surface") return "External submit surface";
  if (normalized === "contact_surface") return "Contact surface";
  return value || "Manual review";
}

function buildResourceReason(row: CsvRow, overlap: number) {
  const reasons = [`Fit score ${row.fit_score || "0"}/10`, contactMethodLabel(row.contact_method)];
  if (overlap > 0) {
    reasons.push("matches current product keywords");
  }
  return reasons.join(" · ");
}

function buildEditorialReason(row: CsvRow, overlap: number) {
  const reasons = [
    `${contactMethodLabel(row.workflow_type)}`,
    `priority ${row.priority_score || "0"}`,
  ];
  if (overlap > 0) {
    reasons.push("matches current product keywords");
  }
  return reasons.join(" · ");
}

export async function getManagedInboxLaunchShortlist(
  product: ProductSnapshot
): Promise<ManagedInboxLaunchTarget[]> {
  const [resourceRows, editorialRows] = await Promise.all([
    readCsvRows(RESOURCE_QUEUE_PATH),
    readCsvRows(EDITORIAL_QUEUE_PATH),
  ]);
  const tokens = productTokens(product);

  const resourceCandidates = resourceRows
    .filter((row) =>
      new Set(["draft_ready", "needs_contact_form_submission"]).has(
        (row.outreach_status || "").trim()
      )
    )
    .map((row) => {
      const overlap = overlapScore(
        tokens,
        `${row.article_title || ""} ${row.article_domain || ""}`
      );
      const score =
        toInt(row.fit_score) * 10 +
        overlap * 8 +
        ((row.contact_method || "") === "email_direct"
          ? 10
          : (row.contact_method || "") === "contact_form"
            ? 7
            : 5);
      return {
        id: row.outreach_id || `${row.article_domain}-${row.article_title}`,
        lane: "resource_page" as const,
        title: row.article_title || row.article_domain || "Resource page target",
        domain: row.article_domain || normalizeHost(row.article_url || ""),
        url: row.article_url || "",
        contactMethod: contactMethodLabel(row.contact_method),
        contactValue: row.contact_value || null,
        sourceReferencePath: row.draft_path || null,
        score,
        status: row.outreach_status || "draft_ready",
        reason: buildResourceReason(row, overlap),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const editorialCandidates = editorialRows
    .map((row) => {
      const overlap = overlapScore(
        tokens,
        `${row.platform_name || ""} ${row.platform_url || ""} ${row.task_url || ""}`
      );
      const workflowType = (row.workflow_type || "").trim();
      const workflowBonus =
        workflowType === "external_submit_surface"
          ? 18
          : workflowType === "editorial_submit_surface"
            ? 14
            : 9;
      const score = toInt(row.priority_score) + overlap * 6 + workflowBonus;
      return {
        id: row.opportunity_id || `${row.platform_name}-${row.task_url}`,
        lane: "editorial_contact" as const,
        title: row.platform_name || row.platform_url || "Editorial contact target",
        domain: normalizeHost(row.platform_url || row.task_url || ""),
        url: row.task_url || row.platform_url || "",
        contactMethod: contactMethodLabel(workflowType),
        contactValue: row.task_url || null,
        sourceReferencePath: null,
        score,
        status: row.recommended_action || workflowType || "queued",
        reason: buildEditorialReason(row, overlap),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 2);

  const deduped = new Map<string, ManagedInboxLaunchTarget>();
  for (const candidate of [...resourceCandidates, ...editorialCandidates]) {
    const key = `${candidate.lane}:${candidate.domain || candidate.id}`;
    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()].sort((left, right) => right.score - left.score);
}

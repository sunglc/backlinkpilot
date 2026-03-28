#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  const productId = readArg("--product-id");
  const kind = readArg("--kind", "note");
  const state = readArg("--state", "logged");
  const direction = readArg("--direction", "internal");
  const title = readArg("--title");
  const body = readArg("--body", "");
  const actor = readArg("--actor", "ops");

  if (!productId || !title) {
    console.error(
      "Usage: node scripts/log-managed-inbox-event.mjs --product-id <id> --title <title> [--kind outbound|reply|note|system] [--state sent|replied|needs_followup|logged] [--direction outbound|inbound|internal] [--body <text>] [--actor ops|system|customer]"
    );
    process.exit(1);
  }

  const workspaceDataRoot =
    process.env.BACKLINK_WORKSPACE_DATA_ROOT || "/root/.local/share/backlink_sender";
  const storageRoot = path.join(
    workspaceDataRoot,
    "backlinkpilot-managed-inbox",
    "products"
  );
  const recordPath = path.join(storageRoot, `${productId}.json`);

  const existing = JSON.parse(await readFile(recordPath, "utf8"));
  const event = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    state,
    direction,
    title,
    body,
    actor,
    createdAt: nowIso(),
  };

  existing.timeline = [event, ...(existing.timeline || [])].slice(0, 40);
  existing.updatedAt = nowIso();

  await mkdir(storageRoot, { recursive: true });
  await writeFile(recordPath, JSON.stringify(existing, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        productId,
        eventId: event.id,
        timelineCount: existing.timeline.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

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

function usage() {
  console.error(
    "Usage: node scripts/progress-managed-inbox-packet.mjs --product-id <id> --packet-id <id> --action claim|mark_sent --actor <ops-email-or-name> [--note <text>] [--receipt-path <path>]"
  );
}

async function main() {
  const productId = readArg("--product-id");
  const packetId = readArg("--packet-id");
  const action = readArg("--action");
  const actor = readArg("--actor");
  const note = readArg("--note", "");
  const receiptPath = readArg("--receipt-path", "");

  if (!productId || !packetId || !actor || !["claim", "mark_sent"].includes(action)) {
    usage();
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

  if (!existing.launchRequest || !Array.isArray(existing.launchRequest.packets)) {
    throw new Error("Managed launch request not found");
  }

  let matched = null;
  existing.launchRequest.packets = existing.launchRequest.packets.map((packet) => {
    if (packet.id !== packetId) {
      return packet;
    }

    matched = packet;
    if (action === "claim") {
      return {
        ...packet,
        state: "claimed",
        claimedAt: nowIso(),
        claimedBy: actor,
        nextStep:
          "Finish the send from the dedicated managed sender identity and then mark the packet as sent.",
      };
    }

    return {
      ...packet,
      state: "sent",
      claimedAt: packet.claimedAt || nowIso(),
      claimedBy: packet.claimedBy || actor,
      sentAt: nowIso(),
      sendReceiptPath: receiptPath || packet.sendReceiptPath || null,
      nextStep: "Monitor for replies and log any inbound movement back into BacklinkPilot.",
    };
  });

  if (!matched) {
    throw new Error("Managed launch packet not found");
  }

  const event = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind: action === "mark_sent" ? "outbound" : "note",
    state: action === "mark_sent" ? "sent" : "logged",
    direction: action === "mark_sent" ? "outbound" : "internal",
    title:
      action === "mark_sent"
        ? `Packet sent for ${matched.title}`
        : `Packet claimed for ${matched.title}`,
    body:
      `${matched.subject}\nActor: ${actor}` +
      (receiptPath ? `\nReceipt: ${receiptPath}` : "") +
      (note ? `\nNote: ${note}` : ""),
    actor: "ops",
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
        packetId,
        action,
        actor,
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

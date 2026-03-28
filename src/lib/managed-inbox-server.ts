import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runtimeConfig } from "@/lib/runtime-config";
import type {
  BringYourOwnSender,
  ManagedInboxEventState,
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
const PRIMARY_EMAIL_CONFIG = "/root/.config/backlink_sender/email_sender.json";

function nowIso() {
  return new Date().toISOString();
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
    timeline: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function ensureStorage() {
  await mkdir(PRODUCT_DIR, { recursive: true });
  await mkdir(BRIEF_DIR, { recursive: true });
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
    return JSON.parse(content) as ManagedInboxRecord;
  } catch {
    return null;
  }
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
    status: "queued" as const,
  };
}

export async function getManagedInboxRecord(args: {
  productId: string;
  userId: string;
}) {
  const record = await readRecord(args.productId);
  if (record && record.userId === args.userId) {
    return record;
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
    timeline,
    updatedAt: nowIso(),
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

  const timeline = [
    createTimelineEvent({
      kind: args.kind,
      state: args.state,
      direction: args.direction,
      title: args.title.trim(),
      body: args.body.trim(),
      actor: args.actor || "ops",
    }),
    ...record.timeline,
  ].slice(0, 40);

  const nextRecord: ManagedInboxRecord = {
    ...record,
    timeline,
    updatedAt: nowIso(),
  };

  await writeRecord(nextRecord);
  return nextRecord;
}

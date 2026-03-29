import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ManagedInboxLaunchPacket,
  ManagedInboxLaunchTarget,
} from "@/lib/managed-inbox-types";
import { runtimeConfig } from "@/lib/runtime-config";

interface ProductSnapshot {
  id: string;
  name: string;
  url: string;
  description: string;
}

const STORAGE_DIR = path.join(
  runtimeConfig.workspaceDataRoot,
  "backlinkpilot-managed-inbox",
  "launch-packets"
);

function sanitizeFragment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function subjectForTarget(target: ManagedInboxLaunchTarget, product: ProductSnapshot) {
  if (target.lane === "resource_page") {
    return `Suggestion for ${target.domain}: add ${product.name}`;
  }
  return `${product.name} could fit ${target.domain}`;
}

function openingForTarget(target: ManagedInboxLaunchTarget) {
  if (target.lane === "resource_page") {
    return `I came across your piece "${target.title}" and thought this could be a strong fit for your readers.`;
  }
  return `I found your ${target.contactMethod.toLowerCase()} route and wanted to share a relevant product for review.`;
}

function messageForTarget(
  target: ManagedInboxLaunchTarget,
  product: ProductSnapshot,
  senderEmail: string
) {
  const description = product.description || `${product.name} helps users solve a focused workflow faster.`;
  return `Hi there,

${openingForTarget(target)}

I'd like to suggest ${product.name} (${product.url}) for consideration.

${description}

If helpful, we can provide a tighter one-line summary, screenshot assets, and any extra details you need for a listing or editorial review.

Best,
${product.name} team
${senderEmail}`;
}

async function readSourceReferenceExcerpt(sourceReferencePath: string | null) {
  if (!sourceReferencePath) {
    return "";
  }
  try {
    const content = await readFile(sourceReferencePath, "utf8");
    return content.slice(0, 700).trim();
  } catch {
    return "";
  }
}

export async function generateManagedInboxLaunchPackets(args: {
  launchReferenceId: string;
  product: ProductSnapshot;
  senderEmail: string;
  shortlist: ManagedInboxLaunchTarget[];
}) {
  const productDir = path.join(STORAGE_DIR, args.product.id);
  await mkdir(productDir, { recursive: true });

  const packets = await Promise.all(
    args.shortlist.slice(0, 4).map(async (target, index) => {
      const slug = sanitizeFragment(target.domain || target.title || target.id) || `target-${index + 1}`;
      const packetId = `mp-${args.product.id.slice(0, 8)}-${slug}`;
      const absolutePath = path.join(productDir, `${packetId}.md`);
      const subject = subjectForTarget(target, args.product);
      const opening = openingForTarget(target);
      const sourceExcerpt = await readSourceReferenceExcerpt(target.sourceReferencePath);
      const nextStep =
        target.contactMethod === "Contact form"
          ? "Open the submission/contact surface and convert this packet into a form-safe version."
          : "Send from the dedicated managed sender identity and monitor for replies.";
      const content = `# Managed Outreach Packet

- packet_id: ${packetId}
- launch_reference: ${args.launchReferenceId}
- product_id: ${args.product.id}
- target_id: ${target.id}
- target_domain: ${target.domain}
- target_url: ${target.url || "unknown"}
- contact_method: ${target.contactMethod}
- sender_identity: ${args.senderEmail}

## Suggested subject

${subject}

## Suggested opening

${opening}

## Suggested message

${messageForTarget(target, args.product, args.senderEmail)}

## Recommended next step

${nextStep}

${sourceExcerpt
    ? `## Source reference excerpt

${sourceExcerpt}
`
    : ""}`;

      await writeFile(absolutePath, content);

      return {
        id: packetId,
        targetId: target.id,
        targetDomain: target.domain,
        targetUrl: target.url,
        targetContactValue: target.contactValue,
        syncedSendId: null,
        path: absolutePath,
        relativePath: path.relative(
          path.join(runtimeConfig.workspaceDataRoot, "backlinkpilot-managed-inbox"),
          absolutePath
        ),
        title: target.domain || target.title,
        subject,
        opening,
        nextStep,
        sourceReferencePath: target.sourceReferencePath,
        state: "prepared",
        claimedAt: null,
        claimedBy: null,
        sentAt: null,
        sendReceiptPath: null,
        replyStatus: "none",
        lastReplyAt: null,
        lastReplyFrom: null,
        lastReplySubject: null,
        lastReplySnippet: null,
      } satisfies ManagedInboxLaunchPacket;
    })
  );

  return packets;
}

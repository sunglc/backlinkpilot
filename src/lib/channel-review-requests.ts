import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runtimeConfig } from "@/lib/runtime-config";
import type { ChannelReviewRequest } from "@/lib/channel-review-requests-types";

interface ProductSnapshot {
  id: string;
  name: string;
}

interface ActorSnapshot {
  userId: string;
  userEmail: string | null;
}

const STORAGE_DIR = path.join(
  runtimeConfig.workspaceDataRoot,
  "backlinkpilot-channel-review-requests"
);
const PRODUCT_DIR = path.join(STORAGE_DIR, "products");

function nowIso() {
  return new Date().toISOString();
}

function recordPath(productId: string) {
  return path.join(PRODUCT_DIR, `${productId}.json`);
}

async function ensureStorage() {
  await mkdir(PRODUCT_DIR, { recursive: true });
}

function normalizeRequest(
  input: Partial<ChannelReviewRequest> &
    Pick<ChannelReviewRequest, "id" | "productId" | "userId" | "channelId" | "channelName">
): ChannelReviewRequest {
  const createdAt = input.createdAt || nowIso();
  return {
    version: 1,
    id: input.id,
    productId: input.productId,
    userId: input.userId,
    channelId: input.channelId,
    channelName: input.channelName,
    status:
      input.status === "approved" || input.status === "rejected" || input.status === "queued"
        ? input.status
        : "queued",
    note: input.note || null,
    createdAt,
    updatedAt: input.updatedAt || createdAt,
    reviewedAt: input.reviewedAt || null,
    decisionNote: input.decisionNote || null,
  };
}

async function writeRequests(productId: string, requests: ChannelReviewRequest[]) {
  await ensureStorage();
  await writeFile(recordPath(productId), JSON.stringify(requests, null, 2));
}

export async function readChannelReviewRequests(args: {
  productId: string;
  userId: string;
}) {
  try {
    const content = await readFile(recordPath(args.productId), "utf8");
    const parsed = JSON.parse(content) as Partial<ChannelReviewRequest>[];
    return parsed
      .map((request) =>
        normalizeRequest({
          ...request,
          id: request.id || `review-${args.productId}`,
          productId: request.productId || args.productId,
          userId: request.userId || args.userId,
          channelId: request.channelId || "unknown",
          channelName: request.channelName || request.channelId || "Unknown channel",
        })
      )
      .filter((request) => request.userId === args.userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [] as ChannelReviewRequest[];
  }
}

export async function queueChannelReviewRequest(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  channelId: string;
  channelName: string;
  note?: string | null;
}) {
  const existing = await readChannelReviewRequests({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const latestForChannel = existing.find((request) => request.channelId === args.channelId);

  if (latestForChannel && latestForChannel.status !== "rejected") {
    return latestForChannel;
  }

  const timestamp = nowIso();
  const request = normalizeRequest({
    id: `review-${args.product.id.slice(0, 8)}-${args.channelId}-${Date.now().toString(36)}`,
    productId: args.product.id,
    userId: args.actor.userId,
    channelId: args.channelId,
    channelName: args.channelName,
    status: "queued",
    note: args.note?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await writeRequests(args.product.id, [request, ...existing]);
  return request;
}

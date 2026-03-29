import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runtimeConfig } from "@/lib/runtime-config";
import type { SaasCapabilityReviewState } from "@/lib/saas-capability-review-state-types";

const REVIEW_STATE_DIR = path.join(
  runtimeConfig.dashboardRoot,
  "capability-contract-review"
);

function reviewStatePath(userId: string) {
  return path.join(REVIEW_STATE_DIR, `${userId}.json`);
}

async function ensureReviewStateDir() {
  await mkdir(REVIEW_STATE_DIR, { recursive: true });
}

async function readStoredReviewState(userId: string) {
  try {
    const content = await readFile(reviewStatePath(userId), "utf8");
    return JSON.parse(content) as Partial<SaasCapabilityReviewState>;
  } catch {
    return null;
  }
}

export async function readSaasCapabilityReviewState(args: {
  userId: string;
  currentFingerprint: string;
}): Promise<SaasCapabilityReviewState> {
  const stored = await readStoredReviewState(args.userId);
  const acknowledgedFingerprint = stored?.acknowledgedFingerprint || "";
  const acknowledgedAt = stored?.acknowledgedAt || "";
  const currentFingerprint = args.currentFingerprint || "";

  return {
    userId: args.userId,
    currentFingerprint,
    acknowledgedFingerprint,
    acknowledgedAt,
    reviewPending: Boolean(currentFingerprint) && currentFingerprint !== acknowledgedFingerprint,
  };
}

export async function acknowledgeSaasCapabilityReview(args: {
  userId: string;
  fingerprint: string;
}) {
  await ensureReviewStateDir();
  const payload: SaasCapabilityReviewState = {
    userId: args.userId,
    currentFingerprint: args.fingerprint,
    acknowledgedFingerprint: args.fingerprint,
    acknowledgedAt: new Date().toISOString(),
    reviewPending: false,
  };
  await writeFile(reviewStatePath(args.userId), JSON.stringify(payload, null, 2));
  return payload;
}

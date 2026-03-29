import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CHANNELS,
  type ChannelContract,
} from "@/lib/execution-contract";
import { runtimeConfig } from "@/lib/runtime-config";
import type { OperationalInsights } from "@/lib/saas-operational-insights";
import type {
  WorkspaceTaskPlan,
  WorkspaceTaskPlanMode,
  WorkspaceTaskPlanGranularity,
  WorkspaceTaskPlanStage,
  WorkspaceTaskPlanTarget,
} from "@/lib/workspace-task-plans-types";

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
  "backlinkpilot-task-plans"
);
const PRODUCT_DIR = path.join(STORAGE_DIR, "products");

function nowIso() {
  return new Date().toISOString();
}

function planPath(productId: string) {
  return path.join(PRODUCT_DIR, `${productId}.json`);
}

async function ensureStorage() {
  await mkdir(PRODUCT_DIR, { recursive: true });
}

function normalizeStage(
  stage: string | null | undefined
): WorkspaceTaskPlanStage {
  if (
    stage === "pending" ||
    stage === "planned" ||
    stage === "awaiting_effect" ||
    stage === "live"
  ) {
    return stage;
  }

  return "planned";
}

function normalizeTarget(
  target: Partial<WorkspaceTaskPlanTarget>
): WorkspaceTaskPlanTarget {
  return {
    id: target.id || `target-${Math.random().toString(36).slice(2, 8)}`,
    label: target.label || "Untitled target",
    detail: target.detail || "",
    url: target.url || null,
    host: target.host || null,
  };
}

function normalizeMode(
  mode: string | null | undefined
): WorkspaceTaskPlanMode {
  if (
    mode === "auto_coverage" ||
    mode === "import_list" ||
    mode === "competitor_map"
  ) {
    return mode;
  }

  return "auto_coverage";
}

function normalizePlan(
  input: Partial<WorkspaceTaskPlan> & Pick<WorkspaceTaskPlan, "id" | "productId" | "userId">
): WorkspaceTaskPlan {
  return {
    version: 1,
    id: input.id,
    productId: input.productId,
    userId: input.userId,
    mode: normalizeMode(input.mode),
    granularity: input.granularity || "batch",
    stage: normalizeStage(input.stage),
    title: input.title || "Workspace task plan",
    summary: input.summary || "",
    createdAt: input.createdAt || nowIso(),
    updatedAt: input.updatedAt || input.createdAt || nowIso(),
    recommendedChannelIds: input.recommendedChannelIds || [],
    targets: (input.targets || []).map(normalizeTarget),
    successCost: Number(input.successCost || 0),
    failureCost: Number(input.failureCost || 0),
  };
}

async function writePlans(productId: string, plans: WorkspaceTaskPlan[]) {
  await ensureStorage();
  await writeFile(planPath(productId), JSON.stringify(plans, null, 2));
}

export async function readWorkspaceTaskPlans(args: {
  productId: string;
  userId: string;
}) {
  try {
    const content = await readFile(planPath(args.productId), "utf8");
    const parsed = JSON.parse(content) as Partial<WorkspaceTaskPlan>[];
    return parsed
      .map((plan) =>
        normalizePlan({
          ...plan,
          id: plan.id || `plan-${args.productId}`,
          productId: plan.productId || args.productId,
          userId: plan.userId || args.userId,
        })
      )
      .filter((plan) => plan.userId === args.userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [] as WorkspaceTaskPlan[];
  }
}

function channelSortForPlan(plan: string, submissions: { channel: string }[]) {
  const submittedIds = new Set(submissions.map((submission) => submission.channel));
  const effectivePlan = plan === "free" ? "starter" : plan;

  return CHANNELS.filter(
    (channel) =>
      channel.support_status === "live" &&
      channel.plans.includes(effectivePlan)
  ).sort((left, right) => {
    const leftUsed = submittedIds.has(left.id) ? 1 : 0;
    const rightUsed = submittedIds.has(right.id) ? 1 : 0;

    if (leftUsed !== rightUsed) {
      return leftUsed - rightUsed;
    }

    return left.name.localeCompare(right.name);
  });
}

function economicsForChannels(channels: ChannelContract[]) {
  if (channels.some((channel) => channel.id === "stealth")) {
    return { successCost: 4, failureCost: 1 };
  }

  return { successCost: 3, failureCost: 1 };
}

function channelsForCurrentPlan(plan: string) {
  const effectivePlan = plan === "free" ? "starter" : plan;
  return CHANNELS.filter((channel) => channel.plans.includes(effectivePlan));
}

function recommendedCoverageChannels(args: {
  plan: string;
  submissions: Array<{ channel: string }>;
  operationalInsights: OperationalInsights;
}) {
  const eligibleChannels = channelsForCurrentPlan(args.plan);
  const prioritizedIds = args.operationalInsights.playbook.recommended_lane_ids || [];
  const prioritizedChannels = prioritizedIds
    .map((id) => eligibleChannels.find((channel) => channel.id === id))
    .filter((channel): channel is ChannelContract => Boolean(channel));
  const fallbackChannels = channelSortForPlan(args.plan, args.submissions);
  const seen = new Set<string>();

  return [...prioritizedChannels, ...fallbackChannels].filter((channel) => {
    if (seen.has(channel.id)) {
      return false;
    }

    seen.add(channel.id);
    return true;
  });
}

export async function createAutoCoverageTaskPlan(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  plan: string;
  submissions: Array<{ channel: string }>;
  operationalInsights: OperationalInsights;
}) {
  const existingPlans = await readWorkspaceTaskPlans({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const recommendedChannels = recommendedCoverageChannels({
    plan: args.plan,
    submissions: args.submissions,
    operationalInsights: args.operationalInsights,
  }).slice(0, 3);
  const economics = economicsForChannels(recommendedChannels);
  const createdAt = nowIso();
  const planId = `plan-${args.product.id.slice(0, 8)}-${Date.now()
    .toString()
    .slice(-6)}`;

  const targets = recommendedChannels.map((channel) => ({
    id: `${planId}:${channel.id}`,
    label: channel.name,
    detail:
      args.plan === "free"
        ? `Preview this lane now. It unlocks on Starter.`
        : `Recommended next lane for this product under the ${args.plan} plan.`,
    url: null,
    host: null,
  }));

  const nextPlan = normalizePlan({
    id: planId,
    productId: args.product.id,
    userId: args.actor.userId,
    mode: "auto_coverage",
    granularity: "batch",
    stage: "planned",
    title: "Recommended coverage plan",
    summary: `Start with ${recommendedChannels
      .map((channel) => channel.name)
      .join(", ")}. Discovery today: ${
      args.operationalInsights.discovery_counted_new_worthy_root_domain_count
    }/${
      args.operationalInsights.discovery_target_new_worthy_root_domains
    }. Paid backlog: ${args.operationalInsights.paid_target_backlog_count}.`,
    createdAt,
    updatedAt: createdAt,
    recommendedChannelIds: recommendedChannels.map((channel) => channel.id),
    targets,
    ...economics,
  });

  await writePlans(args.product.id, [nextPlan, ...existingPlans].slice(0, 20));
  return nextPlan;
}

function normalizeImportedUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const normalizedUrl = `${url.protocol}//${host}${url.pathname === "/" ? "" : url.pathname}`;
    return {
      url: normalizedUrl,
      host,
      label: host,
      detail: normalizedUrl,
    };
  } catch {
    return null;
  }
}

export async function createImportedTaskPlan(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  rawList: string;
  granularity: WorkspaceTaskPlanGranularity;
}) {
  const lines = args.rawList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const uniqueTargets = new Map<string, WorkspaceTaskPlanTarget>();

  lines.forEach((line, index) => {
    const normalized = normalizeImportedUrl(line);
    if (!normalized) {
      return;
    }

    const key = normalized.host || normalized.url;
    if (!uniqueTargets.has(key)) {
      uniqueTargets.set(key, {
        id: `import-${index}-${normalized.host}`,
        label: normalized.label,
        detail: normalized.detail,
        url: normalized.url,
        host: normalized.host,
      });
    }
  });

  const targets = Array.from(uniqueTargets.values()).slice(0, 100);
  if (targets.length === 0) {
    throw new Error("Import at least one valid domain or URL.");
  }

  const existingPlans = await readWorkspaceTaskPlans({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const createdAt = nowIso();
  const planId = `plan-${args.product.id.slice(0, 8)}-${Date.now()
    .toString()
    .slice(-6)}`;
  const economics =
    args.granularity === "per_target"
      ? { successCost: 2, failureCost: 1 }
      : { successCost: 3, failureCost: 1 };

  const nextPlan = normalizePlan({
    id: planId,
    productId: args.product.id,
    userId: args.actor.userId,
    mode: "import_list",
    granularity: args.granularity,
    stage: "planned",
    title:
      args.granularity === "per_target"
        ? "Imported target list (per target)"
        : "Imported target list (batch)",
    summary:
      args.granularity === "per_target"
        ? `${targets.length} imported targets are ready to become individual tasks.`
        : `${targets.length} imported targets are grouped into one planned batch.`,
    createdAt,
    updatedAt: createdAt,
    recommendedChannelIds: [],
    targets,
    ...economics,
  });

  await writePlans(args.product.id, [nextPlan, ...existingPlans].slice(0, 20));
  return nextPlan;
}

export async function createCompetitorCoverageTaskPlan(args: {
  product: ProductSnapshot;
  actor: ActorSnapshot;
  rawCompetitorList: string;
  plan: string;
  submissions: Array<{ channel: string }>;
  operationalInsights: OperationalInsights;
}) {
  const lines = args.rawCompetitorList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const uniqueTargets = new Map<string, WorkspaceTaskPlanTarget>();

  lines.forEach((line, index) => {
    const normalized = normalizeImportedUrl(line);
    if (!normalized) {
      return;
    }

    const key = normalized.host || normalized.url;
    if (!uniqueTargets.has(key)) {
      uniqueTargets.set(key, {
        id: `competitor-${index}-${normalized.host}`,
        label: normalized.label,
        detail: normalized.detail,
        url: normalized.url,
        host: normalized.host,
      });
    }
  });

  const competitors = Array.from(uniqueTargets.values()).slice(0, 25);
  if (competitors.length === 0) {
    throw new Error("Import at least one valid competitor domain or URL.");
  }

  const existingPlans = await readWorkspaceTaskPlans({
    productId: args.product.id,
    userId: args.actor.userId,
  });
  const recommendedChannels = recommendedCoverageChannels({
    plan: args.plan,
    submissions: args.submissions,
    operationalInsights: args.operationalInsights,
  }).slice(0, 3);
  const createdAt = nowIso();
  const planId = `plan-${args.product.id.slice(0, 8)}-${Date.now()
    .toString()
    .slice(-6)}`;

  const nextPlan = normalizePlan({
    id: planId,
    productId: args.product.id,
    userId: args.actor.userId,
    mode: "competitor_map",
    granularity: "batch",
    stage: "planned",
    title: "Competitor coverage plan",
    summary: `Map ${competitors.length} competitors into ${recommendedChannels
      .map((channel) => channel.name)
      .join(", ")} first. Use this to decide which coverage lanes your product should match or outrun before expanding deeper.`,
    createdAt,
    updatedAt: createdAt,
    recommendedChannelIds: recommendedChannels.map((channel) => channel.id),
    targets: competitors.map((competitor) => ({
      ...competitor,
      detail: `${competitor.detail} · Compare this competitor against ${args.product.name} and route the strongest lane first.`,
    })),
    successCost: 0,
    failureCost: 0,
  });

  await writePlans(args.product.id, [nextPlan, ...existingPlans].slice(0, 20));
  return nextPlan;
}

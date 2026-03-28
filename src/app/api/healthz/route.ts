import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { NextResponse } from "next/server";

import { requiredEnvPresence, runtimeConfig } from "@/lib/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function pathExists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readWorkerHeartbeat() {
  try {
    const raw = await readFile(runtimeConfig.workerHeartbeatPath, "utf-8");
    const payload = JSON.parse(raw) as {
      status?: string;
      timestamp?: string;
      queued_jobs?: number;
      error?: string;
    };
    const lastSeenAt = payload.timestamp ? Date.parse(payload.timestamp) : NaN;
    const ageMs = Number.isNaN(lastSeenAt) ? null : Date.now() - lastSeenAt;
    const staleAfterMs = Math.max(runtimeConfig.workerIntervalSeconds * 3 * 1000, 90000);

    return {
      exists: true,
      status: payload.status || "unknown",
      ageMs,
      stale: ageMs === null ? true : ageMs > staleAfterMs,
      queuedJobs: payload.queued_jobs ?? null,
      error: payload.error ?? null,
    };
  } catch {
    return {
      exists: false,
      status: "missing",
      ageMs: null,
      stale: true,
      queuedJobs: null,
      error: null,
    };
  }
}

export async function GET() {
  const env = requiredEnvPresence();
  const paths = {
    workspaceRoot: {
      path: runtimeConfig.workspaceRoot,
      exists: await pathExists(runtimeConfig.workspaceRoot),
    },
    workspaceDataRoot: {
      path: runtimeConfig.workspaceDataRoot,
      exists: await pathExists(runtimeConfig.workspaceDataRoot),
    },
    popwlRunner: {
      path: `${runtimeConfig.popwlDir}/runner.py`,
      exists: await pathExists(`${runtimeConfig.popwlDir}/runner.py`),
    },
    backlinksRoot: {
      path: runtimeConfig.backlinksRoot,
      exists: await pathExists(runtimeConfig.backlinksRoot),
    },
    popwlRuntime: {
      path: `${runtimeConfig.popwlDir}/runtime`,
      exists: await pathExists(`${runtimeConfig.popwlDir}/runtime`),
    },
  };
  const worker = await readWorkerHeartbeat();

  const envOk = Object.values(env).every(Boolean);
  const pathsOk = Object.values(paths).every((entry) => entry.exists);
  const workerOk = worker.exists && !worker.stale && worker.status !== "error";
  const ok = envOk && pathsOk && workerOk;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      env,
      runtime: runtimeConfig,
      paths,
      worker,
    },
    { status: ok ? 200 : 503 }
  );
}

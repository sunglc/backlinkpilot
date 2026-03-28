import { access, readFile, readdir, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

import { runtimeConfig } from "@/lib/runtime-config";

export interface OpsStatusPayload {
  generatedAt: string;
  healthUrl: string;
  routeUrl: string;
  snapshotRoot: string | null;
  services: {
    web: string;
    worker: string;
    captureTimer: string;
    pruneTimer: string;
    statusPage: string;
  };
  health: Record<string, unknown>;
  workerHeartbeat: Record<string, unknown>;
  alertStatus: Record<string, unknown>;
  latestRecoverySummary: string;
  latestSystemSummary: string;
  recentAlertNotes: Array<{ name: string; body: string }>;
}

async function pathExists(target: string) {
  try {
    await access(/* turbopackIgnore: true */ target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalJson(target: string) {
  try {
    return JSON.parse(
      await readFile(/* turbopackIgnore: true */ target, "utf-8")
    ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readOptionalText(target: string) {
  try {
    return await readFile(/* turbopackIgnore: true */ target, "utf-8");
  } catch {
    return "";
  }
}

function externalPath(base: string, ...segments: string[]) {
  return path.join(/* turbopackIgnore: true */ base, ...segments);
}

async function getLatestSnapshotRoot() {
  const latestPath = externalPath(runtimeConfig.stateRoot, "latest");
  if (!(await pathExists(latestPath))) {
    return null;
  }

  try {
    return await realpath(/* turbopackIgnore: true */ latestPath);
  } catch {
    return null;
  }
}

function healthUrlFromRequest(request: Request) {
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    `127.0.0.1:${runtimeConfig.port}`;
  return `${protocol}://${host}/api/healthz`;
}

function routeUrlFromRequest(request: Request) {
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    `127.0.0.1:${runtimeConfig.port}`;
  return `${protocol}://${host}/ops/status`;
}

export function getOpsStatusToken() {
  return process.env.OPS_STATUS_TOKEN || "";
}

export function getOpsStatusUsername() {
  return process.env.OPS_STATUS_USERNAME || "";
}

export function getOpsStatusPassword() {
  return process.env.OPS_STATUS_PASSWORD || "";
}

export function getProvidedOpsToken(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("token") || request.headers.get("x-ops-token") || "";
}

function decodeBasicAuth(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
    const separator = decoded.indexOf(":");
    if (separator === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function getOpsStatusAuthMode(request: Request) {
  const expectedToken = getOpsStatusToken();
  const providedToken = getProvidedOpsToken(request);
  if (expectedToken && providedToken === expectedToken) {
    return "token";
  }

  const username = getOpsStatusUsername();
  const password = getOpsStatusPassword();
  const basic = decodeBasicAuth(request);
  if (username && password && basic && basic.username === username && basic.password === password) {
    return "basic";
  }

  return null;
}

export function isOpsStatusAuthorized(request: Request) {
  return getOpsStatusAuthMode(request) !== null;
}

export async function loadOpsStatus(request: Request): Promise<OpsStatusPayload> {
  const snapshotRoot = await getLatestSnapshotRoot();
  const snapshotPath = snapshotRoot
    ? path.resolve(/* turbopackIgnore: true */ snapshotRoot)
    : null;
  const health = snapshotPath
    ? await readOptionalJson(externalPath(snapshotPath, "healthz.json"))
    : {};
  const workerHeartbeat = snapshotPath
    ? await readOptionalJson(externalPath(snapshotPath, "worker-heartbeat.json"))
    : {};
  const alertStatus = await readOptionalJson(
    externalPath(runtimeConfig.stateRoot, "current-alert-status.json")
  );
  const latestRecoverySummary = snapshotPath
    ? await readOptionalText(externalPath(snapshotPath, "RECOVERY-SUMMARY.md"))
    : "";
  const latestSystemSummary = snapshotPath
    ? await readOptionalText(externalPath(snapshotPath, "system-summary.txt"))
    : "";

  const recentAlertNotes: Array<{ name: string; body: string }> = [];
  try {
    const entries = (
      await readdir(/* turbopackIgnore: true */ runtimeConfig.alertDir, {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .slice(0, 5);

    for (const name of entries) {
      const body = await readOptionalText(externalPath(runtimeConfig.alertDir, name));
      recentAlertNotes.push({ name, body: body.slice(0, 2400) });
    }
  } catch {
    // ignore alert dir read errors in the status view
  }

  const latestServices =
    snapshotPath && (await readOptionalText(externalPath(snapshotPath, "system-summary.txt")));
  const serviceSummary = Object.fromEntries(
    latestServices
      ? latestServices
          .split("\n")
          .filter((line) => line.includes("="))
          .map((line) => {
            const [key, value] = line.split("=", 2);
            return [key.trim(), value.trim()];
          })
      : []
  ) as Record<string, string>;

  return {
    generatedAt: new Date().toISOString(),
    healthUrl: healthUrlFromRequest(request),
    routeUrl: routeUrlFromRequest(request),
    snapshotRoot: snapshotPath,
    services: {
      web: serviceSummary.web_service || "unknown",
      worker: serviceSummary.worker_service || "unknown",
      captureTimer: serviceSummary.state_capture_timer || "unknown",
      pruneTimer: serviceSummary.state_prune_timer || "unknown",
      statusPage: serviceSummary.status_page_service || "unknown",
    },
    health,
    workerHeartbeat,
    alertStatus,
    latestRecoverySummary,
    latestSystemSummary,
    recentAlertNotes,
  };
}

function statusClass(raw: unknown) {
  const value = String(raw || "unknown").toLowerCase();
  if (value === "ok" || value === "active" || value === "idle") return "ok";
  if (value === "warning" || value === "degraded") return "warning";
  if (value === "critical" || value === "error" || value === "failed") return "critical";
  return "warning";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderOpsStatusHtml(payload: OpsStatusPayload, token: string, authMode: "token" | "basic" | null) {
  const health = payload.health as Record<string, unknown>;
  const worker = (health.worker as Record<string, unknown> | undefined) || payload.workerHeartbeat;
  const alertStatus = payload.alertStatus;
  const issues = (alertStatus.issues as Array<Record<string, unknown>> | undefined) || [];
  const alertCards =
    payload.recentAlertNotes.length === 0
      ? '<article class="panel"><h3>No Alert Notes</h3><p class="muted">No recovery alerts are open or archived recently.</p></article>'
      : payload.recentAlertNotes
          .map(
            (note) => `
            <article class="panel">
              <h3>${escapeHtml(note.name)}</h3>
              <pre>${escapeHtml(note.body)}</pre>
            </article>
          `
          )
          .join("");

  const issueList =
    issues.length === 0
      ? "<li>No active issues</li>"
      : issues
          .map(
            (item) =>
              `<li><strong>${escapeHtml(String(item.severity || "unknown"))}</strong> ${escapeHtml(String(item.message || ""))}</li>`
          )
          .join("");

  const jsonHref =
    authMode === "token" && token
      ? `/api/ops/status?token=${token}`
      : "/api/ops/status";
  const pageHref =
    authMode === "token" && token
      ? `${payload.routeUrl}?token=${token}`
      : payload.routeUrl;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BacklinkPilot Remote Ops</title>
  <style>
    :root {
      --bg: #f3efe7;
      --panel: #fffaf3;
      --ink: #1f2430;
      --muted: #596575;
      --line: #d8cfbe;
      --ok: #167244;
      --warning: #a16207;
      --critical: #b42318;
      --accent: #0c5c75;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(12,92,117,0.12), transparent 30rem),
        linear-gradient(180deg, #fbf7ef 0%, var(--bg) 100%);
    }
    .wrap { max-width: 1200px; margin: 0 auto; padding: 28px 18px 48px; }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 20px;
      box-shadow: 0 14px 34px rgba(31,36,48,0.06);
    }
    .hero h1 { margin: 8px 0; font-size: 34px; line-height: 1.1; }
    .hero p { margin: 0; color: var(--muted); }
    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .badge-ok { background: rgba(22,114,68,0.12); color: var(--ok); }
    .badge-warning { background: rgba(161,98,7,0.14); color: var(--warning); }
    .badge-critical { background: rgba(180,35,24,0.12); color: var(--critical); }
    .links { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; }
    .links a {
      color: var(--accent);
      text-decoration: none;
      background: rgba(12,92,117,0.08);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 18px;
    }
    .metric { font-size: 28px; font-weight: 700; margin: 6px 0; }
    .muted { color: var(--muted); font-size: 14px; }
    .section { margin-top: 18px; }
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    pre {
      margin: 0;
      padding: 14px;
      border-radius: 16px;
      background: #f8f2e8;
      border: 1px solid #eadfce;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      font-size: 13px;
      line-height: 1.45;
    }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 8px; }
    @media (max-width: 900px) {
      .split { grid-template-columns: 1fr; }
      .hero h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <span class="badge badge-${statusClass(alertStatus.status || health.status)}">${escapeHtml(String(alertStatus.status || health.status || "unknown"))}</span>
      <h1>BacklinkPilot Remote Ops</h1>
      <p>Accessible through the existing public app port with protected auth. Generated at ${escapeHtml(payload.generatedAt)}.</p>
      <div class="links">
        <a href="${escapeHtml(jsonHref)}">JSON</a>
        <a href="${escapeHtml(pageHref)}">Refresh Page</a>
        <a href="${escapeHtml(payload.healthUrl)}">Public Health JSON</a>
      </div>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>Web</h2>
        <p class="metric">${escapeHtml(payload.services.web)}</p>
        <p class="muted">worker=${escapeHtml(payload.services.worker)}</p>
      </article>
      <article class="panel">
        <h2>Health</h2>
        <p class="metric">${escapeHtml(String(health.status || "unknown"))}</p>
        <p class="muted">snapshot=${escapeHtml(payload.snapshotRoot || "missing")}</p>
      </article>
      <article class="panel">
        <h2>Worker</h2>
        <p class="metric">${escapeHtml(String(worker.status || "unknown"))}</p>
        <p class="muted">queued_jobs=${escapeHtml(String(worker.queuedJobs ?? worker.queued_jobs ?? "n/a"))} stale=${escapeHtml(String(worker.stale ?? "unknown"))}</p>
      </article>
      <article class="panel">
        <h2>Ops Timers</h2>
        <p class="metric">${escapeHtml(payload.services.captureTimer)}</p>
        <p class="muted">prune=${escapeHtml(payload.services.pruneTimer)} status_page=${escapeHtml(payload.services.statusPage)}</p>
      </article>
    </section>

    <section class="panel section">
      <h2>Open Issues</h2>
      <ul>${issueList}</ul>
    </section>

    <section class="split section">
      <section class="panel">
        <h2>Latest Health Snapshot</h2>
        <pre>${escapeHtml(JSON.stringify(payload.health, null, 2))}</pre>
      </section>
      <section class="panel">
        <h2>Latest Worker Heartbeat</h2>
        <pre>${escapeHtml(JSON.stringify(payload.workerHeartbeat, null, 2))}</pre>
      </section>
    </section>

    <section class="split section">
      <section class="panel">
        <h2>Latest Recovery Summary</h2>
        <pre>${escapeHtml(payload.latestRecoverySummary.slice(0, 12000))}</pre>
      </section>
      <section class="panel">
        <h2>Latest System Summary</h2>
        <pre>${escapeHtml(payload.latestSystemSummary)}</pre>
      </section>
    </section>

    <section class="panel section">
      <h2>Recent Recovery Alert Notes</h2>
      <div class="grid">
        ${alertCards}
      </div>
    </section>
  </div>
</body>
</html>`;
}

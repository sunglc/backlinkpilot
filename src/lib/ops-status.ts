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

interface OpsStatusSummaryItemZh {
  label: string;
  raw: string;
  text: string;
  meaning: string;
}

interface OpsStatusIssueSummaryZh {
  severityRaw: string;
  severityText: string;
  message: string;
}

export interface OpsStatusSummaryZh {
  access: {
    modeRaw: string;
    modeText: string;
  };
  overall: OpsStatusSummaryItemZh & {
    openIssueCount: number;
  };
  web: OpsStatusSummaryItemZh;
  health: OpsStatusSummaryItemZh & {
    snapshotRoot: string | null;
  };
  worker: OpsStatusSummaryItemZh & {
    queuedJobs: number | string | null;
    stale: boolean | null;
    staleText: string;
  };
  timers: {
    capture: OpsStatusSummaryItemZh;
    prune: OpsStatusSummaryItemZh;
    statusPage: OpsStatusSummaryItemZh;
  };
  currentIssues: {
    count: number;
    text: string;
    items: OpsStatusIssueSummaryZh[];
  };
  guide: string[];
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

function normalizedStatus(raw: unknown) {
  return String(raw || "unknown").toLowerCase();
}

function statusText(raw: unknown) {
  const value = String(raw || "unknown").toLowerCase();
  switch (value) {
    case "ok":
      return "正常";
    case "active":
      return "运行中";
    case "idle":
      return "空闲";
    case "warning":
      return "警告";
    case "degraded":
      return "降级";
    case "critical":
      return "严重异常";
    case "error":
      return "报错";
    case "failed":
      return "失败";
    case "missing":
      return "缺失";
    case "unknown":
      return "未知";
    default:
      return value;
  }
}

function severityText(raw: unknown) {
  const value = String(raw || "unknown").toLowerCase();
  switch (value) {
    case "critical":
      return "严重";
    case "warning":
      return "警告";
    case "error":
      return "错误";
    default:
      return statusText(value);
  }
}

function boolText(raw: unknown) {
  if (raw === true) return "是";
  if (raw === false) return "否";
  return "未知";
}

function authModeText(authMode: "token" | "basic" | null) {
  if (authMode === "basic") return "Basic Auth";
  if (authMode === "token") return "Token";
  return "未知";
}

function webMeaning(raw: unknown) {
  switch (normalizedStatus(raw)) {
    case "active":
      return "主站页面和 API 正在对外提供服务。";
    case "warning":
    case "degraded":
      return "Web 仍可能可访问，但已经出现降级信号。";
    case "critical":
    case "error":
    case "failed":
      return "Web 服务存在严重异常，需要优先查看 web 日志和 systemd 状态。";
    default:
      return "暂时无法确认 Web 服务状态，建议结合健康检查和日志继续判断。";
  }
}

function healthMeaning(raw: unknown) {
  switch (normalizedStatus(raw)) {
    case "ok":
      return "环境变量、关键路径和 worker 心跳都通过了系统自检。";
    case "warning":
    case "degraded":
      return "系统还能部分工作，但至少有一项自检没有通过。";
    case "critical":
    case "error":
    case "failed":
      return "核心自检失败，说明运行链路里至少有一个关键部件已经异常。";
    default:
      return "健康状态未知，建议先查看 healthz 原始 JSON。";
  }
}

function workerMeaning(raw: unknown, queuedJobs: number | string | null, stale: boolean | null) {
  if (stale === true) {
    return "Worker 心跳已经过期，说明进程可能卡住、退出或失联。";
  }

  switch (normalizedStatus(raw)) {
    case "idle":
      if (queuedJobs === 0 || queuedJobs === "0") {
        return "Worker 在线且当前没有排队任务。";
      }
      return "Worker 在线，当前处于空闲态，但队列里还有待处理任务。";
    case "active":
      return "Worker 正在运行并处理任务。";
    case "warning":
    case "degraded":
      return "Worker 还能工作，但已经出现异常信号。";
    case "critical":
    case "error":
    case "failed":
      return "Worker 已报错或失败，需要优先查看 worker 日志。";
    default:
      return "Worker 状态未知，建议结合心跳和日志继续判断。";
  }
}

function timerMeaning(label: string, raw: unknown) {
  switch (normalizedStatus(raw)) {
    case "active":
      return `${label} 已启用并处于运行状态。`;
    case "warning":
    case "degraded":
      return `${label} 仍可能在工作，但状态已经降级。`;
    case "critical":
    case "error":
    case "failed":
      return `${label} 已异常或失败，相关自动化链路需要人工接手。`;
    default:
      return `${label} 状态未知，建议检查对应 systemd unit。`;
  }
}

function overallMeaning(raw: unknown, issueCount: number) {
  switch (normalizedStatus(raw)) {
    case "ok":
      return issueCount === 0
        ? "当前快照没有发现活跃问题，系统处于可运行状态。"
        : `系统总体正常，但仍记录到 ${issueCount} 个待关注问题。`;
    case "warning":
    case "degraded":
      return `系统可部分工作，但当前有 ${issueCount} 个问题需要继续跟进。`;
    case "critical":
    case "error":
    case "failed":
      return `系统存在严重异常，当前有 ${issueCount} 个活跃问题需要立即处理。`;
    default:
      return "系统总状态未知，建议先查看当前问题和 healthz 原始结果。";
  }
}

export function buildOpsStatusSummaryZh(
  payload: OpsStatusPayload,
  authMode: "token" | "basic" | null
): OpsStatusSummaryZh {
  const health = payload.health as Record<string, unknown>;
  const worker = (health.worker as Record<string, unknown> | undefined) || payload.workerHeartbeat;
  const alertStatus = payload.alertStatus;
  const issues = (alertStatus.issues as Array<Record<string, unknown>> | undefined) || [];

  const overallRaw = String(alertStatus.status || health.status || "unknown");
  const webRaw = String(payload.services.web || "unknown");
  const healthRaw = String(health.status || "unknown");
  const workerRaw = String(worker.status || "unknown");
  const captureRaw = String(payload.services.captureTimer || "unknown");
  const pruneRaw = String(payload.services.pruneTimer || "unknown");
  const statusPageRaw = String(payload.services.statusPage || "unknown");
  const queuedJobsRaw = worker.queuedJobs ?? worker.queued_jobs ?? null;
  const queuedJobs =
    typeof queuedJobsRaw === "number" || typeof queuedJobsRaw === "string"
      ? queuedJobsRaw
      : null;
  const stale = typeof worker.stale === "boolean" ? worker.stale : null;

  const issueItems: OpsStatusIssueSummaryZh[] = issues.map((item) => ({
    severityRaw: String(item.severity || "unknown"),
    severityText: severityText(item.severity || "unknown"),
    message: String(item.message || ""),
  }));

  return {
    access: {
      modeRaw: authMode || "unknown",
      modeText: authModeText(authMode),
    },
    overall: {
      label: "总状态",
      raw: overallRaw,
      text: statusText(overallRaw),
      meaning: overallMeaning(overallRaw, issueItems.length),
      openIssueCount: issueItems.length,
    },
    web: {
      label: "Web 服务",
      raw: webRaw,
      text: statusText(webRaw),
      meaning: webMeaning(webRaw),
    },
    health: {
      label: "健康总状态",
      raw: healthRaw,
      text: statusText(healthRaw),
      meaning: healthMeaning(healthRaw),
      snapshotRoot: payload.snapshotRoot,
    },
    worker: {
      label: "Worker",
      raw: workerRaw,
      text: statusText(workerRaw),
      meaning: workerMeaning(workerRaw, queuedJobs, stale),
      queuedJobs,
      stale,
      staleText: boolText(stale),
    },
    timers: {
      capture: {
        label: "快照定时器",
        raw: captureRaw,
        text: statusText(captureRaw),
        meaning: timerMeaning("快照定时器", captureRaw),
      },
      prune: {
        label: "清理定时器",
        raw: pruneRaw,
        text: statusText(pruneRaw),
        meaning: timerMeaning("清理定时器", pruneRaw),
      },
      statusPage: {
        label: "本机状态页服务",
        raw: statusPageRaw,
        text: statusText(statusPageRaw),
        meaning: timerMeaning("本机状态页服务", statusPageRaw),
      },
    },
    currentIssues: {
      count: issueItems.length,
      text: issueItems.length === 0 ? "当前没有未解决问题。" : `当前有 ${issueItems.length} 个未解决问题。`,
      items: issueItems,
    },
    guide: [
      "Web 服务：主站页面和 API 是否还在正常提供服务。",
      "健康总状态：综合环境变量、关键路径和 worker 心跳后的系统结论。",
      "Worker：任务处理器是否在线，queuedJobs 表示待处理任务数，stale 表示心跳是否过期。",
      "运维定时器：capture 负责留快照，prune 负责清理旧快照，statusPage 是本机状态页服务。",
      "当前问题：这里只列出还没解决的异常，方便快速判断是否需要人工介入。",
    ],
  };
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
  const overallRaw = String(alertStatus.status || health.status || "unknown");
  const overallText = statusText(overallRaw);
  const webRaw = String(payload.services.web || "unknown");
  const healthRaw = String(health.status || "unknown");
  const workerRaw = String(worker.status || "unknown");
  const captureTimerRaw = String(payload.services.captureTimer || "unknown");
  const pruneTimerRaw = String(payload.services.pruneTimer || "unknown");
  const statusPageRaw = String(payload.services.statusPage || "unknown");
  const queuedJobs = String(worker.queuedJobs ?? worker.queued_jobs ?? "n/a");
  const staleText = boolText(worker.stale);
  const alertCards =
    payload.recentAlertNotes.length === 0
      ? '<article class="panel"><h3>最近告警记录</h3><p class="muted">当前没有新的恢复告警，也没有最近归档的告警说明。</p></article>'
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
      ? "<li>当前没有未解决问题</li>"
      : issues
          .map(
            (item) =>
              `<li><strong>${escapeHtml(severityText(item.severity || "unknown"))}</strong> ${escapeHtml(String(item.message || ""))}</li>`
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
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BacklinkPilot 运维总览</title>
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
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: #f8f2e8;
      color: var(--muted);
      font-size: 13px;
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
    code {
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      background: #f8f2e8;
      border: 1px solid #eadfce;
      font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      font-size: 0.92em;
    }
    @media (max-width: 900px) {
      .split { grid-template-columns: 1fr; }
      .hero h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <span class="badge badge-${statusClass(overallRaw)}">${escapeHtml(overallText)}</span>
      <h1>BacklinkPilot 运维总览</h1>
      <p>这个页面走现有公网 <code>3000</code> 端口并受鉴权保护。生成时间：${escapeHtml(payload.generatedAt)}，当前鉴权方式：${escapeHtml(authModeText(authMode))}。</p>
      <div class="links">
        <a href="${escapeHtml(jsonHref)}">查看 JSON</a>
        <a href="${escapeHtml(pageHref)}">刷新页面</a>
        <a href="${escapeHtml(payload.healthUrl)}">查看健康检查 JSON</a>
      </div>
      <div class="legend">
        <span class="chip">ok = 正常</span>
        <span class="chip">active = 运行中</span>
        <span class="chip">idle = 空闲</span>
        <span class="chip">warning / degraded = 警告或降级</span>
        <span class="chip">critical / failed / error = 严重异常</span>
      </div>
    </section>

    <section class="panel section">
      <h2>怎么看这页</h2>
      <ul>
        <li><strong>Web 服务</strong>：主站页面和 API 是否还在正常提供服务。</li>
        <li><strong>健康总状态</strong>：系统自检结果，综合环境变量、关键目录、worker 心跳后给出的结论。</li>
        <li><strong>Worker</strong>：任务处理器是否活着。<code>queued_jobs</code> 是待处理任务数，<code>stale</code> 表示心跳是否过期。</li>
        <li><strong>运维定时器</strong>：<code>capture</code> 负责定时留快照，<code>prune</code> 负责清理旧快照，<code>status_page</code> 是本机 HTML 状态页服务。</li>
        <li><strong>当前问题</strong>：这里只显示还没解决的异常；如果为空，表示当前快照没发现活跃问题。</li>
        <li><strong>原始 JSON / 摘要</strong>：下面保留英文原字段名，方便脚本和人工排查时直接对照。</li>
      </ul>
    </section>

    <section class="grid">
      <article class="panel">
        <h2>Web 服务</h2>
        <p class="metric">${escapeHtml(statusText(webRaw))}</p>
        <p class="muted">原始状态：${escapeHtml(webRaw)}，worker：${escapeHtml(payload.services.worker)}</p>
      </article>
      <article class="panel">
        <h2>健康总状态</h2>
        <p class="metric">${escapeHtml(statusText(healthRaw))}</p>
        <p class="muted">原始状态：${escapeHtml(healthRaw)}，快照目录：${escapeHtml(payload.snapshotRoot || "missing")}</p>
      </article>
      <article class="panel">
        <h2>Worker</h2>
        <p class="metric">${escapeHtml(statusText(workerRaw))}</p>
        <p class="muted">原始状态：${escapeHtml(workerRaw)}，queued_jobs=${escapeHtml(queuedJobs)}，stale=${escapeHtml(staleText)}</p>
      </article>
      <article class="panel">
        <h2>运维定时器</h2>
        <p class="metric">${escapeHtml(statusText(captureTimerRaw))}</p>
        <p class="muted">capture=${escapeHtml(captureTimerRaw)}，prune=${escapeHtml(pruneTimerRaw)}，status_page=${escapeHtml(statusPageRaw)}</p>
      </article>
    </section>

    <section class="panel section">
      <h2>当前问题</h2>
      <ul>${issueList}</ul>
    </section>

    <section class="split section">
      <section class="panel">
        <h2>最新健康检查原始 JSON</h2>
        <pre>${escapeHtml(JSON.stringify(payload.health, null, 2))}</pre>
      </section>
      <section class="panel">
        <h2>最新 Worker 心跳原始 JSON</h2>
        <pre>${escapeHtml(JSON.stringify(payload.workerHeartbeat, null, 2))}</pre>
      </section>
    </section>

    <section class="split section">
      <section class="panel">
        <h2>最新恢复摘要</h2>
        <pre>${escapeHtml(payload.latestRecoverySummary.slice(0, 12000))}</pre>
      </section>
      <section class="panel">
        <h2>最新系统摘要</h2>
        <pre>${escapeHtml(payload.latestSystemSummary)}</pre>
      </section>
    </section>

    <section class="panel section">
      <h2>最近恢复告警说明</h2>
      <div class="grid">
        ${alertCards}
      </div>
    </section>
  </div>
</body>
</html>`;
}

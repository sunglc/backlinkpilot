export interface RequiredEnvPresence {
  NEXT_PUBLIC_SUPABASE_URL: boolean;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean;
  SUPABASE_SERVICE_ROLE_KEY: boolean;
}

const defaultWorkspaceRoot =
  process.env.BACKLINK_WORKSPACE_ROOT || "/root/backlink_sender";

export const runtimeConfig = {
  appRoot: process.env.BACKLINKPILOT_ROOT || "/root/backlinkpilot",
  workspaceRoot: defaultWorkspaceRoot,
  workspaceDataRoot:
    process.env.BACKLINK_WORKSPACE_DATA_ROOT || "/root/.local/share/backlink_sender",
  stateRoot: process.env.BACKLINKPILOT_STATE_ROOT || "/root/.local/state/backlinkpilot",
  alertDir:
    process.env.BACKLINKPILOT_ALERT_DIR ||
    `${defaultWorkspaceRoot}/outbox/system-recovery-alerts`,
  dashboardRoot:
    process.env.BACKLINKPILOT_DASHBOARD_ROOT || "/root/.local/state/backlinkpilot/dashboard",
  dashboardHost: process.env.BACKLINKPILOT_DASHBOARD_HOST || "127.0.0.1",
  dashboardPort: Number(process.env.BACKLINKPILOT_DASHBOARD_PORT || 3001),
  popwlDir:
    process.env.POPWL_DIR ||
    `${defaultWorkspaceRoot}/operations/backlinks/automation/popWL`,
  backlinksRoot:
    process.env.BACKLINKS_ROOT ||
    `${defaultWorkspaceRoot}/operations/backlinks`,
  workerHeartbeatPath:
    process.env.WORKER_HEARTBEAT_PATH || "/tmp/backlinkpilot-worker-heartbeat.json",
  workerIntervalSeconds: Number(process.env.WORKER_INTERVAL || 30),
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
};

export function requiredEnvPresence(): RequiredEnvPresence {
  return {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

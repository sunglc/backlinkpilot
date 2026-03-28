#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-$ROOT_DIR/ops/backlinkpilot.env}"
APP_ENV_FILE="${APP_ENV_FILE:-$ROOT_DIR/.env.local}"

if [[ -f "$RUNTIME_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$RUNTIME_ENV_FILE"
  set +a
fi

if [[ -f "$APP_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$APP_ENV_FILE"
  set +a
fi

BACKLINKPILOT_ROOT="${BACKLINKPILOT_ROOT:-$ROOT_DIR}"
BACKLINK_WORKSPACE_ROOT="${BACKLINK_WORKSPACE_ROOT:-/root/backlink_sender}"
BACKLINK_WORKSPACE_DATA_ROOT="${BACKLINK_WORKSPACE_DATA_ROOT:-/root/.local/share/backlink_sender}"
BACKLINKPILOT_STATE_ROOT="${BACKLINKPILOT_STATE_ROOT:-/root/.local/state/backlinkpilot}"
BACKLINKPILOT_ALERT_DIR="${BACKLINKPILOT_ALERT_DIR:-$BACKLINK_WORKSPACE_ROOT/outbox/system-recovery-alerts}"
WORKER_HEARTBEAT_PATH="${WORKER_HEARTBEAT_PATH:-/tmp/backlinkpilot-worker-heartbeat.json}"
HEALTHCHECK_PATH="${HEALTHCHECK_PATH:-/api/healthz}"
PORT="${PORT:-3000}"

REFRESH=false
JSON_OUTPUT=false

usage() {
  cat <<'EOF'
Usage:
  scripts/status-overview.sh [--refresh] [--json]

Options:
  --refresh   capture a fresh runtime snapshot before printing status
  --json      print machine-readable JSON instead of text
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --refresh)
      REFRESH=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$REFRESH" == true ]]; then
  SNAPSHOT_ROOT="$("$ROOT_DIR/scripts/capture-runtime-state.sh")"
else
  SNAPSHOT_ROOT="${SNAPSHOT_ROOT:-$(readlink -f "$BACKLINKPILOT_STATE_ROOT/latest" 2>/dev/null || true)}"
fi

WEB_STATUS="$(systemctl is-active backlinkpilot-web.service 2>/dev/null || echo unknown)"
WORKER_STATUS="$(systemctl is-active backlinkpilot-worker.service 2>/dev/null || echo unknown)"
CAPTURE_TIMER_STATUS="$(systemctl is-active backlinkpilot-state-capture.timer 2>/dev/null || echo unknown)"
PRUNE_TIMER_STATUS="$(systemctl is-active backlinkpilot-state-prune.timer 2>/dev/null || echo unknown)"

python3 - "$SNAPSHOT_ROOT" "$BACKLINKPILOT_STATE_ROOT" "$BACKLINKPILOT_ALERT_DIR" "$BACKLINKPILOT_ROOT" "$BACKLINK_WORKSPACE_ROOT" "$BACKLINK_WORKSPACE_DATA_ROOT" "$WORKER_HEARTBEAT_PATH" "$PORT" "$HEALTHCHECK_PATH" "$WEB_STATUS" "$WORKER_STATUS" "$CAPTURE_TIMER_STATUS" "$PRUNE_TIMER_STATUS" "$JSON_OUTPUT" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path


(
    snapshot_root_raw,
    state_root_raw,
    alert_dir_raw,
    app_root,
    workspace_root,
    workspace_data_root,
    worker_heartbeat_path,
    port,
    healthcheck_path,
    web_status,
    worker_status,
    capture_timer_status,
    prune_timer_status,
    json_output_raw,
) = sys.argv[1:]

snapshot_root = Path(snapshot_root_raw) if snapshot_root_raw else None
state_root = Path(state_root_raw)
alert_dir = Path(alert_dir_raw)
json_output = json_output_raw.lower() == "true"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_optional_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return read_json(path)
    except Exception:
        return {}


def summarize_health(health: dict) -> tuple[str, str]:
    if not health:
        return "missing", "latest health snapshot missing"
    status = str(health.get("status") or "unknown")
    worker = health.get("worker") or {}
    if status != "ok":
        return status, f"healthz status={status}"
    if worker.get("stale") is True:
        return "degraded", "worker heartbeat stale"
    if worker.get("status") == "error":
        return "degraded", f"worker error={worker.get('error', 'unknown')}"
    return "ok", "healthz ok"


health = read_optional_json(snapshot_root / "healthz.json") if snapshot_root else {}
worker_heartbeat = read_optional_json(snapshot_root / "worker-heartbeat.json") if snapshot_root else {}
alert_status = read_optional_json(state_root / "current-alert-status.json")
alert_files = sorted(p.name for p in alert_dir.glob("*.md"))
health_summary, health_detail = summarize_health(health)
worker_view = health.get("worker") or worker_heartbeat

issues: list[str] = []
for name, value in (
    ("web", web_status),
    ("worker", worker_status),
    ("capture_timer", capture_timer_status),
    ("prune_timer", prune_timer_status),
):
    if value != "active":
        issues.append(f"{name}={value}")

if health_summary != "ok":
    issues.append(health_detail)

if alert_status.get("status") not in ("", "ok"):
    issues.append(f"alert_status={alert_status.get('status')}")
if alert_status.get("open") is True:
    issues.append("recovery_alert_open=true")

exit_code = 0 if not issues else 1

payload = {
    "status": "ok" if exit_code == 0 else "degraded",
    "app_root": app_root,
    "workspace_root": workspace_root,
    "workspace_data_root": workspace_data_root,
    "health_url": f"http://127.0.0.1:{port}{healthcheck_path}",
    "snapshot_root": str(snapshot_root) if snapshot_root else None,
    "services": {
        "web": web_status,
        "worker": worker_status,
        "capture_timer": capture_timer_status,
        "prune_timer": prune_timer_status,
    },
    "health": {
        "status": health_summary,
        "detail": health_detail,
        "raw_status": health.get("status"),
    },
    "worker": {
        "status": worker_view.get("status"),
        "queued_jobs": worker_view.get("queuedJobs", worker_view.get("queued_jobs")),
        "stale": worker_view.get("stale"),
        "age_ms": worker_view.get("ageMs"),
        "heartbeat_path": worker_heartbeat_path,
    },
    "alerts": {
        "status": alert_status.get("status", "unknown"),
        "open": alert_status.get("open"),
        "dir": str(alert_dir),
        "file_count": len(alert_files),
        "latest_files": alert_files[-3:],
    },
    "issues": issues,
}

if json_output:
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    raise SystemExit(exit_code)

lines = [
    "BacklinkPilot Overview",
    f"status: {payload['status']}",
    f"services: web={web_status} worker={worker_status} capture_timer={capture_timer_status} prune_timer={prune_timer_status}",
    f"health: {health_detail}",
    (
        "worker: "
        f"status={payload['worker']['status']} queued_jobs={payload['worker']['queued_jobs']} "
        f"stale={payload['worker']['stale']} age_ms={payload['worker']['age_ms']}"
    ),
    f"alerts: status={payload['alerts']['status']} open={payload['alerts']['open']} file_count={payload['alerts']['file_count']}",
    f"paths: app={app_root} workspace={workspace_root} data_root={workspace_data_root}",
    f"snapshot: {payload['snapshot_root']}",
    f"health_url: {payload['health_url']}",
]

if issues:
    lines.append("issues:")
    lines.extend(f"  - {item}" for item in issues)

print("\n".join(lines))
raise SystemExit(exit_code)
PY

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
BACKLINKS_ROOT="${BACKLINKS_ROOT:-$BACKLINK_WORKSPACE_ROOT/operations/backlinks}"
POPWL_DIR="${POPWL_DIR:-$BACKLINK_WORKSPACE_ROOT/operations/backlinks/automation/popWL}"
BACKLINKPILOT_STATE_ROOT="${BACKLINKPILOT_STATE_ROOT:-/root/.local/state/backlinkpilot}"
BACKLINKPILOT_ALERT_DIR="${BACKLINKPILOT_ALERT_DIR:-$BACKLINK_WORKSPACE_ROOT/outbox/system-recovery-alerts}"
BACKLINKPILOT_DASHBOARD_ROOT="${BACKLINKPILOT_DASHBOARD_ROOT:-$BACKLINKPILOT_STATE_ROOT/dashboard}"
BACKLINKPILOT_DASHBOARD_HOST="${BACKLINKPILOT_DASHBOARD_HOST:-127.0.0.1}"
BACKLINKPILOT_DASHBOARD_PORT="${BACKLINKPILOT_DASHBOARD_PORT:-3001}"
WORKER_HEARTBEAT_PATH="${WORKER_HEARTBEAT_PATH:-/tmp/backlinkpilot-worker-heartbeat.json}"
HEALTHCHECK_PATH="${HEALTHCHECK_PATH:-/api/healthz}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-5}"
HEALTHCHECK_RETRY_DELAY="${HEALTHCHECK_RETRY_DELAY:-2}"
PORT="${PORT:-3000}"

TIMESTAMP_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SNAPSHOT_ID="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT_ROOT="$BACKLINKPILOT_STATE_ROOT/snapshots/$SNAPSHOT_ID"
LATEST_LINK="$BACKLINKPILOT_STATE_ROOT/latest"
HEALTH_URL="http://127.0.0.1:${PORT}${HEALTHCHECK_PATH}"

mkdir -p "$SNAPSHOT_ROOT"

run_capture() {
  local output_file="$1"
  shift
  if "$@" >"$output_file" 2>&1; then
    return 0
  fi
  {
    printf 'command_failed:'
    printf ' %q' "$@"
    printf '\n'
  } >>"$output_file"
}

capture_healthcheck() {
  local output_file="$1"
  local attempts="$HEALTHCHECK_RETRIES"
  local delay="$HEALTHCHECK_RETRY_DELAY"
  local tmp_file
  local err_file
  local attempt

  tmp_file="$(mktemp)"
  err_file="$(mktemp)"

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl -sS --max-time 10 "$HEALTH_URL" >"$tmp_file" 2>"$err_file" &&
      python3 -m json.tool "$tmp_file" >/dev/null 2>&1; then
      mv "$tmp_file" "$output_file"
      rm -f "$err_file"
      return 0
    fi

    if ((attempt < attempts)); then
      sleep "$delay"
    fi
  done

  {
    if [[ -s "$err_file" ]]; then
      cat "$err_file"
    fi
    if [[ -s "$tmp_file" ]]; then
      cat "$tmp_file"
    fi
    printf 'command_failed: curl -sS --max-time 10 %s\n' "$HEALTH_URL"
    printf 'retry_attempts=%s retry_delay_seconds=%s\n' "$attempts" "$delay"
  } >"$output_file"

  rm -f "$tmp_file" "$err_file"
}

printf '%s\n' "$TIMESTAMP_UTC" >"$SNAPSHOT_ROOT/captured-at.txt"
printf '%s\n' "$HEALTH_URL" >"$SNAPSHOT_ROOT/health-url.txt"

run_capture "$SNAPSHOT_ROOT/system-summary.txt" /bin/bash -lc "
  printf 'timestamp_utc=%s\n' '$TIMESTAMP_UTC'
  printf 'hostname=%s\n' \"\$(hostname)\"
  printf 'kernel=%s\n' \"\$(uname -srmo)\"
  printf 'boot_time=%s\n' \"\$(uptime -s 2>/dev/null || echo unknown)\"
  printf 'uptime=%s\n' \"\$(uptime -p 2>/dev/null || echo unknown)\"
  printf 'web_service=%s\n' \"\$(systemctl is-active backlinkpilot-web.service 2>/dev/null || echo unknown)\"
  printf 'worker_service=%s\n' \"\$(systemctl is-active backlinkpilot-worker.service 2>/dev/null || echo unknown)\"
  printf 'state_capture_timer=%s\n' \"\$(systemctl is-active backlinkpilot-state-capture.timer 2>/dev/null || echo unknown)\"
  printf 'state_prune_timer=%s\n' \"\$(systemctl is-active backlinkpilot-state-prune.timer 2>/dev/null || echo unknown)\"
  printf 'status_page_service=%s\n' \"\$(systemctl is-active backlinkpilot-status-page.service 2>/dev/null || echo unknown)\"
"

capture_healthcheck "$SNAPSHOT_ROOT/healthz.json"
run_capture "$SNAPSHOT_ROOT/web-service-status.txt" systemctl status backlinkpilot-web.service --no-pager
run_capture "$SNAPSHOT_ROOT/worker-service-status.txt" systemctl status backlinkpilot-worker.service --no-pager
run_capture "$SNAPSHOT_ROOT/web-log-tail.txt" journalctl -u backlinkpilot-web.service -n 20 --no-pager
run_capture "$SNAPSHOT_ROOT/worker-log-tail.txt" journalctl -u backlinkpilot-worker.service -n 20 --no-pager
run_capture "$SNAPSHOT_ROOT/backlinkpilot-git-status.txt" git -C "$BACKLINKPILOT_ROOT" status --short
run_capture "$SNAPSHOT_ROOT/backlink_sender-git-status.txt" git -C "$BACKLINK_WORKSPACE_ROOT" status --short
run_capture "$SNAPSHOT_ROOT/backlinkpilot-git-head.txt" git -C "$BACKLINKPILOT_ROOT" rev-parse HEAD
run_capture "$SNAPSHOT_ROOT/backlink_sender-git-head.txt" git -C "$BACKLINK_WORKSPACE_ROOT" rev-parse HEAD
run_capture "$SNAPSHOT_ROOT/runtime-links.txt" /bin/bash -lc "
  ls -ld \
    '$BACKLINK_WORKSPACE_ROOT/operations/backlinks/records' \
    '$BACKLINK_WORKSPACE_ROOT/operations/backlinks/evidence' \
    '$BACKLINK_WORKSPACE_ROOT/operations/backlinks/queue' \
    '$BACKLINK_WORKSPACE_ROOT/operations/backlinks/automation/popWL/runtime' \
    '$BACKLINK_WORKSPACE_ROOT/operations/backlinks/automation/popWL/generated' \
    '$BACKLINK_WORKSPACE_ROOT/outbox/resource-outreach-drafts'
"

if [[ -f "$WORKER_HEARTBEAT_PATH" ]]; then
  cp "$WORKER_HEARTBEAT_PATH" "$SNAPSHOT_ROOT/worker-heartbeat.json"
else
  printf '{ "status": "missing", "path": "%s" }\n' "$WORKER_HEARTBEAT_PATH" >"$SNAPSHOT_ROOT/worker-heartbeat.json"
fi

run_capture "$SNAPSHOT_ROOT/alert-evaluation.json" python3 \
  "$ROOT_DIR/scripts/evaluate-runtime-alerts.py" \
  --snapshot-root "$SNAPSHOT_ROOT" \
  --state-root "$BACKLINKPILOT_STATE_ROOT" \
  --alert-dir "$BACKLINKPILOT_ALERT_DIR" \
  --health-url "$HEALTH_URL"

ln -sfn "$SNAPSHOT_ROOT" "$LATEST_LINK"

run_capture "$SNAPSHOT_ROOT/dashboard-render.txt" python3 \
  "$ROOT_DIR/scripts/render-status-dashboard.py" \
  --state-root "$BACKLINKPILOT_STATE_ROOT" \
  --dashboard-root "$BACKLINKPILOT_DASHBOARD_ROOT" \
  --dashboard-host "$BACKLINKPILOT_DASHBOARD_HOST" \
  --dashboard-port "$BACKLINKPILOT_DASHBOARD_PORT" \
  --alert-dir "$BACKLINKPILOT_ALERT_DIR" \
  --health-url "$HEALTH_URL"

cat >"$SNAPSHOT_ROOT/RECOVERY-SUMMARY.md" <<EOF
# BacklinkPilot Recovery Snapshot

Captured at: \`$TIMESTAMP_UTC\`

## Runtime

- App root: \`$BACKLINKPILOT_ROOT\`
- Workspace root: \`$BACKLINK_WORKSPACE_ROOT\`
- Workspace data root: \`$BACKLINK_WORKSPACE_DATA_ROOT\`
- Recovery alert dir: \`$BACKLINKPILOT_ALERT_DIR\`
- Dashboard URL: \`http://$BACKLINKPILOT_DASHBOARD_HOST:$BACKLINKPILOT_DASHBOARD_PORT/\`
- Backlinks root: \`$BACKLINKS_ROOT\`
- popWL dir: \`$POPWL_DIR\`
- Health URL: \`$HEALTH_URL\`
- Worker heartbeat: \`$WORKER_HEARTBEAT_PATH\`

## Services

\`\`\`text
$(sed -n '1,20p' "$SNAPSHOT_ROOT/system-summary.txt")
\`\`\`

## Health

\`\`\`json
$(sed -n '1,120p' "$SNAPSHOT_ROOT/healthz.json")
\`\`\`

## Worker Heartbeat

\`\`\`json
$(sed -n '1,120p' "$SNAPSHOT_ROOT/worker-heartbeat.json")
\`\`\`

## Runtime Links

\`\`\`text
$(sed -n '1,80p' "$SNAPSHOT_ROOT/runtime-links.txt")
\`\`\`

## Alert Evaluation

\`\`\`json
$(sed -n '1,120p' "$SNAPSHOT_ROOT/alert-evaluation.json")
\`\`\`

## Dashboard Render

\`\`\`text
$(sed -n '1,80p' "$SNAPSHOT_ROOT/dashboard-render.txt")
\`\`\`

## Git Status Preview

BacklinkPilot:
\`\`\`text
$(sed -n '1,40p' "$SNAPSHOT_ROOT/backlinkpilot-git-status.txt")
\`\`\`

backlink_sender:
\`\`\`text
$(sed -n '1,40p' "$SNAPSHOT_ROOT/backlink_sender-git-status.txt")
\`\`\`

## Files

- \`system-summary.txt\`
- \`healthz.json\`
- \`worker-heartbeat.json\`
- \`web-service-status.txt\`
- \`worker-service-status.txt\`
- \`web-log-tail.txt\`
- \`worker-log-tail.txt\`
- \`backlinkpilot-git-status.txt\`
- \`backlink_sender-git-status.txt\`
- \`runtime-links.txt\`
- \`alert-evaluation.json\`
- \`dashboard-render.txt\`
EOF

printf '%s\n' "$SNAPSHOT_ROOT"

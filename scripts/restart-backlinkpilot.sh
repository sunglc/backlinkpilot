#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-$ROOT_DIR/ops/backlinkpilot.env}"
WEB_PID_FILE="${WEB_PID_FILE:-/tmp/backlinkpilot-web.pid}"
WORKER_PID_FILE="${WORKER_PID_FILE:-/tmp/backlinkpilot-worker.pid}"
WEB_LOG="${WEB_LOG:-/tmp/backlinkpilot-web.log}"
WORKER_LOG="${WORKER_LOG:-/tmp/backlinkpilot-worker.log}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
WORKER_INTERVAL="${WORKER_INTERVAL:-30}"

if [[ -f "$RUNTIME_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$RUNTIME_ENV_FILE"
  set +a
fi

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
export BACKLINKPILOT_ROOT="${BACKLINKPILOT_ROOT:-$ROOT_DIR}"
export BACKLINK_WORKSPACE_ROOT="${BACKLINK_WORKSPACE_ROOT:-/root/backlink_sender}"
export POPWL_DIR="${POPWL_DIR:-$BACKLINK_WORKSPACE_ROOT/operations/backlinks/automation/popWL}"
export BACKLINKS_ROOT="${BACKLINKS_ROOT:-$BACKLINK_WORKSPACE_ROOT/operations/backlinks}"
export WORKER_HEARTBEAT_PATH="${WORKER_HEARTBEAT_PATH:-/tmp/backlinkpilot-worker-heartbeat.json}"
export BACKLINKPILOT_STATE_ROOT="${BACKLINKPILOT_STATE_ROOT:-/root/.local/state/backlinkpilot}"

stop_pid_file() {
  local pid_file="$1"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    for _ in {1..20}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
  fi

  rm -f "$pid_file"
}

"$ROOT_DIR/scripts/check-runtime.sh"

stop_pid_file "$WEB_PID_FILE"
stop_pid_file "$WORKER_PID_FILE"

cd "$ROOT_DIR"

nohup ./node_modules/.bin/next start -H "$HOST" -p "$PORT" >"$WEB_LOG" 2>&1 &
WEB_PID=$!
echo "$WEB_PID" >"$WEB_PID_FILE"

nohup python3 worker/worker.py --loop --interval "$WORKER_INTERVAL" >"$WORKER_LOG" 2>&1 &
WORKER_PID=$!
echo "$WORKER_PID" >"$WORKER_PID_FILE"

printf 'web pid=%s log=%s\n' "$WEB_PID" "$WEB_LOG"
printf 'worker pid=%s log=%s\n' "$WORKER_PID" "$WORKER_LOG"
printf 'POPWL_DIR=%s\n' "$POPWL_DIR"
printf 'BACKLINKS_ROOT=%s\n' "$BACKLINKS_ROOT"

if [[ -x "$ROOT_DIR/scripts/capture-runtime-state.sh" ]]; then
  sleep 2
  "$ROOT_DIR/scripts/capture-runtime-state.sh" >/dev/null 2>&1 || true
fi

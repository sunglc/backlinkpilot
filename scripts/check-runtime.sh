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
POPWL_DIR="${POPWL_DIR:-$BACKLINK_WORKSPACE_ROOT/operations/backlinks/automation/popWL}"
BACKLINKS_ROOT="${BACKLINKS_ROOT:-$BACKLINK_WORKSPACE_ROOT/operations/backlinks}"
WORKER_HEARTBEAT_PATH="${WORKER_HEARTBEAT_PATH:-/tmp/backlinkpilot-worker-heartbeat.json}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
WORKER_INTERVAL="${WORKER_INTERVAL:-30}"
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"

fail() {
  printf 'runtime-check: %s\n' "$1" >&2
  exit 1
}

[[ -d "$BACKLINKPILOT_ROOT" ]] || fail "missing app root: $BACKLINKPILOT_ROOT"
[[ -x "$BACKLINKPILOT_ROOT/node_modules/.bin/next" ]] || fail "missing next binary: $BACKLINKPILOT_ROOT/node_modules/.bin/next"
[[ -f "$BACKLINKPILOT_ROOT/worker/worker.py" ]] || fail "missing worker entrypoint: $BACKLINKPILOT_ROOT/worker/worker.py"
[[ -f "$BACKLINKPILOT_ROOT/src/lib/execution-contract.json" ]] || fail "missing execution contract: $BACKLINKPILOT_ROOT/src/lib/execution-contract.json"
[[ -d "$BACKLINK_WORKSPACE_ROOT" ]] || fail "missing workspace root: $BACKLINK_WORKSPACE_ROOT"
[[ -d "$BACKLINK_WORKSPACE_DATA_ROOT" ]] || fail "missing workspace data root: $BACKLINK_WORKSPACE_DATA_ROOT"
[[ -f "$POPWL_DIR/runner.py" ]] || fail "missing popWL runner: $POPWL_DIR/runner.py"
[[ -d "$BACKLINKS_ROOT" ]] || fail "missing backlinks root: $BACKLINKS_ROOT"
[[ -n "$SUPABASE_URL" ]] || fail "SUPABASE_URL is empty"
[[ -n "$SUPABASE_SERVICE_KEY" ]] || fail "SUPABASE_SERVICE_KEY is empty"

printf 'runtime-check: ok host=%s port=%s interval=%s workspace=%s\n' \
  "$HOST" "$PORT" "$WORKER_INTERVAL" "$BACKLINK_WORKSPACE_ROOT"
printf 'runtime-check: data_root=%s popwl=%s backlinks=%s heartbeat=%s\n' \
  "$BACKLINK_WORKSPACE_DATA_ROOT" "$POPWL_DIR" "$BACKLINKS_ROOT" "$WORKER_HEARTBEAT_PATH"

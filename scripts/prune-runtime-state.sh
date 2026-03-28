#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-$ROOT_DIR/ops/backlinkpilot.env}"

if [[ -f "$RUNTIME_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$RUNTIME_ENV_FILE"
  set +a
fi

BACKLINKPILOT_STATE_ROOT="${BACKLINKPILOT_STATE_ROOT:-/root/.local/state/backlinkpilot}"
BACKLINKPILOT_ALERT_DIR="${BACKLINKPILOT_ALERT_DIR:-/root/backlink_sender/outbox/system-recovery-alerts}"
BACKLINKPILOT_SNAPSHOT_RETENTION_DAYS="${BACKLINKPILOT_SNAPSHOT_RETENTION_DAYS:-14}"
BACKLINKPILOT_MIN_SNAPSHOTS="${BACKLINKPILOT_MIN_SNAPSHOTS:-96}"
BACKLINKPILOT_ALERT_RETENTION_DAYS="${BACKLINKPILOT_ALERT_RETENTION_DAYS:-45}"

SNAPSHOT_DIR="$BACKLINKPILOT_STATE_ROOT/snapshots"
LATEST_LINK="$BACKLINKPILOT_STATE_ROOT/latest"

log() {
  printf 'state-prune: %s\n' "$1"
}

snapshot_epoch() {
  local name="$1"
  local year="${name:0:4}"
  local month="${name:4:2}"
  local day="${name:6:2}"
  local hour="${name:9:2}"
  local minute="${name:11:2}"
  local second="${name:13:2}"
  date -u -d "${year}-${month}-${day} ${hour}:${minute}:${second} UTC" +%s
}

main() {
  mkdir -p "$SNAPSHOT_DIR" "$BACKLINKPILOT_ALERT_DIR"

  local now_epoch
  now_epoch="$(date -u +%s)"
  local retention_seconds=$((BACKLINKPILOT_SNAPSHOT_RETENTION_DAYS * 86400))
  local removed_snapshots=0
  local removed_alerts=0

  local latest_target=""
  if [[ -L "$LATEST_LINK" ]]; then
    latest_target="$(readlink -f "$LATEST_LINK")"
  fi

  mapfile -t snapshots < <(find "$SNAPSHOT_DIR" -maxdepth 1 -mindepth 1 -type d -printf '%f\n' | sort)
  local snapshot_count="${#snapshots[@]}"
  local protected_start=0
  if (( snapshot_count > BACKLINKPILOT_MIN_SNAPSHOTS )); then
    protected_start=$((snapshot_count - BACKLINKPILOT_MIN_SNAPSHOTS))
  fi

  local idx name path ts_epoch age_seconds
  for idx in "${!snapshots[@]}"; do
    name="${snapshots[$idx]}"
    path="$SNAPSHOT_DIR/$name"

    if [[ "$path" == "$latest_target" ]]; then
      continue
    fi

    if (( idx >= protected_start )); then
      continue
    fi

    ts_epoch="$(snapshot_epoch "$name")"
    age_seconds=$((now_epoch - ts_epoch))
    if (( age_seconds <= retention_seconds )); then
      continue
    fi

    rm -rf "$path"
    removed_snapshots=$((removed_snapshots + 1))
    log "removed snapshot: $path"
  done

  while IFS= read -r alert_file; do
    rm -f "$alert_file"
    removed_alerts=$((removed_alerts + 1))
    log "removed alert: $alert_file"
  done < <(find "$BACKLINKPILOT_ALERT_DIR" -maxdepth 1 -type f -name '*.md' -mtime +"$BACKLINKPILOT_ALERT_RETENTION_DAYS" | sort)

  log "snapshot_retention_days=$BACKLINKPILOT_SNAPSHOT_RETENTION_DAYS min_snapshots=$BACKLINKPILOT_MIN_SNAPSHOTS alert_retention_days=$BACKLINKPILOT_ALERT_RETENTION_DAYS"
  log "removed_snapshots=$removed_snapshots removed_alerts=$removed_alerts remaining_snapshots=$(find "$SNAPSHOT_DIR" -maxdepth 1 -mindepth 1 -type d | wc -l)"
}

main "$@"

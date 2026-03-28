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

WORKSPACE_ROOT="${BACKLINK_WORKSPACE_ROOT:-/root/backlink_sender}"
DATA_ROOT="${BACKLINK_WORKSPACE_DATA_ROOT:-/root/.local/share/backlink_sender}"
INFO_EXCLUDE_FILE="$WORKSPACE_ROOT/.git/info/exclude"

DIR_MAPPINGS=(
  "operations/backlinks/records"
  "operations/backlinks/evidence"
  "operations/backlinks/queue"
  "operations/backlinks/automation/popWL/generated"
  "operations/backlinks/automation/popWL/runtime"
)

FILE_MAPPINGS=(
  "operations/backlinks/automation/popWL/history.sqlite3"
)

OUTBOX_SUBDIRS=(
  "outbox/community-followup-alerts"
  "outbox/email-reply-alerts"
  "outbox/email-reply-drafts"
  "outbox/public-listing-alerts"
  "outbox/resource-outreach-drafts"
  "outbox/system-recovery-alerts"
  "outbox/threeue-account-alerts"
)

log() {
  printf 'runtime-migrate: %s\n' "$1"
}

fail() {
  printf 'runtime-migrate: %s\n' "$1" >&2
  exit 1
}

ensure_info_exclude_rule() {
  local rule="$1"
  mkdir -p "$(dirname "$INFO_EXCLUDE_FILE")"
  touch "$INFO_EXCLUDE_FILE"
  if ! grep -Fxq "$rule" "$INFO_EXCLUDE_FILE"; then
    printf '%s\n' "$rule" >>"$INFO_EXCLUDE_FILE"
  fi
}

move_dir_to_data_root() {
  local rel="$1"
  local src="$WORKSPACE_ROOT/$rel"
  local dest="$DATA_ROOT/$rel"

  mkdir -p "$(dirname "$dest")"

  if [[ -L "$src" ]]; then
    if [[ "$(readlink -f "$src")" == "$dest" ]]; then
      log "already linked: $rel -> $dest"
      return 0
    fi
    fail "unexpected symlink target for $src"
  fi

  if [[ -e "$dest" ]]; then
    fail "destination already exists, refusing to merge automatically: $dest"
  fi

  if [[ -e "$src" ]]; then
    mv "$src" "$dest"
  else
    mkdir -p "$dest"
  fi

  mkdir -p "$(dirname "$src")"
  ln -s "$dest" "$src"
  ensure_info_exclude_rule "/$rel"
  log "migrated dir: $rel -> $dest"
}

move_file_to_data_root() {
  local rel="$1"
  local src="$WORKSPACE_ROOT/$rel"
  local dest="$DATA_ROOT/$rel"

  mkdir -p "$(dirname "$dest")"

  if [[ -L "$src" ]]; then
    if [[ "$(readlink -f "$src")" == "$dest" ]]; then
      log "already linked file: $rel -> $dest"
      return 0
    fi
    fail "unexpected symlink target for $src"
  fi

  if [[ -e "$dest" ]]; then
    fail "destination already exists, refusing to merge automatically: $dest"
  fi

  if [[ -e "$src" ]]; then
    mv "$src" "$dest"
  else
    : >"$dest"
  fi

  mkdir -p "$(dirname "$src")"
  ln -s "$dest" "$src"
  ensure_info_exclude_rule "/$rel"
  log "migrated file: $rel -> $dest"
}

main() {
  [[ -d "$WORKSPACE_ROOT" ]] || fail "workspace root missing: $WORKSPACE_ROOT"
  [[ -d "$WORKSPACE_ROOT/.git" ]] || fail "not a git repo: $WORKSPACE_ROOT"
  mkdir -p "$DATA_ROOT"

  local rel
  for rel in "${DIR_MAPPINGS[@]}"; do
    move_dir_to_data_root "$rel"
  done

  for rel in "${FILE_MAPPINGS[@]}"; do
    move_file_to_data_root "$rel"
  done

  for rel in "${OUTBOX_SUBDIRS[@]}"; do
    move_dir_to_data_root "$rel"
  done

  mkdir -p "$WORKSPACE_ROOT/outbox"
  touch "$WORKSPACE_ROOT/outbox/.gitkeep"

  log "workspace root: $WORKSPACE_ROOT"
  log "data root: $DATA_ROOT"
}

main "$@"

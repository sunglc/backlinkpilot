# BacklinkPilot Recovery

This file is the durable handoff for bringing BacklinkPilot back after a reboot, crash, or context loss.

## Canonical Paths

- App root: `/root/backlinkpilot`
- Workspace root: `/root/backlink_sender`
- Workspace data root: `/root/.local/share/backlink_sender`
- Runtime snapshot root: `/root/.local/state/backlinkpilot`
- Local status page: `http://127.0.0.1:3001/`
- Remote protected status page: `http://47.77.177.156:3000/ops/status`
- Web service: `backlinkpilot-web.service`
- Worker service: `backlinkpilot-worker.service`
- Health endpoint: `http://127.0.0.1:3000/api/healthz`

## What Runs

- Web: Next.js app serving marketing pages, auth flow, dashboard, Stripe checkout and webhook.
- Worker: `worker/worker.py` polling Supabase `submissions` and dispatching live channels through `popWL`.
- External execution engine: `/root/backlink_sender/operations/backlinks/automation/popWL`

## Runtime Data Layout

The source workspace stays at `/root/backlink_sender`, but high-churn runtime data has been moved out of the git tree into `/root/.local/share/backlink_sender`.

The original paths still exist as compatibility symlinks for:

- `operations/backlinks/records`
- `operations/backlinks/evidence`
- `operations/backlinks/queue`
- `operations/backlinks/automation/popWL/runtime`
- `operations/backlinks/automation/popWL/generated`
- `operations/backlinks/automation/popWL/history.sqlite3`
- selected `outbox/` alert and draft directories

## First Checks

Run these first:

```bash
systemctl status backlinkpilot-web.service backlinkpilot-worker.service
curl -sS http://127.0.0.1:3000/api/healthz
journalctl -u backlinkpilot-web.service -n 20 --no-pager
journalctl -u backlinkpilot-worker.service -n 20 --no-pager
```

Healthy baseline:

- web and worker are both `active`
- `/api/healthz` returns `status: ok`
- worker heartbeat is fresh and reports `/root/backlink_sender`

## Recovery Commands

Normal restart:

```bash
systemctl restart backlinkpilot-web.service backlinkpilot-worker.service
```

Manual repo-local restart helper:

```bash
cd /root/backlinkpilot
bash scripts/restart-backlinkpilot.sh
```

Runtime validation:

```bash
cd /root/backlinkpilot
scripts/check-runtime.sh
scripts/status-overview.sh --refresh
curl -sS http://127.0.0.1:3001/ | head
curl -sS "http://47.77.177.156:3000/api/ops/status?token=\$OPS_STATUS_TOKEN" | head
curl -u "\$OPS_STATUS_USERNAME:\$OPS_STATUS_PASSWORD" http://47.77.177.156:3000/api/ops/status | head
```

## Persistent Memory Strategy

BacklinkPilot now captures a recovery snapshot automatically at boot and every 15 minutes.

Snapshot locations:

- latest snapshot: `/root/.local/state/backlinkpilot/latest/`
- historical snapshots: `/root/.local/state/backlinkpilot/snapshots/`

Retention policy:

- snapshots: keep at least the latest 96, and keep snapshots up to 14 days
- recovery alert notes: keep up to 45 days

Each snapshot contains:

- health endpoint payload
- worker heartbeat
- service status
- recent web and worker logs
- git status previews for `backlinkpilot` and `backlink_sender`
- runtime symlink layout
- alert evaluation output
- health capture retries to avoid false alerts during short web restarts

Manual capture:

```bash
cd /root/backlinkpilot
scripts/capture-runtime-state.sh
```

Timer status:

```bash
systemctl status backlinkpilot-state-capture.timer
systemctl status backlinkpilot-state-prune.timer
systemctl status backlinkpilot-status-page.service
```

## Alert Strategy

Recovery alerts are written to:

- `/root/backlink_sender/outbox/system-recovery-alerts/`

An alert note is emitted when the captured snapshot shows problems such as:

- web or worker service not `active`
- `/api/healthz` not returning `status: ok`
- worker heartbeat missing, stale, or in `error`
- required runtime paths missing

When the system returns to healthy state, a matching `resolved` note is written.

## Remote Access Without New Security Group Rules

The app port `3000` is already publicly reachable on `47.77.177.156`, so the protected ops view is exposed through the existing app server instead of a new port.

- HTML: `http://47.77.177.156:3000/ops/status`
- JSON: `http://47.77.177.156:3000/api/ops/status`

Auth options stored locally in `/root/backlinkpilot/.env.local`:

- `OPS_STATUS_USERNAME` / `OPS_STATUS_PASSWORD` for browser-friendly Basic Auth
- `OPS_STATUS_TOKEN` as a fallback for scripted query access

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_summary(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.exists():
        return result
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip()
    return result


def issue(severity: str, message: str) -> dict[str, str]:
    return {"severity": severity, "message": message}


def build_fingerprint(issues: list[dict[str, str]]) -> str:
    stable = json.dumps(issues, sort_keys=True, ensure_ascii=False)
    return sha256(stable.encode("utf-8")).hexdigest()


def write_markdown(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate BacklinkPilot runtime alerts")
    parser.add_argument("--snapshot-root", required=True)
    parser.add_argument("--state-root", required=True)
    parser.add_argument("--alert-dir", required=True)
    parser.add_argument("--health-url", required=True)
    args = parser.parse_args()

    snapshot_root = Path(args.snapshot_root)
    state_root = Path(args.state_root)
    alert_dir = Path(args.alert_dir)
    health_url = args.health_url
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    summary = read_summary(snapshot_root / "system-summary.txt")
    issues: list[dict[str, str]] = []

    health_path = snapshot_root / "healthz.json"
    worker_path = snapshot_root / "worker-heartbeat.json"

    if not health_path.exists():
        issues.append(issue("critical", f"health snapshot missing: {health_path}"))
        health = {}
    else:
        try:
            health = read_json(health_path)
        except Exception as exc:  # noqa: BLE001
            issues.append(issue("critical", f"health snapshot invalid JSON: {exc}"))
            health = {}

    if not worker_path.exists():
        issues.append(issue("critical", f"worker heartbeat snapshot missing: {worker_path}"))
        worker = {}
    else:
        try:
            worker = read_json(worker_path)
        except Exception as exc:  # noqa: BLE001
            issues.append(issue("critical", f"worker heartbeat invalid JSON: {exc}"))
            worker = {}

    if summary.get("web_service") != "active":
        issues.append(issue("critical", f"web service not active: {summary.get('web_service', 'unknown')}"))
    if summary.get("worker_service") != "active":
        issues.append(issue("critical", f"worker service not active: {summary.get('worker_service', 'unknown')}"))
    if summary.get("state_capture_timer") != "active":
        issues.append(issue("warning", f"state capture timer not active: {summary.get('state_capture_timer', 'unknown')}"))

    if health.get("status") and health.get("status") != "ok":
        issues.append(issue("critical", f"health endpoint returned status={health.get('status')}"))

    env = health.get("env") or {}
    for key, value in env.items():
        if not value:
            issues.append(issue("critical", f"required env missing according to healthz: {key}"))

    paths = health.get("paths") or {}
    for name, payload in paths.items():
        if isinstance(payload, dict) and not payload.get("exists", False):
            issues.append(issue("critical", f"required path missing according to healthz: {name} -> {payload.get('path')}"))

    if worker:
        if worker.get("status") == "error":
            issues.append(issue("critical", f"worker heartbeat reports error: {worker.get('error', 'unknown')}"))
        if worker.get("stale") is True:
            issues.append(issue("critical", "worker heartbeat is stale"))
        if worker.get("exists") is False:
            issues.append(issue("critical", "worker heartbeat missing according to healthz"))

    severity_rank = {"ok": 0, "warning": 1, "critical": 2}
    overall = "ok"
    for item in issues:
        if severity_rank[item["severity"]] > severity_rank[overall]:
            overall = item["severity"]

    fingerprint = build_fingerprint(issues)
    state_root.mkdir(parents=True, exist_ok=True)
    state_file = state_root / "current-alert-status.json"
    previous: dict = {}
    if state_file.exists():
        try:
            previous = read_json(state_file)
        except Exception:  # noqa: BLE001
            previous = {}

    status_payload = {
        "checked_at": now,
        "status": overall,
        "fingerprint": fingerprint,
        "snapshot_root": str(snapshot_root),
        "health_url": health_url,
        "issues": issues,
    }

    created_alert_file = None
    resolved_alert_file = None

    if issues:
        previous_status = previous.get("status")
        previous_fingerprint = previous.get("fingerprint")
        if previous_status != overall or previous_fingerprint != fingerprint:
            slug = now.replace(":", "").replace("-", "")
            created_alert_file = alert_dir / f"{slug}-{overall}.md"
            issue_lines = "\n".join(f"- [{item['severity']}] {item['message']}" for item in issues)
            write_markdown(
                created_alert_file,
                "\n".join(
                    [
                        "# BacklinkPilot Recovery Alert",
                        "",
                        f"Detected at: `{now}`",
                        f"Severity: `{overall}`",
                        f"Snapshot: `{snapshot_root}`",
                        f"Health URL: `{health_url}`",
                        "",
                        "## Issues",
                        "",
                        issue_lines or "- none",
                        "",
                        "## First Commands",
                        "",
                        "```bash",
                        "systemctl status backlinkpilot-web.service backlinkpilot-worker.service",
                        f"curl -sS {health_url}",
                        "journalctl -u backlinkpilot-web.service -n 20 --no-pager",
                        "journalctl -u backlinkpilot-worker.service -n 20 --no-pager",
                        "```",
                        "",
                        "## Snapshot Files",
                        "",
                        f"- `{snapshot_root / 'RECOVERY-SUMMARY.md'}`",
                        f"- `{snapshot_root / 'web-log-tail.txt'}`",
                        f"- `{snapshot_root / 'worker-log-tail.txt'}`",
                    ]
                )
                + "\n",
            )
        status_payload["open"] = True
        if created_alert_file:
            status_payload["alert_file"] = str(created_alert_file)
        elif previous.get("alert_file"):
            status_payload["alert_file"] = previous["alert_file"]
    else:
        if previous.get("open"):
            slug = now.replace(":", "").replace("-", "")
            resolved_alert_file = alert_dir / f"{slug}-resolved.md"
            previous_issues = previous.get("issues") or []
            issue_lines = "\n".join(f"- [{item['severity']}] {item['message']}" for item in previous_issues)
            write_markdown(
                resolved_alert_file,
                "\n".join(
                    [
                        "# BacklinkPilot Recovery Alert Resolved",
                        "",
                        f"Resolved at: `{now}`",
                        f"Snapshot: `{snapshot_root}`",
                        "",
                        "## Previously Open Issues",
                        "",
                        issue_lines or "- none",
                        "",
                        "## Current Health",
                        "",
                        f"- Health URL: `{health_url}`",
                        f"- Snapshot summary: `{snapshot_root / 'RECOVERY-SUMMARY.md'}`",
                    ]
                )
                + "\n",
            )
        status_payload["open"] = False
        if resolved_alert_file:
            status_payload["resolved_file"] = str(resolved_alert_file)

    state_file.write_text(
        json.dumps(status_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(
        {
            "status": overall,
            "issues": issues,
            "snapshot_root": str(snapshot_root),
            "alert_file": str(created_alert_file) if created_alert_file else None,
            "resolved_file": str(resolved_alert_file) if resolved_alert_file else None,
            "state_file": str(state_file),
        },
        ensure_ascii=False,
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

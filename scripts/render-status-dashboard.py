#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
from datetime import datetime, timezone
from pathlib import Path


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_optional_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return read_json(path)
    except Exception:
        return {}


def read_optional_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def fmt_bool(value: object) -> str:
    if value is True:
        return "yes"
    if value is False:
        return "no"
    return "unknown"


def issue_list(items: list[dict]) -> str:
    if not items:
        return "<li>No active issues</li>"
    return "\n".join(
        f"<li><strong>{html.escape(str(item.get('severity', 'unknown')))}</strong> {html.escape(str(item.get('message', '')))}</li>"
        for item in items
    )


def alert_cards(alert_files: list[Path]) -> str:
    if not alert_files:
        return "<article class=\"snapshot-card\"><h3>No alert notes</h3><p class=\"subtle\">No recovery alerts are currently stored.</p></article>"
    cards: list[str] = []
    for path in alert_files:
        body = read_optional_text(path)[:1800]
        cards.append(
            "\n".join(
                [
                    '<article class="snapshot-card">',
                    f"<h3>{html.escape(path.name)}</h3>",
                    f"<pre>{html.escape(body)}</pre>",
                    "</article>",
                ]
            )
        )
    return "\n".join(cards)


def snapshot_cards(snapshot_dirs: list[Path], state_root: Path) -> str:
    cards: list[str] = []
    dashboard_root = state_root / "dashboard"
    for snapshot_dir in snapshot_dirs[:12]:
        alert_eval = read_optional_json(snapshot_dir / "alert-evaluation.json")
        summary = read_optional_text(snapshot_dir / "system-summary.txt")
        status = alert_eval.get("status") or "unknown"
        cards.append(
            "\n".join(
                [
                    '<article class="snapshot-card">',
                    f"<h3>{html.escape(snapshot_dir.name)}</h3>",
                    f"<p class=\"badge badge-{html.escape(status)}\">{html.escape(status)}</p>",
                    f"<p><a href=\"../snapshots/{html.escape(snapshot_dir.name)}/RECOVERY-SUMMARY.md\">Recovery summary</a></p>",
                    f"<pre>{html.escape(summary[:600])}</pre>",
                    "</article>",
                ]
            )
        )
    return "\n".join(cards)


def main() -> int:
    parser = argparse.ArgumentParser(description="Render BacklinkPilot local status dashboard")
    parser.add_argument("--state-root", required=True)
    parser.add_argument("--dashboard-root", required=True)
    parser.add_argument("--dashboard-host", required=True)
    parser.add_argument("--dashboard-port", required=True)
    parser.add_argument("--health-url", required=True)
    parser.add_argument("--alert-dir", required=True)
    args = parser.parse_args()

    state_root = Path(args.state_root)
    dashboard_root = Path(args.dashboard_root)
    dashboard_root.mkdir(parents=True, exist_ok=True)

    latest = state_root / "latest"
    latest_root = Path(latest.resolve()) if latest.exists() else None
    alert_dir = Path(args.alert_dir)
    alert_dir.mkdir(parents=True, exist_ok=True)

    health = read_optional_json(latest_root / "healthz.json") if latest_root else {}
    summary = read_optional_text(latest_root / "system-summary.txt") if latest_root else ""
    worker = read_optional_json(latest_root / "worker-heartbeat.json") if latest_root else {}
    alert_status = read_optional_json(state_root / "current-alert-status.json")
    recovery_summary = read_optional_text(latest_root / "RECOVERY-SUMMARY.md") if latest_root else ""

    snapshot_dirs = sorted(
        [p for p in (state_root / "snapshots").glob("*") if p.is_dir()],
        reverse=True,
    )
    latest_alerts = sorted(alert_dir.glob("*.md"), reverse=True)[:10]

    status = alert_status.get("status") or health.get("status") or "unknown"
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    index_html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BacklinkPilot Local Status</title>
  <style>
    :root {{
      --bg: #f4efe6;
      --panel: #fffaf2;
      --ink: #1f2430;
      --muted: #5f6b7a;
      --line: #d8cdbd;
      --ok: #1f7a4c;
      --warning: #a66500;
      --critical: #a12828;
      --accent: #0c5c75;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(12,92,117,0.10), transparent 28rem),
        linear-gradient(180deg, #fbf7ef 0%, var(--bg) 100%);
    }}
    .wrap {{ max-width: 1240px; margin: 0 auto; padding: 32px 20px 56px; }}
    .hero {{
      background: linear-gradient(135deg, rgba(12,92,117,0.12), rgba(255,250,242,0.92));
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(31, 36, 48, 0.08);
    }}
    .hero h1 {{ margin: 0 0 8px; font-size: 34px; line-height: 1.1; }}
    .hero p {{ margin: 0; color: var(--muted); }}
    .hero-links {{ margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px; }}
    .hero-links a {{
      color: var(--accent);
      text-decoration: none;
      background: rgba(12,92,117,0.08);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 14px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }}
    .card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 18px;
      box-shadow: 0 10px 30px rgba(31, 36, 48, 0.05);
    }}
    .card h2 {{ margin: 0 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.06em; }}
    .metric {{ font-size: 28px; font-weight: 700; margin: 0 0 6px; }}
    .subtle {{ color: var(--muted); font-size: 14px; }}
    .badge {{
      display: inline-block;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    .badge-ok {{ background: rgba(31,122,76,0.12); color: var(--ok); }}
    .badge-warning {{ background: rgba(166,101,0,0.12); color: var(--warning); }}
    .badge-critical {{ background: rgba(161,40,40,0.12); color: var(--critical); }}
    .badge-degraded {{ background: rgba(166,101,0,0.12); color: var(--warning); }}
    .panel {{
      margin-top: 18px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(31, 36, 48, 0.05);
    }}
    .panel h2 {{ margin: 0 0 14px; font-size: 20px; }}
    .panel ul {{ margin: 0; padding-left: 18px; }}
    .panel li {{ margin-bottom: 8px; }}
    pre {{
      margin: 0;
      padding: 14px;
      border-radius: 16px;
      background: #f7f1e7;
      border: 1px solid #eadfce;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      font-size: 13px;
      line-height: 1.45;
    }}
    .snapshot-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }}
    .snapshot-card {{
      background: #fffdf8;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
    }}
    .snapshot-card h3 {{ margin: 0 0 10px; font-size: 16px; }}
    .snapshot-card p {{ margin: 0 0 10px; }}
    .two-col {{
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 18px;
      align-items: start;
    }}
    @media (max-width: 900px) {{
      .two-col {{ grid-template-columns: 1fr; }}
      .hero h1 {{ font-size: 28px; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <span class="badge badge-{html.escape(str(status))}">{html.escape(str(status))}</span>
      <h1>BacklinkPilot Local Status</h1>
      <p>Generated at {html.escape(generated_at)}. This dashboard is designed for localhost recovery and operations checks.</p>
      <div class="hero-links">
        <a href="{html.escape(args.health_url)}">Health JSON</a>
        <a href="../latest/RECOVERY-SUMMARY.md">Latest Recovery Summary</a>
        <a href="../current-alert-status.json">Current Alert Status</a>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Services</h2>
        <p class="metric">{html.escape(str(health.get("status") or "unknown"))}</p>
        <p class="subtle">web={html.escape(str(health.get("status") and "active" or "unknown"))}</p>
        <p class="subtle">health url: {html.escape(args.health_url)}</p>
      </article>
      <article class="card">
        <h2>Worker</h2>
        <p class="metric">{html.escape(str((health.get("worker") or worker).get("status") or "unknown"))}</p>
        <p class="subtle">queued_jobs={html.escape(str((health.get("worker") or worker).get("queuedJobs", (health.get("worker") or worker).get("queued_jobs", "n/a"))))}</p>
        <p class="subtle">stale={html.escape(fmt_bool((health.get("worker") or worker).get("stale")))}</p>
      </article>
      <article class="card">
        <h2>Alerts</h2>
        <p class="metric">{html.escape(str(alert_status.get("status") or "unknown"))}</p>
        <p class="subtle">open={html.escape(fmt_bool(alert_status.get("open")))}</p>
        <p class="subtle">alert files={len(list(alert_dir.glob("*.md")))}</p>
      </article>
      <article class="card">
        <h2>Snapshots</h2>
        <p class="metric">{len(snapshot_dirs)}</p>
        <p class="subtle">latest={html.escape(latest_root.name if latest_root else "missing")}</p>
        <p class="subtle">dashboard: http://{html.escape(args.dashboard_host)}:{html.escape(args.dashboard_port)}/</p>
      </article>
    </section>

    <section class="panel">
      <h2>Open Issues</h2>
      <ul>
        {issue_list(alert_status.get("issues") or [])}
      </ul>
    </section>

    <section class="two-col">
      <section class="panel">
        <h2>Latest Health</h2>
        <pre>{html.escape(json.dumps(health, indent=2, ensure_ascii=False))}</pre>
      </section>
      <section class="panel">
        <h2>Latest Worker Heartbeat</h2>
        <pre>{html.escape(json.dumps(worker, indent=2, ensure_ascii=False))}</pre>
      </section>
    </section>

    <section class="two-col">
      <section class="panel">
        <h2>Latest Recovery Summary</h2>
        <pre>{html.escape(recovery_summary[:8000])}</pre>
      </section>
      <section class="panel">
        <h2>Recent Alert Notes</h2>
        <div class="snapshot-grid">
          {alert_cards(latest_alerts)}
        </div>
        <h2 style="margin-top:18px">Latest System Summary</h2>
        <pre>{html.escape(summary)}</pre>
      </section>
    </section>

    <section class="panel">
      <h2>Recent Snapshots</h2>
      <div class="snapshot-grid">
        {snapshot_cards(snapshot_dirs, state_root)}
      </div>
    </section>
  </div>
</body>
</html>
"""

    (dashboard_root / "index.html").write_text(index_html, encoding="utf-8")
    (dashboard_root / "status.json").write_text(
        json.dumps(
            {
                "generated_at": generated_at,
                "dashboard_url": f"http://{args.dashboard_host}:{args.dashboard_port}/",
                "health_url": args.health_url,
                "latest_snapshot": str(latest_root) if latest_root else None,
                "alert_status": alert_status,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    print(str(dashboard_root / "index.html"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
BacklinkPilot Worker — polls Supabase for queued submissions and runs popWL automation.

Usage:
    python worker.py              # run once (process all queued jobs)
    python worker.py --loop       # poll every 30s
    python worker.py --loop --interval 60   # poll every 60s
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from supabase import create_client

# --- Config ---

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pckxauowzpnaicqyxafo.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

POPWL_DIR = Path(os.environ.get(
    "POPWL_DIR",
    "/root/openclaw-stack/workspaces/seo-strategy/operations/backlinks/automation/popWL"
))
BACKLINKS_ROOT = Path(os.environ.get(
    "BACKLINKS_ROOT",
    "/root/openclaw-stack/workspaces/seo-strategy/operations/backlinks"
))

# Map channel IDs to site config glob patterns
CHANNEL_SITE_CONFIGS = {
    "directory": "config.*.local.json",
    "stealth": "config.*.local.json",  # same sites, stealth mode enabled in config
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("backlinkpilot-worker")


def get_supabase():
    if not SUPABASE_KEY:
        logger.error("SUPABASE_SERVICE_KEY not set")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_queued_jobs(sb):
    """Fetch all queued submissions with product info."""
    result = sb.table("submissions").select(
        "*, products(name, url, description)"
    ).eq("status", "queued").execute()
    return result.data or []


def generate_site_config(product, site_config_path, output_dir):
    """
    Take an existing site config template and replace the product-specific fields
    with the user's product data.
    """
    with open(site_config_path, "r") as f:
        config = json.load(f)

    # Override product fields
    config["target_url"] = product["url"]
    config["contact"]["submitter_name"] = product["name"] + " Team"

    if "payload" in config:
        config["payload"]["tool_name"] = product["name"]
        config["payload"]["website"] = product["url"]
        config["payload"]["short_description"] = product.get("description", "")
        config["payload"]["long_description"] = product.get("description", "")

    # Write to temp config
    site_name = Path(site_config_path).stem.replace("config.", "").replace(".local", "")
    output_path = output_dir / f"config.{site_name}.json"
    with open(output_path, "w") as f:
        json.dump(config, f, indent=2)

    return output_path


def get_site_configs(channel):
    """Get list of site config files for a channel."""
    pattern = CHANNEL_SITE_CONFIGS.get(channel)
    if not pattern:
        return []

    configs = sorted(POPWL_DIR.glob(pattern))
    # Filter out example configs
    return [c for c in configs if "example" not in c.name]


def run_submission(config_path):
    """Run popWL runner with a config file. Returns (success, output)."""
    cmd = [
        sys.executable,
        str(POPWL_DIR / "runner.py"),
        "run",
        "--config", str(config_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 min timeout per site
            cwd=str(BACKLINKS_ROOT),
        )
        success = result.returncode == 0
        output = result.stdout + result.stderr
        return success, output[:2000]  # truncate
    except subprocess.TimeoutExpired:
        return False, "Timeout: submission took longer than 5 minutes"
    except Exception as e:
        return False, str(e)[:2000]


def process_job(sb, job):
    """Process a single queued submission job."""
    job_id = job["id"]
    channel = job["channel"]
    product = job.get("products") or {}

    logger.info("Processing job %s: channel=%s product=%s", job_id, channel, product.get("name"))

    # Update status to running
    sb.table("submissions").update({
        "status": "running",
        "updated_at": "now()",
    }).eq("id", job_id).execute()

    # Get site configs for this channel
    site_configs = get_site_configs(channel)
    total = len(site_configs)

    if total == 0:
        logger.warning("No site configs found for channel: %s", channel)
        sb.table("submissions").update({
            "status": "completed",
            "total_sites": 0,
            "updated_at": "now()",
        }).eq("id", job_id).execute()
        return

    sb.table("submissions").update({
        "total_sites": total,
    }).eq("id", job_id).execute()

    completed = 0
    successes = 0
    results = []

    with tempfile.TemporaryDirectory(prefix="blpilot-") as tmpdir:
        tmpdir_path = Path(tmpdir)

        for site_config_path in site_configs:
            site_name = site_config_path.stem.replace("config.", "").replace(".local", "")
            logger.info("  Submitting to %s (%d/%d)", site_name, completed + 1, total)

            try:
                # Generate config with user's product data
                custom_config = generate_site_config(product, site_config_path, tmpdir_path)

                # Run submission
                success, output = run_submission(custom_config)

                completed += 1
                if success:
                    successes += 1

                results.append({
                    "site": site_name,
                    "success": success,
                    "output": output[:500],
                })

                # Update progress
                sb.table("submissions").update({
                    "completed_sites": completed,
                    "success_sites": successes,
                    "results": results,
                    "updated_at": "now()",
                }).eq("id", job_id).execute()

            except Exception as e:
                completed += 1
                results.append({
                    "site": site_name,
                    "success": False,
                    "output": str(e)[:500],
                })
                logger.error("  Error on %s: %s", site_name, e)

    # Mark completed
    sb.table("submissions").update({
        "status": "completed",
        "completed_sites": completed,
        "success_sites": successes,
        "results": results,
        "updated_at": "now()",
    }).eq("id", job_id).execute()

    logger.info("Job %s done: %d/%d successful", job_id, successes, total)


def run_once(sb):
    """Process all queued jobs once."""
    jobs = fetch_queued_jobs(sb)
    if not jobs:
        logger.info("No queued jobs")
        return 0

    logger.info("Found %d queued jobs", len(jobs))
    for job in jobs:
        try:
            process_job(sb, job)
        except Exception as e:
            logger.error("Failed to process job %s: %s", job["id"], e)
            sb.table("submissions").update({
                "status": "failed",
                "updated_at": "now()",
            }).eq("id", job["id"]).execute()

    return len(jobs)


def main():
    parser = argparse.ArgumentParser(description="BacklinkPilot submission worker")
    parser.add_argument("--loop", action="store_true", help="Run in polling loop")
    parser.add_argument("--interval", type=int, default=30, help="Poll interval in seconds")
    args = parser.parse_args()

    sb = get_supabase()

    if args.loop:
        logger.info("Starting worker loop (interval=%ds)", args.interval)
        while True:
            try:
                run_once(sb)
            except Exception as e:
                logger.error("Loop error: %s", e)
            time.sleep(args.interval)
    else:
        run_once(sb)


if __name__ == "__main__":
    main()

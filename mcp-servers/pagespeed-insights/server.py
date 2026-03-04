"""
PageSpeed Insights MCP Server

Provides tools for fetching, parsing, and comparing Google PageSpeed Insights
reports for Shopify theme performance optimization.

Usage:
    mcp dev server.py                    # Development mode
    uv run server.py                     # Direct run (stdio transport)
    python server.py --storage-dir /path # Custom storage directory
"""

import json
import sys
import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
import hashlib

import httpx
from mcp.server.fastmcp import FastMCP

# Logging — stderr only (stdout is reserved for MCP JSON-RPC)
logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("psi-mcp")

# Storage directory for audit history
STORAGE_DIR = Path(os.environ.get("PSI_STORAGE_DIR", ".claude/performance"))

PSI_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
PSI_API_KEY = os.environ.get("PSI_API_KEY", "")  # Optional — free tier works without it
REQUEST_TIMEOUT = 90.0  # PSI can be slow

mcp = FastMCP("pagespeed-insights")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_storage() -> Path:
    """Create storage directory if it doesn't exist. Returns the path."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR


def _url_prefix(url: str) -> str:
    """Build a stable, collision-resistant filename prefix from a URL."""
    parsed = urlparse(url)
    slug = parsed.netloc.replace(".", "-")
    path_slug = parsed.path.strip("/").replace("/", "-")[:30] or "homepage"
    # Add a short hash to avoid collisions (e.g., /a-b vs /a/b, or query strings)
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"{slug}_{path_slug}_{url_hash}"


def _strip_for_storage(data: dict) -> dict:
    """Strip bulky fields from PSI response before saving. Keeps what we need for
    metrics extraction and comparison, drops raw network/trace data."""
    lr = data.get("lighthouseResult", {})
    return {
        "lighthouseResult": {
            "categories": lr.get("categories", {}),
            "audits": lr.get("audits", {}),
            "configSettings": lr.get("configSettings", {}),
            "fetchTime": lr.get("fetchTime", ""),
        },
        "id": data.get("id", ""),
        "analysisUTCTimestamp": data.get("analysisUTCTimestamp", ""),
    }


def _save_audit(url: str, strategy: str, data: dict) -> str:
    """Save an audit result to disk. Returns the filename."""
    storage = _ensure_storage()

    prefix = _url_prefix(url)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    filename = f"{prefix}_{strategy}_{timestamp}.json"
    filepath = storage / filename

    stripped = _strip_for_storage(data)
    filepath.write_text(json.dumps(stripped, indent=2))
    logger.info(f"Saved audit to {filepath}")
    return str(filepath)


def _load_latest_audit(url: str, strategy: str) -> dict | None:
    """Load the most recent audit for a given URL and strategy."""
    storage = _ensure_storage()

    prefix = f"{_url_prefix(url)}_{strategy}_"

    matching = sorted(
        [f for f in storage.iterdir() if f.name.startswith(prefix) and f.suffix == ".json"],
        key=lambda f: f.name,
        reverse=True,
    )

    if not matching:
        return None

    try:
        return json.loads(matching[0].read_text())
    except json.JSONDecodeError:
        logger.warning(f"Corrupt audit file: {matching[0]} — skipping")
        return None


def _load_audit_file(filepath: str) -> dict:
    """Load an audit from a specific file path."""
    try:
        return json.loads(Path(filepath).read_text())
    except json.JSONDecodeError as e:
        raise ValueError(f"Corrupt JSON in {filepath}: {e}")


async def _fetch_psi(url: str, strategy: str) -> dict[str, Any]:
    """Fetch a PageSpeed Insights report from the API."""
    params = {
        "url": url,
        "strategy": strategy,
        "category": "performance",
    }
    if PSI_API_KEY:
        params["key"] = PSI_API_KEY

    async with httpx.AsyncClient() as client:
        response = await client.get(
            PSI_API_BASE,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )

        data = response.json()

        if "error" in data:
            error_msg = data["error"].get("message", "Unknown API error")
            error_code = data["error"].get("code", "")
            raise RuntimeError(f"PSI API error ({error_code}): {error_msg}")

        if "lighthouseResult" not in data:
            raise RuntimeError("PSI API returned an unexpected response — no lighthouseResult found.")

        return data


def _extract_metrics(data: dict) -> dict:
    """Extract core metrics from a PSI response."""
    lr = data.get("lighthouseResult", {})
    score = lr.get("categories", {}).get("performance", {}).get("score")

    metrics = {}
    for audit_key, label in [
        ("largest-contentful-paint", "LCP"),
        ("cumulative-layout-shift", "CLS"),
        ("total-blocking-time", "TBT"),
        ("first-contentful-paint", "FCP"),
        ("speed-index", "SI"),
    ]:
        audit = lr.get("audits", {}).get(audit_key, {})
        metrics[label] = {
            "display": audit.get("displayValue", "N/A"),
            "numeric": audit.get("numericValue", 0),
            "score": audit.get("score"),
        }

    return {
        "score": int(score * 100) if score is not None else 0,
        "metrics": metrics,
    }


def _extract_failed_audits(data: dict) -> list[dict]:
    """Extract all failed audits with their details."""
    lr = data.get("lighthouseResult", {})
    failed = []

    for key, audit in lr.get("audits", {}).items():
        s = audit.get("score")
        if s is not None and s < 1 and audit.get("scoreDisplayMode") != "notApplicable":
            items = audit.get("details", {}).get("items", [])

            # Extract flagged resources
            resources = []
            for item in items[:8]:
                resource = {}
                url = item.get("url", item.get("source", {}).get("url", ""))
                if url:
                    resource["url"] = url[:200]
                node = item.get("node", {})
                if node:
                    resource["element"] = node.get("snippet", "")[:120]
                    resource["selector"] = node.get("selector", "")[:100]
                wasted_bytes = item.get("wastedBytes")
                if wasted_bytes:
                    resource["wastedKB"] = round(wasted_bytes / 1024, 1)
                wasted_ms = item.get("wastedMs")
                if wasted_ms:
                    resource["wastedMs"] = round(wasted_ms)
                transfer_size = item.get("transferSize")
                if transfer_size:
                    resource["transferKB"] = round(transfer_size / 1024, 1)
                if resource:
                    resources.append(resource)

            failed.append({
                "id": key,
                "title": audit["title"],
                "score": round(s, 2),
                "displayValue": audit.get("displayValue", ""),
                "description": audit.get("description", "")[:200],
                "resourceCount": len(items),
                "resources": resources,
            })

    # Sort by score ascending (worst first)
    failed.sort(key=lambda x: x["score"])
    return failed


def _extract_third_party(data: dict) -> list[dict]:
    """Extract third-party script impact data."""
    lr = data.get("lighthouseResult", {})
    audit = lr.get("audits", {}).get("third-party-summary", {})
    items = audit.get("details", {}).get("items", [])

    third_parties = []
    for item in items:
        third_parties.append({
            "entity": item.get("entity", "Unknown"),
            "blockingTimeMs": round(item.get("blockingTime", 0)),
            "transferKB": round(item.get("transferSize", 0) / 1024, 1),
            "mainThreadTimeMs": round(item.get("mainThreadTime", 0)),
        })

    # Sort by blocking time descending
    third_parties.sort(key=lambda x: x["blockingTimeMs"], reverse=True)
    return third_parties


def _format_audit_report(url: str, strategy: str, data: dict) -> str:
    """Format a PSI response into a readable report string."""
    metrics = _extract_metrics(data)
    failed = _extract_failed_audits(data)
    third_parties = _extract_third_party(data)

    lines = [
        f"## PageSpeed Insights — {strategy.upper()}",
        f"**URL:** {url}",
        f"**Performance Score: {metrics['score']}/100**",
        "",
        "### Core Web Vitals",
        "| Metric | Value | Target |",
        "|--------|-------|--------|",
    ]

    targets = {"LCP": "< 2.5s", "CLS": "< 0.1", "TBT": "< 200ms", "FCP": "< 1.8s", "SI": "< 3.4s"}
    for label, target in targets.items():
        m = metrics["metrics"][label]
        lines.append(f"| {label} | {m['display']} | {target} |")

    # Failed audits grouped by impact
    if failed:
        high_impact_ids = {
            "largest-contentful-paint", "render-blocking-resources", "unused-javascript",
            "unused-css-rules", "offscreen-images", "uses-optimized-images",
            "modern-image-formats", "total-blocking-time",
        }
        medium_impact_ids = {
            "font-display", "uses-rel-preconnect", "efficient-animated-content",
            "unsized-images", "uses-responsive-images", "third-party-summary",
        }

        high = [a for a in failed if a["id"] in high_impact_ids]
        medium = [a for a in failed if a["id"] in medium_impact_ids]
        low = [a for a in failed if a["id"] not in high_impact_ids and a["id"] not in medium_impact_ids]

        lines.append("")
        lines.append(f"### Failed Audits ({len(failed)} total)")

        if high:
            lines.append("")
            lines.append("**High Impact:**")
            for a in high:
                lines.append(f"- **{a['title']}** — {a['displayValue']}")
                for r in a["resources"][:3]:
                    parts = []
                    if "url" in r:
                        parts.append(r["url"][:80])
                    if "element" in r:
                        parts.append(f"`{r['element'][:60]}`")
                    if "wastedKB" in r:
                        parts.append(f"saves {r['wastedKB']}KB")
                    if "wastedMs" in r:
                        parts.append(f"saves {r['wastedMs']}ms")
                    if parts:
                        lines.append(f"  - {' — '.join(parts)}")

        if medium:
            lines.append("")
            lines.append("**Medium Impact:**")
            for a in medium:
                lines.append(f"- **{a['title']}** — {a['displayValue']}")
                for r in a["resources"][:2]:
                    parts = []
                    if "url" in r:
                        parts.append(r["url"][:80])
                    if "element" in r:
                        parts.append(f"`{r['element'][:60]}`")
                    if parts:
                        lines.append(f"  - {' — '.join(parts)}")

        if low:
            lines.append("")
            lines.append("**Low Impact:**")
            for a in low:
                lines.append(f"- {a['title']} — {a['displayValue']}")

    # Third-party summary
    if third_parties:
        lines.append("")
        lines.append("### Third-Party Scripts")
        lines.append("| Source | Blocking Time | Transfer Size |")
        lines.append("|--------|---------------|---------------|")
        for tp in third_parties[:10]:
            lines.append(f"| {tp['entity']} | {tp['blockingTimeMs']}ms | {tp['transferKB']}KB |")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------

@mcp.tool()
async def psi_audit(url: str, strategy: str = "mobile") -> str:
    """Run a full Google PageSpeed Insights audit on a URL.

    Fetches the PSI report, parses core metrics, failed audits, and third-party
    script impact. Saves the result to local storage for later comparison.

    Args:
        url: The publicly accessible URL to audit (e.g., https://store.myshopify.com)
        strategy: Test strategy — "mobile" or "desktop". Defaults to "mobile".
    """
    if strategy not in ("mobile", "desktop"):
        return f"Error: strategy must be 'mobile' or 'desktop', got '{strategy}'"

    logger.info(f"Fetching PSI report for {url} ({strategy})...")

    try:
        data = await _fetch_psi(url, strategy)
    except RuntimeError as e:
        return f"Error: {e}"
    except httpx.TimeoutException:
        return f"Error: Request timed out after {REQUEST_TIMEOUT}s. The PSI API may be slow — try again."
    except Exception as e:
        return f"Error fetching PSI data: {e}"

    # Save to disk
    filepath = _save_audit(url, strategy, data)

    # Format the report
    report = _format_audit_report(url, strategy, data)
    report += f"\n\n---\n*Audit saved to `{filepath}`*"

    return report


@mcp.tool()
async def psi_audit_full(url: str) -> str:
    """Run PageSpeed Insights for both mobile AND desktop in one call.

    Fetches both reports, presents them together, and saves both to local storage.

    Args:
        url: The publicly accessible URL to audit (e.g., https://store.myshopify.com)
    """
    results = []
    fetched = {}  # strategy -> data, for in-memory combined summary

    for strategy in ("mobile", "desktop"):
        logger.info(f"Fetching PSI report for {url} ({strategy})...")
        try:
            data = await _fetch_psi(url, strategy)
        except RuntimeError as e:
            results.append(f"## {strategy.upper()}\n\nError: {e}")
            continue
        except httpx.TimeoutException:
            results.append(f"## {strategy.upper()}\n\nError: Request timed out.")
            continue
        except Exception as e:
            results.append(f"## {strategy.upper()}\n\nError: {e}")
            continue

        fetched[strategy] = data
        filepath = _save_audit(url, strategy, data)
        report = _format_audit_report(url, strategy, data)
        report += f"\n\n*Saved to `{filepath}`*"
        results.append(report)

    # Combined summary — use in-memory data, not disk, to avoid stale mixing
    summary = "\n\n---\n\n## Combined Summary\n\n"
    if "mobile" in fetched and "desktop" in fetched:
        mm = _extract_metrics(fetched["mobile"])
        dm = _extract_metrics(fetched["desktop"])
        summary += "| Metric | Mobile | Desktop | Target |\n"
        summary += "|--------|--------|---------|--------|\n"
        summary += f"| Score | **{mm['score']}**/100 | **{dm['score']}**/100 | |\n"

        targets = {"LCP": "< 2.5s", "CLS": "< 0.1", "TBT": "< 200ms", "FCP": "< 1.8s", "SI": "< 3.4s"}
        for label, target in targets.items():
            summary += f"| {label} | {mm['metrics'][label]['display']} | {dm['metrics'][label]['display']} | {target} |\n"
    elif len(fetched) == 1:
        summary += "*Combined summary not available — one strategy failed.*\n"

    return "\n\n---\n\n".join(results) + summary


@mcp.tool()
async def psi_opportunities(url: str, strategy: str = "mobile") -> str:
    """Get actionable performance opportunities from the latest audit.

    Returns only the failed audits sorted by impact, with specific flagged
    resources. Use this for the /diagnose step to map issues to fixes.

    If no stored audit exists, fetches a fresh one.

    Args:
        url: The URL to get opportunities for
        strategy: "mobile" or "desktop". Defaults to "mobile".
    """
    if strategy not in ("mobile", "desktop"):
        return f"Error: strategy must be 'mobile' or 'desktop', got '{strategy}'"

    # Try loading from storage first
    data = _load_latest_audit(url, strategy)
    if not data:
        logger.info(f"No stored audit found, fetching fresh data...")
        try:
            data = await _fetch_psi(url, strategy)
            _save_audit(url, strategy, data)
        except Exception as e:
            return f"Error: {e}"

    failed = _extract_failed_audits(data)
    third_parties = _extract_third_party(data)
    metrics = _extract_metrics(data)

    lines = [
        f"## Opportunities — {strategy.upper()} (Score: {metrics['score']}/100)",
        "",
    ]

    if not failed:
        lines.append("No failed audits — all performance checks pass.")
        return "\n".join(lines)

    # Classify into fixable vs third-party vs platform
    shopify_platform_scripts = {"shopify", "shopify cdn", "shopify web pixels"}

    lines.append(f"### Theme Code Fixes ({len(failed)} audits failing)")
    lines.append("")

    for i, audit in enumerate(failed, 1):
        lines.append(f"**{i}. {audit['title']}** (score: {audit['score']})")
        if audit["displayValue"]:
            lines.append(f"   Value: {audit['displayValue']}")
        lines.append(f"   Audit ID: `{audit['id']}`")

        if audit["resources"]:
            lines.append(f"   Flagged resources ({audit['resourceCount']} total):")
            for r in audit["resources"]:
                parts = []
                if "url" in r:
                    parts.append(r["url"][:100])
                if "element" in r:
                    parts.append(f"`{r['element'][:60]}`")
                if "wastedKB" in r:
                    parts.append(f"saves {r['wastedKB']}KB")
                if "wastedMs" in r:
                    parts.append(f"saves {r['wastedMs']}ms")
                lines.append(f"   - {' | '.join(parts)}")
        lines.append("")

    if third_parties:
        lines.append("### Third-Party Scripts (Client Action Required)")
        lines.append("")
        for tp in third_parties:
            if tp["blockingTimeMs"] > 0:
                lines.append(f"- **{tp['entity']}** — {tp['blockingTimeMs']}ms blocking, {tp['transferKB']}KB")
        lines.append("")

    return "\n".join(lines)


@mcp.tool()
async def psi_compare(url: str, strategy: str = "mobile", before_file: str = "", after_file: str = "") -> str:
    """Compare two PageSpeed Insights audits to show before/after deltas.

    By default, compares the two most recent audits for the given URL and strategy.
    Optionally, specify exact file paths for before and after audits.

    Args:
        url: The URL that was audited
        strategy: "mobile" or "desktop". Defaults to "mobile".
        before_file: Optional path to the before-audit JSON file. If empty, uses the second most recent.
        after_file: Optional path to the after-audit JSON file. If empty, uses the most recent.
    """
    if strategy not in ("mobile", "desktop"):
        return f"Error: strategy must be 'mobile' or 'desktop', got '{strategy}'"

    # Load audits
    if before_file and after_file:
        try:
            before_data = _load_audit_file(before_file)
            after_data = _load_audit_file(after_file)
        except (FileNotFoundError, ValueError) as e:
            return f"Error: {e}"
    else:
        # Find the two most recent audits for this URL/strategy
        storage = _ensure_storage()
        prefix = f"{_url_prefix(url)}_{strategy}_"

        matching = sorted(
            [f for f in storage.iterdir() if f.name.startswith(prefix) and f.suffix == ".json"],
            key=lambda f: f.name,
            reverse=True,
        )

        if len(matching) < 2:
            return (
                f"Error: Need at least 2 audits to compare. Found {len(matching)} for {url} ({strategy}).\n"
                f"Run `psi_audit` again after making changes to create a second audit."
            )

        try:
            after_data = json.loads(matching[0].read_text())
            before_data = json.loads(matching[1].read_text())
        except json.JSONDecodeError as e:
            return f"Error: Corrupt audit file — {e}"

    # Extract metrics
    before = _extract_metrics(before_data)
    after = _extract_metrics(after_data)

    # Build comparison
    score_delta = after["score"] - before["score"]
    score_emoji = "+" if score_delta > 0 else ""

    lines = [
        f"## Before/After Comparison — {strategy.upper()}",
        f"**URL:** {url}",
        "",
        f"### Score: {before['score']} → {after['score']} ({score_emoji}{score_delta})",
        "",
        "### Core Web Vitals",
        "| Metric | Before | After | Change | Target |",
        "|--------|--------|-------|--------|--------|",
    ]

    targets = {"LCP": "< 2.5s", "CLS": "< 0.1", "TBT": "< 200ms", "FCP": "< 1.8s", "SI": "< 3.4s"}
    for label, target in targets.items():
        bm = before["metrics"][label]
        am = after["metrics"][label]
        delta = am["numeric"] - bm["numeric"]

        if label == "CLS":
            delta_str = f"{delta:+.3f}"
        elif label == "TBT":
            delta_str = f"{delta:+.0f}ms"
        else:
            delta_str = f"{delta / 1000:+.2f}s" if abs(delta) > 100 else f"{delta:+.0f}ms"

        status = "improved" if delta < 0 else ("same" if delta == 0 else "regressed")
        lines.append(f"| {label} | {bm['display']} | {am['display']} | {delta_str} ({status}) | {target} |")

    # Audit diffs
    before_failed = {a["id"]: a["title"] for a in _extract_failed_audits(before_data)}
    after_failed = {a["id"]: a["title"] for a in _extract_failed_audits(after_data)}

    fixed = set(before_failed.keys()) - set(after_failed.keys())
    regressed = set(after_failed.keys()) - set(before_failed.keys())
    still_failing = set(before_failed.keys()) & set(after_failed.keys())

    if fixed:
        lines.append("")
        lines.append("### Audits Fixed")
        for key in fixed:
            lines.append(f"- {before_failed[key]}")

    if regressed:
        lines.append("")
        lines.append("### Audits Regressed (new failures)")
        for key in regressed:
            lines.append(f"- {after_failed[key]}")

    if still_failing:
        lines.append("")
        lines.append(f"### Still Failing ({len(still_failing)} audits)")
        for key in still_failing:
            lines.append(f"- {after_failed[key]}")

    if not fixed and not regressed:
        lines.append("")
        lines.append("### No audit changes detected")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Allow custom storage dir via CLI arg
    for i, arg in enumerate(sys.argv):
        if arg == "--storage-dir" and i + 1 < len(sys.argv):
            STORAGE_DIR = Path(sys.argv[i + 1])

    mcp.run()

# PageSpeed Insights MCP Server

MCP server that provides Google PageSpeed Insights tools for Claude Code. Used by the `shopify-performance-standards` plugin.

## Setup

### 1. Install dependencies

```bash
cd mcp-servers/pagespeed-insights
uv venv && source .venv/bin/activate
uv pip install -e .
```

### 2. Add to Claude Code settings

Add this to your project's `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "psi": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/mcp-servers/pagespeed-insights", "server.py"],
      "env": {}
    }
  }
}
```

Replace `/path/to/` with the actual path to this repo.

### 3. (Optional) Add a Google API key

For higher rate limits (400 vs 25 requests per 100 seconds):

```json
{
  "mcpServers": {
    "psi": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/mcp-servers/pagespeed-insights", "server.py"],
      "env": {
        "PSI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Get a free key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — enable the PageSpeed Insights API.

## Tools

| Tool | Description |
|------|-------------|
| `psi_audit` | Run a PSI audit for one strategy (mobile or desktop) |
| `psi_audit_full` | Run both mobile AND desktop in one call |
| `psi_opportunities` | Get actionable failed audits sorted by impact |
| `psi_compare` | Compare two audits (before/after) with delta for every metric |

## Storage

Audit results are saved to `.claude/performance/` in the project directory. This enables:
- `/verify` comparing before/after without re-fetching
- History of audits per page over time
- `/report` accessing all data for the client report

Override the storage directory with `PSI_STORAGE_DIR` env var.

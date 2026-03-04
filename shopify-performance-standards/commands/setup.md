---
description: One-time setup for the performance plugin. Configures the PageSpeed Insights MCP server in the current project.
allowed-tools: Read, Write, Bash
---

# Setup — Configure PSI MCP Server

You are setting up the PageSpeed Insights MCP server for this project. This is a one-time step required before `/audit`, `/diagnose`, or `/verify` can work.

## Process

### Step 1: Find the MCP Server Path
The MCP server lives inside the plugin marketplace repo. Determine the absolute path to `mcp-servers/pagespeed-insights/` by checking where this plugin is installed from.

Run this to find the plugin source:
```bash
find ~/.claude / -path "*/mcp-servers/pagespeed-insights/server.py" -maxdepth 8 2>/dev/null | head -5
```

If no results, ask the user for the path to the `shopify-standards-marketplace` repo.

### Step 2: Check if MCP Server Dependencies are Installed
Run:
```bash
cd <mcp-server-directory> && uv venv && uv pip install -e . 2>&1
```

If `uv` is not available, tell the user:
> You need `uv` installed. Run: `curl -LsSf https://astral.sh/uv/install.sh | sh`

### Step 3: Write the MCP Config
Read the current `.claude/settings.json` in the project directory (create it if it doesn't exist). Merge the `psi` MCP server config into the existing `mcpServers` object — do NOT overwrite other servers that may already be configured.

The config to add:
```json
{
  "mcpServers": {
    "psi": {
      "command": "uv",
      "args": ["run", "--directory", "<absolute-path-to-mcp-servers/pagespeed-insights>", "server.py"],
      "env": {}
    }
  }
}
```

### Step 4: Confirm
Tell the user:

> PSI MCP server configured. Restart Claude Code for the MCP server to load.
>
> You can now use:
> - `/audit <url>` — Fetch PageSpeed Insights scores
> - `/diagnose` — Map issues to theme fixes
> - `/optimize` — Execute performance fixes
> - `/verify <url>` — Compare before/after scores
> - `/report` — Generate client-facing report

## Rules
- Never overwrite existing MCP server configs — merge into the existing object
- Always use absolute paths in the MCP config
- If `.claude/settings.json` doesn't exist, create it with just the mcpServers config

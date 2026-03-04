---
description: One-time setup for the performance plugin. Configures the PageSpeed Insights MCP server in the current project.
allowed-tools: Read, Write, Bash
---

# Setup — Configure PSI MCP Server

You are setting up the PageSpeed Insights MCP server for this project. This is a one-time step required before `/audit`, `/diagnose`, or `/verify` can work.

## Process

### Step 1: Ask for API Key
Ask the user:

> To use PageSpeed Insights, you need a free Google API key.
>
> **If you already have one**, paste it here.
>
> **If you need one** (takes 2 minutes):
> 1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
> 2. Create a project (or use existing)
> 3. Enable "PageSpeed Insights API" (APIs & Services → Library)
> 4. Create an API key (APIs & Services → Credentials → Create Credentials → API Key)
>
> This gives you 25,000 free requests/day.

Wait for the user to provide the key before proceeding.

### Step 2: Write the MCP Config
Read the current `.mcp.json` in the project root (create it if it doesn't exist). Merge the `psi` MCP server config into the existing `mcpServers` object — do NOT overwrite other servers that may already be configured.

The config to add:
```json
{
  "mcpServers": {
    "psi": {
      "command": "npx",
      "args": ["-y", "-p", "pino-pretty", "-p", "pagespeed-insights-mcp", "pagespeed-insights-mcp"],
      "env": {
        "GOOGLE_API_KEY": "<user's API key>"
      }
    }
  }
}
```

### Step 3: Add .mcp.json to .gitignore
Check if `.mcp.json` is in `.gitignore`. If not, add it — the file contains the API key and should NOT be committed.

```bash
grep -q '.mcp.json' .gitignore 2>/dev/null || echo '.mcp.json' >> .gitignore
```

### Step 4: Confirm
Tell the user:

> PSI MCP server configured. **Restart Claude Code** for the MCP server to load.
>
> After restart, you can use:
> - `/audit <url>` — Fetch PageSpeed Insights scores
> - `/diagnose` — Map issues to theme fixes
> - `/optimize` — Execute performance fixes
> - `/verify <url>` — Compare before/after scores
> - `/report` — Generate client-facing report

## Rules
- Never overwrite existing MCP server configs — merge into the existing object
- Always add `.mcp.json` to `.gitignore` (it contains the API key)
- If `.mcp.json` doesn't exist, create it with just the mcpServers config
- The server alias MUST be `psi` — all commands reference tools as `mcp__psi__*`

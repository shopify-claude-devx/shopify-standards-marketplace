# claude-tracker

Universal usage analytics plugin for Claude Code. Tracks tokens, models, skills, agents, tools, and sessions across any project and device.

## Installation

```bash
# Add the marketplace (if not already added)
/plugin marketplace add shopify-claude-devx/shopify-standards-marketplace

# Install the plugin
/plugin install claude-tracker@shopify-standards --scope user
```

Use `--scope user` to enable tracking across all projects on your machine.

## What is tracked

| Metric | How | When |
|---|---|---|
| **Sessions** | SessionStart hook | Once per new session |
| **Tokens** | Transcript parsing (Stop hook) | After every response |
| **Models** | Transcript parsing | After every response |
| **Skills used** | Transcript parsing (Skill tool_use blocks) | After every response |
| **Agents used** | Transcript parsing (Agent tool_use blocks) | After every response |
| **Tool usage** | Transcript parsing (all tool_use blocks) | After every response |
| **Message count** | Transcript parsing (assistant messages) | After every response |
| **Project** | Git repo name or directory name | Every event |
| **User identity** | Git config email/name, falls back to system username | Every event |

## User identity

The plugin resolves user identity in this order:
1. `git config user.email` / `git config user.name` (preferred)
2. `whoami@hostname` / `whoami` (fallback when git is not configured)

## API

Events are sent to the analytics API at:
```
POST https://j32l7w0fjb.execute-api.ap-south-1.amazonaws.com/Prod/analytics/ingest
```

Two event types:
- `session_start` — sent once per new session
- `session_update` — sent after every Claude response with cumulative stats

All requests include `"token": "claude-tracker"` for authentication.

## Privacy

- No prompt content is tracked — only counts and metadata
- No file contents are read — only tool names and counts
- All data is sent over HTTPS
- Failures are silent and non-blocking

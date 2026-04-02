#!/bin/bash
# Shopify Theme Toolkit — Skill Analytics Hook
# Reads PostToolUse hook input from stdin, sends to Google Sheets webhook.

# ========================
# PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BELOW
WEBHOOK_URL="YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"
# ========================

# Exit silently if webhook not configured
if [[ "$WEBHOOK_URL" == "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE" ]]; then
  exit 0
fi

# Read hook input from stdin
input=$(cat)

# Extract fields from hook input JSON
skill_name=$(echo "$input" | jq -r '.tool_input.skill // .tool_input.skill_name // "unknown"')
success=$(echo "$input" | jq -r '.success // true')
duration_ms=$(echo "$input" | jq -r '.duration_ms // 0')
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')

# Build payload with user/machine context
payload=$(jq -n \
  --arg user "$USER" \
  --arg machine "$(hostname -s)" \
  --arg skill_name "$skill_name" \
  --arg success "$success" \
  --arg duration_ms "$duration_ms" \
  --arg session_id "$session_id" \
  --arg event_type "skill_invocation" \
  --arg plugin "shopify-theme-toolkit" \
  '{
    event_type: $event_type,
    user: $user,
    machine: $machine,
    skill_name: $skill_name,
    success: ($success == "true"),
    duration_ms: ($duration_ms | tonumber),
    session_id: $session_id,
    plugin: $plugin
  }')

# Send to Google Sheets (async, don't block Claude)
curl -s -L -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$payload" > /dev/null 2>&1 &

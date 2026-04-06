#!/bin/bash
# Shopify Theme Toolkit - Usage Tracking Hook
# Fires on every PostToolUse(Skill) event via ~/.claude/settings.json
# Sends: skill name, git user, project name, timestamp → Google Sheets

set -euo pipefail

# Read hook payload from stdin
input=$(cat)

# Extract skill name from tool_input
skill=$(echo "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('skill', ''))
except Exception:
    print('')
" 2>/dev/null)

# Exit silently if no skill was captured
[ -z "$skill" ] && exit 0

# Only track shopify-theme-toolkit skills — ignore all other plugins
VALID_SKILLS="clarify plan execute test code-review fix figma compare research understand liquid-standards section-standards css-standards js-standards theme-architecture"
[[ ! " $VALID_SKILLS " =~ " $skill " ]] && exit 0

# Exit silently if tracking is not configured
[ -z "${SHOPIFY_TOOLKIT_TRACKING_URL:-}" ] && exit 0

# Collect context
user=$(git config user.name 2>/dev/null || echo "unknown")
project=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || basename "$(pwd)")
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
token="${SHOPIFY_TOOLKIT_TOKEN:-}"

# Build JSON payload safely via python3 (handles special chars in user/project)
payload=$(SKILL="$skill" USER_NAME="$user" PROJECT="$project" TS="$timestamp" TOKEN="$token" \
  python3 -c "
import json, os
print(json.dumps({
    'skill':     os.environ['SKILL'],
    'user':      os.environ['USER_NAME'],
    'project':   os.environ['PROJECT'],
    'timestamp': os.environ['TS'],
    'token':     os.environ['TOKEN']
}))
")

# Send to Google Sheets (fire-and-forget, never block Claude)
curl -s --max-time 5 -X POST "$SHOPIFY_TOOLKIT_TRACKING_URL" \
  -H "Content-Type: application/json" \
  -d "$payload" > /dev/null 2>&1 || true

exit 0

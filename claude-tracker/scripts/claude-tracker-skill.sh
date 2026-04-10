#!/bin/bash
# Claude Tracker — UserPromptSubmit hook script
# Tracks skill invocations from user-typed /skill commands

input=$(cat)

# Extract prompt
prompt=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('prompt',''))" 2>/dev/null)

# Match any /skill or /plugin:skill pattern
skill=$(echo "$prompt" | python3 -c "
import sys, re
p = sys.stdin.read().strip()
m = re.match(r'^/([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)?)', p)
if m:
    print(m.group(1))
else:
    print('')
" 2>/dev/null)

[ -z "$skill" ] && exit 0

session_id=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null)

# Resolve identity
user_email=$(git config user.email 2>/dev/null || echo "$(whoami)@$(hostname -s 2>/dev/null || echo local)")
user_name=$(git config user.name 2>/dev/null || whoami 2>/dev/null || echo unknown)
project=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || basename "$(pwd)")
ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build payload
payload=$(SKILL="$skill" SESSION_ID="$session_id" USER_EMAIL="$user_email" USER_NAME="$user_name" PROJECT="$project" TS="$ts" python3 -c "
import json, os
print(json.dumps({
    'event_type': 'skill_invocation',
    'skill': os.environ['SKILL'],
    'session_id': os.environ['SESSION_ID'],
    'user_email': os.environ['USER_EMAIL'],
    'user_name': os.environ['USER_NAME'],
    'project': os.environ['PROJECT'],
    'timestamp': os.environ['TS'],
    'token': 'claude-tracker',
}))
")

# Send to API
curl -s --max-time 5 -X POST \
  'https://j32l7w0fjb.execute-api.ap-south-1.amazonaws.com/Prod/analytics/ingest' \
  -H 'Content-Type: application/json' \
  -d "$payload" > /dev/null 2>&1

exit 0

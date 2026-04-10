#!/bin/bash
# Claude Tracker — SessionStart hook script
# Sends session_start event to analytics API

input=$(cat)

# Only fire on startup (not resume/clear/compact)
source_type=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('source',''))" 2>/dev/null)
[ "$source_type" != "startup" ] && exit 0

session_id=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null)
model=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('model','unknown'))" 2>/dev/null)

# Resolve identity
user_email=$(whoami 2>/dev/null || echo "unknown")
user_name=$(git config user.name 2>/dev/null || whoami 2>/dev/null || echo unknown)
project=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || basename "$(pwd)")
ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build payload
payload=$(SESSION_ID="$session_id" USER_EMAIL="$user_email" USER_NAME="$user_name" PROJECT="$project" TS="$ts" MODEL="$model" python3 -c "
import json, os
print(json.dumps({
    'event_type': 'session_start',
    'session_id': os.environ['SESSION_ID'],
    'user_email': os.environ['USER_EMAIL'],
    'user_name': os.environ['USER_NAME'],
    'project': os.environ['PROJECT'],
    'models_used': [os.environ['MODEL']],
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

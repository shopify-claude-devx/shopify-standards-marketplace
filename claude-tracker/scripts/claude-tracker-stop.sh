#!/bin/bash
# Claude Tracker — Stop hook script
# Parses transcript, sends session_update to analytics API

input=$(cat)

# Extract transcript_path and session_id from stdin JSON
transcript=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('transcript_path',''))" 2>/dev/null)
session_id=$(echo "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null)

# Validate
[ -z "$transcript" ] && exit 0
[ ! -f "$transcript" ] && exit 0
[ -z "$session_id" ] && exit 0

# Resolve identity
user_email=$(whoami 2>/dev/null || echo "unknown")
user_name=$(git config user.name 2>/dev/null || whoami 2>/dev/null || echo unknown)
project=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null)
[ -z "$project" ] && project=$(basename "$(pwd)")
ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse transcript
result=$(TRANSCRIPT="$transcript" python3 - << 'PYEOF'
import json, os

total = 0
models = set()
skills = {}
agents = {}
tools = {}
msg_count = 0
seen_ids = set()
session_name = ""

with open(os.environ["TRANSCRIPT"]) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)

        # Extract session name
        if d.get("type") == "custom-title" and d.get("customTitle"):
            session_name = d["customTitle"]
            continue

        # Scan user messages for /skill slash commands
        if d.get("type") == "user":
            msg = d.get("message", {})
            if isinstance(msg, dict):
                content = msg.get("content", "")
                if isinstance(content, str):
                    import re
                    m = re.search(r'<command-name>/([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)?)</command-name>', content)
                    if m:
                        sk = m.group(1)
                        skills[sk] = skills.get(sk, 0) + 1
            continue

        if d.get("type") != "assistant":
            continue
        msg = d.get("message", {})
        if not isinstance(msg, dict):
            continue
        msg_id = msg.get("id", "")

        # Collect tool_use blocks from ALL fragments (not duplicated)
        content = msg.get("content", [])
        if isinstance(content, list):
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                tn = block.get("name", "")
                tools[tn] = tools.get(tn, 0) + 1
                inp = block.get("input", {})
                if tn == "Skill":
                    sk = inp.get("skill", "unknown") if isinstance(inp, dict) else "unknown"
                    skills[sk] = skills.get(sk, 0) + 1
                elif tn == "Agent":
                    at = inp.get("subagent_type", "general-purpose") if isinstance(inp, dict) else "general-purpose"
                    agents[at] = agents.get(at, 0) + 1

        # Count tokens/models/messages only once per unique message ID
        if msg_id and msg_id not in seen_ids:
            seen_ids.add(msg_id)
            u = msg.get("usage")
            if u:
                total += u.get("input_tokens", 0) + u.get("output_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
            m = msg.get("model")
            if m and m != "<synthetic>":
                models.add(m)
            msg_count += 1

print(json.dumps({
    "total_tokens": total,
    "models_used": sorted(models),
    "skills_used": skills,
    "agents_used": agents,
    "tools_used": tools,
    "message_count": msg_count,
    "session_name": session_name,
}))
PYEOF
)

[ -z "$result" ] && exit 0

# Build payload
payload=$(USER_EMAIL="$user_email" USER_NAME="$user_name" PROJECT="$project" TS="$ts" SESSION_ID="$session_id" RESULT="$result" python3 -c "
import json, os
r = json.loads(os.environ['RESULT'])
print(json.dumps({
    'event_type': 'session_update',
    'session_id': os.environ['SESSION_ID'],
    'session_name': r['session_name'],
    'user_email': os.environ['USER_EMAIL'],
    'user_name': os.environ['USER_NAME'],
    'project': os.environ['PROJECT'],
    'total_tokens': r['total_tokens'],
    'models_used': r['models_used'],
    'skills_used': r['skills_used'],
    'agents_used': r['agents_used'],
    'tools_used': r['tools_used'],
    'message_count': r['message_count'],
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

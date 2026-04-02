#!/bin/bash
input=$(cat)
skill=$(echo "$input" | jq -r '.prompt // empty' | grep -oE '^/[a-zA-Z0-9_-]+(:[a-z-]+)?' | sed 's/.*:/\//' | head -1)

[ -z "$skill" ] && exit 0

user="$USER"
email=$(git config user.email 2>/dev/null || echo "unknown")
payload=$(jq -n --arg user "$user" --arg email "$email" --arg skill "$skill" '{user:$user,email:$email,skill:$skill}')

curl -sS -L \
  -H 'Content-Type: application/json' \
  -d "$payload" \
  'https://script.google.com/macros/s/AKfycby6SsDovb3BtHNWDIsnY1dGiUPkXGeD8qClIukP3JS0PmxOkCnW05G9eJkdSWaHYII6DA/exec' \
  >/dev/null 2>&1 &

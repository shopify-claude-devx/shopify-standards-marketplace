#!/bin/bash
# Shopify Theme Toolkit - One-time tracking setup for team members
# Run once per machine: bash setup.sh
# Requires: tracking URL + token from your team lead

set -euo pipefail

TRACKING_DIR="$HOME/.claude/shopify-tracking"
SETTINGS_FILE="$HOME/.claude/settings.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "Shopify Theme Toolkit - Usage Tracking Setup"
echo "============================================"
echo ""

# --- Prompt for credentials ---
read -rp "Tracking URL (from team lead): " tracking_url
read -rp "Tracking token (from team lead): " tracking_token
echo ""

if [ -z "$tracking_url" ] || [ -z "$tracking_token" ]; then
  echo "ERROR: URL and token are required. Get them from your team lead."
  exit 1
fi

# --- Detect shell profile ---
if [ -f "$HOME/.zshrc" ]; then
  shell_profile="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  shell_profile="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
  shell_profile="$HOME/.bash_profile"
else
  shell_profile="$HOME/.zshrc"
fi

# --- Add env vars to shell profile (skip if already present) ---
if ! grep -q "SHOPIFY_TOOLKIT_TRACKING_URL" "$shell_profile" 2>/dev/null; then
  cat >> "$shell_profile" << EOF

# Shopify Theme Toolkit - Usage Tracking
export SHOPIFY_TOOLKIT_TRACKING_URL="$tracking_url"
export SHOPIFY_TOOLKIT_TOKEN="$tracking_token"
EOF
  echo "[1/3] Env vars added to $shell_profile"
else
  echo "[1/3] Env vars already present in $shell_profile — skipping"
fi

# --- Copy tracking script to ~/.claude/shopify-tracking/ ---
mkdir -p "$TRACKING_DIR"
cp "$SCRIPT_DIR/track-skill.sh" "$TRACKING_DIR/track-skill.sh"
chmod +x "$TRACKING_DIR/track-skill.sh"
echo "[2/3] Tracking script installed to $TRACKING_DIR/"

# --- Merge hook into ~/.claude/settings.json ---
# Creates the file if it doesn't exist, merges if it does

[ -f "$SETTINGS_FILE" ] || echo '{}' > "$SETTINGS_FILE"

python3 << 'PYTHON'
import json, os, sys

settings_path = os.path.expanduser("~/.claude/settings.json")

with open(settings_path, 'r') as f:
    try:
        settings = json.load(f)
    except json.JSONDecodeError:
        settings = {}

new_hook = {
    "matcher": "Skill",
    "hooks": [
        {
            "type": "command",
            "command": "bash ~/.claude/shopify-tracking/track-skill.sh"
        }
    ]
}

if "hooks" not in settings:
    settings["hooks"] = {}
if "PostToolUse" not in settings["hooks"]:
    settings["hooks"]["PostToolUse"] = []

# Check if hook already installed
already_installed = any(
    any(
        "shopify-tracking/track-skill.sh" in h.get("command", "")
        for h in entry.get("hooks", [])
    )
    for entry in settings["hooks"]["PostToolUse"]
    if isinstance(entry, dict)
)

if already_installed:
    print("[3/3] Hook already present in ~/.claude/settings.json — skipping")
else:
    settings["hooks"]["PostToolUse"].append(new_hook)
    with open(settings_path, 'w') as f:
        json.dump(settings, f, indent=2)
    print("[3/3] Hook added to ~/.claude/settings.json")
PYTHON

echo ""
echo "Setup complete."
echo "Restart Claude Code for the tracking hook to activate."
echo ""
echo "Your git name '$(git config user.name 2>/dev/null || echo "(not set — run: git config --global user.name \"Your Name\")")' will appear in the team dashboard."
echo ""

#!/usr/bin/env bash
# validate-skill.sh — Mechanical validation of a Claude Code SKILL.md file
# Usage: validate-skill.sh <path-to-skill-directory>
# Exit code 0 = all checks pass, 1 = failures found

set -euo pipefail

SKILL_DIR="${1:?Usage: validate-skill.sh <path-to-skill-directory>}"
SKILL_FILE="$SKILL_DIR/SKILL.md"
ERRORS=()
WARNINGS=()

# ── Check SKILL.md exists ──────────────────────────────────────────────
if [[ ! -f "$SKILL_FILE" ]]; then
    echo "FATAL: $SKILL_FILE does not exist."
    exit 1
fi

CONTENT="$(cat "$SKILL_FILE")"

# ── Check frontmatter exists and is delimited correctly ────────────────
if [[ "$CONTENT" != ---* ]]; then
    ERRORS+=("FRONTMATTER: File does not start with '---'. Frontmatter is missing or malformed.")
else
    # Extract frontmatter block (between first and second ---)
    FRONTMATTER="$(echo "$CONTENT" | sed -n '1,/^---$/p' | tail -n +2)"
    # Check closing ---
    CLOSING_COUNT="$(echo "$CONTENT" | grep -c '^---$')"
    if [[ "$CLOSING_COUNT" -lt 2 ]]; then
        ERRORS+=("FRONTMATTER: Missing closing '---' delimiter.")
    else
        # ── Validate frontmatter fields ────────────────────────────────
        VALID_FIELDS="name|description|argument-hint|disable-model-invocation|user-invocable|allowed-tools|model|effort|context|agent|hooks"

        while IFS= read -r line; do
            # Skip empty lines and comments
            [[ -z "$line" || "$line" == \#* ]] && continue
            # Extract field name (before the colon)
            FIELD="$(echo "$line" | grep -oP '^[a-zA-Z][a-zA-Z0-9_-]*(?=\s*:)' || true)"
            if [[ -n "$FIELD" ]]; then
                if ! echo "$FIELD" | grep -qP "^($VALID_FIELDS)$"; then
                    ERRORS+=("FRONTMATTER: Unknown field '$FIELD'. Valid fields: name, description, argument-hint, disable-model-invocation, user-invocable, allowed-tools, model, effort, context, agent, hooks.")
                fi
            fi
        done <<< "$FRONTMATTER"

        # ── Validate specific field values ─────────────────────────────

        # Helper: extract a frontmatter field value (returns empty string if field absent)
        get_field() {
            echo "$FRONTMATTER" | grep -P "^${1}\s*:" | head -1 | sed "s/^${1}\s*:\s*//" | xargs 2>/dev/null || echo ""
        }

        # name: lowercase, hyphens, numbers only, max 64 chars
        NAME_VAL="$(get_field name)"
        if [[ -n "$NAME_VAL" ]]; then
            if ! echo "$NAME_VAL" | grep -qP '^[a-z0-9-]{1,64}$'; then
                ERRORS+=("FIELD name: '$NAME_VAL' is invalid. Must be lowercase letters, numbers, and hyphens only, max 64 characters.")
            fi
        fi

        # disable-model-invocation: must be true or false
        DMI_VAL="$(get_field disable-model-invocation)"
        if [[ -n "$DMI_VAL" && "$DMI_VAL" != "true" && "$DMI_VAL" != "false" ]]; then
            ERRORS+=("FIELD disable-model-invocation: '$DMI_VAL' is invalid. Must be 'true' or 'false'.")
        fi

        # user-invocable: must be true or false
        UI_VAL="$(get_field user-invocable)"
        if [[ -n "$UI_VAL" && "$UI_VAL" != "true" && "$UI_VAL" != "false" ]]; then
            ERRORS+=("FIELD user-invocable: '$UI_VAL' is invalid. Must be 'true' or 'false'.")
        fi

        # effort: must be low, medium, high, or max
        EFFORT_VAL="$(get_field effort)"
        if [[ -n "$EFFORT_VAL" ]]; then
            if ! echo "$EFFORT_VAL" | grep -qP '^(low|medium|high|max)$'; then
                ERRORS+=("FIELD effort: '$EFFORT_VAL' is invalid. Must be 'low', 'medium', 'high', or 'max'.")
            fi
        fi

        # context: must be fork if set
        CTX_VAL="$(get_field context)"
        if [[ -n "$CTX_VAL" && "$CTX_VAL" != "fork" ]]; then
            ERRORS+=("FIELD context: '$CTX_VAL' is invalid. Only valid value is 'fork'.")
        fi

        # description: warn if missing
        DESC_VAL="$(get_field description)"
        if [[ -z "$DESC_VAL" ]]; then
            WARNINGS+=("FIELD description: Missing. Recommended so Claude knows when to use this skill.")
        fi
    fi
fi

# ── Check file size (line count) ───────────────────────────────────────
LINE_COUNT="$(wc -l < "$SKILL_FILE")"
if [[ "$LINE_COUNT" -gt 500 ]]; then
    WARNINGS+=("SIZE: SKILL.md is $LINE_COUNT lines. Recommended max is 500. Move detailed reference to supporting files.")
elif [[ "$LINE_COUNT" -gt 400 ]]; then
    WARNINGS+=("SIZE: SKILL.md is $LINE_COUNT lines. Approaching the 500-line recommended limit.")
fi

# ── Check for referenced supporting files that don't exist ─────────────
# Look for markdown links like [text](filename) and !`script` references
REFERENCED_FILES=()

# Markdown links: [text](relative-path) — exclude URLs
while IFS= read -r ref; do
    REFERENCED_FILES+=("$ref")
done < <(grep -oP '\[.*?\]\(\K[^)]+' "$SKILL_FILE" | grep -v '^http' | grep -v '^#' || true)

# Script references: !`command path`
while IFS= read -r ref; do
    # Extract file paths from commands (heuristic: look for paths with extensions)
    SCRIPT_PATH="$(echo "$ref" | grep -oP '\S+\.\w+' | head -1 || true)"
    if [[ -n "$SCRIPT_PATH" ]]; then
        REFERENCED_FILES+=("$SCRIPT_PATH")
    fi
done < <(grep -oP '!\`[^`]+\`' "$SKILL_FILE" || true)

for REF in "${REFERENCED_FILES[@]}"; do
    # Resolve relative to skill directory
    if [[ ! -f "$SKILL_DIR/$REF" && ! -f "$REF" ]]; then
        ERRORS+=("MISSING FILE: '$REF' is referenced in SKILL.md but does not exist in $SKILL_DIR/ or as an absolute path.")
    fi
done

# ── Output results ─────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  Skill Validation Report: $SKILL_DIR"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "File: $SKILL_FILE"
echo "Lines: $LINE_COUNT"
echo ""

if [[ ${#ERRORS[@]} -eq 0 && ${#WARNINGS[@]} -eq 0 ]]; then
    echo "✅ All mechanical checks passed."
    echo ""
    exit 0
fi

if [[ ${#ERRORS[@]} -gt 0 ]]; then
    echo "❌ ERRORS (${#ERRORS[@]}):"
    for err in "${ERRORS[@]}"; do
        echo "   • $err"
    done
    echo ""
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo "⚠️  WARNINGS (${#WARNINGS[@]}):"
    for warn in "${WARNINGS[@]}"; do
        echo "   • $warn"
    done
    echo ""
fi

if [[ ${#ERRORS[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi
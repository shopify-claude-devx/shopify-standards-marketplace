---
name: clickup
description: >
  Ingest a ClickUp task into the theme pipeline. Given a ClickUp task ID or URL,
  fetches the title, description, comments (with threaded replies), embedded mockup
  images, custom fields, and subtasks; downloads the images locally; and writes a
  clickup-context.md artifact. Then routes to /clarify (for features) or /fix (for
  bugs). Handles a single task, multiple IDs, or a parent with subtasks. Use as the
  first step whenever work originates from a ClickUp task.
disable-model-invocation: true
argument-hint: "[clickup-task-id | url] — comma-separated for multiple"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, mcp__claude_ai_ClickUp__clickup_get_task, mcp__claude_ai_ClickUp__clickup_get_task_comments, mcp__claude_ai_ClickUp__clickup_get_threaded_comments
---

# ClickUp — Task Context Ingestion

You are entering the ClickUp intake phase. Your job is to pull everything a ClickUp task knows — title, description, mockups, comments, subtasks — into a structured artifact the pipeline can consume, then hand off to the right next step.

**Do NOT write code. Do NOT plan implementation. Do NOT suggest technical approaches. Only fetch, download, structure, and route.**

**Do NOT assume or hallucinate task content. Only record what the ClickUp API returns. If a field is empty, leave it empty.**

## Input
The task reference(s): `$ARGUMENTS`

Accepted forms (all map to a task ID):
- Bare ID: `86d3gp26j` or a custom ID like `DEV-1234`
- Full URL: `https://app.clickup.com/t/86d3gp26j` → take the segment after `/t/`
- Labelled: a line `Clickup ID: 86d3gp26j` or `Clickup IDs: 86d3gp26j, 86d3c625r`
- Multiple: comma- or newline-separated IDs/URLs

If no argument is provided, ask the user for a ClickUp task ID or URL before proceeding.

---

## Step 1: Verify the ClickUp MCP is connected

Before anything else, confirm the ClickUp MCP tools are available by making the first `clickup_get_task` call in Step 2. If the tool is unavailable / the server is not connected, stop and tell the user:

```
ClickUp MCP server not connected.
Connect ClickUp as an MCP server (e.g. via your Claude integrations / `claude mcp add`),
then re-run /clickup with the task ID.
```

> The tool names in this skill's `allowed-tools` match a ClickUp connection named `claude_ai_ClickUp`. If yours is connected under a different server name, the calls still work — you may just be prompted to approve them once.

---

## Step 2: Fetch each task

For every parsed task ID, call:

```
clickup_get_task(task_id, include: ["description", "custom_fields", "checklists", "subtasks", "linked_tasks", "dependencies"])
```

Capture these fields from the response:
- `name` — the task title
- `markdown_description` — **use this, not `text_content`**. `text_content` strips out image links; `markdown_description` contains the embedded `![](…)` mockup URLs you need.
- `status`, `priority`, `tags`, `assignees`, `task_type`
- `list`, `folder`, `space`, `url`
- `custom_fields`, `checklists`, `linked_tasks`, `dependencies`
- `subtasks` — array of child tasks (see Step 4)

If a task ID is invalid or returns an error, report it clearly and continue with the remaining IDs.

---

## Step 3: Resolve scope (single / multiple / parent)

Decide what these tasks represent before fetching deeper:

**One leaf task** (no subtasks) → it is the feature/bug. Proceed.

**Multiple IDs given** → use `AskUserQuestion`:
- **Merge into one feature** — synthesize all tasks into a single `clickup-context.md` under one feature folder.
- **Treat as separate features** — one artifact folder per task; you will report a suggested order at the end and the user runs the pipeline per task.

**One parent with subtasks** → the parent is the umbrella. Decide which subtasks to deep-fetch (Step 4).

---

## Step 4: Deep-fetch subtasks (when present)

The `subtasks` array from Step 2 contains each child's `id`, `name`, `status`, and `task_type` — but its `description` and `text_content` come back **empty**. To get a subtask's full body and mockups you MUST call `clickup_get_task` again on that subtask's ID.

Use `AskUserQuestion` to decide (unless the user already specified via a `Subtasks:` line in the input):
- **All** — deep-fetch every subtask
- **None** — ingest the parent only; list subtasks as titles for reference
- **Specific** — deep-fetch only the subtask IDs the user names

For each subtask to deep-fetch, call `clickup_get_task(subtask_id, include: ["description"])` and capture the same fields as Step 2. If a subtask has its own `subtasks_count > 0`, recurse the same way.

---

## Step 5: Fetch comments

For each task (and each deep-fetched subtask), call:

```
clickup_get_task_comments(task_id)
```

For any comment with `reply_count > 0`, call `clickup_get_threaded_comments(comment_id)` to pull the replies. Capture commenter, timestamp, and text. Comments often contain mockup images too — scan their text for `![](…)` URLs in Step 6.

---

## Step 6: Download embedded images

Mockups live as markdown image links inside `markdown_description` and comment text, pointing at ClickUp's public CDN (`*.clickup-attachments.com`). These URLs are publicly downloadable — **no auth token needed**.

For each task being ingested:

1. Extract every image URL — match `![…](URL)` where URL contains `clickup-attachments.com`.
2. Create the image directory and download each one:
   ```bash
   mkdir -p .buildspace/artifacts/{feature}/clickup-images
   curl -sS -o .buildspace/artifacts/{feature}/clickup-images/{source}-{n}.png "{URL}"
   ```
   Name them by source for traceability: `description-1.png`, `description-2.png`, `comment-1.png`, and for subtasks `{subtask-slug}-1.png`.
3. After download, use the `Read` tool to **view each image** and confirm it loaded (PNG/JPEG, not an error page). Briefly note what each shows (e.g. "PDP delivery-date UI mockup").
4. If a download fails (non-200, zero bytes), report the URL and keep its link in the context doc so it isn't lost.

If a task has no embedded images, note that and move on — not every task has mockups.

---

## Step 7: Set up the artifact folder

Derive a short kebab-case feature name from the task title (e.g. `Build UI for PIN Code TAT check` → `pin-code-tat`; a bug like `PDP UI appears broken` → `pdp-render-fix`).

```bash
mkdir -p .buildspace/artifacts/{feature}/clickup-images
echo "{feature}" > .buildspace/current-feature
```

Use `Glob('.buildspace/artifacts/*/clickup-context.md')` to check for an existing feature with the same name. If one exists, confirm with the user before overwriting.

For **batch mode** (separate features), repeat this per task with its own feature name; do not write `current-feature` until the user picks which one to start.

---

## Step 8: Write clickup-context.md

Read the template from `${CLAUDE_SKILL_DIR}/templates/clickup-context-template.md` and fill it in with the real fetched data. Write it to `.buildspace/artifacts/{feature}/clickup-context.md`.

Fill every section from the API response. Do not invent values — if a field was empty, omit its row. Reference each downloaded image by its saved path. For merged multi-task features, include one "Task" block per source task. For a parent with subtasks, list the parent context, then a block per deep-fetched subtask.

---

## Step 9: Classify and route

Determine whether this is a **feature** or a **bug** so you route to the right skill:
- `task_type == "Bug"` → bug
- otherwise → feature
- if ambiguous (mixed batch, no task_type), use `AskUserQuestion` to confirm

Then tell the user where things were saved and the next step:

**Feature:**
```
ClickUp context ingested → .buildspace/artifacts/{feature}/clickup-context.md
Images: .buildspace/artifacts/{feature}/clickup-images/

→ Run /clarify to define requirements (it will read clickup-context.md automatically).
  Remaining: /clarify → /plan → /execute → /assess
```

**Bug:**
```
ClickUp context ingested → .buildspace/artifacts/{feature}/clickup-context.md
Images: .buildspace/artifacts/{feature}/clickup-images/

→ Run /fix to diagnose and repair (it will read clickup-context.md automatically).
  Remaining: /fix → /assess
```

**Batch (separate features/bugs):** list each artifact folder and a suggested order, then tell the user to run the relevant skill on the first one. Note that `current-feature` is not set until they choose.

**Do NOT output the full task contents in conversation beyond a 1-2 line summary per task. The clickup-context.md artifact is the source of truth.**

---

## Rules
- Never write implementation code — this skill only ingests context
- Never guess task content — record only what the ClickUp API returns; empty stays empty
- Always use `markdown_description` (has image links), never `text_content`
- Subtask list view has empty descriptions — always deep-fetch a subtask by ID to get its body
- ClickUp attachment URLs are public — download with plain `curl`, no token
- Always `Read` downloaded images to confirm they loaded before recording them
- Route bugs to /fix and features to /clarify — confirm when ambiguous
- For multiple IDs, always ask merge-vs-batch before writing artifacts

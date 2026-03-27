# Section Schema Standards — Rules & Checklist

## Rules
- Schema order: name → class → settings → blocks → presets
- **All identifiers under 25 characters** (name, class, IDs, labels, block types, block names, preset names)
- Section name: Title Case
- Section class: kebab-case + `-section` suffix
- Setting IDs: `snake_case` with section/block context prefix (never generic like `image` or `title`)
- Setting labels: Title Case, section-specific
- Setting types: text (short), textarea (multi-line), richtext (formatted HTML), image_picker, video, video_url, url, select (3-7 options), checkbox (boolean), range (numeric), color, color_scheme
- Groups order using headers: Content → Style → Advanced
- Within groups: Media first (desktop then mobile) → Content → Actions
- Block type: kebab-case, block name: Title Case, must match (different format only)
- Block settings follow same ID/label conventions with block context prefix
- Presets: always at least one, name matches section name exactly
- Use abbreviations when prefix makes IDs exceed 25 chars

## Checklist

### Structure
- [ ] Schema order: name, class, settings, blocks, presets
- [ ] Section name: Title Case
- [ ] Section class: kebab-case with `-section` suffix

### Character Length (all under 25 characters)
- [ ] Section name: under 25 chars
- [ ] Section class: under 25 chars
- [ ] All setting IDs: under 25 chars (use abbreviations if prefix makes it long)
- [ ] All setting labels: under 25 chars
- [ ] All block types: under 25 chars
- [ ] All block names: under 25 chars
- [ ] Preset name: under 25 chars

### Setting IDs & Labels
- [ ] All IDs use `snake_case` with section/block context prefix
- [ ] No generic IDs (`image`, `title`, `text`)
- [ ] All labels use Title Case
- [ ] Labels are section-specific, never generic

### Blocks
- [ ] Block type: kebab-case
- [ ] Block name: Title Case
- [ ] Block name and type match (different format only)
- [ ] Block settings follow same ID/label conventions with block context prefix

### Presets
- [ ] At least one preset defined
- [ ] Preset name matches section name

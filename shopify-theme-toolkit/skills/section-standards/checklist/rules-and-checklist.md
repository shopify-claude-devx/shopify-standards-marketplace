# Section Standards — Rules & Checklist

## Rules
- File order: CSS asset call → HTML → JS asset call → Schema
- Wrapper: `<div class="{section-name}">` — class matches filename exactly
- No extra attributes on wrapper unless JS functionality requires them
- Blocks: always rendered via `{% render %}` snippets, never inline HTML
- Snippet name matches block type (`hero-banner-slide` block → `hero-banner-slide.liquid`)
- Multiple block types: `case/when` pattern (not if/elsif)
- Section settings = non-repeatable (background, heading, layout)
- Blocks = repeatable content (slides, cards, testimonials)
- Each section fully self-contained: own CSS, own JS, no cross-section dependencies
- Shared code goes in snippets, not duplicated across sections

## Checklist

### File Structure
- [ ] File order: CSS → HTML → JS → Schema
- [ ] Wrapper `<div>` class matches section filename
- [ ] No extra attributes on wrapper unless JS functionality requires them

### Block Rendering
- [ ] Blocks rendered via `{% render %}` snippets — NEVER inline HTML
- [ ] Snippet name matches block type
- [ ] `case/when` used for multiple block types (not if/elsif)

### Section Independence
- [ ] Section has its own CSS file
- [ ] Section has its own JS file (if interactive)
- [ ] No dependency on another section's assets
- [ ] Works regardless of page template or position

### Settings
- [ ] Repeatable content uses blocks, not section settings
- [ ] Non-repeatable content uses section settings, not blocks

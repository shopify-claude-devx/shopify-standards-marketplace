---
name: section-schema-standards
description: >
  Shopify section schema standards for {% schema %} blocks. Apply whenever writing, modifying, or
  reviewing any {% schema %} JSON in section files — including adding new settings, creating blocks,
  defining presets, or auditing naming conventions for consistency. Covers structure order, class
  naming, setting ID/label conventions, type selection, block patterns, and preset requirements.
---

# Section Schema Standards

## Schema Structure Order
Every section schema follows this order:
1. `name`
2. `class`
3. `settings`
4. `blocks`
5. `presets`

A consistent order makes schemas scannable across all sections — developers always know where to find settings vs blocks vs presets without scrolling through the entire schema.

## Section Name
- Use Title Case matching the section's purpose: `"name": "Hero Banner"`

## Section Class
- Kebab-case with `-section` suffix
- Derived from the section name: `"class": "hero-banner-section"`

The `-section` suffix distinguishes the Shopify-generated wrapper element from the section's internal CSS classes, preventing naming collisions with BEM block classes inside the section.

## Setting IDs
- Always `snake_case`
- Always prefix with section and block context — never use generic IDs

Shopify's theme editor flattens settings from all sections into a single namespace for metafield references and Liquid access. Generic IDs like `image` collide when multiple sections appear on the same page, while `hero_banner_slide_desktop_image` is instantly traceable to its source section. Prefixed IDs also make Liquid code self-documenting — `section.settings.hero_banner_heading` tells you exactly what you're accessing without checking the schema.

- The ID should read as: `section_block_element`

```
✅ hero_banner_slide_desktop_image
✅ hero_banner_slide_button_text
✅ hero_banner_slide_button_url

❌ image
❌ desktop_image
❌ button_text
```

## Setting Labels
- Use Title Case
- Always section-specific — never generic
- Label should mirror the ID in readable form

Labels appear in the Shopify theme editor where merchants customize their store. Section-specific labels like 'Hero Banner Slide Desktop Image' help merchants understand exactly which part of the page they're editing, while generic labels like 'Image' are ambiguous when the editor shows settings from multiple sections.

```
ID: hero_banner_slide_desktop_image
Label: "Hero Banner Slide Desktop Image"

ID: hero_banner_slide_button_text
Label: "Hero Banner Slide Button Text"

❌ "Image"
❌ "Desktop Image"
❌ "Button Text"
```

## Setting Types — When to Use What
- `text` — short single-line content (headings, button text)
- `textarea` — multi-line content (descriptions)
- `richtext` — when merchants need basic formatting (bold, italic, links)
- `image_picker` — always prefer over URL fields for images
- `video` — for Shopify-hosted video
- `video_url` — for external video URLs (YouTube, Vimeo)
- `url` — for links; supports Shopify's link picker
- `select` — when there are 3-7 predefined options
- `checkbox` — for boolean on/off settings
- `range` — for numeric values with min/max
- `color` — for color pickers
- `color_scheme` — when integrating with theme color scheme system

Note: `richtext` outputs HTML — use it when the merchant needs bold/italic/links and you handle the HTML output in Liquid (usually rendering directly in a container). Use `textarea` when you want plain multi-line text without formatting markup. Use `text` for short single-line values that should never contain HTML.

## Settings Grouping Order
When a section has many settings, group them using `"header"` type in this order:
1. **Content** settings first (text, images, videos)
2. **Style** settings second (colors, layout options)
3. **Advanced** settings last (custom classes, visibility toggles)

## Settings Order Within Groups
Follow a logical flow within each group:
1. Media (images, videos) — desktop first, then mobile
2. Content (text, richtext)
3. Actions (button text, button URL)

---

## Blocks

### Block Type
- Kebab-case: `"type": "hero-banner-slide"`

### Block Name
- Title Case: `"name": "Hero Banner Slide"`
- Block name and type must be the same — just different format (Title Case vs kebab-case)

Matching names and types ensures the theme editor label corresponds exactly to what developers see in code. When a merchant sees 'Hero Banner Slide' in the editor and a developer sees `hero-banner-slide` in Liquid, there's zero ambiguity about what they're referring to.

- Name should be meaningful, derived from both the section name and block purpose

```
Section: "Hero Banner"
Block type: "hero-banner-slide"
Block name: "Hero Banner Slide"

Section: "Testimonials"
Block type: "testimonial-card"
Block name: "Testimonial Card"

❌ type: "slide" (too generic)
❌ name: "Slide" (too generic)
```

### Block Settings
Follow the same ID and label conventions as section settings. Prefix with the block context.

Block settings share the same flat namespace as section settings in the Shopify admin's internal APIs. The full context prefix prevents collisions between identically-named settings in different block types.

```
Block type: "hero-banner-slide"
Setting ID: hero_banner_slide_desktop_image
Setting Label: "Hero Banner Slide Desktop Image"
```

---

## Presets
- Always define at least one preset

Presets make the section available in the theme editor's 'Add section' menu. Without a preset, the section exists in code but merchants cannot add it to pages through the editor — it becomes invisible to non-technical users.

- Preset name matches the section name exactly

```json
"presets": [
  {
    "name": "Hero Banner"
  }
]
```

---

## Complete Example

```liquid
{% schema %}
{
  "name": "Hero Banner",
  "class": "hero-banner-section",
  "settings": [],
  "blocks": [
    {
      "type": "hero-banner-slide",
      "name": "Hero Banner Slide",
      "settings": [
        {
          "type": "image_picker",
          "id": "hero_banner_slide_desktop_image",
          "label": "Hero Banner Slide Desktop Image"
        },
        {
          "type": "image_picker",
          "id": "hero_banner_slide_mobile_image",
          "label": "Hero Banner Slide Mobile Image"
        },
        {
          "type": "video",
          "id": "hero_banner_slide_desktop_video",
          "label": "Hero Banner Slide Desktop Video"
        },
        {
          "type": "video",
          "id": "hero_banner_slide_mobile_video",
          "label": "Hero Banner Slide Mobile Video"
        },
        {
          "type": "richtext",
          "id": "hero_banner_slide_content",
          "label": "Hero Banner Slide Content"
        },
        {
          "type": "text",
          "id": "hero_banner_slide_button_text",
          "label": "Hero Banner Slide Button Text"
        },
        {
          "type": "url",
          "id": "hero_banner_slide_button_url",
          "label": "Hero Banner Slide Button URL"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Hero Banner"
    }
  ]
}
{% endschema %}
```

---

## Checklist

Validate every `{% schema %}` block against these.

### Structure
- [ ] Schema order: name, class, settings, blocks, presets
- [ ] Section name: Title Case
- [ ] Section class: kebab-case with `-section` suffix

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
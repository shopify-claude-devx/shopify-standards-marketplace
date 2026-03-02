---
name: section-schema-standards
description: Shopify section schema standards. MUST be followed when writing or modifying any {% schema %} block in section files. Covers schema structure order, section class naming, setting IDs (snake_case with context prefix), setting labels (Title Case), setting type selection, block type/name conventions, and preset requirements.
user-invocable: false
globs: ["sections/**/*.liquid"]
---

# Section Schema Standards

## Schema Structure Order
Every section schema follows this order:
1. `name`
2. `class`
3. `settings`
4. `blocks`
5. `presets`

## Section Name
- Use Title Case matching the section's purpose: `"name": "Hero Banner"`

## Section Class
- Kebab-case with `-section` suffix
- Derived from the section name: `"class": "hero-banner-section"`

## Setting IDs
- Always `snake_case`
- Always prefix with section and block context — never use generic IDs
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
Follow the same ID and label conventions as section settings. Prefix with the block context:

```
Block type: "hero-banner-slide"
Setting ID: hero_banner_slide_desktop_image
Setting Label: "Hero Banner Slide Desktop Image"
```

---

## Presets
- Always define at least one preset
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

## Reference Files
Check `references/patterns-learned.md` for schema patterns and gotchas discovered during development.
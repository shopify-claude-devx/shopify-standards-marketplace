# Figma-to-Code Translation Matrix

## Component Structure Mapping
| Figma Reference (React+Tailwind) | Shopify Theme Output |
|---|---|
| React component | Section `.liquid` file |
| Nested component | Snippet via `{% render %}` |
| Component props | Section schema settings |
| `className="..."` (Tailwind) | BEM classes in CSS asset file |
| `{children}` / slots | Block rendering via `{% render %}` snippets |
| Conditional rendering (`&&`, ternary) | `{% if %}` / `{% unless %}` |
| `.map()` loops | `{% for %}` loops |
| State / useState | Not applicable — use Liquid logic or JS with `data-` attributes |
| Event handlers | Vanilla JS in asset file with `defer` |

## Tailwind to CSS Translation
- Convert Tailwind utility classes to semantic BEM classes: `flex items-center gap-4` → `.section-name__container` with equivalent CSS properties
- Follow CSS property ordering: Layout → Flex/Grid → Sizing → Spacing → Typography → Visual → Effects → Responsive
- Use CSS custom properties for values from schema settings
- Never output Tailwind classes in Liquid templates

## JSX to Liquid Translation
```
// React JSX                          → Liquid equivalent
<div className="...">                 → <div class="section-name__element">
{title && <h2>{title}</h2>}           → {% if section.settings.title != blank %}<h2>{{ section.settings.title }}</h2>{% endif %}
{items.map(item => ...)}              → {% for item in section.settings.items %} ... {% endfor %}
<Component prop={value} />            → {% render 'snippet-name', prop: value %}
```

## Figma Layer to Schema Setting Types
| Figma Layer / Property | Schema Setting Type |
|---|---|
| Text layer | `text` or `richtext` (use `richtext` if formatting visible) |
| Image layer | `image_picker` |
| Color fill | `color` or `color_scheme` |
| Boolean visibility | `checkbox` |
| Text with number | `range` or `number` |
| Link / button | `url` (pair with `text` for label) |
| Dropdown / variant | `select` with options |
| Video layer | `video_url` |

## Repeating Elements → Blocks
- Figma layers that repeat with the same structure → section blocks
- Each unique variant of a repeating element → a block type
- Block type: `kebab-case`, block name: `Title Case`
- Setting IDs: snake_case with full section and block context prefix

## Naming Conventions
- Section setting IDs: `snake_case` with section context prefix
- Derive IDs from Figma layer name: layer "Hero Title" → `hero_title`
- Setting labels: Title Case, section-specific (never generic)

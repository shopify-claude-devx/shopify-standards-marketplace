---
name: liquid-standards
description: Enforces Liquid coding standards for Shopify theme development. Use when writing, reviewing, or modifying any Liquid template code (.liquid files).
---

# Liquid Coding Standards

## Variable Naming
- Use `snake_case` for all Liquid variable names
- Use descriptive names: `product_card_image` not `img` or `pi`
- Prefix captures with their context: `hero_title`, `card_price`, not just `title`, `price`

## Liquid Tag Style
Use `{% liquid %}` for logic-heavy blocks (3+ lines of logic). Use individual tags for simple single conditions wrapping HTML.

```liquid
# Logic block — use {% liquid %}
{% liquid
  assign featured_image = product.featured_image
  assign has_variants = product.variants.size > 1
  assign price = product.price | money_with_currency
%}

# Simple condition wrapping HTML — use individual tags
{% if section.settings.title != blank %}
  <h2>{{ section.settings.title }}</h2>
{% endif %}
```

## Render, Never Include
Always use `{% render %}`. Never use `{% include %}` — it is deprecated and breaks scope isolation.
- Pass only what the snippet needs: `{% render 'product-card', product: product, show_price: true %}`
- Never rely on parent scope inside a snippet

## Snippet Documentation
Every snippet must have a `{% doc %}` tag at the top documenting its props:

```liquid
{% doc %}
  @param {String} title - The card title
  @param {Object} product - The product object
  @param {Boolean} [show_price] - Whether to show price (optional)
{% enddoc %}
```

- Required params listed without brackets
- Optional params wrapped in `[brackets]`
- Always include type and description

## Null & Empty Checks
- Use `{% if variable != blank %}` for strings and objects
- Use `{% if collection.products.size > 0 %}` for collections and arrays
- Metafields must always have a check: `{% if product.metafields.custom.field != blank %}`
- Never output an object without checking if it exists first

## Whitespace Control
Use `{%-` and `-%}` on logic tags to prevent blank lines in rendered HTML. Do NOT use on output tags.

```liquid
{%- if product.available -%}
  <span>{{ product.price | money }}</span>
{%- endif -%}

{%- for item in collection.products -%}
  {{ item.title }}
{%- endfor -%}
```

Logic tags that get whitespace control: `if`, `elsif`, `else`, `endif`, `for`, `endfor`, `assign`, `capture`, `endcapture`, `case`, `when`, `endcase`, `liquid`, `unless`, `endunless`, `render`.

Output tags `{{ }}` stay as-is without whitespace stripping.

## Filters
- Use `| escape` on any user-generated content
- Use `| image_url` for all image source URLs, never construct URLs manually
- Use `| money_with_currency` for prices unless design explicitly requires otherwise
- Chain filters readably — if more than 3 filters, break across lines:
  ```liquid
  {{ product.title
    | strip_html
    | truncate: 50
    | escape
  }}
  ```

## Comments
Always use Liquid comments `{% comment %}{% endcomment %}`. Never use HTML comments `<!-- -->`.
- HTML comments are visible in page source — they leak information
- Comment the WHY of complex logic, not the WHAT

## Liquid Logic
- Keep logic minimal in templates — complex business logic should go in snippets
- Avoid deeply nested if/else (max 3 levels). Extract to snippets if deeper
- Use `case/when` instead of long `if/elsif` chains

## Performance
- Avoid unnecessary `for` loops — Liquid loops are expensive
- Use `limit` and `offset` on collection loops when full iteration isn't needed
- Pass only needed variables to snippets — don't pass entire objects when you only need one property

## Reference Files
Check `references/patterns-learned.md` for project-specific Liquid patterns and gotchas discovered during development.
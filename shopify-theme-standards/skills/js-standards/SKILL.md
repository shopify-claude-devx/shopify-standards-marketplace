---
name: js-standards
description: Vanilla JavaScript standards for Shopify theme development. Use when writing, reviewing, or modifying any JavaScript code in the theme.
---

# JavaScript Standards

## General Approach
This theme uses vanilla JavaScript only. No frameworks, no jQuery, no build-step JS libraries.

## File Organization
- Always use separate asset files for scripts (`assets/` directory)
- Never create inline `<script>` tags in Liquid files
- If a script needs values from Liquid, pass them via `data-` attributes on the HTML element and read them in JS:

```liquid
<div class="product-gallery" data-product-id="{{ product.id }}" data-images-count="{{ product.images.size }}">
```

```javascript
const gallery = document.querySelector('.product-gallery');
const productId = gallery.dataset.productId;
const imagesCount = parseInt(gallery.dataset.imagesCount);
```

## JS Loading
Always use `defer` on script tags regardless of fold position:

```liquid
<script src="{{ 'section-name-javascript.js' | asset_url }}" defer></script>
```

## Initialization Pattern
Use `DOMContentLoaded` as the default initialization pattern:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize section behavior
});
```

## Web Components — When to Use
Use Custom Elements only for **reusable interactive components** that appear in multiple places. Examples: `<accordion-element>`, `<cart-drawer>`, `<modal-dialog>`.

Do NOT use Web Components for one-off section scripts. Those use the `DOMContentLoaded` pattern above.

```javascript
class AccordionElement extends HTMLElement {
  connectedCallback() {
    // Initialize
  }

  disconnectedCallback() {
    // Cleanup event listeners
  }
}

if (!customElements.get('accordion-element')) {
  customElements.define('accordion-element', AccordionElement);
}
```

## Theme Editor Compatibility
Rely on Web Components for Theme Editor compatibility — `connectedCallback` and `disconnectedCallback` handle section load/unload automatically.

## Event Handling — Selectors
- Use `id` when targeting a single element on the page
- Use `classes` when targeting multiple elements

```javascript
// Single element
const header = document.getElementById('site-header');

// Multiple elements
const accordionItems = document.querySelectorAll('.accordion-item');
accordionItems.forEach(function(item) {
  item.addEventListener('click', handleAccordionClick);
});
```

## Naming
- Files: `kebab-case.js` (e.g., `product-gallery.js`, `cart-drawer.js`)
- Variables and functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Classes (Web Components): `PascalCase`
- Custom element tags: `kebab-case` (HTML spec requirement)

---

## Strict Rules

### 1. NO Styling via JavaScript
Never use inline styles via JavaScript. Always toggle CSS classes instead.

```javascript
// ❌ BAD
element.style.display = 'block';
element.style.opacity = '1';
Object.assign(element.style, { display: 'block', opacity: '1' });

// ✅ GOOD
element.classList.add('block', 'opacity-100');
element.classList.remove('hidden', 'opacity-0');

// ✅ ALSO GOOD — state classes
element.classList.add('is-open');
element.classList.remove('is-closed');
```

Never use Tailwind classes as query selectors in scripts.

### 2. NO DOM Element Creation via JavaScript
Never create HTML strings in JavaScript for rendering. Never use `innerHTML` with template strings for complex components. Let Liquid handle all markup.

```javascript
// ❌ BAD
function renderProductCard(product) {
    return `
        <div class="product-card">
            <img src="${product.image}" />
            <h3>${product.title}</h3>
            <p>$${product.price}</p>
        </div>
    `;
}
container.innerHTML = products.map(renderProductCard).join('');
```

```liquid
// ✅ GOOD — Liquid handles markup
{%- for product in products -%}
  {% render 'product-card', card_product: product %}
{%- endfor -%}
```

### 3. NO Price Formatting in JavaScript
Always use Liquid money filters for price display. Never format prices in JS.

```javascript
// ❌ BAD
const price = `$${(cents / 100).toFixed(2)}`;
```

```liquid
// ✅ GOOD
{{ product.price | money }}
```

### 4. NO Inline Scripts
Never create inline `<script>` tags in Liquid files. All JS lives in asset files.

---

## Comments
Don't write excessive unnecessary comments. Only comment when the WHY isn't obvious from the code itself. Clean, readable code is better than commented code.

## Reference Files
Check `references/patterns-learned.md` for JS patterns and issues discovered during development.
---
name: js-standards
description: Vanilla JavaScript standards for Shopify themes. Follow when writing, editing, or reviewing any .js file or script-related code. Covers modern ES syntax, defer loading, Web Components, data attributes for Liquid-to-JS, and strict rules — NO inline styles via JS, NO DOM creation, NO price formatting in JS, NO inline scripts.
user-invocable: false
---

# JavaScript Standards

## Core Rules

This theme uses **vanilla JavaScript only**. No frameworks, no jQuery, no build-step libraries.

### Modern ES Syntax — Always

- **`const` by default. `let` when reassignment is needed. Never `var`.**
- **Arrow functions as default.** Use function declarations only for Web Component methods and named hoisting.
- Destructuring for object/array access
- Template literals over string concatenation
- Optional chaining (`?.`) and nullish coalescing (`??`) over manual null checks
- `for...of` over `.forEach()` when no index needed

```javascript
// ✅ Correct
const gallery = document.querySelector('.product-gallery');
const { productId, imagesCount } = gallery.dataset;
const items = [...document.querySelectorAll('.item')];

const handleClick = (event) => {
  const { target } = event;
  target.classList.toggle('is-active');
};

// ❌ Wrong
var gallery = document.querySelector('.product-gallery');
var productId = gallery.getAttribute('data-product-id');
function handleClick(event) {
  event.target.classList.toggle('is-active');
}
```

## File Organization

- All JS lives in `assets/` directory as separate files
- Never create inline `<script>` tags in Liquid files
- Pass Liquid values to JS via `data-` attributes:

```liquid
<div class="product-gallery" data-product-id="{{ product.id }}" data-images-count="{{ product.images.size }}">
```

```javascript
const gallery = document.querySelector('.product-gallery');
const { productId, imagesCount } = gallery.dataset;
```

## Script Loading

Always `defer` regardless of fold position:

```liquid
<script src="{{ 'section-name.js' | asset_url }}" defer></script>
```

## Initialization Patterns

**One-off section scripts** — `DOMContentLoaded`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Initialize section behavior
});
```

**Reusable interactive components** (multiple places) — Web Components:

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

Web Components also handle Theme Editor compatibility — `connectedCallback`/`disconnectedCallback` manage section load/unload automatically.

Do NOT use Web Components for one-off section scripts.

## Strict Rules

### 1. NO Styling via JavaScript

Never inline styles. Toggle CSS classes instead:

```javascript
// ❌ element.style.display = 'block';
// ✅ element.classList.add('is-open');
// ✅ element.classList.remove('is-closed');
```

Never use Tailwind classes as query selectors.

### 2. NO DOM Creation via JavaScript

Never build HTML strings in JS. Never use `innerHTML` with templates for components. Liquid handles all markup.

### 3. NO Price Formatting in JavaScript

Always use Liquid money filters. Never format prices in JS.

```javascript
// ❌ const price = `$${(cents / 100).toFixed(2)}`;
```
```liquid
// ✅ {{ product.price | money }}
```

### 4. NO Inline Scripts

All JS lives in asset files. No `<script>` blocks in Liquid.

## Reference Files

- `references/js-checklist.md` — per-file validation checklist
- `references/patterns-learned.md` — project-specific JS patterns discovered during development
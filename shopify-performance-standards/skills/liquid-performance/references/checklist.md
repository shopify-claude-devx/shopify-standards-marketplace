# Liquid Performance Checklist

## Caching & Assigns
- [ ] Expensive objects (`product.featured_image`, `product.metafields`) assigned once, not accessed repeatedly
- [ ] Assigns that don't change are placed outside loops
- [ ] `all_products` lookups cached with `assign` (never accessed directly in loops)

## Loop Optimization
- [ ] Large collections use `limit` parameter on `for` loops
- [ ] No N+1 patterns (e.g., `product.metafields` inside collection loops)
- [ ] No `render`/`include` calls inside tight loops without necessity
- [ ] `render` used instead of `include` (isolated scope, more efficient)

## Pagination
- [ ] Collections are paginated (12-24 products, 6-12 blog posts)
- [ ] No unpaginated collection output
- [ ] Search results paginated

## DOM Size
- [ ] Target: under 1,500 DOM nodes per page
- [ ] Conditional rendering prevents unused DOM (disabled features don't render markup)
- [ ] No redundant wrapper `<div>` elements
- [ ] Mega menus render on interaction, not on page load (if possible)

## Expensive Operations
- [ ] `product.variants` not iterated without purpose
- [ ] `collection.products` not accessed without pagination
- [ ] Metafield lookups minimized and cached

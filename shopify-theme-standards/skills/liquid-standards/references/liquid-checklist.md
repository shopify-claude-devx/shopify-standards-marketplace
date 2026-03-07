# Liquid File Checklist

Validate every `.liquid` file against these before committing.

## Variable Naming
- [ ] All variables use `snake_case`
- [ ] Names are descriptive — no single-letter or abbreviated names
- [ ] Captures prefixed with context: `hero_title`, not `title`

## Tag Style
- [ ] Logic-heavy blocks (3+ lines) use `{% liquid %}` tag
- [ ] Simple single conditions wrapping HTML use individual tags
- [ ] `{% render %}` used everywhere — no `{% include %}` anywhere

## Snippet Documentation
- [ ] Every snippet has a `{% doc %}` tag at the top
- [ ] Required params listed without brackets
- [ ] Optional params wrapped in `[brackets]`
- [ ] Each param has type and description

## Null & Empty Checks
- [ ] Strings and objects checked with `!= blank`
- [ ] Collections and arrays checked with `.size > 0`
- [ ] Metafields always have a nil/blank check before use
- [ ] No raw object output without existence check

## Whitespace Control
- [ ] Logic tags use `{%-` and `-%}` whitespace stripping
- [ ] Output tags `{{ }}` do NOT have whitespace stripping

## Filters
- [ ] User-generated content uses `| escape`
- [ ] Image URLs use `| image_url` — never manually constructed
- [ ] Prices use `| money_with_currency` unless design requires otherwise
- [ ] Long filter chains (3+) broken across lines

## Comments
- [ ] All comments use `{% comment %}` — no HTML `<!-- -->` comments
- [ ] Comments explain WHY, not WHAT

## Performance
- [ ] No unnecessary `for` loops
- [ ] Collection loops use `limit`/`offset` when full iteration not needed
- [ ] Snippets receive only needed variables, not entire objects

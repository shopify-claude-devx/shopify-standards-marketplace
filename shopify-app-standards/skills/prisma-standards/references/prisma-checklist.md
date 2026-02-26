# Prisma Checklist

Expanded checklist for reviewing Prisma schema and queries. Read during `/assess` or code review.

## Schema Checklist

- [ ] Every model has `id`, `createdAt`, `updatedAt`
- [ ] Every relation has explicit `@relation` with `fields` and `references`
- [ ] Every relation has explicit `onDelete` behavior
- [ ] Every foreign key has `@@index`
- [ ] Money fields use `Decimal @db.Decimal(10, 2)` not Float
- [ ] Shopify GIDs stored as `String` not `Int`
- [ ] Long text/URLs use `@db.Text`
- [ ] Booleans have explicit `@default`
- [ ] Optional fields (`?`) only where null has distinct meaning
- [ ] Unique constraints added where business logic requires (`@@unique`)
- [ ] Session model untouched

## Query Checklist

- [ ] Every `findMany` has `take` limit or `where` clause
- [ ] Every `findUnique`/`findFirst` handles null return
- [ ] Every `create`/`update` includes all required fields
- [ ] Every `delete` catches `P2025` or verifies record exists
- [ ] No Prisma calls inside `.map()` or `forEach()` loops
- [ ] No Prisma calls in React components — only in `.server.ts`
- [ ] `select` used when full model not needed
- [ ] `include` used only when related data is needed
- [ ] `orderBy` present with pagination

## Error Handling Checklist

- [ ] Every Prisma call in loader/action wrapped in try/catch
- [ ] `P2002` returns "already exists" message
- [ ] `P2025` returns "not found" message
- [ ] `P2003` returns "related record missing" message
- [ ] No raw Prisma errors exposed to UI
- [ ] No empty catch blocks

## Transaction Checklist

- [ ] Multi-step operations use `prisma.$transaction()`
- [ ] All queries inside transaction use `tx` not `prisma`
- [ ] Timeout set for long transactions
- [ ] No nested transactions

## Migration Checklist

- [ ] Migration has descriptive name
- [ ] Generated SQL reviewed before committing
- [ ] No `db push` in production — only `migrate deploy`
- [ ] Required fields added with `@default` to existing tables
- [ ] No edited migration files after they've been applied

## Safety Checklist

- [ ] No `deleteMany({})` without explicit `where`
- [ ] No `updateMany({})` without explicit `where`
- [ ] No `$queryRaw` without `Prisma.sql` parameterization
- [ ] No `new PrismaClient()` outside `db.server.ts`
- [ ] No direct queries to Session table
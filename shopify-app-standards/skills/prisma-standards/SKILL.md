---
name: prisma-standards
description: Prisma ORM standards for Shopify Remix apps. MUST be followed when writing, editing, or generating any Prisma schema, database query, migration, or .server.ts file that interacts with the database. Covers db.server.ts singleton, schema design (naming, relations, indexes), query patterns (select, N+1 prevention, transactions), error handling (P2002/P2025/P2003), pagination, and the pre-commit checklist.
user-invocable: false
---

# Prisma Standards for Shopify Apps

## Before Writing Schema or Query Code

**Always check official sources first** — Prisma releases frequently and APIs change between major versions.

Search these before writing schema, queries, or migrations:
- `prisma.io/docs/orm/reference/prisma-schema-reference` — current schema syntax, attributes, types
- `prisma.io/docs/orm/prisma-client/queries` — current query API, filters, relations
- `prisma.io/docs/orm/more/best-practices` — official best practices (naming, pooling, N+1, security)
- `prisma.io/docs/orm/prisma-migrate` — migration workflow, dev vs deploy
- `prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections` — connection pooling, serverless

If you're unsure whether a Prisma API, attribute, or pattern is current — search before using it.

## db.server.ts — Singleton Pattern (Critical)

- Shopify Remix template uses `app/db.server.ts` — this is the ONLY place PrismaClient is instantiated
- Never create `new PrismaClient()` anywhere else — each instance creates a new connection pool
- Use the singleton pattern to prevent hot-reload connection exhaustion in dev:
  ```
  const prisma = global.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== "production") global.prisma = prisma;
  export default prisma;
  ```
- Import from `~/db.server` everywhere — loaders, actions, server utilities
- Never import PrismaClient directly in route files — always go through db.server

## Session Table — Do Not Modify

- The `Session` model in `prisma/schema.prisma` is managed by `@shopify/shopify-app-session-storage-prisma`
- Never rename, remove, or change field types on the Session model — it will break authentication
- Never query the Session table directly — use `authenticate.admin(request)` from shopify.server.ts
- You CAN add new models alongside Session — just don't touch Session itself

## Schema Design

### Naming
- Models: PascalCase singular — `Product`, `Order`, `SyncLog` (not `Products`, `orders`)
- Fields: camelCase — `createdAt`, `shopDomain`, `productGid`
- Map to snake_case DB columns with `@map` and `@@map` if needed for existing databases
- Enums: PascalCase name, SCREAMING_SNAKE values — `enum SyncStatus { PENDING IN_PROGRESS COMPLETED FAILED }`

### Every Model Must Have
- `id` — use `String @id @default(cuid())` for app models (not autoincrement — cuid is safer for distributed systems)
- `createdAt DateTime @default(now())` — always track creation time
- `updatedAt DateTime @updatedAt` — always track modification time
- At least one meaningful field beyond timestamps — don't create empty placeholder models

### Relations
- Always define BOTH sides of a relation — parent must have relation field, child must have foreign key
- Always add `@relation(fields: [foreignKeyId], references: [id])` explicitly — never rely on implicit
- Add `onDelete` behavior explicitly — `Cascade`, `SetNull`, or `Restrict`. Never leave it default without thinking about what happens when parent is deleted
- Index foreign keys — add `@@index([foreignKeyId])` on every relation scalar field. Without this, Prisma does full table scans on joins

### Field Types
- Use native database types where precision matters — `@db.VarChar(255)`, `@db.Text`, `@db.Decimal(10, 2)`
- Shopify GIDs (like `gid://shopify/Product/123`) — store as `String` not `Int`. GID format can change
- Money/currency — use `Decimal @db.Decimal(10, 2)`, never `Float` (floating point loses precision)
- URLs and long text — use `String @db.Text`, not bare `String` (some DBs default String to varchar(191))
- Boolean flags — always set `@default(false)` or `@default(true)` explicitly
- Optional fields — use `?` only when null has distinct meaning from empty/default

### Indexes
- Add `@@index` on every field you filter or sort by in queries — if it's in a `where` or `orderBy`, index it
- Add `@@unique` for business-logic uniqueness — e.g., `@@unique([shopDomain, productGid])` to prevent duplicates per shop
- Composite indexes — put the most selective field first
- Don't over-index — every index slows writes. Only index fields actually used in queries

## Queries

### Select Only What You Need
- Use `select` to pick specific fields when you don't need the full model — reduces data transfer
- Use `include` only when you need related models — every include is an additional query (or JOIN)
- Never use bare `findMany()` without `select`, `where`, or `take` — unbounded queries are dangerous

### Prevent N+1 Queries
- Never call Prisma inside a `.map()` or `forEach()` loop — this creates N+1 queries
- Use `include` to eager-load relations in the parent query instead
- For bulk lookups, use `findMany({ where: { id: { in: ids } } })` — one query, not N queries
- If you need data from two unrelated models, use `Promise.all([query1, query2])` — parallel, not sequential

### Transactions
- Use interactive transactions for multi-step operations that must succeed or fail together:
  ```
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { ... } });
    await tx.orderItem.createMany({ data: items });
    return order;
  });
  ```
- Pass `tx` (not `prisma`) to all queries inside the transaction — using `prisma` bypasses the transaction
- Set timeout for long transactions — `prisma.$transaction(fn, { timeout: 10000 })`
- Don't nest transactions — Prisma doesn't support savepoints. Flatten the logic

### Error Handling
- Wrap every Prisma call in try/catch in loaders and actions — database errors should never crash the app
- Catch `Prisma.PrismaClientKnownRequestError` for specific error codes:
  - `P2002` — unique constraint violation (duplicate record)
  - `P2025` — record not found (for update/delete operations)
  - `P2003` — foreign key constraint failed
- Return user-friendly errors to the UI — don't expose raw Prisma error messages
- Never leave catch blocks empty — handle the error or rethrow

### Pagination
- Always paginate list queries — use `take` and `skip`, or cursor-based pagination
- Never return all records — add a reasonable default limit (e.g., `take: 50`)
- For cursor-based: use `cursor: { id: lastId }, skip: 1, take: pageSize`
- Always pass `orderBy` with pagination — without it, order is not guaranteed

## Migrations

### Development
- `npx prisma migrate dev --name descriptive-name` — creates and applies migration locally
- Name migrations descriptively — `add-product-sync-table`, `add-shop-domain-index`, not `migration1`
- Review generated SQL in `prisma/migrations/*/migration.sql` before committing — Prisma can generate destructive operations
- Never edit migration files after they've been applied — create a new migration instead
- Run `npx prisma generate` after schema changes — regenerates the client types

### Production
- `npx prisma migrate deploy` — ONLY command for production. Never `migrate dev` or `db push` in production
- `migrate deploy` is non-interactive — safe for CI/CD, won't prompt to reset
- `db push` is for prototyping only — it can be destructive and skips migration history
- Always backup database before running migrations in production
- Test migrations on a staging database first

### Breaking Changes
- Adding a required field to existing model? Add with `@default` value, or make it optional first, backfill, then make required
- Renaming a field? Don't — add new field, migrate data, remove old field (3-step migration)
- Dropping a column? Make sure no code references it first. Prisma will warn about data loss

## Completeness Rules

### No Incomplete Queries
- Every `findUnique` / `findFirst` must handle `null` return — query can return nothing. Check before accessing properties
- Every `create` / `update` must include all required fields — don't leave required fields undefined
- Every `delete` must verify the record exists first or catch `P2025` — deleting non-existent record throws
- Every `findMany` must have `where` clause or `take` limit — never fetch unbounded data

### No Unsafe Patterns
- Never use `$queryRaw` or `$executeRaw` without parameterized queries — SQL injection risk. Use `Prisma.sql` template tag
- Never pass user input directly into `where` without validation — validate and sanitize first
- Never use `deleteMany({})` without explicit `where` — this deletes ALL records
- Never use `updateMany({})` without explicit `where` — this updates ALL records

### No Missing Error States
- Every Prisma call in a loader must handle failure — return error data or throw Response with status code
- Every Prisma call in an action must handle failure — return `{ errors }` to the form, don't silently fail
- Unique constraint violations (`P2002`) must show user-friendly "already exists" message
- Connection failures must show retry message — don't show raw database errors

## Common Mistakes

- Don't create multiple PrismaClient instances — use the singleton in db.server.ts
- Don't call Prisma in React components — only in loaders, actions, and `.server.ts` files
- Don't forget `@updatedAt` — every model that can be edited needs this
- Don't use `Float` for money — use `Decimal` with explicit precision
- Don't skip indexes on foreign keys — causes slow joins on large tables
- Don't paginate without `orderBy` — results will be random without explicit ordering
- Don't use `db push` in production — it skips migration history and can be destructive
- Don't ignore migration warnings — Prisma warns about data loss. Read and handle them
- Don't store Shopify GIDs as integers — they're strings (`gid://shopify/Product/123`)
- Don't query Session table directly — use Shopify's authenticate helpers

## Pre-Commit Checklist

1. Every model has `id`, `createdAt`, `updatedAt`
2. Every relation has explicit `@relation`, `onDelete`, and `@@index` on foreign key
3. Every `findUnique`/`findFirst` handles null return
4. Every `findMany` has `where` or `take` limit
5. Every Prisma call in loader/action is wrapped in try/catch
6. Every unique constraint violation returns user-friendly error
7. No `new PrismaClient()` outside db.server.ts
8. No Prisma calls in React components (client-side)
9. Migrations have descriptive names and reviewed SQL
10. No `$queryRaw` without `Prisma.sql` parameterization

## Reference Files
Check `references/patterns-learned.md` for project-specific patterns.

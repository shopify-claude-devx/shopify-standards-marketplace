---
name: prisma-standards
description: Prisma ORM rules for Shopify Remix apps — db.server.ts singleton, findMany limits, null handling on findFirst/findUnique, Decimal for money, String for GIDs, explicit onDelete, index foreign keys, P2002/P2025 error handling. Use when writing, editing, or reviewing Prisma schema, queries, migrations, or any .server.ts file that touches the database.
user-invocable: false
globs: ["prisma/schema.prisma", "**/*.server.ts"]
---

# Prisma Standards — Shopify Apps

**Search docs first.** Prisma releases frequently. Search `prisma.io/docs` before writing schema or queries.

## db.server.ts — Singleton (Critical)

**Never create `new PrismaClient()` anywhere except `app/db.server.ts`.** Each instance opens a new connection pool. Import from `~/db.server` everywhere — loaders, actions, server utilities.

## Session Table — Do Not Touch

The `Session` model is managed by `@shopify/shopify-app-session-storage-prisma`. Never rename, remove, or change its fields. Never query it directly — use `authenticate.admin(request)`.

## Schema Rules

**Every model must have:**
- `id String @id @default(cuid())`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

**Relations — always explicit:**
- Define both sides
- Add `@relation(fields: [fkId], references: [id])` — never implicit
- Add `onDelete` explicitly (`Cascade`, `SetNull`, or `Restrict`)
- Add `@@index([fkId])` on every foreign key — without this, full table scans on joins

**Field types that Claude gets wrong:**
- Money → `Decimal @db.Decimal(10, 2)` — never `Float`
- Shopify GIDs → `String` — never `Int` (format can change)
- Long text/URLs → `String @db.Text`
- Booleans → always set `@default(false)` or `@default(true)`

**Naming:** Models PascalCase singular (`SyncLog` not `SyncLogs`). Fields camelCase. Enums SCREAMING_SNAKE values.

## Query Rules

**Every `findMany` must have a `take` limit.** No unbounded queries. Add `take: 50` minimum.

**Every `findUnique`/`findFirst` must handle `null`.** The record might not exist. Check before accessing properties.

**Never call Prisma inside `.map()` or `forEach()`.** Use `include` for relations or `findMany({ where: { id: { in: ids } } })` for bulk lookups.

**Never call Prisma in React components.** Only in loaders, actions, and `.server.ts` files.

## Error Handling

Wrap every Prisma call in try/catch. Handle these codes specifically:

| Code | Meaning | User-facing message |
|---|---|---|
| `P2002` | Unique constraint violation | "Already exists" |
| `P2025` | Record not found | "Not found" |
| `P2003` | Foreign key constraint failed | "Related record missing" |

Never expose raw Prisma errors to the UI. Never leave catch blocks empty.

## Migrations

- `migrate dev` for local, `migrate deploy` for production — never `db push` in production
- Name descriptively: `add-product-sync-table` not `migration1`
- Review generated SQL before committing
- Adding required field to existing table? Use `@default` value or make optional first

## Unsafe Patterns — Never Do

- `deleteMany({})` without `where` — deletes ALL records
- `updateMany({})` without `where` — updates ALL records
- `$queryRaw` without `Prisma.sql` template tag — SQL injection
- `new PrismaClient()` outside db.server.ts
- Querying Session table directly

## Reference Files

- `references/patterns-learned.md` — project-specific Prisma patterns
- `references/prisma-checklist.md` — expanded checklist for schema and query review
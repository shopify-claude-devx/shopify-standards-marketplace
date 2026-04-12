---
name: prisma-standards
description: Prisma ORM standards for Shopify apps — db.server.ts singleton, session table rules, schema conventions, query safety, error handling. Use when writing, editing, or reviewing Prisma schema or .server.ts files with database calls.
user-invocable: false
paths: ["prisma/schema.prisma", "app/**/*.server.ts", "app/**/*.server.tsx", "app/db.server.ts"]
---

# Prisma Standards — Shopify Apps

**Search docs first.** Search `prisma.io/docs` before using any Prisma feature you're not certain about. Prisma v6 has API differences from earlier versions.

## db.server.ts Singleton — CRITICAL

Never create `new PrismaClient()` anywhere except `db.server.ts`. Always import from `~/db.server`.

```typescript
// app/db.server.ts
import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();
export default prisma;
```

## Session Table — Do Not Touch

The `Session` model is managed by `@shopify/shopify-app-session-storage-prisma`. Never modify it directly. Never write custom queries against it except during `APP_UNINSTALLED` cleanup.

Current schema includes refresh token fields for `expiringOfflineAccessTokens`:
```prisma
model Session {
  id                  String    @id
  shop                String
  state               String
  isOnline            Boolean   @default(false)
  scope               String?
  expires             DateTime?
  accessToken         String
  userId              BigInt?
  firstName           String?
  lastName            String?
  email               String?
  accountOwner        Boolean   @default(false)
  locale              String?
  collaborator        Boolean?  @default(false)
  emailVerified       Boolean?  @default(false)
  refreshToken        String?
  refreshTokenExpires DateTime?
}
```

## Schema Rules

Every custom model must have:
```prisma
model MyModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ... your fields
}
```

**Field conventions:**
- Relations: explicit `@relation` with `fields`, `references`, and `onDelete`
- Foreign keys: always add `@@index` for query performance
- Money: `Decimal` — never `Float`
- Shopify GIDs: `String` — never `Int`
- Long text/URLs: `@db.Text`
- Booleans: always have `@default`
- Optional fields (`?`): only when null has distinct meaning from default
- Unique constraints: `@@unique` where business logic requires

```prisma
model Event {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shop      String
  name      String
  pixelId   String
  isActive  Boolean  @default(true)
  config    String?  @db.Text

  trackingAccount   TrackingAccount @relation(fields: [trackingAccountId], references: [id], onDelete: Cascade)
  trackingAccountId String

  @@index([trackingAccountId])
  @@index([shop])
}
```

## Query Rules

```typescript
// Every findMany has take limit
const events = await db.event.findMany({
  where: { shop },
  take: 50,
  orderBy: { createdAt: "desc" },
});

// Every findUnique/findFirst handles null
const event = await db.event.findUnique({ where: { id } });
if (!event) {
  throw new Response("Event not found", { status: 404 });
}

// Use select when full model not needed
const names = await db.event.findMany({
  where: { shop },
  select: { id: true, name: true },
  take: 100,
});
```

**Rules:**
- No Prisma calls inside `.map()` or `forEach()` loops — use `createMany`, `updateMany`, or transactions
- No Prisma calls in React components — only in `.server.ts` files
- `include` only when related data is actually needed
- `orderBy` present with pagination

## Error Handling

```typescript
try {
  const event = await db.event.create({ data: { ... } });
  return { success: true, event };
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": return { errors: { form: "A record with this value already exists" } };
      case "P2025": return { errors: { form: "Record not found" } };
      case "P2003": return { errors: { form: "Related record not found" } };
    }
  }
  console.error("Database error:", error instanceof Error ? error.message : "Unknown error");
  return { errors: { form: "A database error occurred. Please try again." } };
}
```

## Transactions

```typescript
// Multi-step operations use $transaction
const result = await db.$transaction(async (tx) => {
  const account = await tx.trackingAccount.create({ data: { ... } });
  const events = await tx.event.createMany({
    data: eventConfigs.map(config => ({ ...config, trackingAccountId: account.id })),
  });
  return { account, eventCount: events.count };
});
```

- All queries inside transaction use `tx`, not `db`
- Set timeout for long transactions
- No nested transactions

## Migrations

- Use `prisma migrate dev` locally with descriptive names
- Use `prisma migrate deploy` in production — never `db push` in prod
- Review generated SQL before committing
- Required fields on existing tables must have `@default`
- Never edit migration files after they've been applied

## Safety

- No `deleteMany({})` without explicit `where`
- No `updateMany({})` without explicit `where`
- No `$queryRaw` without `Prisma.sql` parameterization
- No `new PrismaClient()` outside `db.server.ts`
- No direct queries to Session table (except APP_UNINSTALLED cleanup)

## Checklist

See `checklist/rules-and-checklist.md` for the validation checklist.

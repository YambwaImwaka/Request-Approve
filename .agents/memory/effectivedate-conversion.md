---
name: effectiveDate DB conversion
description: Orval coerces format:date fields to Date objects; must convert to ISO string before inserting into Drizzle date() column.
---

When an OpenAPI field has `format: date`, orval generates `zod.coerce.date()` in the Zod schema. This means `parsed.data.effectiveDate` is a `Date` object, not a string.

Drizzle's `date()` column expects a string in `"YYYY-MM-DD"` format (or null).

**Fix:** In route handlers, convert before DB insert/update:
```ts
effectiveDate: parsed.data.effectiveDate instanceof Date
  ? parsed.data.effectiveDate.toISOString().split("T")[0]
  : (parsed.data.effectiveDate ?? null),
```

**Why:** Drizzle's pg-core `date` type maps to SQL `DATE`, which the pg driver accepts as an ISO date string. Passing a JS `Date` object causes a TypeScript error at the `.values()` call.

**How to apply:** Any time a new OpenAPI field uses `format: date` and feeds into a Drizzle `date()` column, add this conversion in both create and update handlers.

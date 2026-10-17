---
name: Drizzle ORM table spread in db.select()
description: Spreading a full Drizzle table object in db.select({...table}) is a TypeScript type error; use getTableColumns() instead
---

## Rule
`db.select({ ...someTable, extraCol: otherTable.col })` is invalid in Drizzle ORM's TypeScript types. The table object has internal `_` brand properties that don't satisfy `SelectedFields`.

## Fix
Use `getTableColumns(table)` from `drizzle-orm` to extract only the column objects:

```ts
import { getTableColumns } from 'drizzle-orm';
const cols = getTableColumns(roomsTable);
db.select({ ...cols, roomTypeName: roomTypesTable.name })
```

`getTableColumns()` returns `Record<string, Column>` which is a valid `SelectedFields` type.

**Why:** The Drizzle table object contains non-column internal metadata (`_`, `$inferSelect`, etc.) that make it incompatible with the strict `SelectedFields` index signature. `getTableColumns()` strips those and returns only the actual column map.

## How to apply
Any time a NestJS service or Drizzle query needs to select all columns from a table plus extra joined columns, use `getTableColumns(table)` instead of the spread `...table` pattern.

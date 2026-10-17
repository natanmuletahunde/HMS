import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const bedTypesTable = pgTable("bed_types", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(2),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type BedType = typeof bedTypesTable.$inferSelect;
export type InsertBedType = typeof bedTypesTable.$inferInsert;

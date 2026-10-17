import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const roomCategoriesTable = pgTable("room_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type RoomCategory = typeof roomCategoriesTable.$inferSelect;
export type InsertRoomCategory = typeof roomCategoriesTable.$inferInsert;

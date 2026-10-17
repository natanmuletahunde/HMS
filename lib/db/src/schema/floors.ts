import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { buildingsTable } from "./buildings";

export const floorsTable = pgTable("floors", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id").notNull().references(() => buildingsTable.id),
  floorName: text("floor_name").notNull(),
  floorNumber: integer("floor_number").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Floor = typeof floorsTable.$inferSelect;
export type InsertFloor = typeof floorsTable.$inferInsert;

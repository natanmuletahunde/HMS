import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { branchesTable } from "./branches";

export const buildingsTable = pgTable("buildings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  branchId: text("branch_id").notNull().references(() => branchesTable.id),
  buildingName: text("building_name").notNull(),
  buildingCode: text("building_code").notNull().unique(),
  numberOfFloors: integer("number_of_floors").notNull().default(1),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Building = typeof buildingsTable.$inferSelect;
export type InsertBuilding = typeof buildingsTable.$inferInsert;

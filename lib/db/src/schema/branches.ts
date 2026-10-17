import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { hotelsTable } from "./hotels";

export const branchesTable = pgTable("branches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hotelId: text("hotel_id").notNull().references(() => hotelsTable.id),
  branchName: text("branch_name").notNull(),
  branchCode: text("branch_code").notNull().unique(),
  manager: text("manager"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Branch = typeof branchesTable.$inferSelect;
export type InsertBranch = typeof branchesTable.$inferInsert;

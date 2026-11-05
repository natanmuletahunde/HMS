import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { hotelsTable } from "./hotels";

export const branchesTable = pgTable("branches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hotelId: text("hotel_id").notNull().references(() => hotelsTable.id),
  branchName: text("branch_name").notNull(),
  branchCode: text("branch_code").notNull().unique(),
  legalName: text("legal_name"),
  manager: text("manager"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  country: text("country").default("Ethiopia"),
  timezone: text("timezone").default("Africa/Addis_Ababa"),
  currencyCode: text("currency_code").default("ETB"),
  taxNumber: text("tax_number"),
  licenseNumber: text("license_number"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  starRating: integer("star_rating"),
  settings: jsonb("settings").$type<Record<string, any>>().default({}),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Branch = typeof branchesTable.$inferSelect;
export type InsertBranch = typeof branchesTable.$inferInsert;

import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const organizationsTable = pgTable("organizations", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:    text("tenant_id").references(() => tenantsTable.id),
  name:        text("name").notNull(),
  code:        text("code"),
  type:        text("type").default("hotel_group"), // hotel_group, chain, independent
  description: text("description"),
  country:     text("country"),
  city:        text("city"),
  address:     text("address"),
  phone:       text("phone"),
  email:       text("email"),
  website:     text("website"),
  currency:    text("currency").default("USD"),
  timezone:    text("timezone").default("UTC"),
  isActive:    boolean("is_active").notNull().default(true),
  metadata:    jsonb("metadata").default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Organization = typeof organizationsTable.$inferSelect;

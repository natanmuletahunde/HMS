import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const moduleConfigsTable = pgTable("module_configs", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:     text("tenant_id").references(() => tenantsTable.id),
  moduleCode:   text("module_code").notNull(),
  moduleName:   text("module_name").notNull(),
  description:  text("description"),
  icon:         text("icon"),
  category:     text("category").default("operations"), // core, operations, business, enterprise
  isEnabled:    boolean("is_enabled").notNull().default(true),
  isInstalled:  boolean("is_installed").notNull().default(true),
  isCore:       boolean("is_core").notNull().default(false), // core modules cannot be disabled
  settings:     jsonb("settings").default({}),
  version:      text("version").default("1.0.0"),
  dependencies: jsonb("dependencies").default([]),  // list of module codes
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ModuleConfig = typeof moduleConfigsTable.$inferSelect;

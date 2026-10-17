import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const pluginRegistryTable = pgTable("plugin_registry", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:    text("tenant_id").references(() => tenantsTable.id),
  pluginCode:  text("plugin_code").notNull(),
  pluginName:  text("plugin_name").notNull(),
  version:     text("version").notNull().default("1.0.0"),
  description: text("description"),
  author:      text("author"),
  homepage:    text("homepage"),
  status:      text("status").notNull().default("active"), // active, disabled, pending, error
  hooks:       jsonb("hooks").default([]),      // array of hook names this plugin registers
  menus:       jsonb("menus").default([]),      // array of menu items to inject
  routes:      jsonb("routes").default([]),     // array of route definitions
  permissions: jsonb("permissions").default([]), // array of permission strings required
  config:      jsonb("config").default({}),     // plugin-specific configuration
  isSystem:    boolean("is_system").notNull().default(false), // built-in vs user-installed
  installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PluginRegistry = typeof pluginRegistryTable.$inferSelect;

import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull(),
  slug:        text("slug").notNull().unique(),
  domain:      text("domain"),
  country:     text("country"),
  timezone:    text("timezone").default("UTC"),
  currency:    text("currency").default("USD"),
  isActive:    boolean("is_active").notNull().default(true),
  metadata:    jsonb("metadata").default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tenantBrandingTable = pgTable("tenant_branding", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:       text("tenant_id").notNull().references(() => tenantsTable.id),
  logoUrl:        text("logo_url"),
  primaryColor:   text("primary_color").default("#06b6d4"),
  secondaryColor: text("secondary_color").default("#0891b2"),
  accentColor:    text("accent_color").default("#22d3ee"),
  fontFamily:     text("font_family").default("Inter"),
  theme:          text("theme").default("dark"), // dark, light, custom
  customCss:      text("custom_css"),
  faviconUrl:     text("favicon_url"),
  appName:        text("app_name").default("Nexus HMS"),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Tenant        = typeof tenantsTable.$inferSelect;
export type TenantBranding = typeof tenantBrandingTable.$inferSelect;

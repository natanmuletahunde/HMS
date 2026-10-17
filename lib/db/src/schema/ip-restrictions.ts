import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const ipRestrictionsTable = pgTable("ip_restrictions", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:    text("tenant_id"),
  ipAddress:   text("ip_address").notNull(),
  type:        text("type").notNull().default("allowlist"), // allowlist | blocklist
  label:       text("label"),
  isActive:    boolean("is_active").notNull().default(true),
  createdBy:   text("created_by"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IpRestriction = typeof ipRestrictionsTable.$inferSelect;

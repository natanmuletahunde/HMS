import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mfaConfigsTable = pgTable("mfa_configs", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:        text("user_id").notNull().references(() => usersTable.id),
  secret:        text("secret").notNull(),
  isEnabled:     boolean("is_enabled").notNull().default(false),
  backupCodes:   jsonb("backup_codes").default([]),
  lastUsedAt:    timestamp("last_used_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type MfaConfig = typeof mfaConfigsTable.$inferSelect;

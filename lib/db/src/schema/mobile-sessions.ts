import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mobileSessionsTable = pgTable("mobile_sessions", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:       text("user_id").notNull().references(() => usersTable.id),
  deviceId:     text("device_id").notNull(),
  deviceName:   text("device_name"),
  platform:     text("platform"), // ios | android
  pushToken:    text("push_token"),
  isActive:     boolean("is_active").notNull().default(true),
  lastSeenAt:   timestamp("last_seen_at", { withTimezone: true }),
  metadata:     jsonb("metadata").default({}),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type MobileSession = typeof mobileSessionsTable.$inferSelect;

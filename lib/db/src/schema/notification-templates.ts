import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationTemplatesTable = pgTable("notification_templates", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code:        text("code").notNull().unique(), // e.g. RESERVATION_CONFIRMATION
  name:        text("name").notNull(),
  channel:     text("channel").notNull().default("in_app"), // in_app, email, sms, push
  type:        text("type").notNull(), // reservation_confirmation, checkin_reminder, etc.
  subject:     text("subject"),
  body:        text("body").notNull(), // template with {{variable}} placeholders
  variables:   text("variables"), // json: ["guestName","roomNumber",...]
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:   text("created_by"),
  updatedBy:   text("updated_by"),
});

export type NotificationTemplate = typeof notificationTemplatesTable.$inferSelect;

import { pgTable, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { guestsTable } from "./guests";
import { reservationsTable } from "./reservations";
import { roomsTable } from "./rooms";

export const checkinsTable = pgTable("checkins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  checkinNumber: text("checkin_number").notNull().unique().$defaultFn(() => `CHK-${Date.now()}`),
  reservationId: text("reservation_id").notNull().references(() => reservationsTable.id),
  guestId: text("guest_id").notNull().references(() => guestsTable.id),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  // Workflow flags
  identityVerified: boolean("identity_verified").notNull().default(false),
  depositCollected: boolean("deposit_collected").notNull().default(false),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  keyCardNumber: text("key_card_number"),
  registrationCardGenerated: boolean("registration_card_generated").notNull().default(false),
  // Personnel
  checkedInBy: text("checked_in_by"),
  notes: text("notes"),
  // Audit
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Checkin = typeof checkinsTable.$inferSelect;
export type InsertCheckin = typeof checkinsTable.$inferInsert;

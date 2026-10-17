import { pgTable, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { guestsTable } from "./guests";
import { reservationsTable } from "./reservations";
import { roomsTable } from "./rooms";

export const stayChangesTable = pgTable("stay_changes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reservationId: text("reservation_id").notNull().references(() => reservationsTable.id),
  guestId: text("guest_id").notNull().references(() => guestsTable.id),
  // Action type: upgrade | downgrade | transfer | extend | shorten | add_guest | add_service | note
  actionType: text("action_type").notNull(),
  // Room change info (for upgrade/downgrade/transfer)
  fromRoomId: text("from_room_id").references(() => roomsTable.id),
  toRoomId: text("to_room_id").references(() => roomsTable.id),
  // Date change info (for extend/shorten)
  previousCheckOut: date("previous_check_out", { mode: "string" }),
  newCheckOut: date("new_check_out", { mode: "string" }),
  // Details
  reason: text("reason"),
  performedBy: text("performed_by"),
  notes: text("notes"),
  // Audit
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type StayChange = typeof stayChangesTable.$inferSelect;
export type InsertStayChange = typeof stayChangesTable.$inferInsert;

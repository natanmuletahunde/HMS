import { pgTable, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { guestsTable } from "./guests";
import { reservationsTable } from "./reservations";
import { roomsTable } from "./rooms";

export const checkoutsTable = pgTable("checkouts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  checkoutNumber: text("checkout_number").notNull().unique().$defaultFn(() => `OUT-${Date.now()}`),
  reservationId: text("reservation_id").notNull().references(() => reservationsTable.id),
  guestId: text("guest_id").notNull().references(() => guestsTable.id),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  // Financials
  lateCheckoutFee: numeric("late_checkout_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCharges: numeric("total_charges", { precision: 10, scale: 2 }).notNull().default("0"),
  // Status flags
  invoiceGenerated: boolean("invoice_generated").notNull().default(false),
  depositRefunded: boolean("deposit_refunded").notNull().default(false),
  // Feedback
  feedbackRating: integer("feedback_rating"),   // 1-5
  feedbackNotes: text("feedback_notes"),
  // Personnel
  checkedOutBy: text("checked_out_by"),
  notes: text("notes"),
  // Audit
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Checkout = typeof checkoutsTable.$inferSelect;
export type InsertCheckout = typeof checkoutsTable.$inferInsert;

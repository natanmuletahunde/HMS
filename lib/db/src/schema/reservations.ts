import { pgTable, text, boolean, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { guestsTable } from "./guests";
import { roomsTable } from "./rooms";
import { roomTypesTable } from "./room-types";

export const reservationStatusValues = [
  "draft", "pending", "confirmed", "guaranteed",
  "checked_in", "checked_out", "cancelled", "no_show", "expired", "waitlisted",
] as const;
export type ReservationStatus = (typeof reservationStatusValues)[number];

export const reservationTypeValues = [
  "individual", "group", "corporate", "travel_agency", "online", "walk_in",
] as const;
export type ReservationType = (typeof reservationTypeValues)[number];

export const reservationsTable = pgTable("reservations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reservationNumber: text("reservation_number").notNull().unique().$defaultFn(() => `RES-${Date.now()}`),
  confirmationNumber: text("confirmation_number").notNull().unique().$defaultFn(() => `HMS-${Date.now()}`),
  // Parties
  guestId: text("guest_id").notNull().references(() => guestsTable.id),
  roomId: text("room_id").references(() => roomsTable.id),
  roomTypeId: text("room_type_id").references(() => roomTypesTable.id),
  // Dates
  checkInDate: date("check_in_date", { mode: "string" }).notNull(),
  checkOutDate: date("check_out_date", { mode: "string" }).notNull(),
  nights: integer("nights").notNull().default(1),
  actualCheckIn: timestamp("actual_check_in", { withTimezone: true }),
  actualCheckOut: timestamp("actual_check_out", { withTimezone: true }),
  // Guests
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  // Type & source
  reservationType: text("reservation_type").notNull().default("individual").$type<ReservationType>(),
  bookingSource: text("booking_source"),   // direct | walk_in | phone | online | ota | travel_agency | corporate
  ratePlan: text("rate_plan"),
  // Financials
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  serviceCharge: numeric("service_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  depositRequired: numeric("deposit_required", { precision: 10, scale: 2 }).notNull().default("0"),
  depositPaid: numeric("deposit_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  // Status
  status: text("status").notNull().default("pending").$type<ReservationStatus>(),
  // Extras
  specialRequests: text("special_requests"),
  remarks: text("remarks"),
  notes: text("notes"),
  // Cancellation
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  // Audit
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Reservation = typeof reservationsTable.$inferSelect;
export type InsertReservation = typeof reservationsTable.$inferInsert;

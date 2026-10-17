import { pgTable, text, boolean, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";

// ─── Conference Halls ─────────────────────────────────────────────────────────
export const conferenceHallsTable = pgTable("conference_halls", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text("name").notNull(),
  location:      text("location"),
  floor:         text("floor"),
  capacity:      integer("capacity").notNull(),
  minCapacity:   integer("min_capacity").default(1),
  area:          numeric("area", { precision: 8, scale: 2 }), // sq meters
  layouts:       text("layouts"), // json string: ["theater","classroom","boardroom","u_shape"]
  hourlyRate:    numeric("hourly_rate", { precision: 10, scale: 2 }),
  halfDayRate:   numeric("half_day_rate", { precision: 10, scale: 2 }),
  fullDayRate:   numeric("full_day_rate", { precision: 10, scale: 2 }),
  status:        text("status").notNull().default("available"), // available, booked, maintenance, closed
  description:   text("description"),
  amenities:     text("amenities"), // json string
  imageUrl:      text("image_url"),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:     text("created_by"),
  updatedBy:     text("updated_by"),
});

// ─── Conference Hall Equipment ────────────────────────────────────────────────
export const conferenceEquipmentTable = pgTable("conference_equipment", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hallId:     text("hall_id").references(() => conferenceHallsTable.id),
  name:       text("name").notNull(), // projector, sound_system, microphone, stage, led_display, whiteboard
  quantity:   integer("quantity").notNull().default(1),
  status:     text("status").notNull().default("available"), // available, in_use, maintenance
  extraCharge: numeric("extra_charge", { precision: 10, scale: 2 }).default("0"),
  notes:      text("notes"),
  isActive:   boolean("is_active").notNull().default(true),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Conference Bookings ──────────────────────────────────────────────────────
export const conferenceBookingStatusEnum = [
  "inquiry","confirmed","in_progress","completed","cancelled","no_show",
] as const;
export type ConferenceBookingStatus = (typeof conferenceBookingStatusEnum)[number];

export const conferenceBookingsTable = pgTable("conference_bookings", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingNumber:    text("booking_number").notNull(),
  hallId:           text("hall_id").notNull().references(() => conferenceHallsTable.id),
  reservationId:    text("reservation_id"),
  guestId:          text("guest_id"),
  customerName:     text("customer_name").notNull(),
  customerEmail:    text("customer_email"),
  customerPhone:    text("customer_phone"),
  companyName:      text("company_name"),
  eventName:        text("event_name").notNull(),
  eventType:        text("event_type"), // conference, seminar, wedding, birthday, meeting, training, other
  layout:           text("layout").default("theater"),
  attendees:        integer("attendees").notNull(),
  bookingDate:      date("booking_date", { mode: "string" }).notNull(),
  startTime:        text("start_time").notNull(),
  endTime:          text("end_time").notNull(),
  setupTime:        text("setup_time"),
  teardownTime:     text("teardown_time"),
  status:           text("status").notNull().default("inquiry").$type<ConferenceBookingStatus>(),
  hallRate:         numeric("hall_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  equipmentCharges: numeric("equipment_charges", { precision: 10, scale: 2 }).default("0"),
  cateringCharges:  numeric("catering_charges", { precision: 10, scale: 2 }).default("0"),
  otherCharges:     numeric("other_charges", { precision: 10, scale: 2 }).default("0"),
  discountAmount:   numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount:        numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount:      numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  depositAmount:    numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  depositPaid:      boolean("deposit_paid").notNull().default(false),
  paymentStatus:    text("payment_status").notNull().default("pending"),
  cateringRequired: boolean("catering_required").notNull().default(false),
  specialRequirements: text("special_requirements"),
  notes:            text("notes"),
  cancelledAt:      timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:        timestamp("deleted_at", { withTimezone: true }),
  createdBy:        text("created_by"),
  updatedBy:        text("updated_by"),
});

// ─── Conference Booking Services ──────────────────────────────────────────────
export const conferenceBookingServicesTable = pgTable("conference_booking_services", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingId:   text("booking_id").notNull().references(() => conferenceBookingsTable.id),
  serviceType: text("service_type").notNull(), // equipment, catering, av, other
  name:        text("name").notNull(),
  quantity:    integer("quantity").notNull().default(1),
  unitPrice:   numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  total:       numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:       text("notes"),
});

export type ConferenceHall    = typeof conferenceHallsTable.$inferSelect;
export type ConferenceBooking = typeof conferenceBookingsTable.$inferSelect;

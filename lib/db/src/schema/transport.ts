import { pgTable, text, boolean, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export const vehicleTypeEnum = ["sedan","suv","van","minibus","bus","luxury","motorcycle","other"] as const;
export type VehicleType = (typeof vehicleTypeEnum)[number];

export const vehiclesTable = pgTable("vehicles", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vehicleNumber:    text("vehicle_number").notNull().unique(),
  vehicleType:      text("vehicle_type").notNull().$type<VehicleType>(),
  make:             text("make"),
  model:            text("model"),
  year:             integer("year"),
  color:            text("color"),
  capacity:         integer("capacity").notNull().default(4), // passengers
  fuelType:         text("fuel_type").default("petrol"), // petrol, diesel, electric, hybrid
  plateNumber:      text("plate_number"),
  insuranceExpiry:  date("insurance_expiry", { mode: "string" }),
  serviceDate:      date("service_date", { mode: "string" }),
  status:           text("status").notNull().default("available"), // available, assigned, maintenance, out_of_service
  currentDriverId:  text("current_driver_id"),
  notes:            text("notes"),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:        text("created_by"),
  updatedBy:        text("updated_by"),
});

// ─── Drivers ──────────────────────────────────────────────────────────────────
export const driversTable = pgTable("drivers", {
  id:                text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  driverCode:        text("driver_code").notNull(),
  firstName:         text("first_name").notNull(),
  lastName:          text("last_name").notNull(),
  phone:             text("phone").notNull(),
  alternativePhone:  text("alternative_phone"),
  email:             text("email"),
  licenseNumber:     text("license_number"),
  licenseType:       text("license_type"),
  licenseExpiry:     date("license_expiry", { mode: "string" }),
  nationality:       text("nationality"),
  address:           text("address"),
  photo:             text("photo"),
  rating:            numeric("rating", { precision: 3, scale: 2 }).default("5.0"),
  totalTrips:        integer("total_trips").default(0),
  status:            text("status").notNull().default("available"), // available, assigned, off_duty, on_leave
  availability:      text("availability").notNull().default("full_time"), // full_time, part_time, on_call
  notes:             text("notes"),
  isActive:          boolean("is_active").notNull().default(true),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:         timestamp("deleted_at", { withTimezone: true }),
  createdBy:         text("created_by"),
  updatedBy:         text("updated_by"),
});

// ─── Trips ────────────────────────────────────────────────────────────────────
export const tripTypeEnum = [
  "airport_pickup","airport_dropoff","hotel_shuttle","city_tour","custom","transfer",
] as const;
export type TripType = (typeof tripTypeEnum)[number];

export const tripStatusEnum = ["scheduled","assigned","started","completed","cancelled","no_show"] as const;
export type TripStatus = (typeof tripStatusEnum)[number];

export const tripsTable = pgTable("trips", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tripNumber:      text("trip_number").notNull(),
  tripType:        text("trip_type").notNull().$type<TripType>(),
  vehicleId:       text("vehicle_id").references(() => vehiclesTable.id),
  driverId:        text("driver_id").references(() => driversTable.id),
  reservationId:   text("reservation_id"),
  roomServiceId:   text("room_service_id"),
  guestId:         text("guest_id"),
  guestName:       text("guest_name"),
  guestPhone:      text("guest_phone"),
  passengerCount:  integer("passenger_count").default(1),
  pickupLocation:  text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  flightNumber:    text("flight_number"),
  scheduledTime:   timestamp("scheduled_time", { withTimezone: true }).notNull(),
  startedAt:       timestamp("started_at", { withTimezone: true }),
  completedAt:     timestamp("completed_at", { withTimezone: true }),
  distance:        numeric("distance", { precision: 8, scale: 2 }), // km
  fare:            numeric("fare", { precision: 10, scale: 2 }).default("0"),
  extraCharges:    numeric("extra_charges", { precision: 10, scale: 2 }).default("0"),
  totalAmount:     numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus:   text("payment_status").notNull().default("pending"),
  paymentMethod:   text("payment_method"),
  chargeToRoom:    boolean("charge_to_room").notNull().default(false),
  status:          text("status").notNull().default("scheduled").$type<TripStatus>(),
  driverNotes:     text("driver_notes"),
  notes:           text("notes"),
  cancelledAt:     timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

export type Vehicle = typeof vehiclesTable.$inferSelect;
export type Driver  = typeof driversTable.$inferSelect;
export type Trip    = typeof tripsTable.$inferSelect;

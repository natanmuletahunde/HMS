import { pgTable, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { guestsTable } from "./guests";
import { reservationsTable } from "./reservations";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";
import { menuItemsTable } from "./restaurant";

// ─── Room Service Requests ────────────────────────────────────────────────────
export const roomServiceTypeEnum = [
  "food","drinks","laundry","spa","taxi","airport_pickup","airport_dropoff",
  "wake_up_call","extra_pillow","extra_blanket","baby_cot","wheelchair",
  "housekeeping","maintenance","other",
] as const;
export type RoomServiceType = (typeof roomServiceTypeEnum)[number];

export const roomServiceDepartmentEnum = [
  "restaurant","housekeeping","maintenance","transport","reception","spa","laundry",
] as const;
export type RoomServiceDepartment = (typeof roomServiceDepartmentEnum)[number];

export const roomServiceStatusEnum = [
  "requested","accepted","assigned","in_progress","completed","cancelled",
] as const;
export type RoomServiceStatus = (typeof roomServiceStatusEnum)[number];

export const roomServiceRequestsTable = pgTable("room_service_requests", {
  id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestNumber:        text("request_number").notNull(),
  reservationId:        text("reservation_id").references(() => reservationsTable.id),
  guestId:              text("guest_id").references(() => guestsTable.id),
  roomId:               text("room_id").references(() => roomsTable.id),
  roomNumber:           text("room_number"),
  guestName:            text("guest_name"),
  serviceType:          text("service_type").notNull().$type<RoomServiceType>(),
  department:           text("department").notNull().$type<RoomServiceDepartment>(),
  status:               text("status").notNull().default("requested").$type<RoomServiceStatus>(),
  priority:             text("priority").notNull().default("normal"), // low, normal, high, urgent
  description:          text("description"),
  specialInstructions:  text("special_instructions"),
  assignedToId:         text("assigned_to_id").references(() => usersTable.id),
  slaMinutes:           integer("sla_minutes").default(30),
  estimatedCompletion:  timestamp("estimated_completion", { withTimezone: true }),
  actualCompletion:     timestamp("actual_completion", { withTimezone: true }),
  chargeAmount:         numeric("charge_amount", { precision: 10, scale: 2 }).default("0"),
  chargeToRoom:         boolean("charge_to_room").notNull().default(false),
  paymentStatus:        text("payment_status").notNull().default("pending"),
  notes:                text("notes"),
  cancelReason:         text("cancel_reason"),
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:            timestamp("deleted_at", { withTimezone: true }),
  createdBy:            text("created_by"),
  updatedBy:            text("updated_by"),
});

// ─── Room Service Items (food/drinks sub-orders) ──────────────────────────────
export const roomServiceItemsTable = pgTable("room_service_items", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId:  text("request_id").notNull().references(() => roomServiceRequestsTable.id),
  menuItemId: text("menu_item_id").references(() => menuItemsTable.id),
  name:       text("name").notNull(),
  quantity:   integer("quantity").notNull().default(1),
  unitPrice:  numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  total:      numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:      text("notes"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoomServiceRequest = typeof roomServiceRequestsTable.$inferSelect;
export type RoomServiceItem    = typeof roomServiceItemsTable.$inferSelect;

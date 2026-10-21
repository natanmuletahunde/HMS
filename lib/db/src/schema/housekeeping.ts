import { pgTable, text, boolean, timestamp, date, integer, numeric } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";

// ─── Cleaning Areas ───────────────────────────────────────────────────────────
export const cleaningAreaTypeEnum = [
  "guest_room","conference","lobby","restaurant","kitchen","reception",
  "corridor","parking","pool","garden","public_toilet","other",
] as const;
export type CleaningAreaType = (typeof cleaningAreaTypeEnum)[number];

export const cleaningAreasTable = pgTable("cleaning_areas", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:      text("name").notNull(),
  areaType:  text("area_type").notNull().$type<CleaningAreaType>(),
  floor:     text("floor"),
  building:  text("building"),
  notes:     text("notes"),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

// ─── Housekeeping Tasks (assignments) ─────────────────────────────────────────
export const cleaningTypeEnum = ["daily","checkout","deep","emergency","inspection"] as const;
export type CleaningType = (typeof cleaningTypeEnum)[number];

export const cleaningPriorityEnum = ["low","normal","high","urgent"] as const;
export type CleaningPriority = (typeof cleaningPriorityEnum)[number];

export const housekeepingStatusEnum = [
  "pending","assigned","accepted","in_progress","ready_for_inspection",
  "completed","rejected","cancelled",
] as const;
export type HousekeepingStatus = (typeof housekeepingStatusEnum)[number];

export const housekeepingAssignmentsTable = pgTable("housekeeping_assignments", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskNumber:      text("task_number").notNull(),
  roomId:          text("room_id").references(() => roomsTable.id),
  areaType:        text("area_type").notNull().default("guest_room").$type<CleaningAreaType>(),
  staffId:         text("staff_id").references(() => usersTable.id),
  supervisorId:    text("supervisor_id").references(() => usersTable.id),
  cleaningType:    text("cleaning_type").notNull().default("daily").$type<CleaningType>(),
  priority:        text("priority").notNull().default("normal").$type<CleaningPriority>(),
  status:          text("status").notNull().default("pending").$type<HousekeepingStatus>(),
  scheduledDate:   date("scheduled_date", { mode: "string" }).notNull(),
  scheduledTime:   text("scheduled_time"),
  startedAt:       timestamp("started_at", { withTimezone: true }),
  completedAt:     timestamp("completed_at", { withTimezone: true }),
  notes:           text("notes"),
  rejectionReason: text("rejection_reason"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Cleaning Inspections ─────────────────────────────────────────────────────
export const cleaningInspectionsTable = pgTable("cleaning_inspections", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId:      text("task_id").notNull().references(() => housekeepingAssignmentsTable.id),
  inspectedBy: text("inspected_by").references(() => usersTable.id),
  result:      text("result").notNull().default("passed"), // passed | failed
  score:       integer("score"),                           // 0-100
  notes:       text("notes"),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull().defaultNow(),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type HousekeepingAssignment = typeof housekeepingAssignmentsTable.$inferSelect;
export type CleaningArea          = typeof cleaningAreasTable.$inferSelect;
export type CleaningInspection    = typeof cleaningInspectionsTable.$inferSelect;

// ─── Pre-Checkout Room Clearance Inspections ────────────────────────────────
export const preCheckoutInspectionsTable = pgTable("pre_checkout_inspections", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  inspectionNumber: text("inspection_number").notNull().unique().$defaultFn(() => `PCI-${Date.now()}`),
  reservationId:    text("reservation_id").notNull(),
  roomId:           text("room_id").notNull(),
  guestId:          text("guest_id").notNull(),
  status:           text("status").notNull().default("pending"), // pending | in_progress | cleared | issues_reported
  minibarItems:     text("minibar_items"), // JSON stringified array [{ name, quantity, unitPrice, total }]
  minibarTotal:     numeric("minibar_total", { precision: 10, scale: 2 }).notNull().default("0"),
  damageCharges:    numeric("damage_charges", { precision: 10, scale: 2 }).notNull().default("0"),
  damageNotes:      text("damage_notes"),
  assetsIntact:     boolean("assets_intact").notNull().default(true),
  lostAndFoundFound: boolean("lost_and_found_found").notNull().default(false),
  lostAndFoundNotes: text("lost_and_found_notes"),
  inspectedBy:      text("inspected_by"),
  inspectedById:    text("inspected_by_id"),
  inspectedAt:      timestamp("inspected_at", { withTimezone: true }),
  notes:            text("notes"),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PreCheckoutInspection       = typeof preCheckoutInspectionsTable.$inferSelect;
export type InsertPreCheckoutInspection = typeof preCheckoutInspectionsTable.$inferInsert;


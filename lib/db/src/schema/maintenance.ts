import { pgTable, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";

// ─── Maintenance Categories ───────────────────────────────────────────────────
export const maintenanceCategoriesTable = pgTable("maintenance_categories", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull().unique(),
  description: text("description"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Maintenance Requests ─────────────────────────────────────────────────────
export const maintenancePriorityEnum = ["low","medium","high","critical"] as const;
export type MaintenancePriority = (typeof maintenancePriorityEnum)[number];

export const maintenanceStatusEnum = [
  "pending","approved","assigned","in_progress","waiting_parts",
  "completed","rejected","cancelled",
] as const;
export type MaintenanceStatus = (typeof maintenanceStatusEnum)[number];

export const maintenanceRequestsTable = pgTable("maintenance_requests", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestNumber:   text("request_number").notNull(),
  roomId:          text("room_id").references(() => roomsTable.id),
  categoryId:      text("category_id").references(() => maintenanceCategoriesTable.id),
  reportedBy:      text("reported_by"),
  assignedToId:    text("assigned_to_id").references(() => usersTable.id),
  approvedBy:      text("approved_by"),
  approvedAt:      timestamp("approved_at", { withTimezone: true }),
  title:           text("title").notNull(),
  description:     text("description"),
  priority:        text("priority").notNull().default("medium").$type<MaintenancePriority>(),
  status:          text("status").notNull().default("pending").$type<MaintenanceStatus>(),
  startedAt:       timestamp("started_at", { withTimezone: true }),
  completedAt:     timestamp("completed_at", { withTimezone: true }),
  resolvedAt:      timestamp("resolved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  estimatedCost:   numeric("estimated_cost", { precision: 10, scale: 2 }),
  actualCost:      numeric("actual_cost", { precision: 10, scale: 2 }),
  notes:           text("notes"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Maintenance Inspections ──────────────────────────────────────────────────
export const maintenanceInspectionsTable = pgTable("maintenance_inspections", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId:   text("request_id").notNull().references(() => maintenanceRequestsTable.id),
  inspectedBy: text("inspected_by").references(() => usersTable.id),
  result:      text("result").notNull().default("passed"), // passed | failed
  notes:       text("notes"),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull().defaultNow(),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type MaintenanceCategory   = typeof maintenanceCategoriesTable.$inferSelect;
export type MaintenanceRequest    = typeof maintenanceRequestsTable.$inferSelect;
export type MaintenanceInspection = typeof maintenanceInspectionsTable.$inferSelect;

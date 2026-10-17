import { pgTable, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { roomTypesTable } from "./room-types";
import { roomCategoriesTable } from "./room-categories";
import { bedTypesTable } from "./bed-types";
import { buildingsTable } from "./buildings";
import { floorsTable } from "./floors";

export const roomStatusEnum = [
  "available", "occupied", "reserved", "maintenance", "cleaning",
  "dirty", "ready", "blocked", "under_maintenance", "out_of_service",
] as const;
export type RoomStatus = (typeof roomStatusEnum)[number];

export const roomsTable = pgTable("rooms", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Legacy fields kept for backward compat
  number: text("number").notNull().unique(),
  floor: text("floor").notNull().default("1"),
  notes: text("notes"),
  // Phase 2 additions
  roomName: text("room_name"),
  roomCode: text("room_code").unique(),
  roomTypeId: text("room_type_id").notNull().references(() => roomTypesTable.id),
  roomCategoryId: text("room_category_id").references(() => roomCategoriesTable.id),
  bedTypeId: text("bed_type_id").references(() => bedTypesTable.id),
  buildingId: text("building_id").references(() => buildingsTable.id),
  floorId: text("floor_id").references(() => floorsTable.id),
  capacityAdults: integer("capacity_adults").notNull().default(2),
  capacityChildren: integer("capacity_children").notNull().default(1),
  size: numeric("size", { precision: 8, scale: 2 }),
  view: text("view"),
  smokingAllowed: boolean("smoking_allowed").notNull().default(false),
  description: text("description"),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("available").$type<RoomStatus>(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Room = typeof roomsTable.$inferSelect;
export type InsertRoom = typeof roomsTable.$inferInsert;

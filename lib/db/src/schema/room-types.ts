import { pgTable, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { roomCategoriesTable } from "./room-categories";
import { bedTypesTable } from "./bed-types";

export const roomTypesTable = pgTable("room_types", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  categoryId: text("category_id").references(() => roomCategoriesTable.id),
  bedTypeId: text("bed_type_id").references(() => bedTypesTable.id),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  maxOccupancy: text("max_occupancy").notNull().default("2"),
  maximumAdults: integer("maximum_adults").notNull().default(2),
  maximumChildren: integer("maximum_children").notNull().default(1),
  amenities: text("amenities").array().notNull().default([]),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type RoomType = typeof roomTypesTable.$inferSelect;
export type InsertRoomType = typeof roomTypesTable.$inferInsert;

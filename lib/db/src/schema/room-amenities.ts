import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const amenityCategoryEnum = ["technology", "comfort", "view", "bathroom", "food_beverage", "recreation", "other"] as const;
export type AmenityCategory = (typeof amenityCategoryEnum)[number];

export const roomAmenitiesTable = pgTable("room_amenities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  category: text("category").notNull().default("other").$type<AmenityCategory>(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type RoomAmenity = typeof roomAmenitiesTable.$inferSelect;
export type InsertRoomAmenity = typeof roomAmenitiesTable.$inferInsert;

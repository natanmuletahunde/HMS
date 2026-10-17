import { pgTable, text, boolean, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";

export const pricingTypeEnum = ["base", "weekend", "holiday", "seasonal", "corporate", "travel_agency", "vip"] as const;
export type PricingType = (typeof pricingTypeEnum)[number];

export const roomPricingTable = pgTable("room_pricing", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  pricingType: text("pricing_type").notNull().default("base").$type<PricingType>(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).default("0"),
  effectiveDate: text("effective_date"),
  expirationDate: text("expiration_date"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type RoomPricing = typeof roomPricingTable.$inferSelect;
export type InsertRoomPricing = typeof roomPricingTable.$inferInsert;

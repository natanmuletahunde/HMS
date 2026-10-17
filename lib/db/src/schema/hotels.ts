import { pgTable, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";

export const hotelStatusEnum = ["active", "inactive", "suspended"] as const;
export type HotelStatus = (typeof hotelStatusEnum)[number];

export const hotelsTable = pgTable("hotels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  hotelName: text("hotel_name").notNull(),
  legalName: text("legal_name"),
  hotelCode: text("hotel_code").notNull().unique(),
  logo: text("logo"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  country: text("country").notNull().default("Ethiopia"),
  region: text("region"),
  city: text("city"),
  subCity: text("sub_city"),
  address: text("address"),
  postalCode: text("postal_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  description: text("description"),
  timezone: text("timezone").notNull().default("Africa/Addis_Ababa"),
  currencyCode: text("currency_code").notNull().default("ETB"),
  taxNumber: text("tax_number"),
  licenseNumber: text("license_number"),
  starRating: integer("star_rating").default(3),
  checkInTime: text("check_in_time").notNull().default("14:00"),
  checkOutTime: text("check_out_time").notNull().default("12:00"),
  status: text("status").notNull().default("active").$type<HotelStatus>(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Hotel = typeof hotelsTable.$inferSelect;
export type InsertHotel = typeof hotelsTable.$inferInsert;

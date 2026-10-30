import { pgTable, text, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";

export const guestsTable = pgTable("guests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  guestCode: text("guest_code").unique(),
  // Name
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  // Personal info
  gender: text("gender"),            // male | female | other
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  nationality: text("nationality"),
  // Identity documents
  idType: text("id_type"),
  idNumber: text("id_number"),
  passportNumber: text("passport_number"),
  nationalId: text("national_id"),
  visaNumber: text("visa_number"),
  // Contact
  phone: text("phone"),
  alternativePhone: text("alternative_phone"),
  email: text("email"),
  // Address
  country: text("country"),
  region: text("region"),
  city: text("city"),
  address: text("address"),
  // Emergency contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  // Classification
  vipStatus: boolean("vip_status").notNull().default(false),
  guestType: text("guest_type").notNull().default("individual"), // individual | corporate | travel_agency | government
  // Preferences
  smokingPreference: text("smoking_preference"),    // smoking | non_smoking
  bedPreference: text("bed_preference"),            // king | queen | twin | single
  floorPreference: text("floor_preference"),        // low | mid | high
  foodPreference: text("food_preference"),          // vegetarian | vegan | halal | none
  specialRequests: text("special_requests"),
  // Media / misc
  profilePhoto: text("profile_photo"),
  remarks: text("remarks"),
  notes: text("notes"),
  passwordHash: text("password_hash"),
  totalStays: integer("total_stays").notNull().default(0),
  // Audit
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Guest = typeof guestsTable.$inferSelect;
export type InsertGuest = typeof guestsTable.$inferInsert;

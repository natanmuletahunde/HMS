import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";
import { roomAmenitiesTable } from "./room-amenities";

export const roomAmenityAssignmentsTable = pgTable("room_amenity_assignments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  amenityId: text("amenity_id").notNull().references(() => roomAmenitiesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoomAmenityAssignment = typeof roomAmenityAssignmentsTable.$inferSelect;

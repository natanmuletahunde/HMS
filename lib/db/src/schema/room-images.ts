import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";

export const roomImagesTable = pgTable("room_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  url: text("url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoomImage = typeof roomImagesTable.$inferSelect;
export type InsertRoomImage = typeof roomImagesTable.$inferInsert;

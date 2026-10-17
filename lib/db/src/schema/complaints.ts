import { pgTable, text, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";

export const complaintCategoryEnum = [
  "room","restaurant","billing","staff","housekeeping","maintenance","transport","conference","general",
] as const;
export type ComplaintCategory = (typeof complaintCategoryEnum)[number];

export const complaintPriorityEnum = ["low","medium","high","critical"] as const;
export type ComplaintPriority = (typeof complaintPriorityEnum)[number];

export const complaintStatusEnum = ["new","assigned","in_progress","resolved","closed","rejected","escalated"] as const;
export type ComplaintStatus = (typeof complaintStatusEnum)[number];

export const complaintsTable = pgTable("complaints", {
  id:               text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  complaintNumber:  text("complaint_number").notNull(),
  guestId:          text("guest_id"),
  guestName:        text("guest_name").notNull(),
  guestEmail:       text("guest_email"),
  guestPhone:       text("guest_phone"),
  reservationId:    text("reservation_id"),
  roomId:           text("room_id"),
  category:         text("category").notNull().$type<ComplaintCategory>(),
  priority:         text("priority").notNull().default("medium").$type<ComplaintPriority>(),
  subject:          text("subject").notNull(),
  description:      text("description").notNull(),
  status:           text("status").notNull().default("new").$type<ComplaintStatus>(),
  assignedTo:       text("assigned_to"),
  assignedAt:       timestamp("assigned_at", { withTimezone: true }),
  resolvedBy:       text("resolved_by"),
  resolvedAt:       timestamp("resolved_at", { withTimezone: true }),
  resolutionNotes:  text("resolution_notes"),
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  satisfactionComment: text("satisfaction_comment"),
  escalatedTo:      text("escalated_to"),
  escalatedAt:      timestamp("escalated_at", { withTimezone: true }),
  escalationReason: text("escalation_reason"),
  firstResponseAt:  timestamp("first_response_at", { withTimezone: true }),
  closedAt:         timestamp("closed_at", { withTimezone: true }),
  isActive:         boolean("is_active").notNull().default(true),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:        timestamp("deleted_at", { withTimezone: true }),
  createdBy:        text("created_by"),
  updatedBy:        text("updated_by"),
});

export const complaintCommentsTable = pgTable("complaint_comments", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  complaintId: text("complaint_id").notNull().references(() => complaintsTable.id),
  authorId:    text("author_id"),
  authorName:  text("author_name").notNull(),
  comment:     text("comment").notNull(),
  isInternal:  boolean("is_internal").notNull().default(false), // internal staff note vs guest-visible
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Complaint        = typeof complaintsTable.$inferSelect;
export type ComplaintComment = typeof complaintCommentsTable.$inferSelect;

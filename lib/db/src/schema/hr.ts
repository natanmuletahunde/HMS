import { pgTable, text, boolean, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsTable = pgTable("departments", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull().unique(),
  code:        text("code"),
  description: text("description"),
  managerId:   text("manager_id"),
  parentId:    text("parent_id"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:   text("created_by"),
  updatedBy:   text("updated_by"),
});

// ─── Attendance Records ───────────────────────────────────────────────────────
export const attendanceRecordsTable = pgTable("attendance_records", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId:      text("employee_id").notNull().references(() => employeesTable.id),
  attendanceDate:  date("attendance_date", { mode: "string" }).notNull(),
  clockIn:         timestamp("clock_in", { withTimezone: true }),
  clockOut:        timestamp("clock_out", { withTimezone: true }),
  scheduledIn:     text("scheduled_in"), // "08:00"
  scheduledOut:    text("scheduled_out"), // "17:00"
  workedHours:     numeric("worked_hours", { precision: 5, scale: 2 }).default("0"),
  overtimeHours:   numeric("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  lateMinutes:     integer("late_minutes").default(0),
  status:          text("status").notNull().default("present"), // present, absent, late, half_day, on_leave, public_holiday
  shiftId:         text("shift_id"),
  notes:           text("notes"),
  approvedBy:      text("approved_by"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Leave Requests ───────────────────────────────────────────────────────────
export const leaveTypeEnum = ["annual","sick","maternity","paternity","emergency","unpaid","other"] as const;
export type LeaveType = (typeof leaveTypeEnum)[number];

export const leaveRequestsTable = pgTable("leave_requests", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leaveNumber:     text("leave_number").notNull(),
  employeeId:      text("employee_id").notNull().references(() => employeesTable.id),
  leaveType:       text("leave_type").notNull().$type<LeaveType>(),
  startDate:       date("start_date", { mode: "string" }).notNull(),
  endDate:         date("end_date", { mode: "string" }).notNull(),
  totalDays:       integer("total_days").notNull(),
  reason:          text("reason"),
  status:          text("status").notNull().default("pending"), // pending, approved, rejected, cancelled
  approvedBy:      text("approved_by"),
  approvedAt:      timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  handoverTo:      text("handover_to"),
  attachmentUrl:   text("attachment_url"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Shifts ───────────────────────────────────────────────────────────────────
export const shiftsTable = pgTable("shifts", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull(), // Morning, Evening, Night, Split
  code:        text("code"),
  startTime:   text("start_time").notNull(), // "06:00"
  endTime:     text("end_time").notNull(),   // "14:00"
  breakMinutes: integer("break_minutes").default(30),
  workedHours: numeric("worked_hours", { precision: 4, scale: 2 }),
  isNightShift: boolean("is_night_shift").notNull().default(false),
  overtimeRate: numeric("overtime_rate", { precision: 4, scale: 2 }).default("1.5"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:   text("created_by"),
  updatedBy:   text("updated_by"),
});

// ─── Shift Assignments ────────────────────────────────────────────────────────
export const shiftAssignmentsTable = pgTable("shift_assignments", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId:  text("employee_id").notNull().references(() => employeesTable.id),
  shiftId:     text("shift_id").notNull().references(() => shiftsTable.id),
  assignedDate: date("assigned_date", { mode: "string" }).notNull(),
  status:      text("status").notNull().default("scheduled"), // scheduled, completed, missed, swapped
  notes:       text("notes"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:   text("created_by"),
  updatedBy:   text("updated_by"),
});

// ─── Performance Reviews ──────────────────────────────────────────────────────
export const performanceReviewsTable = pgTable("performance_reviews", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId:      text("employee_id").notNull().references(() => employeesTable.id),
  reviewerId:      text("reviewer_id"),
  reviewPeriod:    text("review_period").notNull(), // "2024-Q1", "2024-Annual"
  reviewDate:      date("review_date", { mode: "string" }).notNull(),
  overallScore:    integer("overall_score"), // 1-100
  attendanceScore: integer("attendance_score"),
  performanceScore: integer("performance_score"),
  teamworkScore:   integer("teamwork_score"),
  initiativeScore: integer("initiative_score"),
  strengths:       text("strengths"),
  improvements:    text("improvements"),
  goals:           text("goals"),
  kpis:            text("kpis"), // json
  status:          text("status").notNull().default("draft"), // draft, submitted, acknowledged, completed
  employeeComment: text("employee_comment"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

export type Department       = typeof departmentsTable.$inferSelect;
export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
export type LeaveRequest     = typeof leaveRequestsTable.$inferSelect;
export type Shift             = typeof shiftsTable.$inferSelect;
export type PerformanceReview = typeof performanceReviewsTable.$inferSelect;

import { pgTable, text, boolean, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const employeesTable = pgTable("employees", {
  id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeCode:         text("employee_code"),
  firstName:            text("first_name").notNull(),
  middleName:           text("middle_name"),
  lastName:             text("last_name").notNull(),
  email:                text("email").notNull().unique(),
  phone:                text("phone"),
  alternativePhone:     text("alternative_phone"),
  gender:               text("gender"),
  dateOfBirth:          date("date_of_birth", { mode: "string" }),
  nationalId:           text("national_id"),
  nationality:          text("nationality"),
  address:              text("address"),
  city:                 text("city"),
  country:              text("country"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  department:           text("department").notNull(),
  departmentId:         text("department_id"),
  position:             text("position").notNull(),
  employmentType:       text("employment_type").notNull().default("full_time"), // full_time, part_time, contract, intern
  salaryGrade:          text("salary_grade"),
  salary:               numeric("salary", { precision: 10, scale: 2 }),
  supervisorId:         text("supervisor_id"),
  userId:               text("user_id").references(() => usersTable.id),
  profilePhoto:         text("profile_photo"),
  hiredAt:              date("hired_at", { mode: "string" }).notNull(),
  terminationDate:      date("termination_date", { mode: "string" }),
  terminationReason:    text("termination_reason"),
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:            timestamp("deleted_at", { withTimezone: true }),
  createdBy:            text("created_by"),
  updatedBy:            text("updated_by"),
});

export type Employee = typeof employeesTable.$inferSelect;

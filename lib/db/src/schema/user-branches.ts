import { pgTable, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

export const userBranchesTable = pgTable(
  "user_branches",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    branchId: text("branch_id").notNull().references(() => branchesTable.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_branches_user_branch_idx").on(table.userId, table.branchId),
  ]
);

export type UserBranch = typeof userBranchesTable.$inferSelect;
export type InsertUserBranch = typeof userBranchesTable.$inferInsert;

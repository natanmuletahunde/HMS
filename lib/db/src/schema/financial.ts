import { pgTable, text, boolean, timestamp, numeric, date } from "drizzle-orm/pg-core";

// ─── Financial Transactions ───────────────────────────────────────────────────
export const transactionTypeEnum = [
  "revenue","expense","deposit","refund","transfer","adjustment",
] as const;
export type TransactionType = (typeof transactionTypeEnum)[number];

export const transactionPaymentMethodEnum = [
  "cash","credit_card","debit_card","bank_transfer","mobile_money","online_payment","voucher","gift_card","room_charge",
] as const;
export type TransactionPaymentMethod = (typeof transactionPaymentMethodEnum)[number];

export const transactionsTable = pgTable("transactions", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionNumber: text("transaction_number").notNull(),
  transactionType: text("transaction_type").notNull().$type<TransactionType>(),
  category:        text("category").notNull(), // room_charges, restaurant_sales, pos_sales, maintenance, payroll, etc.
  subcategory:     text("subcategory"),
  amount:          numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency:        text("currency").notNull().default("USD"),
  exchangeRate:    numeric("exchange_rate", { precision: 10, scale: 6 }).default("1"),
  amountUsd:       numeric("amount_usd", { precision: 10, scale: 2 }),
  paymentMethod:   text("payment_method").$type<TransactionPaymentMethod>(),
  referenceType:   text("reference_type"), // invoice, reservation, pos_order, purchase_order, etc.
  referenceId:     text("reference_id"),
  referenceNumber: text("reference_number"),
  description:     text("description"),
  cashRegisterId:  text("cash_register_id"),
  cashShiftId:     text("cash_shift_id"),
  processedBy:     text("processed_by"),
  transactionDate: date("transaction_date", { mode: "string" }).notNull(),
  status:          text("status").notNull().default("completed"), // pending, completed, failed, reversed
  notes:           text("notes"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Cash Registers ───────────────────────────────────────────────────────────
export const cashRegistersTable = pgTable("cash_registers", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull(),
  location:    text("location"),
  status:      text("status").notNull().default("closed"), // open, closed
  currentBalance: numeric("current_balance", { precision: 10, scale: 2 }).default("0"),
  currency:    text("currency").notNull().default("USD"),
  assignedTo:  text("assigned_to"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:   text("created_by"),
  updatedBy:   text("updated_by"),
});

// ─── Cash Shifts ──────────────────────────────────────────────────────────────
export const cashShiftsTable = pgTable("cash_shifts", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  shiftNumber:     text("shift_number").notNull(),
  cashRegisterId:  text("cash_register_id").notNull().references(() => cashRegistersTable.id),
  cashierId:       text("cashier_id"),
  openingBalance:  numeric("opening_balance", { precision: 10, scale: 2 }).notNull(),
  closingBalance:  numeric("closing_balance", { precision: 10, scale: 2 }),
  expectedBalance: numeric("expected_balance", { precision: 10, scale: 2 }),
  cashIn:          numeric("cash_in", { precision: 10, scale: 2 }).default("0"),
  cashOut:         numeric("cash_out", { precision: 10, scale: 2 }).default("0"),
  openedAt:        timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt:        timestamp("closed_at", { withTimezone: true }),
  status:          text("status").notNull().default("open"), // open, closed
  discrepancy:     numeric("discrepancy", { precision: 10, scale: 2 }),
  notes:           text("notes"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Credit Notes ─────────────────────────────────────────────────────────────
export const creditNotesTable = pgTable("credit_notes", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  noteNumber:   text("note_number").notNull(),
  type:         text("type").notNull().default("credit"), // credit, debit
  invoiceId:    text("invoice_id"),
  guestId:      text("guest_id"),
  amount:       numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason:       text("reason").notNull(),
  status:       text("status").notNull().default("issued"), // issued, applied, cancelled
  issuedBy:     text("issued_by"),
  issuedAt:     timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  appliedAt:    timestamp("applied_at", { withTimezone: true }),
  notes:        text("notes"),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:    text("created_by"),
  updatedBy:    text("updated_by"),
});

export type Transaction   = typeof transactionsTable.$inferSelect;
export type CashRegister  = typeof cashRegistersTable.$inferSelect;
export type CashShift     = typeof cashShiftsTable.$inferSelect;
export type CreditNote    = typeof creditNotesTable.$inferSelect;

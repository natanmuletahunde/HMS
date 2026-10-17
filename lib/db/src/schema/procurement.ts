import { pgTable, text, boolean, timestamp, numeric, date, integer } from "drizzle-orm/pg-core";
import { inventoryItemsTable } from "./inventory";

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersTable = pgTable("suppliers", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  supplierCode:    text("supplier_code").notNull(),
  companyName:     text("company_name").notNull(),
  contactPerson:   text("contact_person"),
  phone:           text("phone"),
  email:           text("email"),
  address:         text("address"),
  city:            text("city"),
  country:         text("country"),
  tin:             text("tin"),
  bankName:        text("bank_name"),
  bankAccount:     text("bank_account"),
  paymentTerms:    text("payment_terms"),
  rating:          integer("rating").default(5), // 1-5
  status:          text("status").notNull().default("active"), // active, inactive, blacklisted
  notes:           text("notes"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Purchase Requests ────────────────────────────────────────────────────────
export const purchaseRequestsTable = pgTable("purchase_requests", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestNumber: text("request_number").notNull(),
  department:    text("department").notNull(),
  requestedBy:   text("requested_by"),
  priority:      text("priority").notNull().default("normal"), // low, normal, high, urgent
  requiredDate:  date("required_date", { mode: "string" }),
  status:        text("status").notNull().default("draft"), // draft, pending, approved, rejected, ordered, completed
  approvedBy:    text("approved_by"),
  approvedAt:    timestamp("approved_at", { withTimezone: true }),
  rejectedBy:    text("rejected_by"),
  rejectionReason: text("rejection_reason"),
  notes:         text("notes"),
  totalAmount:   numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:     timestamp("deleted_at", { withTimezone: true }),
  createdBy:     text("created_by"),
  updatedBy:     text("updated_by"),
});

export const purchaseRequestItemsTable = pgTable("purchase_request_items", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId:    text("request_id").notNull().references(() => purchaseRequestsTable.id),
  itemId:       text("item_id").references(() => inventoryItemsTable.id),
  itemName:     text("item_name").notNull(),
  unit:         text("unit").notNull(),
  quantityRequested: numeric("quantity_requested", { precision: 10, scale: 2 }).notNull(),
  estimatedUnitCost: numeric("estimated_unit_cost", { precision: 10, scale: 2 }),
  estimatedTotal:    numeric("estimated_total", { precision: 10, scale: 2 }),
  notes:        text("notes"),
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrdersTable = pgTable("purchase_orders", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  poNumber:        text("po_number").notNull(),
  supplierId:      text("supplier_id").references(() => suppliersTable.id),
  requestId:       text("request_id").references(() => purchaseRequestsTable.id),
  orderDate:       date("order_date", { mode: "string" }),
  expectedDelivery: date("expected_delivery", { mode: "string" }),
  actualDelivery:  date("actual_delivery", { mode: "string" }),
  status:          text("status").notNull().default("draft"), // draft, sent, confirmed, partial, received, cancelled
  subtotal:        numeric("subtotal", { precision: 10, scale: 2 }).default("0"),
  taxAmount:       numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount:  numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount:     numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus:   text("payment_status").notNull().default("unpaid"), // unpaid, partial, paid
  paymentTerms:    text("payment_terms"),
  deliveryAddress: text("delivery_address"),
  approvedBy:      text("approved_by"),
  approvedAt:      timestamp("approved_at", { withTimezone: true }),
  notes:           text("notes"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:        text("order_id").notNull().references(() => purchaseOrdersTable.id),
  itemId:         text("item_id").references(() => inventoryItemsTable.id),
  itemName:       text("item_name").notNull(),
  unit:           text("unit").notNull(),
  quantityOrdered:   numeric("quantity_ordered", { precision: 10, scale: 2 }).notNull(),
  quantityReceived:  numeric("quantity_received", { precision: 10, scale: 2 }).default("0"),
  unitPrice:      numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount:      numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  total:          numeric("total", { precision: 10, scale: 2 }).notNull(),
  notes:          text("notes"),
});

// ─── Goods Receipts ───────────────────────────────────────────────────────────
export const goodsReceiptsTable = pgTable("goods_receipts", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  receiptNumber: text("receipt_number").notNull(),
  orderId:       text("order_id").references(() => purchaseOrdersTable.id),
  supplierId:    text("supplier_id").references(() => suppliersTable.id),
  receivedDate:  date("received_date", { mode: "string" }).notNull(),
  receivedBy:    text("received_by"),
  status:        text("status").notNull().default("pending"), // pending, inspecting, accepted, partial, rejected
  qualityScore:  integer("quality_score"),
  notes:         text("notes"),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdBy:     text("created_by"),
  updatedBy:     text("updated_by"),
});

export const goodsReceiptItemsTable = pgTable("goods_receipt_items", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  receiptId:       text("receipt_id").notNull().references(() => goodsReceiptsTable.id),
  orderItemId:     text("order_item_id").references(() => purchaseOrderItemsTable.id),
  itemId:          text("item_id").references(() => inventoryItemsTable.id),
  itemName:        text("item_name").notNull(),
  unit:            text("unit").notNull(),
  quantityExpected: numeric("quantity_expected", { precision: 10, scale: 2 }),
  quantityReceived: numeric("quantity_received", { precision: 10, scale: 2 }).notNull(),
  quantityAccepted: numeric("quantity_accepted", { precision: 10, scale: 2 }).default("0"),
  quantityRejected: numeric("quantity_rejected", { precision: 10, scale: 2 }).default("0"),
  unitCost:         numeric("unit_cost", { precision: 10, scale: 2 }),
  inspectionNotes:  text("inspection_notes"),
  status:           text("status").notNull().default("pending"), // pending, accepted, rejected, partial
});

export type Supplier           = typeof suppliersTable.$inferSelect;
export type PurchaseRequest    = typeof purchaseRequestsTable.$inferSelect;
export type PurchaseOrder      = typeof purchaseOrdersTable.$inferSelect;
export type GoodsReceipt       = typeof goodsReceiptsTable.$inferSelect;

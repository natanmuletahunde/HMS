import { pgTable, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { menuItemsTable } from "./restaurant";
import { restaurantTablesTable } from "./restaurant";
import { usersTable } from "./users";

// ─── POS Orders ───────────────────────────────────────────────────────────────
export const posOrderTypeEnum = ["dine_in","takeaway","room_charge","delivery","walk_in"] as const;
export type PosOrderType = (typeof posOrderTypeEnum)[number];

export const posOrderStatusEnum = ["open","pending","preparing","ready","served","cancelled","paid"] as const;
export type PosOrderStatus = (typeof posOrderStatusEnum)[number];

export const posDiscountTypeEnum = ["none","percent","fixed"] as const;
export type PosDiscountType = (typeof posDiscountTypeEnum)[number];

export const posOrdersTable = pgTable("pos_orders", {
  id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber:          text("order_number").notNull(),
  orderType:            text("order_type").notNull().default("dine_in").$type<PosOrderType>(),
  tableId:              text("table_id").references(() => restaurantTablesTable.id),
  tableNumber:          integer("table_number"),
  reservationId:        text("reservation_id"),
  guestId:              text("guest_id"),
  guestName:            text("guest_name"),
  roomNumber:           text("room_number"),
  waiterId:             text("waiter_id").references(() => usersTable.id),
  status:               text("status").notNull().default("open").$type<PosOrderStatus>(),
  // Pricing
  subtotal:             numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discountType:         text("discount_type").notNull().default("none").$type<PosDiscountType>(),
  discountValue:        numeric("discount_value", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount:       numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  taxRate:              numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount:            numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  serviceChargeRate:    numeric("service_charge_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  serviceChargeAmount:  numeric("service_charge_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount:          numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  // Payment
  paymentStatus:        text("payment_status").notNull().default("pending"),
  paymentMethod:        text("payment_method"),
  paidAt:               timestamp("paid_at", { withTimezone: true }),
  // Coupon/Promo
  couponCode:           text("coupon_code"),
  promotionId:          text("promotion_id"),
  // Meta
  notes:                text("notes"),
  receiptNumber:        text("receipt_number"),
  splitFrom:            text("split_from"),   // parent order id for split bills
  mergedTo:             text("merged_to"),    // target order id for merge
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── POS Order Items ──────────────────────────────────────────────────────────
export const posOrderItemsTable = pgTable("pos_order_items", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:        text("order_id").notNull().references(() => posOrdersTable.id),
  menuItemId:     text("menu_item_id").notNull().references(() => menuItemsTable.id),
  name:           text("name").notNull(),
  quantity:       integer("quantity").notNull().default(1),
  unitPrice:      numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total:          numeric("total", { precision: 10, scale: 2 }).notNull(),
  notes:          text("notes"),
  kitchenStatus:  text("kitchen_status").notNull().default("pending"), // pending, preparing, ready, served
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PosOrder     = typeof posOrdersTable.$inferSelect;
export type PosOrderItem = typeof posOrderItemsTable.$inferSelect;

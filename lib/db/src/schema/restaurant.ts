import { pgTable, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { guestsTable } from "./guests";
import { reservationsTable } from "./reservations";
import { roomsTable } from "./rooms";
import { usersTable } from "./users";

// ─── Menu Items ───────────────────────────────────────────────────────────────
export const menuCategoryEnum = [
  "breakfast","lunch","dinner","drinks","dessert","coffee","juice",
  "fast_food","traditional","other",
] as const;
export type MenuCategory = (typeof menuCategoryEnum)[number];

export const kitchenSectionEnum = ["hot","cold","bakery","bar","grill","salad","other"] as const;
export type KitchenSection = (typeof kitchenSectionEnum)[number];

export const menuItemsTable = pgTable("menu_items", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemCode:        text("item_code"),
  name:            text("name").notNull(),
  category:        text("category").notNull().$type<MenuCategory>(),
  kitchenSection:  text("kitchen_section").default("hot").$type<KitchenSection>(),
  description:     text("description"),
  price:           numeric("price", { precision: 10, scale: 2 }).notNull(),
  preparationTime: integer("preparation_time").default(15), // minutes
  imageUrl:        text("image_url"),
  isAvailable:     boolean("is_available").notNull().default(true),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Restaurant Tables ────────────────────────────────────────────────────────
export const tableStatusEnum = ["available","occupied","reserved","cleaning"] as const;
export type TableStatus = (typeof tableStatusEnum)[number];

export const restaurantTablesTable = pgTable("restaurant_tables", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tableNumber:  integer("table_number").notNull().unique(),
  name:         text("name"),
  capacity:     integer("capacity").notNull().default(4),
  floor:        text("floor").default("1"),
  section:      text("section"),
  status:       text("status").notNull().default("available").$type<TableStatus>(),
  currentOrderId: text("current_order_id"),
  waiterId:     text("waiter_id").references(() => usersTable.id),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Restaurant Orders ────────────────────────────────────────────────────────
export const restaurantOrderStatusEnum = ["pending","preparing","ready","served","cancelled"] as const;
export type RestaurantOrderStatus = (typeof restaurantOrderStatusEnum)[number];

export const restaurantOrderTypeEnum = ["dine_in","takeaway","room_charge","delivery","room_service"] as const;
export type RestaurantOrderType = (typeof restaurantOrderTypeEnum)[number];

export const restaurantOrdersTable = pgTable("restaurant_orders", {
  id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber:          text("order_number"),
  tableNumber:          integer("table_number"),
  tableId:              text("table_id").references(() => restaurantTablesTable.id),
  orderType:            text("order_type").notNull().default("dine_in").$type<RestaurantOrderType>(),
  reservationId:        text("reservation_id").references(() => reservationsTable.id),
  guestId:              text("guest_id").references(() => guestsTable.id),
  roomId:               text("room_id").references(() => roomsTable.id),
  waiterId:             text("waiter_id").references(() => usersTable.id),
  guestName:            text("guest_name"),
  status:                      text("status").notNull().default("pending").$type<RestaurantOrderStatus>(),
  diningCase:                  text("dining_case").notNull().default("walk_in"), // 'walk_in' | 'in_house_table' | 'room_service'
  settlementType:              text("settlement_type").default("direct_payment"), // 'complimentary_breakfast' | 'room_charge' | 'direct_payment'
  complimentaryDiscountAmount: numeric("complimentary_discount_amount", { precision: 10, scale: 2 }).default("0"),
  subtotal:                    numeric("subtotal", { precision: 10, scale: 2 }).default("0"),
  taxAmount:                   numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  serviceChargeAmount:         numeric("service_charge_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount:              numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount:                 numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentStatus:               text("payment_status").notNull().default("pending"),
  paymentMethod:               text("payment_method"),
  coordinatorId:               text("coordinator_id").references(() => usersTable.id),
  kitchenOfficerId:            text("kitchen_officer_id").references(() => usersTable.id),
  routedVia:                   text("routed_via").default("direct_kitchen"), // 'coordinator' | 'direct_kitchen'
  coordinatorStatus:           text("coordinator_status").default("pending"), // 'pending' | 'dispatched' | 'bypassed'
  coordinatorNotes:            text("coordinator_notes"),
  kitchenNotes:                text("kitchen_notes"),
  notifiedParty:               text("notified_party"), // 'waiter' | 'coordinator'
  readyAt:                     timestamp("ready_at", { withTimezone: true }),
  dispatchedAt:                timestamp("dispatched_at", { withTimezone: true }),
  servedAt:                    timestamp("served_at", { withTimezone: true }),
  billingStatus:               text("billing_status").default("open_tab"), // 'open_tab' | 'bill_requested' | 'bill_printed' | 'delivered' | 'settled'
  billRequestedAt:             timestamp("bill_requested_at", { withTimezone: true }),
  receiptPrintedAt:            timestamp("receipt_printed_at", { withTimezone: true }),
  cashierId:                   text("cashier_id").references(() => usersTable.id),
  cashierNotes:                text("cashier_notes"),
  notes:                       text("notes"),
  isActive:                    boolean("is_active").notNull().default(true),
  createdAt:                   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Daily Meal Claims (Breakfast Eligibility Tracking) ─────────────────────────
export const dailyMealClaimsTable = pgTable("daily_meal_claims", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId:        text("room_id").notNull().references(() => roomsTable.id),
  roomNumber:    text("room_number").notNull(),
  reservationId: text("reservation_id").references(() => reservationsTable.id),
  guestId:       text("guest_id").references(() => guestsTable.id),
  guestName:     text("guest_name"),
  claimDate:     text("claim_date").notNull(), // 'YYYY-MM-DD'
  mealType:      text("meal_type").notNull().default("breakfast"), // 'breakfast'
  coversClaimed: integer("covers_claimed").notNull().default(1),
  orderId:       text("order_id"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Restaurant Order Items ───────────────────────────────────────────────────
export const restaurantOrderItemsTable = pgTable("restaurant_order_items", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:    text("order_id").notNull().references(() => restaurantOrdersTable.id),
  menuItemId: text("menu_item_id").notNull().references(() => menuItemsTable.id),
  name:       text("name").notNull(),
  quantity:   integer("quantity").notNull().default(1),
  unitPrice:  numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  total:      numeric("total", { precision: 10, scale: 2 }).notNull(),
  isComplimentary: boolean("is_complimentary").notNull().default(false),
  notes:      text("notes"),
});

export type MenuItem             = typeof menuItemsTable.$inferSelect;
export type RestaurantTable      = typeof restaurantTablesTable.$inferSelect;
export type RestaurantOrder      = typeof restaurantOrdersTable.$inferSelect;
export type RestaurantOrderItem  = typeof restaurantOrderItemsTable.$inferSelect;
export type DailyMealClaim       = typeof dailyMealClaimsTable.$inferSelect;

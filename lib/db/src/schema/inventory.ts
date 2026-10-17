import { pgTable, text, boolean, timestamp, numeric, integer } from "drizzle-orm/pg-core";

// ─── Inventory Categories ─────────────────────────────────────────────────────
export const inventoryCategoriesTable = pgTable("inventory_categories", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:        text("name").notNull().unique(),
  description: text("description"),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Inventory Items ──────────────────────────────────────────────────────────
export const inventoryItemsTable = pgTable("inventory_items", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemCode:        text("item_code"),
  barcode:         text("barcode"),
  name:            text("name").notNull(),
  categoryId:      text("category_id").references(() => inventoryCategoriesTable.id),
  category:        text("category").notNull(),
  unit:            text("unit").notNull(),
  currentStock:    numeric("current_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  minStock:        numeric("min_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  maxStock:        numeric("max_stock", { precision: 10, scale: 2 }),
  reorderLevel:    numeric("reorder_level", { precision: 10, scale: 2 }).default("0"),
  unitCost:        numeric("unit_cost", { precision: 10, scale: 2 }),
  purchasePrice:   numeric("purchase_price", { precision: 10, scale: 2 }),
  sellingPrice:    numeric("selling_price", { precision: 10, scale: 2 }),
  storageLocation: text("storage_location"),
  supplier:        text("supplier"),
  supplierId:      text("supplier_id"),
  status:          text("status").notNull().default("active"), // active, low_stock, out_of_stock, discontinued
  expiryDate:      text("expiry_date"),
  description:     text("description"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:       timestamp("deleted_at", { withTimezone: true }),
  createdBy:       text("created_by"),
  updatedBy:       text("updated_by"),
});

// ─── Stock Movements ──────────────────────────────────────────────────────────
export const stockMovementTypeEnum = [
  "stock_in","stock_out","transfer","adjustment","return","damaged","expired","count_correction",
] as const;
export type StockMovementType = (typeof stockMovementTypeEnum)[number];

export const stockMovementsTable = pgTable("stock_movements", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId:        text("item_id").notNull().references(() => inventoryItemsTable.id),
  movementType:  text("movement_type").notNull().$type<StockMovementType>(),
  quantity:      numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  previousStock: numeric("previous_stock", { precision: 10, scale: 2 }).notNull(),
  newStock:      numeric("new_stock", { precision: 10, scale: 2 }).notNull(),
  unitCost:      numeric("unit_cost", { precision: 10, scale: 2 }),
  referenceType: text("reference_type"), // purchase_order, pos_order, room_service, etc.
  referenceId:   text("reference_id"),
  notes:         text("notes"),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy:     text("created_by"),
});

export type InventoryCategory = typeof inventoryCategoriesTable.$inferSelect;
export type InventoryItem     = typeof inventoryItemsTable.$inferSelect;
export type StockMovement     = typeof stockMovementsTable.$inferSelect;

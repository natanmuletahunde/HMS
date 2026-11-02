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

// ─── Multi-Tier Inventory Locations (Main vs Mini Stocks) ─────────────────────
export const inventoryLocationsTable = pgTable("inventory_locations", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code:       text("code").notNull().unique(), // e.g. MAIN_WH, MINI_REST, MINI_HK
  name:       text("name").notNull(),
  type:       text("type").notNull().default("mini"), // 'main' | 'mini'
  department: text("department").notNull().default("general"), // 'central' | 'restaurant' | 'housekeeping' | 'maintenance'
  managedBy:  text("managed_by"),
  isActive:   boolean("is_active").notNull().default(true),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Location Specific Stock Balances ─────────────────────────────────────────
export const inventoryLocationStocksTable = pgTable("inventory_location_stocks", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  locationId:   text("location_id").notNull().references(() => inventoryLocationsTable.id),
  itemId:       text("item_id").notNull().references(() => inventoryItemsTable.id),
  currentStock: numeric("current_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  minStock:     numeric("min_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  reorderLevel: numeric("reorder_level", { precision: 10, scale: 2 }).notNull().default("0"),
  status:       text("status").notNull().default("adequate"), // 'adequate', 'running_low', 'depleted'
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ─── Frontline Floor Requisitions (Housekeeping & Waiters -> Coordinator) ─────
export const floorRequisitionsTable = pgTable("floor_requisitions", {
  id:                 text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requisitionNumber:  text("requisition_number").notNull().unique(), // e.g. REQ-XXXXX
  department:         text("department").notNull(), // 'housekeeping' | 'waiters' | 'restaurant'
  requestedBy:        text("requested_by").notNull(),
  stationName:        text("station_name"), // e.g. Cart #3, Dining Station 2
  sourceLocationId:   text("source_location_id").references(() => inventoryLocationsTable.id),
  status:             text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  urgency:            text("urgency").notNull().default("normal"), // 'normal', 'urgent'
  notes:              text("notes"),
  approvedBy:         text("approved_by"),
  approvedAt:         timestamp("approved_at", { withTimezone: true }),
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const floorRequisitionItemsTable = pgTable("floor_requisition_items", {
  id:                 text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requisitionId:      text("requisition_id").notNull().references(() => floorRequisitionsTable.id),
  itemId:             text("item_id").references(() => inventoryItemsTable.id),
  itemName:           text("item_name").notNull(),
  unit:               text("unit").notNull(),
  quantityRequested:  numeric("quantity_requested", { precision: 10, scale: 2 }).notNull(),
  quantityIssued:     numeric("quantity_issued", { precision: 10, scale: 2 }).notNull().default("0"),
  notes:              text("notes"),
});

export type InventoryLocation       = typeof inventoryLocationsTable.$inferSelect;
export type InventoryLocationStock  = typeof inventoryLocationStocksTable.$inferSelect;
export type FloorRequisition        = typeof floorRequisitionsTable.$inferSelect;
export type FloorRequisitionItem    = typeof floorRequisitionItemsTable.$inferSelect;


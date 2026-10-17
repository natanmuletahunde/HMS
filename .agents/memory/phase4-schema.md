---
name: Phase 4 schema additions
description: New DB tables added in Phase 4 (Operations), migration notes, and export names used in NestJS services
---

## New tables added in Phase 4

### Housekeeping
- `cleaning_areas` → `cleaningAreasTable`
- `housekeeping_assignments` (expanded) → `housekeepingAssignmentsTable`
- `cleaning_inspections` → `cleaningInspectionsTable`

### Maintenance
- `maintenance_categories` → `maintenanceCategoriesTable`
- `maintenance_requests` (expanded) → `maintenanceRequestsTable`
- `maintenance_inspections` → `maintenanceInspectionsTable`

### Restaurant
- `restaurant_tables` (new) → `restaurantTablesTable`
- `menu_items` (expanded: itemCode, kitchenSection, preparationTime, isActive) → `menuItemsTable`
- `restaurant_orders` (expanded: orderNumber, orderType, tableId, subtotal, tax, paymentStatus, etc.) → `restaurantOrdersTable`
- `restaurant_order_items` (expanded: notes) → `restaurantOrderItemsTable`

### POS
- `pos_orders` → `posOrdersTable`
- `pos_order_items` → `posOrderItemsTable`

### Room Service
- `room_service_requests` → `roomServiceRequestsTable`
- `room_service_items` → `roomServiceItemsTable`

## Migration approach
All tables migrated using raw SQL via `node -e` with `Pool` from 'pg' from the `artifacts/api-server/` directory (which has pg in node_modules). Used `ADD COLUMN IF NOT EXISTS` for altering existing tables and `CREATE TABLE IF NOT EXISTS` for new ones. All in a single transaction.

**Why:** drizzle-kit push fails in non-TTY; lib/db uses CJS dist which can't run directly.

## NestJS modules added
- `PosModule` at `src/modules/pos/`
- `RoomServiceModule` at `src/modules/room-service/`
Both registered in `app.module.ts`.

## Numeric column parsing
All numeric columns from Postgres return as strings. Always use `parseFloat(x)` before arithmetic or returning from service. The pattern `Number(x ?? 0).toFixed(2)` is used in frontend display.

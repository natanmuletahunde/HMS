---
name: Phase 5 schema additions
description: New tables and expanded tables added in Phase 5 Business Management; migration approach and key export names
---

## New tables (Phase 5)
All created via single `node -e` migration from `artifacts/api-server/` directory using ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS pattern.

### inventory.ts (expanded)
- `inventory_categories` — new; exported as `inventoryCategoriesTable`
- `inventory_items` — expanded: added itemCode, barcode, categoryId, reorderLevel, purchasePrice, sellingPrice, storageLocation, supplierId, status, expiryDate, description, isActive, deletedAt, createdBy, updatedBy
- `stock_movements` — new; exported as `stockMovementsTable`

### procurement.ts (new file)
- `suppliers` → `suppliersTable`
- `purchase_requests` → `purchaseRequestsTable`
- `purchase_request_items` → `purchaseRequestItemsTable`
- `purchase_orders` → `purchaseOrdersTable`
- `purchase_order_items` → `purchaseOrderItemsTable`
- `goods_receipts` → `goodsReceiptsTable`
- `goods_receipt_items` → `goodsReceiptItemsTable`

### financial.ts (new file)
- `transactions` → `transactionsTable`
- `cash_registers` → `cashRegistersTable`
- `cash_shifts` → `cashShiftsTable`
- `credit_notes` → `creditNotesTable`

### conference.ts (new file)
- `conference_halls` → `conferenceHallsTable`
- `conference_equipment` → `conferenceEquipmentTable`
- `conference_bookings` → `conferenceBookingsTable`
- `conference_booking_services` → `conferenceBookingServicesTable`

### transport.ts (new file)
- `vehicles` → `vehiclesTable`
- `drivers` → `driversTable`
- `trips` → `tripsTable`

### hr.ts (new file)
- `departments` → `departmentsTable`
- `attendance_records` → `attendanceRecordsTable`
- `leave_requests` → `leaveRequestsTable`
- `shifts` → `shiftsTable`
- `shift_assignments` → `shiftAssignmentsTable`
- `performance_reviews` → `performanceReviewsTable`

### employees.ts (expanded)
Added: employeeCode, middleName, alternativePhone, gender, dateOfBirth, nationalId, nationality, address, city, country, emergencyContactName, emergencyContactPhone, departmentId, employmentType, salaryGrade, supervisorId, profilePhoto, terminationDate, terminationReason, deletedAt, createdBy, updatedBy

## New NestJS modules (registered in app.module.ts)
- ProcurementModule (`./modules/procurement/procurement.module`)
- FinancialModule (`./modules/financial/financial.module`)
- ConferenceModule (`./modules/conference/conference.module`)
- TransportModule (`./modules/transport/transport.module`)
- HrModule (`./modules/hr/hr.module`)

## New frontend pages
- /inventory — 4 tabs: Dashboard, Items, Stock Movements, Alerts
- /procurement — 4 tabs: Suppliers, Purchase Requests, Purchase Orders, Goods Receipt
- /financial — 4 tabs: Dashboard, Transactions, Cash Registers, Credit Notes
- /conference — 4 tabs: Dashboard, Halls, Bookings, Calendar
- /transport — 4 tabs: Dashboard, Vehicles, Drivers, Trips
- /hr — 7 tabs: Dashboard, Employees, Attendance, Leaves, Shifts, Departments, Performance
- /employees — full rewrite with stats + expanded employee form

**Why:** Phase 5 Business Management spec implementation.

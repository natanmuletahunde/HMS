# Changelog

All notable changes to Nexus HMS are documented in this file.

Format: [Version] — Date — Summary

---

## [2.0.0] — 2026-08-27 — Phase 7: Enterprise Platform & Documentation

### Added
- **Multi-Tenant SaaS** — Tenant and organization administration, tenant branding, and subscription plan/current/usage/history management.
- **Workflow Engine** — Workflow definitions, ordered steps, instances, and start/advance operations.
- **Module Management** — Module inventory/statistics and module enable/disable configuration.
- **Plugin Framework** — Plugin registry, SDK specification, and plugin create/read/update lifecycle.
- **i18n** — English, Amharic, Oromo, Arabic, and French interface support, including Arabic right-to-left presentation.
- **Themes** — Light, dark, system, and configured custom theme support.
- **WebSocket, EventBus, Cache, and Metrics** — Authenticated Socket.IO tenant/platform channels and reservation, room, housekeeping, notification, and dashboard events; official password-protected Redis adapter/backplane for cross-pod delivery; production fail-closed startup without a usable credential-bearing `REDIS_URL`; cache statistics/flush; metrics endpoint; and client targeting by absolute origin, relative proxy prefix, or empty same-origin mode. Replit uses `/api-server`, local Compose uses `http://localhost:8080`, and production Nginx/Ingress routes same-origin `/socket.io`. Process-local cache remains per pod.
- **Mobile API** — Device registration, token refresh, delta synchronization, and queued change push endpoints.
- **BI** — KPI, occupancy/revenue forecast, and drill-down endpoints and interface views.
- **Security** — TOTP MFA with backup codes, password-policy administration, IPv4/CIDR IP restrictions, active-device management, JWT-protected real-time gateway, and security/audit operational guidance.
- **Infrastructure and CI/CD** — Node 20 Alpine images with pnpm 10.26.1 pinned; hardened non-root containers; authenticated Redis in production Compose/Kubernetes; writable non-root uploads; production Nginx gateway on port 80; and quality-gated GHCR delivery with two-service rollback. Kubernetes sources Redis password and API `REDIS_URL` from a Secret, permits Redis ingress only from API pods, and denies Redis egress. Deployment waits for Redis, and authenticated two-replica smoke verifies PostgreSQL, Redis, cross-replica events, health, and UID 1000 upload writes. Kubernetes mandates three API replicas/HPA with API pod co-location on one node, `fsGroup: 1000`, and a 10Gi ReadWriteOnce uploads PVC. This is safe single-node scaling, not multi-node HA; moving API pods across nodes requires shared RWX/object storage and affinity changes.
- **Documentation** — v2.0.0 user and administrator manuals, refreshed project README, architecture/quick-start guidance, security caveats, and operational runbooks.

### Changed
- **Documentation baseline** — Clarified that Swagger at `/api/docs` is incomplete for some schemas, authorization annotations, and Socket.IO channels; integrations require implementation-level verification.
- **Tenant safety** — Documented the current limitation that legacy core hotel tables do not yet have complete row-level tenant isolation. Tenant-aware services restrict responses where a safe filter is unavailable.

---

## [1.0.0] — 2026-08-05 — Production Release

### Phase 6: Enterprise Services & Production Release

#### Added
- **Customer Service Management** — Full complaint lifecycle: register, assign, escalate, resolve, close. Complaint categories, priorities, status tracking, satisfaction ratings, comment threads (internal + guest-visible), dashboard with analytics.
- **Notification Management** — In-app notification center with templates ({{variable}} substitution), broadcast to all users, mark read/all-read, notification history, unread count badge.
- **Reports & Business Intelligence** — 14 report types with Recharts visualizations: Occupancy, Revenue, Reservations, Restaurant, Inventory, Procurement, HR, Complaints, Financial, Conference, Transport, Executive Summary. Date-range filtering, stat cards, bar/area/pie charts.
- **Executive Dashboard Enhancement** — Real-time KPI cards, Revenue trend (AreaChart), Reservation status (PieChart), Open Complaints table, Low Stock Alerts table.
- **Audit Trail Enhancement** — Added method, user_agent, browser, os, previous_values, new_values, status columns. Stats endpoint with security event tracking.
- **File & Document Management** — Upload (multipart/form-data), reference-based lookup, soft delete, local file storage in /uploads.
- **Global Search** — Single endpoint searches across 8 entity types (guests, reservations, rooms, inventory, suppliers, employees, complaints, vehicles) using parallel ILIKE queries.
- **Background Scheduler** — 4 cron jobs: hourly inventory alerts, midnight reservation expiry (no-show), daily stats report (6am), 30-min room status sync.
- **AI Assistant** — Floating chat widget with keyword-driven responses sourced from live API data (occupancy, revenue, complaints, inventory, reservations).
- **Security Hardening** — Helmet (HTTP headers), compression, CORS, Rate Limiting (ThrottlerModule: 300 req/min), Global ValidationPipe.
- **Swagger/OpenAPI** — Full API documentation at /api/docs.
- **DB Indexes** — 16 performance indexes on high-traffic columns (reservations, rooms, transactions, complaints, attendance, etc.).

#### Schema Additions
- `complaints` table — 30+ columns including satisfaction_rating, escalation tracking, response/resolution timestamps
- `complaint_comments` table — internal and guest-visible comments
- `documents` table — file metadata with reference type/id, versioning, storage path
- `notification_templates` table — reusable templates with variable substitution

---

## [0.5.0] — 2026-08-04 — Phase 5: Business Management

#### Added
- **Inventory Management** — Categories, items with stock tracking, stock movements (in/out/adjust/damaged/expired), low stock alerts, reorder levels.
- **Procurement Management** — Suppliers, Purchase Requests (approve/reject workflow), Purchase Orders, Goods Receipts (auto-updates inventory on acceptance).
- **Financial Transactions** — Transaction ledger, Cash Registers, Cash Shifts (open/close with discrepancy tracking), Credit Notes.
- **Conference & Event Management** — Halls with layouts and pricing, equipment, bookings with double-booking validation, calendar view.
- **Transport Management** — Vehicle fleet, driver management, full trip lifecycle (scheduled → assigned → started → completed).
- **HR Management** — Departments, attendance records (clock-in/out), leave requests (approve/reject), shift definitions and assignments, performance reviews.
- **Employees Module Expansion** — Employee codes, employment types, emergency contacts, supervisor hierarchy, termination tracking.

#### Schema Additions (Phase 5)
- inventory_categories, stock_movements
- suppliers, purchase_requests, purchase_request_items, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items
- transactions, cash_registers, cash_shifts, credit_notes
- conference_halls, conference_equipment, conference_bookings, conference_booking_services
- vehicles, drivers, trips
- departments, attendance_records, leave_requests, shifts, shift_assignments, performance_reviews

---

## [0.4.0] — 2026-08-03 — Phase 4: Hotel Operations

#### Added
- **Housekeeping Management** — Task assignment, room status updates (clean/dirty/inspecting), staff tracking, daily schedules.
- **Maintenance Management** — Request lifecycle (open → assigned → in_progress → resolved), priority levels, cost tracking.
- **Restaurant Management** — Menu categories, menu items, order management (dine-in/takeaway/room-service), kitchen status.
- **POS System** — Point of sale orders, item catalog, void/discount support, session management.
- **Room Service** — In-room dining orders linked to reservations, delivery tracking.

---

## [0.3.0] — 2026-08-02 — Phase 3: Reservation & Front Office

#### Added
- **Guest Management** — CRM with guest profiles, VIP tracking, loyalty points, stay history.
- **Reservation Management** — Full booking lifecycle, room allocation, pricing calculation.
- **Check-in / Check-out** — Front desk workflows, key card assignment, early/late handling.
- **Stay Management** — Room change, stay extension, group booking support.
- **Front Office Dashboard** — Arrivals, departures, in-house guests, availability calendar.
- **Walk-in Booking** — Quick reservation + immediate check-in workflow.

---

## [0.2.0] — 2026-08-01 — Phase 2: Hotel Core

#### Added
- **Hotel & Branch Setup** — Multi-property support with branch management.
- **Building & Floor Management** — Physical structure hierarchy.
- **Room Configuration** — Categories, types, amenities, bed types, images.
- **Room Pricing** — Seasonal pricing, room-type pricing, date-range rules.
- **Room Availability** — Real-time availability calendar.

---

## [0.1.0] — 2026-07-31 — Phase 1: Foundation

#### Added
- **Authentication** — JWT login/logout, password hashing (bcryptjs).
- **Authorization** — Role-Based Access Control (RBAC) with JwtAuthGuard.
- **User Management** — Create, update, deactivate users.
- **Roles Management** — Role definitions and assignments.
- **Audit Logging** — Basic action tracking (user, action, resource, IP).
- **Notifications** — In-app notification storage and retrieval.
- **Health Check** — API health endpoint at /api/health.
- **Database** — PostgreSQL + Drizzle ORM setup, schema compilation pipeline.

---

*Semantic versioning: MAJOR.MINOR.PATCH*

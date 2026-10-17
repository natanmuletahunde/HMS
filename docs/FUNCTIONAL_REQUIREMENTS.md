# Nexus HMS Functional Requirements

## Document control

- Product: Nexus HMS Enterprise Hotel Management System
- Release baseline: Phase 7B Enterprise Platform
- Document type: Functional requirements specification
- Date: 27 August 2026
- Audience: Product owners, hotel operators, implementation teams, QA, and auditors

## 1. Purpose and scope

Nexus HMS is a multi-module hotel management platform for hotel operators, front-office teams, department supervisors, finance teams, HR teams, tenant administrators, and platform administrators. The system supports the hotel lifecycle from property configuration and reservations through guest stays, operations, finance, reporting, security, and enterprise administration.

The requirements below describe the behavior delivered across the foundation, hotel core, front office, operations, business management, enterprise services, and Phase 7 SaaS and enterprise features. The implementation is a modular monolith with a shared PostgreSQL database and a Next.js web application.

## 2. Actors and permissions

- Platform administrator: manages global settings, tenants, subscriptions, modules, plugins, and platform-wide security policy.
- Tenant administrator: manages users and operational configuration inside an assigned tenant, subject to tenant scope.
- Hotel manager: supervises property operations, dashboards, approvals, reports, and department activity.
- Front-desk agent: manages guests, reservations, arrivals, check-in, stay changes, and checkout.
- Housekeeping and maintenance staff: update room readiness, tasks, and maintenance requests.
- Restaurant, POS, and room-service staff: manage menus, orders, tables, kitchen status, and delivery.
- Finance staff: manage invoices, payments, cash registers, transactions, and financial reports.
- HR staff: manage employees, attendance, leave, shifts, and performance reviews.
- Read-only or reporting user: views permitted operational and BI information without mutation rights.
- Mobile client: authenticates a user device, receives scoped synchronization data, and submits offline changes.

Authorization is role-based. The global authentication guard is fail-closed: protected routes require a valid access token. Public routes are explicitly marked and include login, MFA verification, token refresh, health, and metrics.

## 3. Functional requirements

### FR-001 Authentication and session management

1. The system shall authenticate users with email and password.
2. Passwords shall be verified against bcrypt hashes and inactive users shall be rejected.
3. Successful authentication shall issue an access token and a refresh token when MFA is not enabled.
4. When MFA is enabled, login shall return only a short-lived MFA-pending token and shall not grant API access.
5. The MFA verification endpoint shall accept a current TOTP code or a valid one-time backup code before issuing full tokens.
6. Refresh endpoints shall be public because an expired access token is expected during refresh.
7. Logout shall be available to clients and clients shall remove stored tokens locally.

### FR-002 User and role administration

1. Authorized administrators shall create, update, deactivate, and view users.
2. Users shall be associated with a role and, where applicable, a tenant.
3. Roles shall be listed and assigned according to the caller's administrative scope.
4. Deactivated users shall not be able to authenticate.
5. User actions and security-sensitive mutations shall be auditable.

### FR-003 Hotel and property configuration

1. Authorized users shall configure hotels, branches, buildings, floors, room categories, room types, amenities, bed types, room images, and room pricing.
2. The room hierarchy shall support availability and operational status management.
3. Pricing rules shall support date ranges and room-type or category-based configuration.

### FR-004 Guest, reservation, and front-office operations

1. Staff shall create, search, view, update, confirm, cancel, and manage reservations.
2. Reservations shall link guests, rooms or room types, stay dates, pricing, and status.
3. Staff shall create guest profiles and view stay history and VIP or loyalty information where available.
4. Front-desk staff shall process arrivals, assign rooms, check guests in, record key-card information, and handle checkout.
5. Staff shall support walk-in bookings, stay extensions, and room changes.
6. Calendar and availability views shall show room occupancy and reservation state.

### FR-005 Hotel operations

1. Housekeeping staff shall receive assigned tasks and update room readiness states.
2. Maintenance staff shall create, assign, progress, and resolve maintenance requests with priority and cost information.
3. Restaurant users shall manage menu categories, menu items, dining orders, and kitchen status.
4. POS users shall create orders, apply supported discounts or voids, and manage sessions.
5. Room-service staff shall manage in-room dining requests through delivery completion.

### FR-006 Inventory, procurement, and business management

1. Inventory users shall manage item categories, stock levels, reorder thresholds, and stock movements.
2. Procurement users shall manage suppliers, purchase requests, purchase orders, and goods receipts.
3. Accepted goods receipts shall update inventory quantities.
4. Finance users shall manage invoices, invoice lines, payments, transactions, cash registers, cash shifts, credit notes, and financial dashboards.
5. Conference users shall manage halls, equipment, bookings, services, and double-booking validation.
6. Transport users shall manage vehicles, drivers, and trips through scheduled, assigned, started, and completed states.
7. HR users shall manage departments, employees, attendance, leave, shifts, shift assignments, and performance reviews.

### FR-007 Enterprise services

1. Customer service users shall manage complaints through registration, assignment, escalation, response, resolution, closure, comments, and satisfaction tracking.
2. Notification users shall create templates, send broadcasts, list notifications, and mark notifications read.
3. Document users shall upload, find, version, and soft-delete files associated with supported references.
4. Authorized users shall search across supported entities from a single search experience.
5. Scheduled jobs shall support inventory alerts, reservation expiry, statistics reporting, and room-status synchronization.
6. Audit logs shall record relevant actions and support review of security events.

### FR-008 SaaS platform administration

1. Platform administrators shall create and manage tenants and organizations.
2. Subscription records shall represent plan, status, and lifecycle data.
3. Authorized administrators shall configure modules and plugin records.
4. Workflow definitions shall support configurable approvals and transitions where the module exposes them.
5. Tenant context shall be derived from the authenticated caller and used by tenant-aware enterprise services.

### FR-009 Real-time events and caching

1. Authenticated Socket.IO clients shall connect using a JWT during the handshake.
2. Clients shall subscribe to reservations, rooms, housekeeping, notifications, and dashboard channels.
3. Reservation and room mutations shall publish internal EventBus events.
4. The gateway shall broadcast events only to the appropriate tenant-scoped room or subscription.
5. Cache statistics shall expose hit and miss counts.
6. Authorized administrators shall be able to flush cache state; ordinary tenant users shall receive a forbidden response.

### FR-010 Security administration

1. Users shall be able to begin MFA setup and receive a QR code, secret, and backup codes for one-time display.
2. TOTP verification shall enable MFA only after a valid current code is supplied.
3. Disabling MFA shall require the current TOTP code.
4. TOTP secrets and backup codes shall be encrypted before database persistence.
5. Platform administrators shall configure password length, complexity, expiry, and password reuse settings.
6. Administrators shall add or deactivate IPv4 and IPv4 CIDR allowlist or blocklist rules.
7. Users shall view active mobile devices and revoke their own devices.
8. Malformed persisted IP rules shall be ignored rather than treated as a match.

### FR-011 Mobile synchronization

1. Authenticated users shall register a mobile device with device ID, name, platform, and optional push token.
2. A mobile refresh endpoint shall exchange a valid refresh token for a new access and refresh token pair.
3. Mobile clients shall request a delta using an ISO timestamp.
4. Platform-scoped synchronization shall return reservations, rooms, and guests changed since the timestamp with counts and a sync timestamp.
5. Mobile clients shall submit offline changes as a batch and receive accepted results and conflicts.
6. Until row-level tenant columns exist on core hotel tables, tenant-user sync shall return an empty, explicitly annotated result rather than risk cross-tenant leakage.

### FR-012 Business intelligence and metrics

1. Authorized BI users shall view KPI values and current-versus-prior period comparisons.
2. The system shall provide occupancy and revenue forecasts for a requested horizon.
3. BI users shall drill down by supported metric and grouping such as branch or category.
4. The dashboard shall display KPI cards, forecast charts, and drill-down views.
5. The Prometheus endpoint shall expose request totals, durations, cache counters, database pool metrics, and active WebSocket connections.

### FR-013 Web application experience

1. The dashboard shall provide navigation to the major hotel, business, enterprise, BI, and security modules.
2. The language switcher shall support English, Amharic, Oromo, Arabic, and French.
3. Selecting Arabic shall apply right-to-left document direction.
4. The theme control shall support light, dark, system, and custom behavior where tenant branding is available.
5. The login screen shall render a second step for MFA users without exposing protected pages before verification.

## 4. Core workflows

### Reservation lifecycle

Search or create a guest, select dates and room inventory, calculate the price, save the reservation, confirm it when approved, allocate a room, check the guest in, record stay changes, and complete checkout. Cancellation and no-show handling update the reservation state and remain visible to authorized reporting users.

### MFA enrollment

Open Security, start MFA setup, scan the QR code in an authenticator application, save the backup codes, enter a current six-digit code, and confirm enrollment. On the next login, enter the password first and then the TOTP or an unused backup code. Disablement requires the current TOTP code.

### Offline mobile synchronization

Register the device, store the returned session metadata securely on the device, request changes since the last successful sync, apply the delta locally, submit queued changes, inspect conflicts, and advance the local sync watermark only after a successful response.

## 5. Acceptance criteria

- Protected endpoints return an authentication error without a valid access token.
- Public health, login, MFA verification, refresh, and metrics endpoints remain callable without a bearer token.
- An enabled MFA user cannot receive full tokens from password validation alone.
- A consumed backup code cannot be used again.
- Tenant users cannot receive unscoped core-table mobile data while tenant row isolation is incomplete.
- A malformed IP restriction never grants or blocks access by accidental pattern matching.
- Non-admin users cannot change platform password policy, mutate IP restrictions, or flush the cache.
- The web application can switch supported locales and themes without a full page reload.
- Reservation and room mutations can be observed by an authenticated subscribed WebSocket client.

## 6. Known scope boundary

Core hotel tables do not yet carry tenant_id columns. Tenant-aware BI and mobile responses are therefore intentionally limited where a safe row-level filter cannot be proven. Full core-table tenant isolation is a required follow-on migration before unrestricted tenant operational data access is enabled.
# Nexus HMS Enterprise Edition — User Manual

**Release:** v2.0.0 (Phase 7) · **Audience:** hotel and tenant users · **Date:** 2026-08-27

Navigation, data, and buttons vary with your role, tenant, subscription, and enabled modules. A hidden menu item is not an approval decision and a visible button is not permission to bypass policy. Confirm the record, amount, room, guest, and current status before saving. Do not share passwords, bearer tokens, MFA codes, backup codes, or guest information.

## Login and MFA

**Screen description:** The login screen has email/password fields; an MFA step appears after valid credentials when MFA is enabled. **Security** contains MFA setup and active devices.

Sign in with your assigned account. At the MFA step enter the current authenticator code, or one unused backup code. To enroll, select MFA setup, scan the displayed QR code, save backup codes securely, and verify a current code. Lost access to an authenticator requires the organization’s recovery process. Backup codes are single-use. Only authorized users can change security settings; revoke a lost device immediately.

## Dashboard

**Screen description:** The dashboard presents KPI cards, trend charts, arrivals/departures, operational alerts, and recent activity.

Select the period filter and drill into a card where the screen offers a link. Treat the source record—not a cached chart—as authoritative. Review low-stock, complaint, room, and reservation exceptions promptly. Managers use dashboards for oversight; users should not alter a metric to resolve a discrepancy.

## Reservations

### Create
**Screen description:** The reservation list provides create action, filters, calendar/availability views, and today’s arrivals, departures, in-house, and no-show views.

Search for the guest first, then select/create the guest, enter dates and occupancy, choose an available room/type and rate, review the calculated amount, and save. Confirm only when your role and property process allow it.

### View, change, and cancel
**Screen description:** Reservation detail shows guest, dates, room/rate, payment context, notes, and actions.

Open detail to verify the booking before permitted edits. Use the displayed status lifecycle—such as pending/confirmed, checked-in, checked-out, cancelled, or no-show—rather than assuming any transition is valid. Cancel only under the cancellation policy and with required authorization; record a factual reason. Front desk users handle daily stays, while managers approve exceptions.

## Guests

**Screen description:** Guests has a searchable list, statistics, profile form/detail, and stay history.

Search before creating to prevent duplicates. Capture verified identity/contact details and use history to support service, not to infer unverified facts. Guest records contain sensitive data; edit, export, or delete only when authorized.

## Check-in

**Screen description:** Check-in lists arrivals and opens a stay/check-in detail action.

Verify identity, reservation status, dates, room readiness, allocation, and required registration details. Record key/card or arrival notes as required, then complete check-in. If a room is not ready, coordinate with housekeeping; do not override room readiness informally. Use stay management for a room move or extension.

## Check-out

**Screen description:** Check-out lists departures and exposes the stay and settlement context.

Confirm the departing guest, charges, invoice/payment state, keys, and departure notes before completing checkout. Escalate disputed charges or payment discrepancies to finance/management; do not silently alter financial records. Completion changes the stay state and should occur only after the property’s departure procedure.

## Housekeeping

**Screen description:** Housekeeping includes dashboard, areas, task list/detail, and inspections.

Review assignments, update the actual cleaning/inspection outcome, and add factual notes. Follow the screen’s available room/task statuses (for example dirty, cleaning, inspecting, clean/ready) and do not mark a room ready until work and required inspection are complete. Supervisors assign work and verify exceptions.

## Maintenance

**Screen description:** Maintenance provides dashboard, request list/detail, and assignment/progress controls.

Create a request with room/asset, issue, priority, and evidence; assign it to the right team and update progress as work occurs. Follow displayed statuses such as open, assigned, in progress, and resolved. Keep a safety-affected room blocked until the responsible team clears it. Costs and closure normally require supervisor approval.

## Restaurant and POS

**Screen description:** Restaurant has dashboard, menu-item, table, kitchen, and order screens. POS has a sales summary, order list/detail, and item actions.

Restaurant staff create orders and advance kitchen/service status only when the handoff occurred. Authorized managers maintain menu items and tables. In POS, select/create the correct order, add or remove items before settlement, and use void only with documented authorization. Reconcile completed and voided orders; never use a void to conceal a cash error.

## Room Service

**Screen description:** Room Service displays a dashboard and order list/detail with preparation and delivery updates.

Link the order to the correct reservation or room, confirm the items, and update preparation/delivery only when completed. Verify room and charge destination before posting. Kitchen/service users update fulfillment; finance handles disputed settlement.

## Inventory and Procurement

**Screen description:** Inventory provides dashboard, categories, item/movement lists, stock-in/out/adjustment actions, and alerts. Procurement provides suppliers, purchase requests, purchase orders, and goods receipts.

Record every movement with the real quantity and reason; investigate low-stock alerts. Workflow: maintain supplier → submit request → obtain required approval → create PO → verify delivery → record goods receipt. Do not accept unreceived quantities or use an adjustment as a substitute for investigation. Purchasing/approval rights are role-controlled.

## Invoices, Payments, and Financial

**Screen description:** Invoices and Payments list/create settlement records. Financial includes dashboard, transactions, cash registers, cash shifts, credit notes, and revenue/expense summaries.

Create/review invoices and record payments against the correct guest or transaction. Open a cash shift before accepting cash; close it using the physical count and investigate any difference. Create credit notes and corrections only through approved finance procedure. These screens are restricted to finance or delegated managers.

## HR

**Screen description:** HR provides dashboard, departments, attendance clock-in/out, leaves, shifts, shift assignments, performance reviews, and employee records.

Record attendance truthfully, submit leaves with required details, and use approved shift assignments. Managers approve or update requests only within their authority. Personnel and performance data is confidential; HR/management roles must not disclose it through notes or exports.

## Conference and Transport

**Screen description:** Conference includes dashboard, halls, equipment, calendar, and booking detail. Transport includes dashboard, vehicle, driver, and trip screens.

For a booking, confirm dates, capacity, equipment, services, and calendar conflicts before saving. For a trip, verify vehicle/driver suitability and advance the displayed trip status as work happens. Event/transport managers resolve scheduling conflicts; do not double-book by creating duplicate records.

## Reports and BI

**Screen description:** Reports offers operational and executive report types with date filters. BI shows KPIs, occupancy/revenue forecasts, and drill-downs.

Choose the reporting period and confirm the underlying records before sharing or exporting. Use occupancy, revenue, reservation, housekeeping, maintenance, restaurant, inventory, procurement, HR, complaint, financial, conference, transport, and executive reports according to role. Forecasts are planning aids, not accounting commitments. Reporting access may be read-only.

## Search

**Screen description:** Global Search accepts a query and returns matching operational entities.

Search for guests, reservations, rooms, inventory, suppliers, employees, complaints, or vehicles, then open and confirm the exact record before editing. Search results do not override access restrictions or prove identity.

## Notifications

**Screen description:** The notification center lists unread/read operational messages and supported read actions.

Open the linked record, take the required action, and mark the notification read afterward. Escalate urgent alerts through the property’s normal process; a read marker is not evidence that the issue is resolved.

## Customer Service

**Screen description:** Customer Service offers dashboard/statistics, complaint list/detail, comments, and feedback.

Register category, priority, guest context, and factual description; assign, escalate, resolve, or close using available statuses and local service policy. Keep internal comments internal. Mark text guest-visible only after review by an authorized service user.

## Documents

**Screen description:** Documents lists reference-linked files and supports upload, detail, update, and soft delete.

Attach the correct file to the correct reference, verify its contents and audience, and follow retention policy. Soft-delete only when authorized; do not upload credentials, tokens, or inappropriate guest data. Document access is role-sensitive.

## Realtime and mobile

**Screen description:** Live pages may refresh reservation, room, housekeeping, notification, or dashboard activity. Mobile clients register a device and synchronize changes.

If an update appears delayed, refresh and verify the source record; do not repeat a transaction. The connection location depends on deployment: Replit uses the `/api-server/socket.io` proxy, local Compose connects to `http://localhost:8080/socket.io`, and production Nginx/Kubernetes uses same-origin `/socket.io`. Users normally do not configure this value; report repeated disconnects to an administrator.

Use a unique, secured device and revoke it from Security if lost/replaced. Mobile sync can request deltas and submit queued changes, but current tenant-safety controls may return empty tenant-scoped results where safe filtering is unavailable. Resolve conflicts through the source record and report cross-tenant concerns immediately. Production live events use an authenticated Socket.IO Redis backplane across API pods; its credentials are administrator-managed and must never be requested, copied, or entered by an end user. Process-local cached values can still differ briefly by pod, so verify the source record when a value appears stale.
# Nexus HMS Hands-On User Manual

## Document control

- Product: Nexus HMS Enterprise Hotel Management System
- Release baseline: Phase 7B Enterprise Platform
- Document type: End-user operating guide
- Date: 27 August 2026

## 1. Before you begin

Use a current desktop browser on the hotel network. Open the web application URL provided by your administrator. Your account must be active and assigned a role. Ask an administrator for an account through the approved onboarding process; never share another user's password.

The dashboard navigation is grouped by operational area. Menu entries may vary by role and enabled modules. Changes are saved through the API and may be visible to other staff immediately.

## 2. Sign in and MFA

1. Enter your email address and password.
2. If MFA is not enabled, the dashboard opens after successful validation.
3. If MFA is enabled, enter the six-digit code from your authenticator application.
4. If you cannot access the authenticator, enter one unused backup code.
5. Do not reuse or share backup codes. Each accepted backup code is consumed.
6. If login fails, verify the code clock, account status, and network before trying again.

To enroll MFA, open **Security > MFA Setup**, choose setup, scan the QR code with an authenticator, save the displayed backup codes in a secure location, and enter the current six-digit code. To disable MFA, open the same area and provide the current TOTP code.

## 3. Dashboard

The dashboard gives a current operational view of occupancy, reservations, open complaints, low-stock items, and revenue or activity trends where data is available.

- Use the date or period filters to change the reporting window.
- Select a KPI or chart to open its detail view when the page provides one.
- A live room or reservation event may update the page through the real-time connection.
- Treat a stale or unavailable metric as an operational signal and confirm the underlying module record.

## 4. Reservations and guest stays

### Create a reservation

1. Open **Reservations** and choose create.
2. Search for an existing guest or create a new guest profile.
3. Enter arrival and departure dates, room type or room, occupancy, rate, and required notes.
4. Review the calculated amount and save.
5. Confirm the reservation when your role and hotel process allow confirmation.

### Manage a reservation

Open the reservation to review guest, room, rate, payment, and status information. Use edit for permitted corrections. Use cancel only when the hotel's cancellation policy and authorization allow it. The reservation detail and audit history are the source of truth for later review.

### Check in and check out

1. Use **Check-in** or the reservation action for an arriving guest.
2. Confirm identity and required guest details.
3. Allocate or confirm the room, record key-card information if required, and complete check-in.
4. For departure, open **Check-out**, confirm charges and payment state, record any notes, and complete checkout.
5. If a room change or stay extension is needed, use the stay-management action rather than changing dates informally.

## 5. Rooms, housekeeping, and maintenance

- **Rooms:** review room inventory, room type, status, pricing, and availability.
- **Housekeeping:** open assigned tasks, update clean, dirty, inspecting, or other supported states, and record completion.
- **Maintenance:** create a request with room, category, priority, description, and cost details; assign it to the correct team; progress it through resolution.
- Confirm that a repaired or cleaned room is in the correct operational state before front desk assigns it.

## 6. Restaurant, POS, and room service

1. Use **Restaurant** to maintain categories and menu items.
2. Use **POS** to start or select a session, create an order, add items, apply authorized adjustments, and complete the sale.
3. Use **Room Service** for orders connected to a reservation or room, then update preparation and delivery status.
4. Use the order history to reconcile kitchen, service, and finance questions.

## 7. Inventory and procurement

- Review inventory categories and item quantities in **Inventory**.
- Record stock-in, stock-out, adjustment, damaged, or expired movements with a reason.
- Monitor reorder levels and low-stock alerts.
- In **Procurement**, create a supplier record, submit a purchase request, obtain approval, create a purchase order, and record a goods receipt.
- Verify received quantities before acceptance; accepted receipts may update stock.

## 8. Invoices, payments, and finance

Use **Invoices** to create or review invoice headers and lines. Use **Payments** to record settlement information. Use **Financial** for transactions, cash registers, cash shifts, credit notes, and financial dashboards. Close cash shifts with the actual count and investigate discrepancies rather than overwriting them.

## 9. HR, conference, and transport

- **HR:** maintain departments and employee records, record attendance, review leave requests, assign shifts, and record performance reviews.
- **Conference:** configure halls and equipment, create bookings, add services, and check for double-booking conflicts.
- **Transport:** maintain vehicles and drivers, create trips, assign a driver, and move the trip through its operational lifecycle.

## 10. Complaints, notifications, documents, and search

- Register a complaint with category, priority, guest context, and description.
- Assign and escalate according to service policy. Add internal notes carefully; mark guest-visible responses only when appropriate.
- Review notifications from the notification center and mark them read after action.
- Upload documents through the document area with the correct reference. Use soft delete only when policy allows.
- Use global search for guests, reservations, rooms, inventory, suppliers, employees, complaints, and vehicles. Always confirm the entity before editing.

## 11. BI dashboard

Open **BI** to view executive KPIs, period comparisons, revenue forecasts, occupancy forecasts, and drill-down breakdowns. Select a period such as day, week, or month. For forecasts, choose the supported horizon. For drill-down, choose occupancy or revenue and group by branch or category. Forecasts are planning aids, not accounting commitments.

## 12. Security page

Authorized users can view MFA status, active devices, and permitted security settings. Administrators may manage IP restrictions according to hotel policy. Password-policy changes are platform-wide and restricted to platform administrators. If a device is lost, revoke it promptly and report the incident.

## 13. Language and theme

Use the top-bar controls to select English, Amharic, Oromo, Arabic, or French. Arabic changes the page direction to right-to-left. Use the theme control for light, dark, system, or configured custom colors. If a translation is missing, report the screen and label to the administrator instead of guessing at a high-risk operational action.

## 14. Mobile and offline behavior

Register a device from the mobile client with a unique device ID. The client can refresh tokens, request changes since the last sync, and submit queued offline changes. Keep the device secure, use the OS lock, and revoke the device from **Security > Active Devices** when it is lost or replaced. Until core row-level tenant isolation is complete, tenant-scoped sync may intentionally return an empty result.

## 15. Good operating practice

- Confirm the guest, room, and date before saving a reservation.
- Do not copy tokens, QR codes, backup codes, or passwords into chat or tickets.
- Use notes and comments that are factual and appropriate for the audience.
- Review audit history when correcting a financial or guest record.
- Contact an administrator for access changes; do not work around a forbidden action.
---
name: Phase 6 schema additions
description: New tables and modules added in Phase 6 Enterprise Services; key implementation notes
---

## New tables (Phase 6)

### complaints.ts (new)
- `complaints` → `complaintsTable` — complaintNumber, guestId, guestName, category, priority, subject, description, status, assignedTo, resolvedAt, resolutionNotes, satisfactionRating, escalation tracking
- `complaint_comments` → `complaintCommentsTable` — complaintId FK, authorName, comment, isInternal

### documents.ts (new)
- `documents` → `documentsTable` — name, originalName, documentType, mimeType, size, storageType, storagePath, referenceType, referenceId, version

### notification-templates.ts (new)
- `notification_templates` → `notificationTemplatesTable` — code (unique), name, channel, type, subject, body (with {{variable}} placeholders), variables

### audit_logs (expanded)
- Added columns: method, user_agent, browser, os, previous_values, new_values, status

## New DB indexes (Phase 6 migration)
16 performance indexes on: reservations(status, check_in_date, guest_id), rooms(status), complaints(status, created_at), transactions(transaction_date, transaction_type), audit_logs(user_id, created_at), notifications(user_id), inventory_items(status), employees(department), trips(status, scheduled_time), conference_bookings(booking_date), attendance_records(attendance_date), leave_requests(status)

## New NestJS modules (Phase 6)
- CustomerServiceModule → `/api/customer-service/*`
- ReportsModule → `/api/reports/*` (14 endpoints)
- SearchModule → `/api/search`
- DocumentsModule → `/api/documents/*` (file upload with multer memory storage)
- SchedulerModule → background cron jobs (no HTTP endpoints)
- ThrottlerModule → rate limiting (300 req/60s)

## New frontend pages (Phase 6)
- /customer-service — 3 tabs: Dashboard, Complaints (with comment thread dialog), Analytics
- /reports — 9 tabs with Recharts (BarChart, PieChart, AreaChart, LineChart)
- /notifications — 3 tabs: My Notifications, Templates, Broadcast
- /search — global search with debounce, grouped results
- /documents — 2 tabs: All Documents, Upload (FormData)
- /audit-logs — rewritten with stats cards + pagination
- AI Assistant floating chat widget (components/ai-assistant.tsx)

## Security additions
- Helmet (HTTP security headers)
- ThrottlerModule (rate limiting)
- CORS enabled
- Swagger UI at /api/docs

**Why:** Phase 6 final production release — Enterprise Services layer on top of Phases 1-5.

## Important: compression CJS issue
`import compression from 'compression'` throws at runtime. Must use:
`const compression = require('compression');` in main.ts

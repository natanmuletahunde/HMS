# Nexus HMS API Guide

## Base URLs, discovery, and contract status

HTTP REST routes use the global `/api` prefix. Swagger UI is at `/api/docs`. Swagger is useful for discovery but is incomplete: many controllers lack tags, DTO schemas, response/status annotations, or consistent bearer annotations, and it does not describe Socket.IO. Verify exact payloads, permissions, and response fields in the controller/service before integrating.

This guide groups the implemented API surface; it does not claim every handler has identical request/response conventions. Several handlers accept flexible `any` body/query values, and pagination, filters, status codes, errors, RBAC, and tenant scope can vary by endpoint.

## Authentication and public perimeter

Send protected requests with:

```http
Authorization: Bearer <access-token>
```

The global JWT guard is fail-closed for HTTP routes. Explicit public auth endpoints are:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/auth/mfa-verify` | Complete MFA verification |
| POST | `/api/auth/logout` | Public by current controller design |
| POST | `/api/auth/refresh` | Refresh-token flow |
| POST | `/api/mobile/token-refresh` | Explicitly public mobile token refresh |
| GET | `/api/health` and `/health` | Public health path |
| GET | `/api/metrics` | Explicitly public metrics |

`GET /api/auth/me` is the current-user endpoint and is protected. All other route groups below should be treated as JWT-protected unless source confirms a public exception. JWT presence is not a documented role/permission grant; verify business authorization per operation.

Health and metrics must be restricted by ingress/firewall/monitoring network even though they are application-public. Do not expose operational metrics to the general internet.

## Endpoint groups

Paths below are relative to `/api`; “CRUD” means the group supplies list/create/get/update/delete operations where noted, not a promise of uniform URL shapes or bodies.

| Group | Main capabilities |
|---|---|
| `auth` | login, MFA verify, logout, refresh, current user |
| `health`, `metrics` | health response and metrics |
| `users`, `roles`, `employees` | user/role CRUD; employee statistics and CRUD |
| `audit-logs`, `security` | audit stats/list/create; password policy; MFA; IP restrictions; devices |
| `tenants`, `organizations`, `subscriptions` | tenant CRUD/branding; organization CRUD/stats; plans/current/usage/history/activate |
| `modules`, `plugins`, `cache` | module list/stats/update; plugin SDK/list/create/get/update; cache stats/flush |
| `hotel`, `branches`, `buildings`, `floors` | hotel list/stats/get/create/update/delete and configuration CRUD |
| `room-categories`, `bed-types`, `room-amenities`, `room-pricing`, `room-types` | room configuration CRUD (room types include list/create/get/update/delete) |
| `rooms` | availability/list/export/get/detail/amenities/images/pricing; create, bulk import, block/unblock, amenity/image add/delete, update/status/delete |
| `guests`, `reservations` | guest list/stats/history/CRUD; reservation arrivals/departures/in-house/no-shows/calendar/availability/list/CRUD/confirm/check-in/check-out |
| `checkins`, `checkouts`, `stay-management`, `front-office` | check-in list/get/update; checkout list/get; stay list/get/create; front-office root |
| `housekeeping`, `maintenance` | dashboards plus area/inspection or maintenance management operations |
| `inventory`, `restaurant`, `pos`, `room-service` | operational dashboards and inventory/menu/table/order/stock/POS/room-service workflows |
| `payments`, `invoices` | payment list/create; invoice list/create/get/update |
| `procurement`, `financial` | suppliers, purchase requests/orders, goods receipts; financial dashboard, transactions, registers/shifts, credit notes, summaries |
| `conference`, `transport`, `hr` | conference halls/equipment/calendar/bookings; vehicles/drivers/trips; HR dashboard/departments/attendance/leaves/shifts/assignments/reviews |
| `dashboard`, `reports`, `search` | enterprise stats/occupancy/revenue/activity; operational reports; global search root |
| `customer-service`, `documents`, `bi` | complaint service/dashboard/feedback/comments; document lookup/upload/CRUD; KPIs, forecasts, drill-down |
| `mobile`, `workflows` | device registration, token refresh, delta/sync/push; workflow definitions, instances, start/advance, step management |

Examples of specialized rather than generic CRUD routes include reservation lifecycle actions, room bulk import/blocking, POS item add/delete/void, inventory stock movements, cash-shift open/close, attendance clock-in/out, and workflow start/advance. Consult implementation before assuming IDs, verbs, or nesting.

## Pagination, query, errors, and limits

Use endpoint-specific query parameters for list filtering, sorting, date ranges, and pagination. Some list handlers may accept common values such as page/limit, while others use different or no pagination shape. Do not assume a universal envelope (`items`, `data`, `meta`, total count) until the target endpoint is verified.

Validation strips unwhitelisted properties and transforms input globally. Client integrations should send typed, minimal JSON and handle the endpoint's actual validation response. Authentication failures are expected to be `401`; other status codes and error bodies—including authorization, missing resource, conflicts, and validation—must be consumed as returned by each handler rather than assumed from this guide.

The configured throttling baseline is 300 requests per minute. Treat it as a server protection convention, not a guarantee that every route/client/IP key is identically limited. Implement retry/backoff for retryable failures and avoid burst polling; use realtime events where suitable.

## Canonical integration contract

The following is the **target contract for new or revised list/error integrations**. Legacy handlers may still return a different shape, accept `any` bodies/query parameters, or use a different status code; verify the specific controller before relying on it and normalize client-side where necessary.

### JSON and list pagination

Send `Content-Type: application/json` for JSON bodies. The target list request and response contract is:

```http
GET /api/reservations?page=1&limit=25 HTTP/1.1
Authorization: Bearer <access-token>
```

```json
{
  "data": [
    { "id": "reservation-id", "status": "confirmed" }
  ],
  "total": 143,
  "page": 1,
  "limit": 25
}
```

`page` is one-based in this target contract and `limit` is the requested page size. Filters, sorts, date parameters, maximum limits, and legacy response envelopes still vary until each endpoint has been aligned. Treat this contract as a compatibility target, not a claim that all existing list routes already produce it.

### Errors and HTTP statuses

The target canonical JSON error format is:

```json
{
  "statusCode": 400,
  "message": "A human-readable explanation",
  "error": "Bad Request"
}
```

Target status meanings are `200` successful reads/actions, `201` created resources, `204` successful no-content deletion where adopted, `400` invalid input, `401` missing/invalid authentication, `403` authenticated but not permitted, `404` missing resource, `409` conflict/state conflict, `422` domain validation where explicitly adopted, `429` throttled, and `5xx` unexpected server failure. Existing endpoint status/error bodies may vary; consume the actual response and do not parse an error only by message text.

On `429`, stop immediate retries, honor `Retry-After` when supplied, use exponential backoff with jitter, and reduce polling/concurrency. Never retry non-idempotent create/lifecycle actions blindly after an ambiguous network failure.

### API versioning policy

The current public base is unversioned `/api`; Swagger declares API version `1.0.0` as documentation metadata, not a `/v1` path prefix. Preserve backward compatibility for additive changes where possible. A future breaking public contract should introduce an explicit versioning plan (such as `/api/v1`) with deprecation, migration, and sunset communication rather than silently changing a legacy endpoint.

## Canonical request examples

Examples use placeholder values only; never put credentials/tokens in source code or logs.

### Login and MFA

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "operator@example.test", "password": "<password>" }
```

If MFA is required, login returns a pending token rather than full credentials:

```json
{ "mfaRequired": true, "mfaToken": "<five-minute-mfa-pending-token>" }
```

Complete it with:

```http
POST /api/auth/mfa-verify
Content-Type: application/json

{ "mfaToken": "<pending-token>", "totpCode": "<totp-or-backup-code>" }
```

The successful token response shape should be consumed from the actual auth service; integrations should protect both access and refresh tokens. Refresh is public by route but requires its token in the body:

```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "<refresh-token>" }
```

### Reservation examples

Concrete implemented paths include:

```http
GET /api/reservations/availability?checkIn=2026-08-10&checkOut=2026-08-12&roomTypeId=<id>
Authorization: Bearer <access-token>

POST /api/reservations/<id>/confirm
Authorization: Bearer <access-token>

POST /api/reservations/<id>/check-in
Authorization: Bearer <access-token>
Content-Type: application/json

{}
```

Creation is `POST /api/reservations`; update is `PATCH /api/reservations/<id>`; cancellation currently uses `DELETE /api/reservations/<id>` and may accept a body with `reason`. Reservation create/check-in payload fields remain legacy-variable and must be verified before integration.

### Workflow examples

```http
GET /api/workflows/instances?status=pending&entityType=purchase-request
Authorization: Bearer <access-token>

POST /api/workflows/instances/start
Authorization: Bearer <access-token>
Content-Type: application/json

{ "workflowId": "<workflow-id>", "entityType": "purchase-request", "entityId": "<entity-id>" }

PATCH /api/workflows/instances/<instance-id>/advance
Authorization: Bearer <access-token>
Content-Type: application/json

{ "action": "approve", "comment": "Approved" }
```

The example field names are an integration illustration, not a guaranteed legacy DTO: validate them against the workflow service before use. Implemented definition routes include `GET/POST /api/workflows`, `GET/PATCH /api/workflows/:id`, `POST /api/workflows/:id/steps`, and `DELETE /api/workflows/steps/:stepId`.

## Tenancy and mobile sync

The product is moving toward shared-database multi-tenancy, but legacy hotel tables do not yet all enforce `tenant_id`. A tenant user or tenant-related endpoint does not prove that every hotel-domain response is tenant-isolated. Verify tenant scope, authorization, and role policy endpoint by endpoint before exposing integrations to tenant customers.

For mobile sync in domains that lack enforced tenant scope, tenant users safely receive empty sync data. This protects against accidental legacy-data disclosure; it is not a signal that the domain has no records or that tenant synchronization is fully available.

## Socket.IO (not REST)

Socket.IO is outside the HTTP JWT guard. Connect with a JWT in `auth.token` (preferred) or query `token`; invalid/missing authentication emits `auth_error` then disconnects. Subscribe using `subscribe-reservations`, `subscribe-rooms`, `subscribe-housekeeping`, `subscribe-notifications`, or `subscribe-dashboard`. Server event names are `reservation:update`, `room:update`, `housekeeping:update`, `notification:push`, and `dashboard:update`.

The browser REST base is `/api`. `NEXT_PUBLIC_API_URL` has three supported Socket.IO forms rather than one fixed interpretation:

- absolute `http://localhost:8080` for cross-origin local Docker, using `/socket.io` on that API origin;
- relative `/api-server` for the Replit same-origin proxy, using `/api-server/socket.io`;
- empty for a generic, Kubernetes, or production gateway, using same-origin `/socket.io`.

Configure the selected reverse-proxy path, WebSocket upgrades, and sticky sessions for Socket.IO polling. Production API startup requires a credential-bearing `REDIS_URL`; `main.ts` installs the official Socket.IO Redis adapter, so room broadcasts from the originating API pod propagate to clients on other pods. Local business events, the EventBus, and cache remain process-local; Redis does not turn those facilities into a durable/distributed event system.

Production Compose exposes an Nginx gateway on port 80 that sends `/api` and `/socket.io` to API, `/` to web, and blocks public `/api/metrics`; local and production Compose include password-protected `redis:7-alpine`. Kubernetes runs three API replicas with an HPA range of 2–10, authenticated Redis, Redis-only-from-API NetworkPolicy, and polling affinity. Embedded Redis is network-isolated but not TLS-enabled. Redis is transient pub/sub, so serious production should use private monitored managed/HA Redis over TLS with a `rediss://` URL.
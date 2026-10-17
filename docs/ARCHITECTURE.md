# Nexus HMS Architecture

## System shape

Nexus HMS is a pnpm monorepo containing a modular NestJS API, a Next.js 15 web application, and a shared PostgreSQL/Drizzle database package. It is a modular monolith: feature modules are deployed together in the API process while retaining controller, service, module, DTO, and schema boundaries.

```text
Browser / mobile client
  ├─ Next.js hotel-management application
  ├─ REST: reverse proxy → NestJS /api → module controller → service → Drizzle → PostgreSQL
  └─ realtime: reverse proxy → Socket.IO /socket.io → EventsGateway

lib/db (shared Drizzle schema and compiled package) ────────────────┘
```

The workspace layout is:

| Location | Responsibility |
|---|---|
| `artifacts/api-server` | NestJS API, feature modules, guards, gateway, API bootstrap |
| `artifacts/hotel-management` | Next.js App Router UI, browser API and websocket clients |
| `lib/db` | Shared Drizzle schema, database exports, and schema tooling |
| `scripts` | Workspace scripts where present |
| `uploads` | Local file storage in deployments that choose filesystem storage |

The API uses PostgreSQL through Drizzle ORM. The web app uses React, Next.js, Tailwind/ShadCN-style UI components, and client-side API helpers. Authentication is JWT bearer-token based; the web client stores its token under `hms_token` in local storage and sends it in the `Authorization: Bearer` header.

## API request pipeline

`main.ts` establishes the `/api` global prefix, validation with whitelist and transform behavior, CORS with credentials, Helmet, compression, and Swagger at `/api/docs`. A global JWT guard is registered first, followed by an IP-restriction guard that acts only after user context has been populated.

HTTP requests are fail-closed: every route requires a valid JWT unless it is explicitly public or matches the health public-path handling. Do not infer authorization from Swagger: bearer annotations are inconsistent. Likewise, JWT authentication does **not** by itself document an endpoint's business authorization or role permission; controller-level role declarations are not a complete authorization contract.

Feature modules cover:

- **Identity and platform:** auth, users, roles, employees, audit logs, security, tenants, organizations, subscriptions, module configuration, plugins, cache, metrics, health.
- **Hotel configuration:** hotels, branches, buildings, floors, room categories/types, bed types, room amenities/pricing, rooms.
- **Guest and front office:** guests, reservations, check-ins, check-outs, stay management, front office.
- **Operations:** housekeeping, maintenance, restaurant, inventory, POS, room service, invoices, payments.
- **Business:** procurement, financials, conference, transport, and HR.
- **Enterprise:** dashboards, reports, search, customer service, documents, BI, mobile, workflows.
- **Infrastructure:** scheduler and event bus (infrastructure modules without controller routes).

## Realtime architecture and proxy boundary

Realtime updates use a Socket.IO `EventsGateway`, not the HTTP global guard. At handshake, it requires a JWT in `auth.token` or query `token`; missing or invalid tokens receive `auth_error` and are disconnected. Clients can subscribe to reservations, rooms, housekeeping, notifications, and dashboard streams. Server rooms are isolated as `tenant:<tenantId>:<channel>` or `platform:<channel>`, and events include `reservation:update`, `room:update`, `housekeeping:update`, `notification:push`, and `dashboard:update`.

There is an important routing distinction: REST is normally addressed through `/api`, while the Socket.IO client derives its socket origin/prefix from `NEXT_PUBLIC_API_URL` and uses a `/socket.io` path. The variable supports three intentional forms:

| Topology | `NEXT_PUBLIC_API_URL` | Effective socket path/origin |
|---|---|---|
| Cross-origin local Docker | `http://localhost:8080` | API origin with `/socket.io` |
| Replit relative proxy | `/api-server` | Same origin through `/api-server/socket.io` |
| Generic gateway, Kubernetes, production Compose | empty | Same origin at `/socket.io` |

It is therefore neither always an origin nor always a path. An edge proxy must route REST and the selected Socket.IO path deliberately; forwarding `/api` alone does not make realtime work. It must preserve WebSocket upgrade headers and Socket.IO transport behavior.

Production Compose adds an Nginx gateway on port 80: `/api` goes to the API, `/socket.io` goes to the API with upgrade headers, `/` goes to Next.js, and `/api/metrics` is blocked from the public gateway. The Next.js Docker build uses `API_INTERNAL_URL=http://api:8080` for server-side `/api` rewrites; this container-network URL must never be sent to browsers. Both Compose definitions mount a named volume at `/app/uploads`; the API image creates that path for its non-root `node` user. Kubernetes applies uid/gid and `fsGroup` 1000 so the mounted PVC is writable without granting root execution.

Production API startup requires a credential-bearing `REDIS_URL`. During bootstrap, `main.ts` installs the official Socket.IO Redis adapter, using authenticated Redis pub/sub to carry room broadcasts between API pods. Local business events are still emitted by the pod that performs the operation; when that pod broadcasts through Socket.IO, Redis propagates the room event to clients connected to the other pods.

Ingress sticky sessions remain required because Socket.IO can use HTTP long-polling as well as WebSocket transport. Redis solves cross-pod fan-out, not polling affinity. Redis here is a transient pub/sub dependency rather than a durable event log; local and production Compose use password-protected `redis:7-alpine`. The embedded Kubernetes Redis template also requires authentication and uses NetworkPolicy rather than TLS: only `nexus-hms-api` pods may enter Redis and Redis egress is denied. Serious production should use private, managed/HA Redis with TLS and a `rediss://` URL.

The application EventBus and cache remain process-local. Their local-only behavior must not be confused with Socket.IO fan-out through Redis: caches can differ between pods and a local event is initially handled only by its originating process.

## C4-style system context

```text
Hotel staff / administrators       Mobile operations users       Monitoring system
          │ HTTPS / WSS                    │ HTTPS / WSS                  │ private scrape
          └──────────────┬─────────────────┴──────────────────────────────┘
                         ▼
                 DNS, TLS and ingress / load balancer
                         │
      ┌──────────────────┼────────────────────┐
      ▼                  ▼                    ▼
 Next.js web          NestJS REST          Socket.IO gateway
 application           (/api)                (/socket.io)
      │                  │                    │
      └──────────────────┴──────────┬─────────┘
                                    ▼
                         PostgreSQL shared database
                                    │
                              upload storage
```

Staff use the web application to operate hotels; mobile clients use the mobile REST/sync surface and realtime channel where enabled. The monitoring system accesses health/metrics only from the restricted operational perimeter. A reverse proxy is a first-class system dependency: it terminates TLS, directs `/api` to REST, and directs the separately configured Socket.IO path with WebSocket upgrades.

## C4-style container view

```text
┌──────────────── Browser ────────────────┐
│ Next.js/React UI                         │
│ REST base: /api                          │
│ Socket client: URL + /socket.io path     │
└───────────────┬─────────────────────────┘
                │ HTTPS/WSS
┌───────────────▼──────────────────────────────────────────────────────┐
│ Edge proxy / ingress                                                   │
│ /api → API service     /socket.io (or configured public socket path) │
└───────────────┬──────────────────────────────────────────┬───────────┘
                ▼                                          ▼
┌────────────────────────────┐                  ┌────────────────────────┐
│ NestJS API container(s)    │                  │ Socket.IO EventsGateway │
│ guards → controllers →     │◄────────────────►│ authenticated channels  │
│ services → Drizzle         │   official Redis adapter: cross-pod fan-out  │
└──────────────┬─────────────┘                  └────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PostgreSQL: shared DB schema, tenant/platform metadata, hotel data    │
└──────────────────────────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────┐
│ uploads: local/PVC/object  │
└────────────────────────────┘
               │
┌──────────────▼─────────────┐
│ Redis pub/sub: Socket.IO   │
│ cross-pod room broadcasts │
└────────────────────────────┘
```

### Component overview

| Container/component | Responsibilities |
|---|---|
| Next.js web | Routes, UI state, authenticated API calls, socket subscriptions |
| NestJS API | HTTP transport, validation, guards, business services, reporting and integrations |
| Feature modules | Domain boundaries for hotel, reservation/front-office, operations, business, enterprise, SaaS, and platform services |
| `lib/db` | Shared Drizzle tables/types and database package consumed by API |
| PostgreSQL | Durable operational and platform records |
| EventsGateway | JWT-authenticated Socket.IO rooms and update fan-out |
| Redis | Transient Socket.IO pub/sub backplane used by the official adapter |
| Edge/ingress | TLS, routing, public-path policy, WebSocket upgrade and session affinity |

## Key data flows

### Reservation lifecycle

```text
Staff UI → POST /api/reservations → Reservation service → PostgreSQL
                                             │
                                             └→ reservation:update Socket.IO event

Staff UI → POST /api/reservations/:id/confirm → status transition → database/event
Staff UI → POST /api/reservations/:id/check-in → check-in/stay records → database/event
Staff UI → POST /api/reservations/:id/check-out → checkout/financial follow-up → database/event
```

The API also supplies availability, calendar, arrivals, departures, in-house, and no-show views. Validate allowed lifecycle transitions and financial/room side effects in the service layer; controller paths alone do not describe the full domain contract.

### Approval workflow

```text
Authorized client → POST /api/workflows (definition + steps) → workflow definition/steps
Authorized client → POST /api/workflows/instances/start → scoped workflow instance
Approver          → PATCH /api/workflows/instances/:id/advance → validate caller/step
                                                               → persist state/history
                                                               → optional domain/event notification
```

Workflow requests build caller context through tenant-context helpers. Scope and authorization must still be reviewed against the target entity and legacy data domain.

## Architecture decisions

| Decision | Why it fits | Consequence |
|---|---|---|
| NestJS | Dependency injection, modules, guards, validation, and gateway support suit a large TypeScript operational API. | Keep modules registered and keep authorization/tenant checks explicit. |
| Next.js | App Router supports a structured React operations UI and server/web delivery. | Browser-visible configuration is build/deployment-sensitive; proxy routing is part of the contract. |
| Drizzle | TypeScript schema definitions and typed SQL access can be shared through `lib/db`. | Rebuild the DB workspace package after schema changes and review generated database changes. |
| PostgreSQL | Relational integrity and transactional operations suit reservations, finance, and operational records. | Backups, connection controls, migration discipline, and tenant migration work are required. |

## Security architecture

TLS is terminated at the approved edge. The API applies Helmet, compression, CORS with credentials, a validation pipe, JWT protection, then IP restriction evaluation. REST JWTs use the bearer header; Socket.IO independently validates its handshake token. The web client’s local-storage token is sensitive browser state, so avoid logging it, URLs, or untrusted script exposure.

`SESSION_SECRET` must be secret-manager supplied, cryptographically random, and at least 32 bytes. Database access stays on a private network and should use least-privilege credentials. Public health and metrics routes remain restricted at the edge despite being unauthenticated application routes. Audit logging, security/MFA/device/IP modules provide application-level controls; they do not replace ingress, WAF, network policy, backups, or secret rotation.

## Scalability and storage caveats

The checked-in Kubernetes API deployment specifies three replicas and the HPA scales from 2 to 10. `REDIS_PASSWORD` and the matching credential-bearing API `REDIS_URL` come from `nexus-hms-secrets`, and deployment waits for Redis before API rollout; the official adapter makes Socket.IO room broadcasts cross-pod. Ingress cookie affinity remains required for Socket.IO polling. Redis loss interrupts realtime fan-out, so a serious production installation should replace the single transient Redis template with private managed/HA Redis over TLS and monitor connectivity. Redis and web containers explicitly run non-root with privilege escalation disabled.

The 10Gi Kubernetes upload PVC is `ReadWriteOnce` (RWO). Required pod affinity co-locates every API pod on the same `kubernetes.io/hostname`, so the volume attaches once and is consistently visible to all API containers on that node. This is safe for the implemented scaled topology but deliberately creates a single-node failure domain; an HPA scale-up can remain `Pending` when that node lacks capacity. Multi-node high availability requires RWX/shared or object storage and removal or replacement of the required affinity rule. Process-local EventBus/cache behavior remains a separate per-pod caveat.

## Tenancy and data boundaries

The intended SaaS direction is a **shared database with tenant-scoped data**. Tenant context and platform/tenant realtime rooms are present, and tenant, organization, subscription, branding, module, and plugin capabilities are part of the platform surface.

This is not yet universal row-level tenancy. Legacy hotel-domain tables do not all enforce a `tenant_id`, so a tenant-scoped request must not be assumed to isolate every legacy domain merely because a tenant exists on the user. Tenant isolation and authorization must be verified per controller/service and table before exposing a domain to independent tenants.

Mobile synchronization deliberately handles this transition safely: for tenant users in domains without enforced tenant scope, sync returns an empty result rather than leaking or guessing legacy hotel data. This is a safe compatibility behavior, not evidence that those domains are tenant-ready. A complete migration requires adding/backfilling tenant identifiers, indexes and foreign-key policy as appropriate, enforcing scoping in every query/mutation, and testing cross-tenant access denial.

## Security and operational boundaries

Use TLS at the edge, private database connectivity, secret-manager injection, narrow CORS origins, and network controls in addition to application guards. `SESSION_SECRET` is security-sensitive signing/MFA key material and must be at least 32 bytes of cryptographically random secret material. It must not be committed, reused across environments, or rotated without a token/session invalidation plan.

Health and metrics are public at the application perimeter (`/api/health` and accepted `/health`; `/api/metrics`). Public means unauthenticated, not internet-safe: restrict both paths at ingress, WAF, load balancer, or monitoring-network policy. Expose metrics only to the scraper/operations network. Swagger documents REST imperfectly and does not document Socket.IO; it is not the sole security or contract source.
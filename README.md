# Nexus HMS Enterprise Edition

**v2.0.0 — Phase 7** is a modular hotel-management platform built with Next.js 15, NestJS 10, PostgreSQL, and Drizzle ORM.

## Architecture and routing

```text
Browser or mobile client
        │ REST + Socket.IO
        ▼
Next.js hotel-management UI ──► NestJS API ──► PostgreSQL / Drizzle
        │                              │
        └── dashboards, operations     └── auth/MFA, tenants, workflows,
            and administration             reports/BI, events, cache, metrics
```

`NEXT_PUBLIC_API_URL` controls the browser's Socket.IO target and supports three forms: an absolute API origin, a relative same-origin proxy prefix, or an explicitly empty value for same-origin `/socket.io`. REST browser calls remain at `/api`.

- **Replit:** use the relative prefix `NEXT_PUBLIC_API_URL=/api-server`, producing `/api-server/socket.io`.
- **Local Compose:** use the absolute origin `NEXT_PUBLIC_API_URL=http://localhost:8080`, producing `http://localhost:8080/socket.io`; the web server rewrites REST `/api` through `API_INTERNAL_URL=http://api:8080`.
- **Production Compose/Kubernetes:** build with an empty `NEXT_PUBLIC_API_URL`, producing same-origin `/socket.io`. The production Nginx gateway or Kubernetes Ingress routes `/api` and `/socket.io` to the API and `/` to the web service. Preserve WebSocket upgrade headers; production Compose exposes the gateway on host port **80**.

## Phase highlights

- **Phase 1 — Foundation:** JWT authentication, users, roles, audit logging, notifications, health checks, and database foundation.
- **Phase 2 — Hotel Core:** hotels, branches, physical hierarchy, room catalog, amenities, pricing, rooms, and availability.
- **Phase 3 — Reservations & Front Office:** guests, reservations, calendars, arrivals/departures, check-in/out, and stay management.
- **Phase 4 — Operations:** housekeeping, maintenance, restaurant, POS, and room service.
- **Phase 5 — Business Management:** inventory, procurement, finance/cash shifts, conference, transport, HR, and employees.
- **Phase 6 — Enterprise Services:** customer service, documents, search, reports, BI dashboards, scheduler, notifications, audit enhancements, and security hardening.
- **Phase 7 — Enterprise Platform:** tenant/organization administration, subscriptions, modules, workflows, plugins, i18n/themes, MFA/IP/device security, mobile sync, metrics/cache, and authenticated real-time events.

## Quick start (pnpm)

Prerequisites: Git, Node.js 20, **pnpm 10.26.1**, and PostgreSQL. Container builds pin pnpm 10.26.1 on Node 20 Alpine.

```bash
git clone <repository-url> nexus-hms
cd nexus-hms
pnpm install
cp .env.example .env

# Edit .env: for a host-run API, DATABASE_URL must point to your host PostgreSQL
# (the provided default hostname "postgres" is for Docker Compose).

# Build the workspace package consumed by the API and apply the schema.
pnpm --filter @workspace/db run build
pnpm --filter @workspace/db run push

# Optional, NON-PRODUCTION ONLY: seed sample Phase 2 data.
# Run only against a disposable database after schema push.
pnpm exec tsx scripts/seed-phase2.ts

# Optional additional NON-PRODUCTION seed data; these scripts exist at the root.
node seed-phase4.js
node seed-phase5.js
node seed-phase6.js
```

Start each service in its own terminal:

```bash
# Terminal 1 — API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — web application
PORT=3000 pnpm --filter @workspace/hotel-management run dev
```

Validate the workspace with `pnpm run typecheck`; production builds use `pnpm --filter @workspace/api-server run build` and `pnpm --filter @workspace/hotel-management run build`. `drizzle-kit push` changes schema directly, so use an approved migration/change-control procedure for production.

## Docker Compose quick start

Docker Compose supplies PostgreSQL and starts API and web containers:

```bash
cp .env.example .env
# Change SESSION_SECRET; retain the Compose DATABASE_URL host "postgres".
docker compose up --build
```

Open `http://localhost:3000`; API health is `http://localhost:8080/api/health`. Compose persists PostgreSQL and `/app/uploads` in named volumes but does not automatically seed data. To seed, run the explicit non-production commands above against the Compose database only after schema setup; never use sample seed scripts in production.

For the external-database production topology, `docker compose -f docker-compose.prod.yml up -d` pulls the configured GHCR API/web images, includes password-protected Redis, persists `/app/uploads` in `uploads_data`, and exposes only the Nginx gateway at `http://localhost:80`. Supply `.env.production`, immutable `IMAGE_TAG`, and production secrets before starting it. Compose Redis requires a secret password and a matching credential-bearing API `REDIS_URL`; no default credential is provided. Production API startup fails closed when `REDIS_URL` is missing, invalid, or Redis is unavailable.

## Delivery and scaling notes

The deployment workflow quality-gates image publication with lint, typecheck, API security tests, and an authenticated two-replica runtime smoke covering PostgreSQL, Redis, API health, cross-replica realtime delivery, and an upload write as UID 1000. It pushes immutable API and web images to GHCR, waits for authenticated Redis readiness during deployment, then checks both Kubernetes rollouts. A failed rollout triggers rollback of **both services**.

The official Socket.IO Redis adapter/backplane is implemented, and production Compose/Kubernetes include authenticated Redis. Kubernetes sources the Redis password and API `REDIS_URL` from a Secret, permits Redis ingress only from API pods with NetworkPolicy, denies Redis egress, and runs hardened non-root containers. For real production, prefer a private managed TLS Redis service and a secret-sourced `rediss://` URL. Never commit or print the URL or password. Process-local application cache remains per pod; it is not a distributed cache.

Kubernetes mandates three API replicas/HPA and makes the **10Gi ReadWriteOnce (RWO)** uploads PVC coherent through required API pod co-location on one node plus `fsGroup: 1000`. This is safe **single-node scaling**, not multi-node HA. Moving API pods across nodes requires shared RWX or object storage and corresponding affinity changes; shared/object storage remains a future multi-node prerequisite.

## API and security

- Swagger UI: **`/api/docs`**
- Health: `/api/health` (also accepted at `/health`); metrics: `/api/metrics`
- Normal API requests use `Authorization: Bearer <access token>`. Authentication flows, health, metrics, and mobile token refresh have special/public behavior; restrict exposure at the network boundary.
- Swagger is a discovery aid, not a complete integration contract: some generated schemas, authorization annotations, and Socket.IO channels are incomplete. Validate implementation-level routes, payloads, and authorization.

> **Development credentials — change immediately**
>
> `admin@nexushms.com` / `Admin@1234` is a development bootstrap credential. **Change it immediately after first sign-in; never deploy, reuse, or share it in production.**

## Documentation

- [User Manual](docs/USER_MANUAL.md)
- [Administrator Manual](docs/ADMIN_MANUAL.md)
- [Hands-On User Manual](docs/HANDS_ON_USER_MANUAL.md)
- [User Management and Security Guide](docs/USER_MANAGEMENT_AND_SECURITY.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Guide](docs/API_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Deployment Strategy](docs/DEPLOYMENT_STRATEGY.md)
- [Entity Relationship Diagram](docs/ER_DIAGRAM.md)
- [Functional Requirements](docs/FUNCTIONAL_REQUIREMENTS.md)
- [Non-Functional Requirements](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Technologies Used](docs/TECHNOLOGIES_USED.md)
- [Changelog](CHANGELOG.md)

## License

Licensed under the [MIT License](LICENSE).
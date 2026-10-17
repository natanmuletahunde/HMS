# Nexus HMS Deployment Guide

## Release prerequisites

Use Node.js 20 and the repository-pinned pnpm **10.26.1**, PostgreSQL, and a secret manager suitable for the target environment. Corepack can activate the package-manager version from the root `packageManager` field. The root repository is the build context: workspace definitions include `artifacts/*`, `lib/*`, `lib/integrations/*`, and `scripts`. Use **pnpm only**; the root preinstall hook rejects npm/yarn clients.

Required runtime configuration:

| Variable | Use |
|---|---|
| `DATABASE_URL` | Isolated PostgreSQL connection string for this environment |
| `SESSION_SECRET` | JWT/MFA secret material; cryptographically random and **at least 32 bytes** |
| `REDIS_PASSWORD` | Password required by Compose/Kubernetes Redis |
| `REDIS_URL` | Credential-bearing Socket.IO Redis adapter URL; required for production API startup |
| `NODE_ENV` | Set `production` outside development |
| `PORT` | API port (defaults to 8080); required by the web runtime |
| `API_INTERNAL_URL` | Server-side Next.js `/api` rewrite target; Docker uses `http://api:8080` |
| `NEXT_PUBLIC_API_URL` | Absolute API origin, relative same-origin proxy prefix, or empty for same-origin gateway |

Keep all secrets out of Git and build logs. Use separate database and secret scopes for development, staging, and production. Build and promote immutable artifacts; do not rebuild a different commit during promotion.

## Build and release workflow

From repository root:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

`typecheck` runs TypeScript build checks and artifact/script checks. `build` typechecks then recursively builds workspaces. For targeted work:

```bash
pnpm --filter @workspace/db run build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/hotel-management run build
```

The API depends on `@workspace/db`; build the database package before or together with the API. Its compiled output includes `lib/db/dist/index.js`, declarations, and `dist/schema`.

Release database changes before code that requires them. Take/verify a backup, use additive/expand-backfill-contract changes where possible, test in staging, push the compatible application artifacts, then monitor authentication, reservation, and operational flows. Do not perform destructive schema changes without a tested rollback/data plan.

## Local deployment

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Set `DATABASE_URL`, `REDIS_URL`, a 32-byte-or-longer `SESSION_SECRET`, and needed `PORT`/browser configuration.
3. Apply the approved schema workflow described in the developer guide.
4. Build the shared DB package if schema code changed.
5. Start API and web packages with their workspace development scripts.

The API normally listens on port 8080 and serves REST below `/api`; the web application normally uses a separately configured port (commonly 3000). Keep databases non-production and do not use production secrets locally.

### Local first run, step by step

```bash
cp .env.example .env
# Edit .env: retain only a local DATABASE_URL and replace SESSION_SECRET.
# SESSION_SECRET must contain at least 32 bytes of random material.
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run build
pnpm run typecheck
```

`push` is Drizzle schema push, not a substitute for a reviewed production migration. Run approved migration scripts, if the release supplies them, before seeding. Seed scripts are repository-root phase seed scripts; run only those appropriate to the intended local data set and only after the schema is present. Then start the API and web development commands in separate terminals:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/hotel-management run dev
```

Verify an API response at `http://localhost:8080/api/health`, load the web root on its configured port, log in with non-production test data, and verify a protected request. Do not consider `/api/docs` a health check.

## Docker

Build from the repository root, not an artifact subdirectory, so pnpm workspace dependencies resolve. Use a multi-stage image and a frozen lockfile. Build `@workspace/db` and then the target package.

For the API, `pnpm --filter @workspace/api-server run build` produces `artifacts/api-server/dist/main.js` and related `dist/**`; run `node dist/main` from `artifacts/api-server`. After building, the Docker builder runs a frozen, offline, production-only install filtered to the API and its workspace dependency graph. This preserves required dependency links and the compiled workspace DB output without a registry metadata refresh. Do not replace it with workspace-wide `pnpm prune`, which removes required API dependency links. The runtime image also creates `/app/uploads` owned by the non-root `node` user because document storage initializes that directory at startup. Expose/configure port 8080 unless `PORT` overrides it.

For the web app, `pnpm --filter @workspace/hotel-management run build` uses Next.js `output: "standalone"`. The Docker runner copies the standalone tree to `/app`; from there its command is:

```bash
node artifacts/hotel-management/server.js
```

Set `PORT` and include the standalone runtime output, `.next/static`, and `public/**` when present exactly as the Dockerfile does. `API_INTERNAL_URL=http://api:8080` is a build input for server-side `/api` rewrites; `NEXT_PUBLIC_API_URL` is also build-sensitive browser configuration.

### Docker Compose first run

1. Create local configuration: `cp .env.example .env`.
2. Replace the example secrets: use at least 32 random bytes for `SESSION_SECRET`, generate `REDIS_PASSWORD`, and ensure `REDIS_URL` contains the same Redis credential. The Compose database host is `postgres` and Redis host is `redis`; retain container DNS names inside container URLs. Do not print either secret.
3. Build and start the stack:

   ```bash
   docker compose build
   docker compose up -d
   docker compose ps
   ```

4. Wait until PostgreSQL, authenticated Redis, and API report healthy. Both local and production Compose include password-protected `redis:7-alpine`, and the API waits for its authenticated health check. Apply schema once from an API-compatible image or an installed workspace; do not repeatedly force schema changes:

   ```bash
   pnpm --filter @workspace/db run push
   # or run an approved release migration process
   ```

   When running schema tooling on the host instead, temporarily use a host-reachable database URL rather than the Compose-only `postgres` hostname.
5. Run appropriate non-production seed scripts only after the schema push/migration.
6. Check `curl -f http://localhost:8080/api/health`, `curl -f http://localhost:3000/`, and `docker compose ps`.

Development Compose builds Next with `API_INTERNAL_URL=http://api:8080` for server-side `/api` rewrites. For its direct, cross-origin browser topology, set `NEXT_PUBLIC_API_URL=http://localhost:8080`; Socket.IO then connects to that absolute origin using `/socket.io`. The browser must never receive the Docker-only `api` hostname.

### Production Compose gateway

Production Compose uses prebuilt API/web images, password-protected `redis:7-alpine`, and `nginx.prod.conf` as a gateway. Supply matching `REDIS_PASSWORD` and credential-bearing `REDIS_URL` values through the deployment secret store-backed `.env.production`; Compose waits for an authenticated Redis health check before API startup. Build the web image with `API_INTERNAL_URL=http://api:8080` and an empty `NEXT_PUBLIC_API_URL` so browser REST and realtime remain same-origin. Then run:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/healthz
curl -f http://localhost/api/health
curl -f http://localhost/
```

Port 80 on the `gateway` is the public entry point; API port 8080 and web port 3000 are exposed only to the Compose network. Nginx routes `/api` to API, `/socket.io` to API with WebSocket upgrades, and `/` to web. It returns 404 for public `/api/metrics`; monitoring must scrape the API privately. The `uploads_data` named volume persists `/app/uploads` across API container replacement on that Compose host. Verify authenticated Redis and API health, an authenticated REST call, an upload/read-back, and an authenticated same-origin `/socket.io` connection after first start. Redis is transient pub/sub; use private managed/HA Redis over TLS (`rediss://`) for serious production. Stop with `docker compose -f docker-compose.prod.yml down`; database lifecycle is external to this production file.

To stop while retaining local database and upload volumes use `docker compose down`; use `docker compose down -v` only when intentionally deleting both kinds of local data.

Local and production Compose use a named `uploads_data` volume for single-host persistence. Back it up with the database and replace it with supported shared/object storage before scaling API containers across hosts.

## Kubernetes

Use a namespace or equivalently isolated release boundary per environment. Deploy API and web workloads behind ClusterIP Services and TLS ingress. Define resource requests/limits, secret injection, rolling-update controls, autoscaling policy, database network policy, and storage only where a durable upload strategy is approved.

Route REST `/api` to the API service and same-origin `/socket.io` to it with WebSocket upgrade support; an `/api` rule does not cover the socket. Use empty `NEXT_PUBLIC_API_URL` for this generic/Kubernetes gateway form. Health is available at `/api/health` (and `/health` is accepted); metrics is `/api/metrics`. Both are unauthenticated application paths and must be perimeter-restricted to load balancers/monitoring networks, rather than broadly exposed through public ingress.

The scaled topology includes the official Socket.IO Redis adapter and ingress sticky sessions. `REDIS_URL` is required in production; room broadcasts propagate across pods through Redis, including broadcasts caused by a local business event on its originating pod. The cache and EventBus themselves remain process-local and are not synchronized by this adapter.

### Kubernetes deployment, step by step

The checked-in deployment runs three API replicas and the HPA scales from 2 to 10. Kubernetes includes an authenticated Redis Deployment and Service. Redis gets `REDIS_PASSWORD` from `nexus-hms-secrets`, and API gets the matching credential-bearing `REDIS_URL` from that Secret—not from the ConfigMap. NetworkPolicy allows Redis ingress only from `nexus-hms-api` pods and denies Redis egress. Embedded Redis traffic is authenticated and network-isolated but not TLS-encrypted. Redis and web containers run non-root with privilege escalation disabled. The API runs as uid/gid 1000 and `fsGroup: 1000` makes the 10Gi RWO upload path writable. Required pod affinity co-locates all API pods on one `kubernetes.io/hostname`; the volume attaches once and is consistently visible to those pods. This is safe but is not multi-node HA, and added replicas can remain `Pending` if that node lacks capacity. Multi-node operation requires RWX/shared or object storage plus removal/replacement of affinity.

1. Build and publish immutable API and web images, then update image references/tags in manifests (or inject them through your release tooling).
2. Create the namespace and non-secret configuration:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/pvc.yaml -f k8s/network-policies.yaml
   ```

3. Create runtime secrets without committing or printing values. Set `DATABASE_URL`, `SESSION_SECRET`, and `REDIS_PASSWORD` in the current shell from an approved secret source. Build a matching URL in memory (URL-encode the password if it contains URL-significant characters), then send values directly to Kubernetes:

   ```bash
   REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"
   kubectl -n nexus-hms create secret generic nexus-hms-secrets \
     --from-literal=DATABASE_URL="$DATABASE_URL" \
     --from-literal=SESSION_SECRET="$SESSION_SECRET" \
     --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
     --from-literal=REDIS_URL="$REDIS_URL" \
     --dry-run=client -o yaml | kubectl apply -f -
   unset REDIS_URL REDIS_PASSWORD
   ```

   Confirm `SESSION_SECRET` is at least 32 bytes before this command. This generated/imperative approach is preferred over editing `k8s/secrets.yaml`; prefer an external-secrets integration in production.

   `k8s/secrets.yaml` is only a template. All `Secret.data` entries—including `DATABASE_URL`, `SESSION_SECRET`, `REDIS_PASSWORD`, and credential-bearing `REDIS_URL`—must be base64-encoded by secure deployment tooling. Do not run commands that print these values into a shared terminal/log. Base64 is encoding, not encryption; never commit the rendered values. The checked-in placeholders are invalid credentials. The `kubectl create secret` command above is preferred because it performs encoding without requiring values in a file.
4. Provision database connectivity and apply persistent storage only if its access mode fits the replica design:

   ```bash
   kubectl apply -f k8s/api-service.yaml -f k8s/web-service.yaml -f k8s/redis-service.yaml
   kubectl apply -f k8s/redis-deployment.yaml
   kubectl -n nexus-hms rollout status deployment/redis --timeout=3m
   kubectl apply -f k8s/api-deployment.yaml
   kubectl apply -f k8s/web-deployment.yaml
   ```

5. Apply the approved schema migration/push using a one-off, access-controlled job or release runner, before enabling code that needs the change. Seed only a non-production environment, after schema work.
6. Install/configure the ingress controller and cert-manager/ClusterIssuer. Point the intended DNS name (the sample is `hotel.example.com`) to the ingress load-balancer address. After DNS is ready:

   ```bash
   kubectl apply -f k8s/ingress.yaml
   kubectl apply -f k8s/hpa-api.yaml
   kubectl apply -f k8s/hpa-web.yaml
   kubectl -n nexus-hms rollout status deployment/api
   kubectl -n nexus-hms rollout status deployment/web
   ```

   The ingress requests cert-manager TLS via `letsencrypt-prod`; ensure that issuer exists and is appropriate for the DNS zone.
7. Verify `/`, `/api/health`, login and a protected API request through the public host. Upload and read back a test document, and verify `/socket.io` across different API pods. Public ingress intentionally excludes `/api/metrics`; scrape it through the internal service from the monitoring network. Watch for `Pending` API pods because required same-node affinity limits scheduling capacity.

For same-origin Kubernetes browser traffic, leave `NEXT_PUBLIC_API_URL` empty and route `/socket.io` through ingress. Supply `API_INTERNAL_URL=http://api:8080` to the Next build/runtime configuration where server-side `/api` rewrites are required. Never set browser-visible `NEXT_PUBLIC_API_URL` to that cluster-only name. Replit is the separate relative-prefix case: `NEXT_PUBLIC_API_URL=/api-server`, yielding `/api-server/socket.io`.

Rollback application images with `kubectl -n nexus-hms rollout undo deployment/api` and/or `deployment/web`, then inspect rollout status. Roll back a database only if the approved migration is reversible and data impact is understood; otherwise use a forward-compatible application rollback.

## Cloud-provider deployment

The same artifact model applies to managed container services, managed Kubernetes, VMs, or platform runtimes:

1. Provision managed PostgreSQL with backups, TLS/private connectivity, least-privilege credentials, and recovery testing.
2. Store `DATABASE_URL`, `REDIS_URL`, and `SESSION_SECRET` in the provider secret manager and inject them at runtime.
3. Deploy separate API and web services; set API `PORT` and web `PORT`.
4. Configure edge TLS, approved CORS origins, REST and Socket.IO proxy paths, WebSocket support, and health/metrics perimeter rules.
5. Use provider load-balancer affinity for Socket.IO polling and managed/HA Redis for the installed Socket.IO adapter.
6. Centralize logs, error reporting, metrics scraping, alerting, and database backup/restore ownership.

Use a private API where the web is served through a same-origin proxy, or carefully configure public origins and CORS where browser traffic crosses origins. Never turn public metrics into an internet-wide debugging endpoint.

### Provider-neutral runbook

1. Provision managed PostgreSQL and managed/HA Redis with private networking and TLS; use a credential-bearing `rediss://` URL, configure database backups/restore testing, and monitor Redis availability.
2. Put `DATABASE_URL`, `REDIS_URL`, and the 32-byte-or-longer `SESSION_SECRET` in the provider secret manager; grant only runtime identity access.
3. Publish the images built from the root context and deploy API/web services with health checks, resource limits, and separate identities.
4. Create DNS records to the provider load balancer, issue TLS certificates (managed certificate service or cert-manager), and wait for certificate/DNS validation.
5. Configure `/api`, the Socket.IO public path, WebSocket upgrades, session affinity, health/metrics perimeter rules, and CORS. For a same-origin topology, route `/socket.io` to API and use an internal `API_INTERNAL_URL`; for a cross-origin topology, make `NEXT_PUBLIC_API_URL` the public API origin.
6. Test Redis-backed room broadcasts with clients connected to different replicas. For multi-node scaling, use RWX/shared or object storage and replace the Kubernetes same-node affinity/RWO design.
7. Release with rolling deployment, verify health/login/protected API/realtime, monitor errors and latency, and retain the previous immutable image for rollback.

## Production checklist

- [ ] Frozen-lockfile build and typecheck completed for the promoted commit.
- [ ] Schema change backed up, staged, and compatible with the release.
- [ ] `SESSION_SECRET` is secret-managed, random, and at least 32 bytes.
- [ ] Production `REDIS_URL` targets monitored managed/HA Redis; polling affinity and cross-pod broadcasts are verified.
- [ ] API/web ports and `NEXT_PUBLIC_API_URL` match the public proxy configuration.
- [ ] TLS, private database network, CORS, health, and metrics exposure are restricted.
- [ ] REST `/api` and Socket.IO proxy routes are tested independently.
- [ ] Upload read-back is verified; RWO/same-node capacity and failure-domain limits are accepted or replaced.
- [ ] CI/deploy smoke starts PostgreSQL and Redis and checks API health and upload persistence.
- [ ] Monitoring, backups, restore procedure, and rollback artifact are ready.
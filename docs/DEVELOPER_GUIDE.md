# Nexus HMS Developer Guide

## Working in the monorepo

Nexus HMS uses pnpm workspaces on Node.js 20 and pins pnpm **10.26.1** in the root `packageManager` field. Use Corepack to honor that pin. Work from the repository root unless a command explicitly targets a package. Do not use npm or yarn: the root `preinstall` guard rejects them.

```text
.
├── artifacts/
│   ├── api-server/                 NestJS API
│   │   └── src/{common,modules}/   guards, context and feature modules
│   └── hotel-management/           Next.js App Router application
│       └── src/{app,components,lib}
├── lib/db/src/schema/              Drizzle schema source
├── scripts/                        workspace scripts where supplied
├── uploads/                        local upload location
├── k8s/                            deployment manifests
└── pnpm-workspace.yaml
```

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

`artifacts/api-server` is the NestJS API, `artifacts/hotel-management` is the Next.js application, and `lib/db` is the shared Drizzle schema package. Targeted package commands are:

```bash
pnpm --filter @workspace/db run build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/hotel-management run build
```

The root typecheck runs `tsc --build` and relevant artifact/script typechecks. The root build runs typecheck before recursive package builds.

## Local configuration and development

Set `DATABASE_URL` to a local/development PostgreSQL instance, set `REDIS_PASSWORD`, set `REDIS_URL` to the same credential-bearing local Redis service, and set `SESSION_SECRET` to cryptographically random material of at least 32 bytes. Production API startup fails without `REDIS_URL`. Never print or use production credentials locally. API development uses the API package's `dev` script; web development uses the hotel-management package's `dev` script. Run them as separate processes when needed.

The API has global `/api` prefix, commonly runs at port 8080, and serves Swagger at `/api/docs`. The browser REST helper targets `/api`. For Socket.IO, `NEXT_PUBLIC_API_URL` deliberately accepts an absolute origin (`http://localhost:8080` for cross-origin local Docker), a relative proxy prefix (`/api-server` on Replit), or an empty value (same-origin `/socket.io` through a generic/Kubernetes/production gateway). Do not model the variable as always an origin or always a path.

| Variable | Required by | Meaning |
|---|---|---|
| `DATABASE_URL` | API and schema tooling | PostgreSQL URL; never use production locally |
| `SESSION_SECRET` | API | Random JWT/MFA secret, at least 32 bytes |
| `REDIS_PASSWORD` | Compose/Kubernetes Redis | Redis authentication secret |
| `REDIS_URL` | API realtime | Matching credential-bearing pub/sub URL; mandatory in production |
| `PORT` | API/web runtime | API defaults to 8080; set web port explicitly |
| `NODE_ENV` | Runtime | Set `production` only for production-like execution |
| `API_INTERNAL_URL` | Next rewrite | Server-side `/api` target; Docker Next uses `http://api:8080` |
| `NEXT_PUBLIC_API_URL` | Browser config | Absolute API origin, relative same-origin prefix, or empty for root same-origin socket |

## Database schema workflow

Schema definitions live under `lib/db/src/schema`. After editing schema code:

```bash
pnpm --filter @workspace/db run build
pnpm --filter @workspace/db run push
```

`push` runs `drizzle-kit push --config ./drizzle.config.ts`. Use `push-force` only when the database impact is understood and explicitly approved:

```bash
pnpm --filter @workspace/db run push-force
```

Schema push changes a database; review its generated plan and use a disposable local database for exploratory work. For shared/staging/production databases, follow the reviewed release migration process, backup first, and prefer additive changes. Rebuild `@workspace/db` before building/running API code that imports its compiled package.

### New table workflow

1. Add the table and exports under `lib/db/src/schema`, including identifiers, constraints, indexes, and a tenant relationship where the domain is tenant-capable.
2. Update service queries/types; a compiled table alone is not an exposed feature.
3. Inspect `pnpm --filter @workspace/db run push` on a disposable local database.
4. Build `@workspace/db`, then typecheck the API.
5. For shared environments, use a reviewed migration plan, backup first, apply it once, and test upgrade/rollback or forward-compatible behavior.

`push-force` can permit destructive changes. It is not routine development tooling; use it only with explicit approval and a recoverable database.

## Adding a backend feature

Follow the existing NestJS module pattern: controller for transport concerns, service for business/data work, and module for registration. Add the module to the application module where required. Validate incoming payloads rather than relying on permissive `any` bodies. Global validation whitelists and transforms input, but that does not replace DTO design or domain authorization.

All HTTP routes are protected by the global JWT guard unless explicitly public. Make public exposure deliberate and document it. Do not rely on inconsistent Swagger bearer annotations to decide whether a route is protected. Consider IP restrictions, auditing, tenant context, and error behavior in every new endpoint.

For websocket changes, authenticate handshake tokens in the gateway model, use the defined tenant/platform room naming convention, and document client subscription/event changes. Websocket authorization is separate from the HTTP global guard. `main.ts` installs the official Socket.IO Redis adapter: local business events originate on one pod, while gateway room broadcasts propagate cross-pod through Redis. Do not assume the process-local cache or EventBus is distributed.

### New Nest module workflow

1. Create `src/modules/<feature>/` with controller, service, and module files following a neighboring feature.
2. Define DTOs/types; keep transport in the controller and state/database operations in the service.
3. Decide JWT/public handling explicitly, then implement business authorization, caller/tenant context, audit needs, status/error behavior, and validation.
4. Register the module in `AppModule`; otherwise controllers/providers are inactive.
5. Add `/api` routes and practical Swagger metadata, while documenting the verified contract outside incomplete generated Swagger.
6. For realtime, define handshake authorization, tenant/platform rooms, event payloads, and multi-replica delivery.
7. Run typecheck/build before review.

## Tenant-aware development

The target model is a shared database with tenant-scoped data. It is transitional: legacy hotel tables do not yet all enforce `tenant_id`. Do not treat tenant context as proof that every legacy query is tenant isolated. New tenant-capable data should carry and enforce tenant scope consistently in reads and writes; additions should include tests for cross-tenant denial.

Mobile synchronization returns an empty response safely for tenant users when a legacy domain lacks enforced tenant scope. Preserve that behavior rather than inventing unscoped fallback data. Expanding a domain to tenant users requires a deliberate schema backfill, query/mutation enforcement, authorization review, and mobile-sync tests.

## Frontend practices

Add pages under the established Next.js App Router/dashboard structure and reuse shared API and websocket helpers. Treat UI routes as user-interface routes, not automatic proof of a backend endpoint: for example, a walk-in UI flow does not establish a dedicated walk-in API controller route. Build UI flows from documented, verified API calls.

The token is currently local-storage bearer authentication. Avoid logging it, placing it in URLs, or treating it as a cookie/session abstraction. Handle 401 responses and refresh/MFA flows explicitly.

### New frontend page workflow

1. Start from a verified backend contract and its tenant/authorization behavior; a UI label is not proof an API exists.
2. Add a route in the established App Router layout, e.g. `src/app/(dashboard)/<feature>/page.tsx`.
3. Reuse shared API/components; keep browser REST on `/api` unless supported public-origin configuration says otherwise.
4. Implement loading, empty, validation, authorization, and API-error states.
5. Add socket subscriptions only for defined gateway events/channels and clean them up on unmount.
6. Build/typecheck and verify both permitted and denied flows in non-production.

## Quality and code conventions

Use TypeScript, existing formatting/import order, descriptive names, and narrow types instead of propagating `any`. Keep controllers thin, services domain-focused, and schema code in `lib/db`. Global validation does not replace DTOs for new contracts. Do not log secrets, bearer tokens, credentials, or sensitive guest data.

```bash
pnpm run typecheck
pnpm run build
```

Use package-level lint/test commands when a package provides them; a successful build is not proof that tests ran. Add focused tests where infrastructure exists, especially for authorization, tenant separation, lifecycle transitions, and error paths.

CI/deploy runtime smoke provisions PostgreSQL and password-protected Redis, starts the production API with matching credentials, checks health, and verifies upload behavior. Preserve these dependencies and checks when modifying bootstrap, Redis, health, documents, Docker, or deployment configuration.

## API and realtime tenant review checklist

- [ ] Correct `/api` method/path, validation, success status, pagination, and error behavior are verified.
- [ ] JWT/public choice is explicit; business permissions are not inferred from Swagger annotations.
- [ ] Caller, tenant, and platform scope apply to every read and mutation.
- [ ] A legacy hotel table lacking enforced `tenant_id` is not represented as tenant-isolated; mobile sync remains safely empty for tenant users in that domain.
- [ ] Audit, file, financial, and lifecycle side effects are reviewed.
- [ ] Gateway handshake, room scope, event payload, proxy path, Redis fan-out, and polling sticky-session requirements are addressed.
- [ ] `REDIS_PASSWORD` and credential-bearing `REDIS_URL` match; credentials are never logged or committed.
- [ ] Kubernetes Redis NetworkPolicy and non-root/no-escalation container hardening remain intact.
- [ ] Kubernetes file behavior accounts for the 10Gi RWO PVC plus required same-node pod affinity; multi-node changes use RWX/shared/object storage and replace affinity.
- [ ] Process-local cache/EventBus semantics are not presented as distributed; the originating pod emits local business events.

## Before submitting changes

1. Build the shared DB package after schema edits.
2. Run the appropriate typecheck/build command.
3. Confirm route prefix, authentication behavior, and proxy path assumptions.
4. Confirm tenant scoping or document the legacy-domain limitation.
5. Avoid adding sensitive values, `.env` files, generated runtime output, or unrelated changes.
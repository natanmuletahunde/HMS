# Nexus HMS Enterprise Edition — Administrator Manual

**Release:** v2.0.0 (Phase 7) · **Audience:** platform and tenant administrators · **Date:** 2026-08-27

## Administrative scope and tenant limitation

Platform administrators manage platform-wide tenants, subscriptions, module settings, plugins, and password policy. Tenant administrators manage their assigned tenant’s users, permitted configuration, IP rules, and workflows. Use named accounts and least privilege; UI visibility is never a security boundary.

> **Current tenant limitation:** legacy core hotel tables do not yet have complete `tenant_id` row-level isolation. Tenant-aware BI and mobile services deliberately limit results where a safe filter is unavailable. Do not claim complete row isolation, grant unrestricted cross-tenant access, or enable broad cross-tenant integrations until the migration and verification are complete.

## First-time platform and hotel setup

1. **Prepare environment.** Provision PostgreSQL and password-protected Redis; set strong, secret-managed `SESSION_SECRET`, `DATABASE_URL`, and credential-bearing `REDIS_URL` values, production environment values, TLS/proxy rules, and durable restricted upload storage. Builds use pinned pnpm 10.26.1 and Node 20 Alpine. Build and apply the approved schema procedure. Production API startup fails closed without a usable `REDIS_URL`. Never commit or log Redis credentials.
2. **Secure bootstrap.** Sign in to the development bootstrap account only in development, change the password immediately, create named platform administrators, enroll MFA, and disable/remove bootstrap access as policy requires.
3. **Create tenant and organization.** In **Tenants**, create the customer boundary and branding; in **Organizations**, create the approved operating structure. Confirm assignments against the isolation limitation.
4. **Create physical hotel inventory.** Create hotel → branch → building → floor → room category/type → bed type/amenity → pricing → room. Add room images/amenities and validate availability. Do not create sellable rooms before parent configuration exists.
5. **Validate operations.** With a least-privilege test account, create a guest/reservation, perform a controlled check-in/out, verify audit events, and confirm finance/report views. Correct configuration through the UI, not direct database edits.

**Setup checklist**
- [ ] Secrets, TLS, database access, upload storage, and recovery ownership are approved.
- [ ] Tenant/organization and hotel hierarchy are reviewed.
- [ ] Room inventory, rates, availability, and room statuses are validated.
- [ ] MFA is enabled for administrators and sensitive roles.
- [ ] A test confirms authorization, audit capture, and backup restoration.

## Users, roles, and permissions

1. Define roles around duties: platform admin, tenant admin, hotel manager, front desk, housekeeping/maintenance, restaurant/POS, inventory/procurement, finance, HR, customer service, and reporting read-only.
2. Create each user with correct identity, tenant, department, active status, and minimum role.
3. Test each sensitive operation using that role. The codebase does not establish that every endpoint has a controller-level role decorator; verify server authorization rather than relying on navigation hiding.
4. On transfer, remove old tenant/role access before granting new access. On departure or compromise, deactivate, revoke devices, preserve audit evidence, and review recent activity.

Review assignments quarterly and after organizational change. Separate approval, payment, void, and user-administration duties where possible.

## Tenant management, subscriptions, and modules

**Tenant procedure:** create/update tenant and branding; associate approved organizations/users; review scope before enabling operational access; document compensating controls for the current isolation limitation.

**Subscription procedure:** review plans, current subscription, usage, and history in **Subscriptions**; activate only an approved plan; record the commercial owner and renewal/usage review date.

**Module procedure:** in **Module Configuration**, review module status and dependency/training impact, obtain approval, enable/disable the module, and test with a least-privilege user. Communicate outages before disabling a used module. Preserve audit evidence and a rollback decision.

## Workflow engine setup

1. Identify the business event, owner, required evidence, approvers, service target, and exception path.
2. Create a workflow definition in **Workflows** and add the minimum ordered steps.
3. Test a complete instance: start, advance each approved transition, test rejected/stalled handling, and check audit visibility.
4. Publish only after process-owner approval. Do not change a live workflow without impact review; version/test the revised process and retain the prior audit trail.
5. Review stalled instances and orphaned ownership on a scheduled cadence.

## Security policy, MFA, IP rules, and devices

### Password and authentication policy

Platform administrators set password length, uppercase/number/symbol requirements, expiry, and history. Record owner, rationale, effective date, and communication. JWT bearer tokens protect normal HTTP requests; the browser client uses local storage, so enforce HTTPS and reduce XSS exposure. Public/special routes include authentication flows, health, metrics, and mobile token refresh; restrict exposure at the proxy/network boundary.

### MFA procedure

1. Require MFA for administrators and finance/HR/sensitive operational roles.
2. User opens Security, starts setup, scans the TOTP QR code, stores backup codes securely, and verifies a current code.
3. Confirm enrollment without collecting a user’s codes or secret.
4. For lost factors, identity-verify under the recovery policy; do not edit MFA database data. MFA disablement requires current TOTP verification.

### IP restriction procedure

1. Identify the source IPv4/CIDR, scope (global or tenant), business owner, and recovery route.
2. Create a labelled allow/block rule and have a second administrator verify it.
3. Test with a non-admin session before ending the recovery path. Invalid IPv6 or malformed CIDR input is rejected.
4. Record the audit reference and review expiry/need. Use firewall/private ingress as the primary perimeter, not application rules alone.

### Device procedure

Review **Active Devices** regularly. For a lost/replaced/shared device: revoke it, assess account compromise, reset credentials if required, review audit activity, and register only a verified replacement. Socket.IO handshakes require JWT authentication and must be tested separately from REST controls. The official Socket.IO Redis adapter provides the production cross-pod event backplane. Compose Redis requires a password and matching credential-bearing API URL. Kubernetes sources both the Redis password and API `REDIS_URL` from a Secret; production fails closed when authentication or connectivity fails.

### Realtime routing procedure

`NEXT_PUBLIC_API_URL` accepts an absolute origin, a relative proxy prefix, or an explicitly empty value. Use `/api-server` on Replit, `http://localhost:8080` for local Compose, and an empty value for production Compose/Kubernetes so the client uses same-origin `/socket.io`. In production, route `/api` and `/socket.io` to the API and `/` to the web service through Nginx/Ingress, with WebSocket upgrades enabled. Production Compose exposes gateway port 80; API and web stay internal.

## Audit review and monitoring

Assign an audit owner and review schedule. In **Audit Logs**, review failed logins/MFA, role/user/tenant changes, MFA actions, IP mutations, device registration/revocation, password-policy changes, cache flushes, and high-risk financial/guest corrections. Protect audit exports and retain evidence under policy.

Monitor health, metrics, subscription usage, failed integrations, low-stock/operational alerts, workflow stalls, and dashboard anomalies. `/api/health` and public metrics need network/proxy restrictions. Swagger at `/api/docs` does not fully document schemas, authorization, or Socket.IO; verify implementation-level contracts before integrations.

## Backups and restores

### Backup checklist
- [ ] Back up PostgreSQL and uploaded documents on the approved schedule.
- [ ] Encrypt backups, restrict access/keys, and record retention and location.
- [ ] Keep secrets in managed secret storage, not tickets or plaintext backup notes.
- [ ] Test a restoration in an isolated environment at the defined cadence and record RPO/RTO results.
- [ ] Back up the 10Gi RWO upload volume. Its API replicas are deliberately co-located on one node; add shared RWX/object-storage backup procedures when moving to multi-node storage.

### Restore procedure

1. Declare the incident, preserve the affected database, uploads, audit data, and logs, and select an approved recovery point.
2. Restore database and corresponding document storage together in isolation.
3. Validate record/file references, login/MFA, reservation, payment, and report workflows with test accounts.
4. Rotate compromised secrets, obtain business/security sign-off, then reopen access and document actual RPO/RTO.

## Plugin governance

Before enabling a plugin, document business owner, data classification/flow, permissions, credential storage, support contact, compatibility/security test, monitoring, and rollback. Use only reviewed integrations; SDK metadata is not a security approval. Disable the plugin and preserve logs/audit evidence first when investigating malfunction or abuse. Review enabled plugins periodically.

## Rollout and incident runbooks

**Rollout:** approve scope → test in non-production → verify migration/backup → communicate downtime/training → enable modules/workflows in controlled order → test least-privilege access, real-time and mobile paths → monitor → sign off or roll back.

**CI/CD and topology:** GitHub Actions gates delivery on lint, typecheck, and security tests; publishes immutable API/web images to GHCR; deploys both; and rolls back both services if either rollout fails. Deployment waits for authenticated Redis. Its two-replica runtime smoke verifies PostgreSQL, Redis authentication, cross-replica realtime delivery, API health, and upload writes under UID 1000.

Kubernetes mandates three API replicas/HPA, a 10Gi ReadWriteOnce uploads PVC, pod co-location on one node, and `fsGroup: 1000`. Hardened API/Redis containers run non-root. NetworkPolicy allows Redis ingress only from API pods and denies Redis egress; Redis is not an ingress/public service. The implemented Redis adapter distributes Socket.IO events, but process-local cache remains independent per pod. This is safe single-node scaling—not multi-node HA. Moving API pods across nodes requires shared RWX or object storage plus revised affinity/co-location rules; shared object storage remains a future multi-node prerequisite.

For real production, prefer a private managed Redis service with TLS and a Secret-sourced `rediss://` URL. Apply provider firewall/private-network controls, certificate validation, password rotation, and log redaction; do not invent, document, or expose actual credentials.

**Account/device compromise:** deactivate user or revoke device → preserve evidence → inspect audit/IP/session activity → reset credentials/rotate affected secrets → assess token/MFA/data exposure → restore only after verified recovery.

**IP-rule lockout:** use the pre-tested recovery account/network → revert the offending rule → validate with non-admin test → audit/document the correction. Never broadly remove controls to recover access.

**Cross-tenant concern:** stop affected broad access/integration → preserve evidence → notify security/data owner → assess scope against the stated limitation → remediate and obtain approval before resuming.

**Data correction:** locate record/audit trail → use the approved corrective transaction, never direct database editing → obtain finance/manager approval as appropriate → document cause and result.
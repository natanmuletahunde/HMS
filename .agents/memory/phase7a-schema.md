---
name: Phase 7A schema additions
description: New tables added in Phase 7A for multi-tenant SaaS platform
---

## New tables (Phase 7A)

### tenants.ts
- `tenants` → `tenantsTable` — slug (unique), domain, timezone, currency, is_active, metadata
- `tenant_branding` → `tenantBrandingTable` — tenant_id FK, colors, theme, logo_url, app_name

### organizations.ts
- `organizations` → `organizationsTable` — tenant_id FK, type (hotel_group/chain/independent), metadata

### subscriptions.ts
- `subscription_plans` → `subscriptionPlansTable` — code (unique: trial/basic/professional/enterprise), max_hotels, max_users, max_rooms, storage_limit_gb, api_limit_per_month, features (JSONB array)
- `tenant_subscriptions` → `tenantSubscriptionsTable` — tenant_id + plan_id FK, status, billing_cycle, starts_at, expires_at, trial_ends_at

### module-configs.ts
- `module_configs` → `moduleConfigsTable` — module_code, module_name, category (core/operations/business/enterprise), is_enabled, is_installed, is_core, settings (JSONB), dependencies (JSONB)

### workflows.ts
- `workflow_definitions` → `workflowDefinitionsTable` — code, entity_type, trigger_conditions (JSONB), is_active
- `workflow_steps` → `workflowStepsTable` — workflow_id FK, step_order, approver_role, escalation_hours, conditions (JSONB)
- `workflow_instances` → `workflowInstancesTable` — workflow_id FK, entity_type, entity_id, current_step, total_steps, status (pending/in_progress/approved/rejected)
- `workflow_approvals` → `workflowApprovalsTable` — instance_id FK, step_id FK, action, acted_at, due_at

### plugins.ts
- `plugin_registry` → `pluginRegistryTable` — plugin_code, version, hooks/menus/routes/permissions (JSONB arrays), config (JSONB), is_system

## New NestJS modules (Phase 7A)
- TenantsModule → /api/tenants/* (CRUD + branding sub-routes)
- OrganizationsModule → /api/organizations/*
- SubscriptionsModule → /api/subscriptions/* (plans, current, usage, activate, history)
- WorkflowsModule → /api/workflows/* (definitions, steps, instances, advance)
- ModuleConfigModule → /api/modules/* (list with defaults merged, stats, toggle)
- PluginsModule → /api/plugins/* (CRUD + sdk-spec endpoint)

## 4 default subscription plans seeded
trial (free/14d), basic ($49/mo), professional ($149/mo/featured), enterprise ($499/mo)

## Default modules list (18 modules)
ModuleConfigService maintains DEFAULT_MODULES array with all modules from Phase 1-6 — when no DB record exists for a module, the default is merged into the response.

**Why:** Phase 7A SaaS backbone — tenants own their data, subscriptions gate features, workflows handle approvals, module config enables/disables features.

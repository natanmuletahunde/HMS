-- Phase 7B: Enterprise Platform Features Migration
-- Run this against the database to add Phase 7B tables.
-- Tables are created with IF NOT EXISTS so re-runs are safe.

-- MFA configurations: stores TOTP secrets and backup codes per user
CREATE TABLE IF NOT EXISTS mfa_configs (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  secret     TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IP restriction rules: allowlist/blocklist entries scoped per tenant (or global)
CREATE TABLE IF NOT EXISTS ip_restrictions (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT,
  ip_address  TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'allowlist', -- 'allowlist' | 'blocklist'
  label       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mobile sessions: registered devices with push tokens for mobile clients
CREATE TABLE IF NOT EXISTS mobile_sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  device_id   TEXT NOT NULL,
  device_name TEXT,
  platform    TEXT,               -- 'ios' | 'android'
  push_token  TEXT,               -- FCM/APNs token (stored, delivery in Phase 7C)
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency index: one device per user
CREATE UNIQUE INDEX IF NOT EXISTS mobile_sessions_user_device
  ON mobile_sessions (user_id, device_id);

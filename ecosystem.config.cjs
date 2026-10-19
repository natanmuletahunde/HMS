/**
 * Nexus Enterprise Hotel Management System
 * Production Process Supervisor Configuration (PM2 / Systemd Cluster Mode)
 *
 * SRS Requirement: Section 5.2 - Availability & High Availability SLA
 * Target: 99.9% Uptime SLA with automated failover and zero-downtime rolling restart.
 */

module.exports = {
  apps: [
    {
      name: 'nexus-api-server',
      cwd: './artifacts/api-server',
      script: 'dist/main.js',
      instances: 'max', // Multi-core CPU clustering
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      exp_backoff_restart_delay: 100,
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        RATE_LIMIT: 10000,
        DATABASE_URL: 'postgresql://postgres:admin@localhost:5433/hotel_management',
        SESSION_SECRET: 'nexus_hms_enterprise_secret_key_at_least_32_characters_long_12345',
      },
    },
    {
      name: 'nexus-web-frontend',
      cwd: './artifacts/hotel-management',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 0.0.0.0',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'http://localhost:8080',
        API_INTERNAL_URL: 'http://localhost:8080',
      },
    },
  ],
};

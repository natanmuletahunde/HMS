# Nexus HMS - Production Operations, Deployment & Handover Runbook

**Document Reference:** `NEXUS-OPS-HANDOVER-001`  
**Target Roles:** System Administrator, DevOps Engineer, IT Director, General Manager  

---

## 1. System Architecture Overview

The Nexus Hotel Management System is built on a high-concurrency micro-modular architecture designed for 99.9% uptime SLA:

* **Backend API Engine**: NestJS (TypeScript, Node.js 22 LTS) on Port `8080`.
* **Frontend Web Application**: Next.js 15 (React 19, Tailwind CSS, Shadcn UI) on Port `3000`.
* **Primary Relational Database**: PostgreSQL 17 on Port `5433` (or default `5432` in Docker).
* **Caching & Real-Time Sync**: In-memory Redis event adapter & Socket.IO WebSockets.
* **Process Supervisor**: PM2 Enterprise Cluster Mode (`ecosystem.config.cjs`).

---

## 2. Environment Variables & Secret Configuration

Production secrets must be stored securely in the host environment or secret manager (`.env.production`):

```bash
# Database Connection (PostgreSQL 17)
DATABASE_URL="postgresql://postgres:admin@localhost:5433/hotel_management"

# API Server Ports & Runtime
PORT=8080
NODE_ENV=production
RATE_LIMIT=10000

# Cryptographic Keys (Must be minimum 32 characters)
SESSION_SECRET="nexus_hms_enterprise_secret_key_at_least_32_characters_long_12345"
JWT_SECRET="nexus_hms_jwt_production_signing_key_secure_2026"

# Frontend Integration
NEXT_PUBLIC_API_URL="http://localhost:8080"
API_INTERNAL_URL="http://localhost:8080"

# External Integrations
CHAPA_API_KEY="chapa_live_sec_key_sample"
TELEBIRR_MERCHANT_ID="telebirr_merchant_001"
ETHIO_TELECOM_SMS_API="https://api.ethiotelecom.et/sms/v1/send"
```

---

## 3. Production Startup & Process Supervisor (PM2)

To start both the API server and frontend with multi-core clustering and auto-recovery:

```bash
# 1. Install PM2 globally if not installed
npm install -g pm2

# 2. Build both workspace targets
pnpm run build

# 3. Launch with PM2 cluster configuration
pm2 start ecosystem.config.cjs

# 4. Save PM2 state for automatic system reboot startup
pm2 save
pm2 startup
```

---

## 4. Database Automated Backup & Disaster Recovery

Run the automated backup script daily via Windows Task Scheduler or Linux Cron:

```powershell
# PowerShell Backup Routine (Windows)
.\scripts\backup-database.ps1
```

```bash
# Linux / Bash Cron Routine (Every night at 02:00 AM)
0 2 * * * pg_dump -U postgres -d hotel_management -F c -b -v -f "/var/backups/nexus_hms_$(date +\%Y\%m\%d).dump"
```

### Database Restore Procedure:
```bash
pg_restore -U postgres -d hotel_management -v -c "/var/backups/nexus_hms_TIMESTAMP.dump"
```

---

## 5. Administrative Credentials & Access Verification

* **Default Administrator Account:**
  * **Email**: `admin@nexushms.com`
  * **Password**: `Admin@1234`
  * **Role**: `System Administrator` (Unrestricted permissions across all 54 modules)
* **Default Hotel Property:**
  * **Trade Name**: Nexus Hotel Addis Ababa
  * **Code**: `NGH-001`
  * **Currency**: Ethiopian Birr (`ETB`)
  * **Standard VAT Rate**: `15.00%`

> [!IMPORTANT]
> Upon formal system handover, the hotel IT administrator MUST change the default admin password immediately and enable Multi-Factor Authentication (MFA) via `/security`.

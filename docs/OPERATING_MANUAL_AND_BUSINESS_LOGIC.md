# Nexus HMS Enterprise — System Operations & Business Logic Manual

**Document Version:** 2.0.0 (Phase 7 Enterprise Edition)  
**Target System:** Nexus Hotel Management System (HMS)  
**Database:** PostgreSQL 18 (`hotel_management` @ `localhost:5432`)  
**Backend:** NestJS 10 (`http://localhost:8080`)  
**Frontend:** Next.js 15 / React 19 (`http://localhost:3000`)  
**Last Updated:** October 2026  

---

## 1. System Architecture & Operating Topology

Nexus HMS is structured as a high-performance **pnpm monorepo workspace** following a decoupled, API-first architecture:

```text
                     ┌────────────────────────────────────────┐
                     │          Browser / Mobile Client       │
                     └───────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼ (Port 3000)                                   ▼ (Port 8080 / WS)
┌───────────────────────────────────┐               ┌───────────────────────────────────┐
│ Next.js 15 Web Application        │               │ NestJS 10 API Server              │
│ (artifacts/hotel-management)      │               │ (artifacts/api-server)            │
│ ───────────────────────────────── │               │ ───────────────────────────────── │
│ • App Router & Radix UI / Tailwind│  REST Rewrite │ • 55 Feature Modules & RBAC       │
│ • TanStack React Query            ├──────────────►│ • JWT Auth + Passport             │
│ • Fayda National ID Integration   │  /api/:path*  │ • Socket.IO Realtime Gateway      │
│ • Responsive Guest Portal         │               │ • Swagger Docs (/api/docs)        │
└───────────────────────────────────┘               └─────────────────┬─────────────────┘
                                                                      │
                                                                      ▼
                                                    ┌───────────────────────────────────┐
                                                    │ PostgreSQL 18 Database            │
                                                    │ (lib/db - Drizzle ORM)            │
                                                    │ ───────────────────────────────── │
                                                    │ • 85 Relational Tables            │
                                                    │ • Strong Foreign Key Constraints  │
                                                    │ • Drizzle Schema & Type Safety    │
                                                    └───────────────────────────────────┘
```

### 1.1 Reverse Proxy & Gateway Communication
- **Frontend URL:** `http://localhost:3000`
- **Backend API URL:** `http://localhost:8080`
- **API Documentation (Swagger):** `http://localhost:8080/api/docs`
- **Reverse Proxy Rule (`next.config.ts`):** All browser requests sent to `/api/:path*` are rewritten internally by Next.js to `${API_INTERNAL_URL}/api/:path*` (defaulting to `http://localhost:8080`). This eliminates cross-origin resource sharing (CORS) complications for browser clients while keeping auth cookies and tokens seamless.
- **WebSocket Gateway (`/socket.io`):** Live synchronization for room status changes, kitchen order status, housekeeping dispatches, and emergency alerts.

---

## 2. Core Business Logic & State Machines

### 2.1 Room State Machine & Inventory Lifecycle

Every room in the property is managed as an atomic inventory unit governed by the following state machine:

```mermaid
stateDiagram-v2
    [*] --> Available: Master Setup / Cleaning Passed
    Available --> Reserved: Reservation Created / Assigned
    Available --> Occupied: Immediate Walk-in Check-in
    Reserved --> Occupied: Guest Arrival / Check-in
    Reserved --> Available: Hold Expired / Reservation Cancelled
    Occupied --> Cleaning_Inspection: Guest Check-out / Transfer-Out
    Cleaning_Inspection --> Available: Housekeeper Done & Supervisor Approved
    Available --> Maintenance: Issue Logged / Work Order Created
    Maintenance --> Cleaning_Inspection: Repair Completed
    Occupied --> Occupied: Mid-Stay Transfer (New Room Occupied)
    Cleaning_Inspection --> Maintenance: Damage Detected during Inspection
```

#### Room State Rules:
1. **Available (`available`):** Room is clean, inspected, vacant, and bookable.
2. **Reserved (`reserved`):** Locked to a confirmed future reservation. Cannot be double-booked or assigned to walk-ins.
3. **Occupied (`occupied`):** Currently checked-in with an active guest stay. In-room amenities, dining, and room services can be charged to this room number.
4. **Needs Cleaning / Inspection (`dirty` / `inspecting`):** Triggered immediately upon check-out or room transfer. Cannot return to `available` until a housekeeper marks it clean and a supervisor marks it inspected.
5. **Maintenance / Out of Order (`maintenance` / `out_of_service`):** Excluded from online booking calendars and front-desk walk-in allocation.

---

### 2.2 Reservation & Front Office Engine

#### A. Booking Channels & Types
- **Individual / Direct:** Standard front-desk reservations.
- **Walk-In:** Guests arriving at the front desk without prior reservation; allocates room immediately and transitions to check-in.
- **Corporate & Group:** Tied to company master accounts with corporate discount rates and consolidated billing.
- **Online / Guest Portal:** Self-service reservations initiated from the public web portal.

#### B. Rate Calculation & Dynamic Pricing Logic
Total reservation room cost is calculated dynamically:
$$\text{Total Room Charge} = \sum_{d = \text{checkIn}}^{\text{checkOut}} \left( \text{Base Price} \times \text{Seasonal Multiplier} \times \text{Weekend Adjustment} \right) - \text{Discount} + \text{Taxes}$$
- **Base Rate:** Configured per Room Type (Standard, Deluxe, Executive Suite, Presidential).
- **Taxes:** 15% VAT plus applicable municipal hotel tourism levies.
- **Deposit Policy:** Requires a mandatory upfront deposit (configured per room type or flat amount) held against incidental damages and in-stay consumption.

---

### 2.3 Identity Verification & Ethiopian Fayda National ID Integration

The check-in module features a specialized integration with Ethiopia's **Fayda National ID system** (`fayda-decoder`):
1. **Digital Fayda QR Scan:** The front desk scanner reads the guest's Fayda QR code.
2. **Offline Demographic Decryption:** Parses the binary/encrypted payload into:
   - Full Name (Amharic & Latin transcriptions)
   - Fayda FAN (Identification number)
   - Date of Birth & Gender
   - Registered City / Sub-City / Woreda
3. **Automatic Profile Matching:** The system matches the FAN against existing guest records. If found, loyalty status and historical stay preferences are attached; if new, a verified profile is automatically created.

---

### 2.4 In-Stay Operations & Mid-Stay Room Transfers

Once a guest is checked in, their stay is actively tracked in **Stay Management** (`/stay`):

#### A. Room Transfers (Upgrade, Downgrade, Lateral)
Guests can transfer rooms during an ongoing stay under strict operational controls:
1. **Target Room Validation:** Target room must be strictly `available` and clean.
2. **Automated State Handshake:**
   - Previous Room $\rightarrow$ Automatically flipped to `dirty` / `needs_cleaning`. A housekeeping priority ticket is automatically generated.
   - New Room $\rightarrow$ Flipped to `occupied`.
   - Key Card Bridge $\rightarrow$ Old key card revoked; new key card assigned.
3. **Folio Rate Adjustment:**
   - For an **Upgrade**, the system prorates the rate differential from the transfer date to check-out.
   - For a **Downgrade**, the lower rate takes effect starting that evening.

#### B. Unified Guest Folio Postings
Any service consumed on property is posted directly to the guest's room folio:
- **Restaurant & Bar (POS):** Food and beverage charges dispatched via waiter terminals or Room Service.
- **Transport / Airport Shuttle:** Chauffeur and fuel charges dispatched via Transport Management.
- **Laundry & Amenities:** Turnaround laundry and extra bed/bedding charges.

---

### 2.5 Check-Out, Late Check-Out Fee Engine & Folio Settlement

The departure process in `/check-out` executes an automated 4-stage audit:

```text
[Step 1: Room Inspection]  ──►  [Step 2: Late Fee Calculation]  ──►  [Step 3: Deposit Reconciliation]  ──►  [Step 4: Payment & Invoice]
Minibar + Damage Checklist      Automated 12:00 PM rule              Deposit minus Folio Charges           Cash / Card / Telebirr
```

#### A. Smart Late Check-Out Fee Calculator
Standard hotel check-out deadline is **12:00 PM local time**. The system evaluates departure time:
- **Before 12:00 PM:** On-time checkout. Late fee = \$0.
- **12:00 PM – 12:30 PM (30 min Grace Period):** Courtesy window. Late fee = \$0.
- **12:31 PM – 15:00 PM (Half-Day Tier):** Applies a 50% single-day room charge.
- **After 15:00 PM (Full-Day Tier):** Applies a 100% full daily room charge.

#### B. Deposit Reconciliation & Refund
$$\text{Final Balance Due} = \text{Room Charges} + \text{In-Stay Incidentals} + \text{Minibar / Damages} + \text{Late Fee} - \text{Deposit Paid}$$
- If $\text{Deposit Paid} > \text{Total Charges}$: The difference is refunded to the guest (cash back or card/Telebirr reversal).
- If $\text{Total Charges} > \text{Deposit Paid}$: The guest settles the outstanding balance via Cash, Credit Card, Telebirr, or CBE Birr.

#### C. Invoice Dispatch & Audit Closure
Once settled:
1. The room is marked `dirty` for housekeeping.
2. A formal digital invoice is generated, archived in `/invoices`, and emailed/printed with official tax registration numbers.
3. The guest record logs loyalty points and total stay spend.

---

### 2.6 Back-of-House Operating Modules

#### 1. Housekeeping (`/housekeeping`)
- Room status synchronization between front office and room attendants.
- Inspection checklist sign-off (bedding, bathroom, minibar, electronics, hygiene).
- Staff shift rosters and cleaning time tracking.

#### 2. Maintenance (`/maintenance`)
- Work orders categorized by electrical, plumbing, HVAC, carpentry, or electronics.
- Rooms with critical issues are automatically isolated as `out_of_service` on the front-desk grid until technician sign-off.

#### 3. Restaurant & POS (`/restaurant`, `/pos`, `/room-service`)
- Table management layout, digital waiter ordering, and Kitchen Display System (KDS).
- Split billing, table-to-room charges, and takeaway sales.

#### 4. Inventory & Procurement (`/inventory`, `/procurement`)
- Real-time stock levels across departments (F&B, Housekeeping, Maintenance).
- Reorder threshold alerts, Purchase Orders (PO), and Goods Receipt Notes (GRN).

#### 5. Fleet & Transport (`/transport`)
- Airport pick-up and drop-off dispatching.
- Vehicle fleet logs, driver schedules, and trip status tracking.

#### 6. Accounting & Cash Shifts (`/financial`)
- Cashier shift open/close with drawer balance verification.
- Accounts Receivable (AR), Accounts Payable (AP), and general ledger postings.

---

## 3. Security, RBAC & Multi-Tenancy

### 3.1 Predefined Roles Matrix
The platform defines 16 operational roles with granular permissions:

| Role | Core Access & Responsibilities |
| :--- | :--- |
| **System Administrator** | Full platform control, tenants, subscriptions, plugins, audit logs |
| **Hotel Manager** | Branch oversight, financial approvals, operational KPI dashboards |
| **Front Desk Receptionist** | Reservations, guest registration, check-in, key cards, room transfers |
| **Cashier** | Folio settlement, payments, refunds, cash shift balancing |
| **Housekeeping Supervisor** | Cleaning task assignments, room inspection sign-offs |
| **Housekeeping Staff** | Room cleaning status updates, linen requests |
| **Maintenance Engineer** | Work orders, asset repair, facility maintenance |
| **Restaurant Manager** | F&B menu catalog, table layout, daily POS sales |
| **Restaurant Waiter** | Order taking, kitchen dispatching, table checks |
| **Chef / Kitchen Staff** | Kitchen Display System (KDS), preparation status |
| **Storekeeper** | Stock inventory in/out, goods receipts, warehouse items |
| **Accountant** | General ledger, tax reports, accounts receivable/payable |
| **Guest (Portal)** | Self-service room browsing, dining orders, stay folio view |

### 3.2 Security Protections
- **JWT Authentication:** Strict token verification with automated session expiration guards.
- **Audit Logging:** Every critical mutation (rates change, price override, room status override, refund, deletion) generates an immutable timestamped log record in `/audit-logs`.
- **Tenant Isolation:** Multi-property tenant boundaries enforced at both API route and database query levels.

---

## 4. Run, Operate & Maintain

### 4.1 Environment Configuration (`.env`)
The system requires the following environment variables (configured in `C:\Users\Administrator\HMS\.env`):

```env
# Local PostgreSQL 18 connection
DATABASE_URL=postgresql://postgres:045422@localhost:5432/hotel_management

# API Configuration
PORT=8080
API_INTERNAL_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
SESSION_SECRET=nexus_hms_enterprise_secret_key_at_least_32_characters_long_12345
```

### 4.2 Essential Commands

```powershell
# Navigate to the codebase
cd C:\Users\Administrator\HMS

# 1. Apply Database Schema (Drizzle Kit Push)
pnpm --filter @workspace/db run push

# 2. Seed Sample Hospitality Data
node -r dotenv/config seed-core.js
node -r dotenv/config seed-phase4.js
node -r dotenv/config seed-phase5.js
node -r dotenv/config seed-phase6.js

# 3. Start Backend API Server (Port 8080)
pnpm --filter @workspace/api-server run dev

# 4. Start Frontend Web Application (Port 3000)
pnpm --filter @workspace/hotel-management run dev
```

### 4.3 Default Administrator Credentials
- **Portal URL:** `http://localhost:3000/login`
- **Email:** `admin@nexushms.com`
- **Password:** `Admin@1234`

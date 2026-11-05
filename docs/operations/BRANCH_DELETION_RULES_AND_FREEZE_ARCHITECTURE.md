# Hotel Branch Deletion Safeguards & Operational Freeze Architecture

This document defines the architectural safeguards, business rules, and the Administrative Decommissioning Freeze event implemented in Nexus HMS for safe branch removal.

---

## 1. Overview of Implemented Safeguards

Nexus HMS prevents accidental, premature, or catastrophic branch deletion through 5 sequential database-enforced validation layers:

| Layer | Safeguard Name | Enforcement Mechanism | Failure Response |
|---|---|---|---|
| **Layer 1** | **Sole Active Branch Guard** | Checks if the branch is the only active property in the hotel chain. | `HTTP 400`: *"Cannot delete branch '{name}': This is the sole active branch in the hotel chain. The property portfolio must maintain at least one operational branch."* |
| **Layer 2** | **Active Buildings Guard** | Queries `buildings` where `branch_id = :id AND is_active = true`. | `HTTP 400`: *"Cannot delete branch '{name}': X active building(s) exist in this branch. Remove or reassign buildings first."* |
| **Layer 3** | **Active & Upcoming Bookings Guard** | Queries `reservations` joined to branch rooms with status `confirmed`, `guaranteed`, or `checked_in`. | `HTTP 400`: *"Cannot delete branch '{name}': X active or upcoming reservation(s) exist for this branch. Please relocate, check out, or cancel these reservations first."* |
| **Layer 4** | **Stationed & Assigned Staff Guard** | Queries `users` where `primary_branch_id = :id` or joined via `user_branches`. | `HTTP 400`: *"Cannot delete branch '{name}': X active staff member(s) are assigned to this branch. Reassign staff members before deleting the branch."* |
| **Layer 5** | **Soft-Deletion & Tax Preservation** | Executes `UPDATE branches SET is_active = false, deleted_at = NOW()`. Hard SQL deletion (`DELETE FROM branches`) is blocked. | Preserves all historical folios, payments, and ERCA / MoR fiscal receipts for 10-year legal audit compliance. |

---

## 2. Administrative Decommissioning Freeze Architecture

To manage branch closures without race conditions (such as new reservations arriving while staff are actively relocating in-house guests), Nexus HMS provides an **Administrative Decommissioning Freeze** event.

```
Super Admin / GM triggers Freeze Event
                  │
                  ▼
   [Branch Settings: isFrozen = true]
                  │
  ┌───────────────┴───────────────┐
  ▼                               ▼
Inbound Traffic BLOCKED       Operations Restricted to Read-Only
• POST /reservations -> 400   • Check-ins prohibited
• Public Web Engine -> Closed • Room transfers permitted
• OTA Feeds -> Paused         • Folio settlement & checkout only
```

### 2.1 Triggering the Freeze Event
Management triggers the freeze via the dedicated API endpoint:
```http
POST /api/branches/:id/freeze
Content-Type: application/json

{
  "reason": "Terminal property closure & lease surrender"
}
```

The system stamps the branch record:
```json
{
  "settings": {
    "isFrozen": true,
    "frozenAt": "2026-11-04T14:30:00.000Z",
    "freezeReason": "Terminal property closure & lease surrender"
  }
}
```

### 2.2 Operational Restrictions While Frozen
1. **New Bookings Blocked (`POST /api/reservations`):**
   Any attempt to create a reservation for rooms within the frozen branch is rejected with HTTP 400:
   `"Cannot create reservation: Branch '{name}' is under an Administrative Decommissioning Freeze. New reservations are locked."`
2. **Check-Ins Blocked (`POST /api/front-office/checkin`):**
   Attempting to check in a guest into a room under the frozen branch is rejected with HTTP 400:
   `"Cannot complete check-in: Branch '{name}' is under an Administrative Decommissioning Freeze. Only check-outs and folio settlements are permitted."`
3. **Front Desk in Settlement-Only Mode:**
   Front desk agents can only perform read actions, guest check-outs, payment collection, and mid-stay room transfers to active sister branches.
4. **Reversibility (`POST /api/branches/:id/unfreeze`):**
   If a planned closure is cancelled or postponed, administrators can lift the freeze immediately, returning all modules to full operational status.

---

## 3. End-to-End Safe Decommissioning Workflow

```
[Phase 1: Freeze] ──> [Phase 2: Relocate & Settle] ──> [Phase 3: Reassign Staff] ──> [Phase 4: Shutdown Wings] ──> [Phase 5: Soft Delete]
```

1. **Phase 1: Freeze Property (`POST /branches/:id/freeze`)**
   - Halts all inbound booking traffic and walk-ins.
2. **Phase 2: Relocate In-House Guests & Settle Folios**
   - Transfer remaining guests to sister properties or complete standard check-outs.
   - Settle all outstanding open invoices and tax receipts.
3. **Phase 3: Reassign Staff Members (`PATCH /users/:id`)**
   - In [`users/page.tsx`](file:///C:/Users/Administrator/HMS/artifacts/hotel-management/src/app/(dashboard)/users/page.tsx), reassign each staff member's `primaryBranchId` and stationed `buildingId` to an operational branch.
4. **Phase 4: Deactivate Physical Inventory**
   - Deactivate all floors and buildings under the branch.
5. **Phase 5: Execute Branch Deletion (`DELETE /branches/:id`)**
   - With zero active buildings, zero staff, and zero active bookings, the soft deletion succeeds cleanly.

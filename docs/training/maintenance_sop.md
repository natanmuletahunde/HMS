# Nexus HMS - Engineering & Maintenance 6-Stage Workflow SOP

**Document Reference:** `NEXUS-SOP-MNT-001`  
**System Module:** Maintenance / Work Orders / Asset Management  
**Target Roles:** Maintenance Technician, Chief Engineer, Operations Manager  

---

## 1. Scope & Objective
This SOP enforces the 6-stage engineering ticket pipeline defined in Section 3.10 of the SRS, guaranteeing systematic logging, parts tracking, safety verification, and room status synchronization.

---

## 2. The 6-Stage Maintenance Lifecycle

```
+---------------+     +------------+     +--------------+     +---------------+     +---------------+     +--------------+
| 1. Reported   | --> | 2. Logged  | --> | 3. Assigned  | --> | 4. In Progress| --> | 5. Completed  | --> | 6. Verified  |
+---------------+     +------------+     +--------------+     +---------------+     +---------------+     +--------------+
```

### Stage 1: Reported
* Issue reported by Guest, Housekeeping during room turnaround, or Front Desk staff.
* Initial ticket created with Room Number, Priority (`Low`, `Medium`, `High`, `Emergency`), and Category (`Plumbing`, `Electrical`, `HVAC`, `Carpentry`, `Civil`).

### Stage 2: Logged
* Maintenance dispatcher or Chief Engineer reviews the report.
* Verifies warranty status, equipment asset tags, and assigns internal tracking code.

### Stage 3: Assigned
* Ticket dispatched to a specific ON-DUTY technician (e.g. Lead Electrician).
* Technician receives SMS alert or mobile system notification.

### Stage 4: In Progress
1. Technician arrives at location and clicks **"Start Work"**.
2. If the issue requires taking the room out of service, the room status is updated to **`Maintenance / Out of Order`** to prevent commercial reservations.
3. Spare parts requested from storeroom (Inventory deducted).

### Stage 5: Completed
1. Work finished (e.g., AC thermostat replaced, plumbing seal renewed).
2. Technician enters labor hours, spare parts consumed, resolution notes, and clicks **"Mark Completed"**.

### Stage 6: Verified & Released
1. Chief Engineer or Floor Supervisor inspects the repair.
2. Clicks **"Verify & Close"**:
   * Ticket is archived in historical audit records.
   * Room is released back to **`Cleaning / Ready`** status.

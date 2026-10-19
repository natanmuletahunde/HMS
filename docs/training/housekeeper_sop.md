# Nexus HMS - Housekeeping & Room Inspection Standard Operating Procedures (SOP)

**Document Reference:** `NEXUS-SOP-HSK-001`  
**System Module:** Housekeeping / Room Management / Inspections  
**Target Roles:** Housekeeping Staff, Floor Supervisor, Executive Housekeeper  

---

## 1. Scope & Objective
This SOP defines the 4-stage room cleaning cycle and inspection pipeline ensuring rooms are refreshed, sanitary, inspected, and released back into commercial inventory safely.

---

## 2. The 4-Stage Room Cleaning Lifecycle

```
[ Checked Out ]
       |
       v
+--------------+        +---------------+        +-------------+        +-------------+
| 1. Dirty     | -----> | 2. In Progress| -----> | 3. Clean    | -----> | 4. Ready    |
| (Automatic)  |        | (Staff Claim) |        | (Completed) |        | (Inspected) |
+--------------+        +---------------+        +-------------+        +-------------+
```

### Stage 1: Automatic `Dirty` Status Assignment
* When Front Desk checks out a guest, the room automatically updates to **`Dirty / Cleaning`**.
* The room appears in the Housekeeping task board under **Pending Turnaround**.

### Stage 2: Task Assignment & `In Progress`
1. Log in to Nexus HMS on the floor mobile tablet or desktop terminal.
2. Navigate to `/housekeeping`.
3. Locate assigned room and tap **"Start Cleaning"**:
   * Room transitions to **`In Progress`**.
   * Housekeeping staff's ON-DUTY status is verified.

### Stage 3: Cleaning Execution & `Clean` Mark
1. Perform standard cleaning checklist:
   * Linens stripped, laundered, and replaced.
   * Restroom sanitized, towels replaced, amenities replenished.
   * Mini-bar inventory verified.
   * Vacuuming and surface dusting.
2. Tap **"Mark as Clean"**:
   * Room transitions to **`Clean`**.
   * Automatic notification is dispatched to Floor Supervisor for inspection.

### Stage 4: Supervisor Inspection & `Ready` Release
1. Floor Supervisor navigates to `/housekeeping/inspections`.
2. Inspect room quality against 12-point hotel hygiene standards.
3. If defects or damages are found:
   * Log an Engineering Maintenance ticket directly from the room record.
4. If passed:
   * Click **"Approve & Release Room"**.
   * The room status transitions to **`Ready / Available`**, instantly returning to commercial booking inventory.

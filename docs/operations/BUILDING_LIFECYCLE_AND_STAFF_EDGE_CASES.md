# Property Hierarchy, Building Deactivation & Staff Edge Cases

This document defines the business logic, dependency rules, and edge-case behaviors for physical property structures (branches, buildings, floors, rooms) and their relationship with staff user accounts in Nexus HMS.

---

## 1. Architectural Model & Scope Separation

Nexus HMS enforces a strict separation between physical facilities and operational personnel:

```
Hotel Chain (Tenant / HQ)
  └── Hotel Branch (e.g., Bole, City Center)
        ├── Staff User Accounts (Assigned via primary_branch_id & user_branches)
        └── Buildings (Physical wings / towers)
              └── Floors (Levels 1..N)
                    └── Rooms (Sellable inventory)
```

- **Staff are scoped to Branches**: Staff members belong to a hotel branch, not to an individual physical building.
- **Buildings contain Inventory**: Buildings group floors and rooms. Buildings never own staff accounts.

---

## 2. Building Lifecycle & Edge-Case Rules

### 2.1 Edge Case 1: Deactivation with In-House Guests (Occupied Rooms)

- **Scenario**: A property manager attempts to deactivate or soft-delete a building (e.g., Tower B) while guests are currently checked into rooms within that building.
- **Trigger**: `PATCH /api/buildings/:id` with `{ isActive: false }` or `DELETE /api/buildings/:id`.
- **System Defense**:
  - The system queries `rooms` where `building_id = :id AND is_active = true AND status = 'occupied'`.
  - If `count > 0`, the operation is aborted with HTTP 400 Bad Request:
    ```json
    {
      "statusCode": 400,
      "message": "Cannot deactivate building 'Tower B': 3 room(s) are currently occupied by guests. Please check out or relocate guests first."
    }
    ```
- **Staff Remediation**: Staff must either process formal check-outs or execute mid-stay room transfers to rooms in an active building before taking the facility offline.

### 2.2 Edge Case 2: Deactivation with Active Back-of-House Tickets

- **Scenario**: A building has pending housekeeping cleaning assignments or uncompleted maintenance tickets.
- **Behavior**:
  - **Hard Deletion (`DELETE /buildings/:id`)**: Blocked if active housekeeping (`pending`, `assigned`, `accepted`, `in_progress`) or maintenance (`pending`, `approved`, `assigned`, `in_progress`) work orders are tied to rooms in that building.
  - **Soft Deactivation (`PATCH /buildings/:id` `{ isActive: false }`)**: Permitted once guests are vacated. Work orders remain preserved in audit logs and historical reports, but the rooms immediately exit operational dispatching.

### 2.3 Edge Case 3: Automated Downstream Cascading (Building -> Floors -> Rooms)

- **Scenario**: When a building is taken offline for seasonal shutdown, full renovation, or structural maintenance.
- **Cascading Logic**:
  - Setting `buildings.is_active = false` automatically executes:
    ```sql
    UPDATE floors SET is_active = false WHERE building_id = :buildingId;
    UPDATE rooms SET is_active = false WHERE building_id = :buildingId;
    ```
  - Setting `buildings.is_active = true` (reactivation) automatically restores:
    ```sql
    UPDATE floors SET is_active = true WHERE building_id = :buildingId;
    UPDATE rooms SET is_active = true WHERE building_id = :buildingId;
    ```
- **Inventory Isolation**:
  - `GET /api/rooms` and `GET /api/rooms/available` enforce `buildings.is_active = true`.
  - Rooms belonging to inactive buildings are instantly hidden from:
    - Front desk room rack and check-in selectors.
    - Online guest portal and booking engine availability.
    - POS and room service delivery destination selectors.

### 2.4 Edge Case 4: Creation Safeguards in Inactive Buildings

- **Scenario**: An API client or staff member submits a request to add a new room or floor to an inactive building.
- **Enforcement**:
  - `POST /api/rooms` checks `buildings.is_active`. If inactive, returns HTTP 400:
    ```json
    {
      "statusCode": 400,
      "message": "Cannot add rooms to inactive building 'Tower B'."
    }
    ```
  - `POST /api/floors` checks `buildings.is_active`. If inactive, returns HTTP 400:
    ```json
    {
      "statusCode": 400,
      "message": "Cannot add floors to inactive building 'Tower B'."
    }
    ```

### 2.5 Edge Case 5: Branch Staff Decoupling (Sole Building Deletion)

- **Scenario**: A hotel branch has only one building (e.g. "Main Wing"), and staff are employed at that branch.
- **Previous Failure Mode**: A legacy check blocked deleting or clearing the building because staff members existed in that branch, creating an unresolvable deadlock.
- **Enforced Rule**: Because staff belong to the branch entity, removing or deactivating an empty building (zero active rooms) does not affect staff login credentials, on-duty states, or branch scopes.

---

## 3. Staff Reassignment & Branch Synchronization Edge Cases

### 3.1 Edge Case 6: Parameter Key Polymorphism (`branchId` vs `primaryBranchId` vs `branchIds`)

- **Scenario**: Front-end forms, REST clients, and third-party integrations submit branch changes under different parameter names.
- **Handling Matrix**:
  | Payload Property | Type | Action Taken |
  | :--- | :--- | :--- |
  | `branchId` | `string` | Sets `primary_branch_id` and replaces `user_branches` with `[{ branchId, isPrimary: true }]`. |
  | `primaryBranchId` | `string` | Sets `primary_branch_id` and ensures `user_branches` contains this branch with `isPrimary: true`. |
  | `branchIds` | `string[]` | Replaces `user_branches` with all IDs, setting `isPrimary: true` for the designated primary branch. |
  | Combined | Any | Primary branch is resolved, included in the junction table, and persisted to `users.primary_branch_id`. |

### 3.2 Edge Case 7: Junction Table Desynchronization Protection

- **Scenario**: A user is updated with a new primary branch that did not exist in their previous multi-branch list.
- **Enforced Logic**:
  - The service clears old assignments from `user_branches` and inserts the updated set atomically.
  - `GET /api/users` and `GET /api/users/:id` read from `user_branches` inner joined with `branches`. Because the junction table is updated synchronously with `users.primary_branch_id`, staff directories and navigation topbars reflect the new branch immediately.

### 3.3 Edge Case 8: Branch Deletion Dependency Verification

- **Scenario**: An administrator attempts to delete a branch property (`DELETE /api/branches/:id`).
- **Dependencies Enforced**:
  1. **Active Buildings**: Blocked if active buildings exist (`Cannot delete branch: X active building(s) exist`).
  2. **Active Staff (Distinct Count)**:
     ```sql
     SELECT count(distinct u.id)::int
     FROM users u
     LEFT JOIN user_branches ub ON u.id = ub.user_id
     WHERE u.is_active = true AND (u.primary_branch_id = :id OR ub.branch_id = :id);
     ```
     Double counting is prevented. Staff must be reassigned to another branch before the branch can be deleted.

---

## 4. Operational Checklist for Property Managers

1. **Before Deactivating a Building**:
   - Verify room occupancy on the Front Office Dashboard.
   - Relocate any remaining guests to another building.
   - Complete or reassign any active maintenance tickets.
2. **Deactivating**:
   - In **Settings > Buildings**, locate the building and click **Deactivate Building** (or toggle Operational Status in the Edit dialog).
   - Verify the status badge switches to `Inactive`.
3. **Reactivating**:
   - In **Settings > Buildings**, set the filter to `All Statuses` or `Inactive Only`.
   - Click **Activate Building**. All floors and rooms are restored to active status immediately.

# Nexus HMS Enterprise — End-to-End Manual Testing & Exploration Master Plan

This master plan guides you through testing **every module and feature** of Nexus HMS manually from start to finish. It uses a realistic scenario: **"The VIP Corporate Delegation Experience at Nexus Grand Hotel"**.

Follow the steps in chronological order to observe how data connects across modules—from configuration to front desk, operations, billing, and executive analytics.

---

## Access & Initial Credentials

- **Web Application URL:** [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation:** [http://localhost:8080/api/docs](http://localhost:8080/api/docs)
- **Initial Login Credentials:**
  - **Email:** `admin@nexushms.com`
  - **Password:** `Admin@1234`

---

## Phase 1: Security, Roles & User Administration

### 1.1 Sign In & Session Verification
1. Navigate to: `http://localhost:3000/login`
2. Enter:
   - **Email:** `admin@nexushms.com`
   - **Password:** `Admin@1234`
3. Click **Sign In**.
4. **Expected Result:** You are redirected to `/dashboard` with your user profile showing in the top navigation bar.

### 1.2 Create a New Custom Role
1. Navigate to: `/roles`
2. Click **Add New Role** (or **Create Role**).
3. Fill in:
   - **Role Name:** `VIP Services Supervisor`
   - **Description:** `Handles VIP guest relations, custom dining, and transport logistics`
   - **Permissions:** Check permissions for `guests`, `reservations`, `restaurant`, `transport`, `customer-service`
4. Click **Save / Create**.
5. **Expected Result:** The role appears in the active roles table.

### 1.3 Create a Dedicated Operations Staff User
1. Navigate to: `/users`
2. Click **Create User**.
3. Fill in:
   - **First Name:** `Bethlehem`
   - **Last Name:** `Assefa`
   - **Email:** `bethlehem.services@nexusgrand.com`
   - **Phone:** `+251-911-223344`
   - **Password:** `HotelAdmin@2026`
   - **Role:** Select `VIP Services Supervisor`
   - **Status:** `Active`
4. Click **Create User**.
5. **Expected Result:** The new user is listed with their assigned role and active status.

---

## Phase 2: Hotel Hierarchy, Room Catalog & Dynamic Pricing

### 2.1 Verify / Update Hotel Profile
1. Navigate to: `/hotel`
2. Click **Edit Profile** on **Nexus Grand Hotel**.
3. Update or verify:
   - **Hotel Name:** `Nexus Grand Hotel & Suites`
   - **Star Rating:** `5`
   - **Check-In Time:** `14:00`
   - **Check-Out Time:** `12:00`
   - **Currency Code:** `ETB`
4. Click **Save Changes**.

### 2.2 Add a New Building Wing
1. Navigate to: `/buildings`
2. Click **Add Building**.
3. Fill in:
   - **Branch:** `Nexus Main Branch – Bole`
   - **Building Name:** `Axum Royal Pavilions`
   - **Building Code:** `BLD-AXUM`
   - **Number of Floors:** `4`
   - **Description:** `Dedicated presidential and diplomat luxury villas`
4. Click **Save**.

### 2.3 Add Floors to the New Building
1. Navigate to: `/floors`
2. Click **Add Floor**.
3. Fill in:
   - **Building:** `Axum Royal Pavilions`
   - **Floor Number:** `1`
   - **Floor Name:** `Ground Pavilion Level`
4. Click **Save**.
5. Repeat for Floor `2` named `Diplomatic Suite Level`.

### 2.4 Create a Specialized Room Category & Bed Type
1. Navigate to: `/room-categories`
   - Click **Add Category**:
     - **Name:** `Presidential Penthouse`
     - **Description:** `Top-tier VIP suites with private dining and panoramic views`
     - **Sort Order:** `1`
2. Navigate to: `/bed-types`
   - Click **Add Bed Type**:
     - **Name:** `Emperor California King`
     - **Capacity:** `2 Adults, 1 Child`

### 2.5 Add Custom Room Amenities
1. Navigate to: `/room-amenities`
2. Click **Add Amenity**:
   - **Name:** `Private Jacuzzi & Sauna`
   - **Icon:** `bath`
   - **Category:** `bathroom`
3. Click **Add Amenity**:
   - **Name:** `Butler Service Call Button`
   - **Icon:** `bell`
   - **Category:** `service`

### 2.6 Configure Room Type & Pricing Rules
1. Navigate to: `/room-types`
2. Click **Create Room Type**:
   - **Name:** `Imperial Diplomatic Suite`
   - **Base Price:** `18500.00`
   - **Max Occupancy:** `3`
   - **Max Adults:** `2`
   - **Max Children:** `1`
   - **Description:** `Exclusive penthouse suite with private terrace and butler pantry`
3. Navigate to: `/room-pricing`
4. Click **Add Pricing Rule**:
   - **Room Type:** `Imperial Diplomatic Suite`
   - **Rule Name:** `Weekend VIP Premium`
   - **Multiplier / Rate:** `1.15` (or flat rate `21275.00`)
   - **Effective Dates:** From current date to +30 days

### 2.7 Create the Suite Room
1. Navigate to: `/rooms`
2. Click **Add Room**:
   - **Room Number:** `AX-201`
   - **Room Name:** `The Sheba Diplomatic Suite`
   - **Room Code:** `RM-AX201`
   - **Building:** `Axum Royal Pavilions`
   - **Floor:** `Diplomatic Suite Level`
   - **Room Type:** `Imperial Diplomatic Suite`
   - **Status:** `Available`
   - **Price:** `18500.00`
3. Click **Save**.
4. Navigate to: `/availability` and verify `AX-201` shows in green as available across the calendar.

---

## Phase 3: Operations Setup (HR, Inventory, Procurement & Cash Shifts)

### 3.1 Department & Shift Setup
1. Navigate to: `/hr`
2. Under **Departments**, click **Add Department**:
   - **Name:** `VIP Relations & Protocol`
   - **Description:** `High-profile guest assistance and embassy liaison`
3. Under **Shifts**, click **Add Shift**:
   - **Shift Name:** `Morning Executive Shift`
   - **Start Time:** `07:00`
   - **End Time:** `15:30`

### 3.2 Add Employee & Clock-In
1. Navigate to: `/employees`
2. Click **Add Employee**:
   - **First Name:** `Kassahun`
   - **Last Name:** `Worku`
   - **Department:** `VIP Relations & Protocol`
   - **Position:** `Senior Protocol Officer`
   - **Email:** `kassahun.worku@nexusgrand.com`
   - **Phone:** `+251-922-334455`
   - **Salary:** `28000`
   - **Hire Date:** Today's date
3. Navigate to: `/hr` -> **Attendance**:
   - Click **Clock-In**: Select `Kassahun Worku` and submit today's time.

### 3.3 Inventory & Stock Intake
1. Navigate to: `/inventory`
2. Under **Categories**, click **Add Category**:
   - **Name:** `VIP Amenities & Delicacies`
3. Click **Add Item**:
   - **Item Name:** `Artisanal Ethiopian Honey Wine (Tej Vintage)`
   - **Category:** `VIP Amenities & Delicacies`
   - **Unit:** `Bottle`
   - **Cost Price:** `450.00`
   - **Selling Price:** `1200.00`
   - **Minimum Stock:** `10`
   - **Current Quantity:** `50`
4. Navigate to: `/procurement`
5. Click **Add Supplier**:
   - **Company Name:** `Highland Organic Vines & Roasters`
   - **Contact Name:** `Dawit Kebede`
   - **Email:** `orders@highlandorganic.et`
   - **Phone:** `+251-11-663-8899`

### 3.4 Open a Cash Register Shift
1. Navigate to: `/financial`
2. Look for **Cash Registers** / **Cash Shifts**:
3. Click **Open Shift**:
   - **Register:** `Main Front Desk Register #1`
   - **Opening Cash Float:** `10000.00 ETB`
   - **Notes:** `Morning front desk float verified`
4. Click **Confirm Open**.
5. **Expected Result:** Shift status changes to **Open**.

---

## Phase 4: Guest Intake, Reservation & Front Office

### 4.1 Create a VIP Guest Profile
1. Navigate to: `/guests`
2. Click **Add Guest**:
   - **First Name:** `Ambassador Jonathan`
   - **Last Name:** `Sterling`
   - **Email:** `j.sterling@diplomatic-corp.org`
   - **Phone:** `+44-7700-900123`
   - **ID Type:** `Passport`
   - **ID / Passport Number:** `GB98451203`
   - **Nationality:** `United Kingdom`
   - **VIP Level / Notes:** `VIP Level 1 - Delegation Head. Prefers mountain view and quiet floor.`
3. Click **Save Guest**.
4. **Expected Result:** Guest profile is created and visible in the directory.

### 4.2 Book a Reservation
1. Navigate to: `/reservations`
2. Click **Create Reservation**:
   - **Guest:** Select `Ambassador Jonathan Sterling`
   - **Room Type:** `Imperial Diplomatic Suite`
   - **Assigned Room:** `AX-201`
   - **Check-In Date:** Today's date
   - **Check-Out Date:** 3 days from now
   - **Number of Adults:** `2`
   - **Number of Children:** `0`
   - **Special Requests:** `Complimentary airport VIP transfer, late check-out requested`
   - **Initial Status:** `Confirmed`
3. Click **Create Reservation**.
4. **Expected Result:** Reservation is created with a unique booking confirmation number (e.g., `RES-...`).

### 4.3 Check-In Guest & Issue Keys
1. Navigate to: `/check-in` (or from `/front-office` -> Today's Arrivals):
2. Find the reservation for `Ambassador Jonathan Sterling`.
3. Click **Check-In**:
   - **Verify Room:** `AX-201`
   - **Key Card Number:** `KEY-AX201-A`
   - **Deposit / Card Pre-Auth:** `20000.00 ETB`
   - **Notes:** `Passport scanned and welcome pack provided`
4. Click **Complete Check-In**.
5. **Expected Result:**
   - Reservation status transitions to **In-House / Checked-In**.
   - Room `AX-201` status updates to **Occupied**.
   - Shows on `/front-office` In-House Guest Board.

---

## Phase 5: In-Stay Services (Dining, POS, Conference & Transport)

### 5.1 Place a Room Service Order
1. Navigate to: `/room-service`
2. Click **New Order**:
   - **Room:** `AX-201`
   - **Select Items:**
     - 2x `Traditional Ethiopian Breakfast Platter`
     - 2x `Single-Origin Yirgacheffe Coffee Pot`
   - **Delivery Time:** `Immediate`
   - **Special Instructions:** `Deliver to terrace table with warm milk`
3. Click **Submit Order**.
4. Update the order status from `Pending` -> `Preparing` -> `Delivered`.

### 5.2 Restaurant Table POS Dining
1. Navigate to: `/pos` (or `/restaurant`)
2. Under **Restaurant Orders / POS**:
   - Select **Table 12 (Garden Patio)**
   - Add Menu Items:
     - 2x `Prime Ribeye Steak`
     - 1x `Tej Vintage Honey Wine`
   - Click **Charge to Room**:
     - Room: `AX-201 (Ambassador Sterling)`
     - Amount: `3850.00 ETB`
3. Click **Post to Folio**.
4. **Expected Result:** The charge is added directly to Room AX-201's open folio.

### 5.3 Reserve a Conference Hall
1. Navigate to: `/conference`
2. Under **Conference Halls**, select:
   - **Hall:** `Africa Hall Ballroom`
3. Click **New Booking**:
   - **Event Title:** `Bilateral Trade Cooperation Summit`
   - **Host / Client:** `Ambassador Jonathan Sterling`
   - **Date & Time:** Tomorrow, `09:00 - 13:00`
   - **Attendees:** `25`
   - **Equipment Requested:** `4K Laser Projector, Wireless Microphones, Simultaneous Translation Booth`
   - **Total Quoted:** `45000.00 ETB`
4. Click **Confirm Booking**.

### 5.4 Dispatch VIP Airport Transport
1. Navigate to: `/transport`
2. Click **Schedule Trip**:
   - **Guest:** `Ambassador Jonathan Sterling`
   - **Vehicle:** Select an active executive vehicle (e.g., `Mercedes S-Class` or `Toyota Land Cruiser V8`)
   - **Driver:** Select an assigned driver
   - **Pickup Location:** `Nexus Grand Hotel – Main Lobby`
   - **Drop-off Destination:** `Addis Ababa Bole International Airport VIP Terminal`
   - **Scheduled Time:** Day of check-out, `10:30 AM`
3. Click **Create Trip**.
4. **Expected Result:** Trip scheduled and linked to the guest.

---

## Phase 6: Hotel Operations (Housekeeping & Maintenance)

### 6.1 Create & Inspect a Housekeeping Task
1. Navigate to: `/housekeeping`
2. Click **Assign Task**:
   - **Room:** `AX-201`
   - **Task Type:** `Daily Turndown & Restock`
   - **Priority:** `High`
   - **Assignee:** Select a housekeeping attendant
3. Change status to `In Progress`, then to `Completed`.
4. Click **Log Inspection**:
   - **Score:** `100% - Pristine`
   - **Inspector:** `Bethlehem Assefa`

### 6.2 Log & Resolve a Maintenance Request
1. Navigate to: `/maintenance`
2. Click **New Request**:
   - **Room / Location:** `AX-201`
   - **Category:** `Climate Control / HVAC`
   - **Issue Title:** `Terrace Patio Heater Pilot Light Inspection`
   - **Priority:** `Medium`
   - **Reported By:** `Front Desk`
3. Open the created ticket:
   - Assign technician
   - Update status to `Resolved` with resolution notes: `Gas line primed and pilot tested OK`.

### 6.3 Customer Service & Guest Feedback
1. Navigate to: `/customer-service`
2. Click **Log Interaction / Feedback**:
   - **Guest:** `Ambassador Jonathan Sterling`
   - **Type:** `Compliment / Commendation`
   - **Subject:** `Exceptional butler service and airport reception`
   - **Satisfaction Rating:** `5 / 5 Stars`
3. Click **Save**.

---

## Phase 7: Document Management & Unified Search

### 7.1 Attach Guest Identity Document
1. Navigate to: `/documents`
2. Click **Upload Document**:
   - **Reference Type:** `Guest`
   - **Reference ID:** Select `Ambassador Jonathan Sterling`
   - **Document Type:** `Passport Copy`
   - **Title:** `Passport_Sterling_J_GB.pdf`
3. Submit and verify the file appears in the document repository.

### 7.2 Test Unified Global Search
1. Navigate to: `/search` (or click the search bar in the top navigation)
2. Type: `Sterling`
3. **Expected Result:** Search instantly returns matching records across categories:
   - **Guest Profile:** `Ambassador Jonathan Sterling`
   - **Reservation:** Active reservation for `AX-201`
   - **Conference Booking:** `Bilateral Trade Cooperation Summit`
   - **Document:** `Passport_Sterling_J_GB.pdf`

---

## Phase 8: Invoices, Settlement, Check-Out & Shift Closing

### 8.1 Review In-House Guest Folio
1. Navigate to: `/stay` (or `/invoices`)
2. Select Room `AX-201` / Guest `Jonathan Sterling`.
3. Verify all charges are consolidated:
   - Room accommodation (3 nights)
   - Room service dining
   - Restaurant table charge
   - Conference hall booking
4. Click **Generate Master Invoice**.

### 8.2 Process Payment Settlement
1. Navigate to: `/payments`
2. Click **Record Payment**:
   - **Invoice:** Select the generated folio invoice for `Jonathan Sterling`
   - **Payment Method:** `Credit Card (Visa / Amex)`
   - **Transaction Ref:** `AUTH-VIP-998822`
   - **Amount Paid:** Full balance
3. Click **Process Payment**.
4. **Expected Result:** Invoice status transitions from `Unpaid / Open` to `Paid in Full`.

### 8.3 Complete Check-Out
1. Navigate to: `/check-out`
2. Select `Ambassador Jonathan Sterling` (Room `AX-201`).
3. Verify:
   - Outstanding balance: `0.00 ETB`
   - Keys returned: `KEY-AX201-A` checked
4. Click **Confirm Check-Out**.
5. **Expected Result:**
   - Reservation status updates to **Checked-Out**.
   - Room `AX-201` updates to **Dirty / Cleaning Needed**.
   - Automatic housekeeping cleaning order is scheduled.

### 8.4 Close Cash Shift & Financial Reconciliation
1. Navigate to: `/financial`
2. Under **Cash Shifts**, select the open shift on `Main Front Desk Register #1`.
3. Click **Close Shift**:
   - **Closing Cash Count:** Enter verified amount
   - **Summary Notes:** `All folio settlements balanced and reconciled`
4. Click **Finalize Close**.

---

## Phase 9: Executive Reports, Business Intelligence & Platform Settings

### 9.1 Review Executive Reports
1. Navigate to: `/reports`
2. Explore each sub-report:
   - **Occupancy Report:** Check room occupancy rate calculation
   - **Revenue Report:** Review ADR (Average Daily Rate) and RevPAR (Revenue Per Available Room)
   - **Departmental P&L:** Track F&B, Conference, and Rooms revenue breakdown

### 9.2 Inspect Business Intelligence (BI) Analytics
1. Navigate to: `/bi`
2. Review:
   - KPI metrics cards (Total Revenue, Active Occupancy, Guest Satisfaction Index)
   - 30-day occupancy forecasting graph
   - Revenue drill-down charts by room category

### 9.3 SaaS Platform Modules & Workflows
1. Navigate to: `/module-config`:
   - Toggle module availability (e.g. Transport or Conference) to see dynamic menu configuration.
2. Navigate to: `/workflows`:
   - Inspect active automated triggers (e.g., `On Check-In -> Send Welcome SMS`, `On Check-Out -> Create Housekeeping Task`).
3. Navigate to: `/audit-logs`:
   - Verify every manual action you performed (user created, reservation booked, payment received) was recorded with timestamp, user ID, and IP address.

---

## Quick Reference Testing Checklist

| Module | Key Testing Actions | Expected Outcome |
| :--- | :--- | :--- |
| **Auth & Security** | Login, Role creation, Staff user creation | Token issued, permissions strictly enforced |
| **Hotel Core** | Building, Floor, Room Category, Bed Type, Room Type, Room | Room shows in `/availability` grid |
| **HR & Payroll** | Department, Shift, Employee, Clock-in | Real-time attendance updated |
| **Inventory** | Item creation, Stock intake, Supplier | Quantity available for POS and Room Service |
| **Reservations** | Guest profile, Date selection, Room assignment | Instant booking confirmation number |
| **Front Office** | Check-in, Key assignment, In-house board | Room status switches to Occupied |
| **F&B & POS** | Room service order, Table POS order | Direct billing to room folio |
| **Events & Transport** | Conference hall booking, Airport vehicle dispatch | Scheduled on calendar and transport roster |
| **Housekeeping** | Turndown task, Room cleaning, Inspection | Room status updates to Clean / Ready |
| **Maintenance** | HVAC ticket, Priority, Technician assignment | Full lifecycle from Reported to Resolved |
| **Billing & Payments** | Folio generation, Card/Cash settlement | Invoice marked Paid, 0.00 balance |
| **Check-Out** | Key return, Room release | Room becomes Dirty, guest checked out |
| **Reports & BI** | ADR, RevPAR, Forecasting, Audit trails | Real-time graphs and audit log entries |

---

*This concludes the complete end-to-end testing journey for Nexus HMS.*

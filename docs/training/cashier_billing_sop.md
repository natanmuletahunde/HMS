# Nexus HMS - Cashier, POS & Billing Standard Operating Procedures (SOP)

**Document Reference:** `NEXUS-SOP-CSH-001`  
**System Module:** POS / Restaurant / Room Service / Invoices / Payments  
**Target Roles:** Cashier, Restaurant Waiter, Front Desk Cashier, F&B Supervisor  

---

## 1. Scope & Objective
This SOP defines protocols for opening/closing cashier shifts, processing in-room dining orders with automated stay folio charge posting, handling multi-modal payments (Cash, Card, Telebirr, CBE Birr), and generating official VAT invoices.

---

## 2. Shift Management (Opening & Closing)

1. Navigate to `/financial` -> **Cash Registers**.
2. To Open Shift:
   * Select your terminal register.
   * Enter starting cash float (e.g. `ETB 2,000`).
   * Click **Open Shift**.
3. To Close Shift:
   * Count cash, review credit card terminal totals, and mobile money transactions.
   * Enter physical cash count and reconcile against system expected totals.
   * Click **Close Shift** to print the Z-Report and shift reconciliation summary.

---

## 3. In-Room Dining & Restaurant POS Workflow

```
+------------------+     +--------------------+     +---------------------+
| 1. Select Items  | --> | 2. Choose Payment  | --> | 3. Automated Charge |
|   from Menu      |     |   or Charge Folio  |     |    Posting to Room  |
+------------------+     +--------------------+     +---------------------+
```

### Direct Folio Charge Posting:
1. Navigate to `/pos` or `/room-service`.
2. Add customer items (e.g., Tibs, Kitfo, Club Sandwich, Beverage) to the active cart.
3. In the checkout drawer, choose **"Charge to Guest Room"**:
   * Search active guest stay by **Room Number** or **Guest Name**.
   * System verifies that the room is currently in **`Occupied`** status and the guest has credit allowance.
4. Click **"Post Order & Charge Room"**:
   * The culinary order is dispatched to the kitchen display screen (KDS) or printer.
   * The order line items are **automatically posted to the guest's open stay invoice** in real time.
   * Zero manual front-desk reentry required!

---

## 4. Multi-Modal Payment Processing

* **Cash**: Log physical amount, system calculates change due.
* **Credit / Debit Card**: Process through POS terminal, enter auth code.
* **Telebirr / CBE Birr / Online**:
  1. Click **"Pay Online"** on the invoice or check-in screen.
  2. Direct guest to scan QR code or enter mobile money prompt.
  3. Webhook listener instantly receives transaction confirmation (`TX-XXXXX`), automatically marking the bill as **`Paid`**.

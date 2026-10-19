# Nexus HMS - Front Desk & Receptionist Standard Operating Procedures (SOP)

**Document Reference:** `NEXUS-SOP-REC-001`  
**System Module:** Front Office / Check-In / Guest Management / Reservations  
**Target Roles:** Receptionist, Front Desk Supervisor, Reservation Officer  

---

## 1. Scope & Objective
This Standard Operating Procedure (SOP) outlines the mandatory protocol for guest arrivals, identity verification with Ethiopian National ID (Fayida), digital signature capture, RFID keycard encoding, and express guest check-out.

---

## 2. Guest Arrival & Check-In Protocol

```
+------------------+     +--------------------+     +---------------------+     +--------------------+
| 1. Search Guest  | --> | 2. Verify Identity | --> | 3. Capture Digital  | --> | 4. Issue Encoded   |
|   or Reservation |     |   (Fayida / FIN)   |     |    Signature Canvas |     |    RFID Keycard    |
+------------------+     +--------------------+     +---------------------+     +--------------------+
```

### Step 1: Reservation Lookup
1. Navigate to `/check-in` or `/reservations`.
2. Locate the guest by booking reference, full name, or phone number (`+251-9XX-XXXXXX`).
3. If walk-in, navigate to `/reservations/new`, select the available room from the dynamic availability matrix, and confirm rates.

### Step 2: Ethiopian National ID (Fayida) Verification
1. Request guest identification. For domestic Ethiopian residents and foreign residents with Fayida, collect:
   * **Fayida Identification Number (FIN / FAN)**.
   * Verify spelling of First Name, Father's Name, and Grandfather's Name.
2. In the Guest Profile modal, enter or confirm the **Fayida ID** field.
3. Check the **Identity Verified** confirmation checkbox.

### Step 3: Registration & Digital Signature Capture
1. Present the on-screen digital registration card to the guest.
2. Direct the guest to the **Digital Signature Canvas**:
   * Guest signs with capacitive stylus, touch device, or front desk signature pad.
   * Receptionist clicks **Accept Signature**.
3. Collect the security deposit if applicable (Cash, Card, or Mobile Money) and log the deposit amount.

### Step 4: Electronic RFID Keycard Programming
1. Place a blank hotel RFID keycard onto the desktop USB/Serial encoder terminal.
2. In the Check-In dialog, click **"Encode RFID Keycard"**.
3. The system executes the **Mifare-Classic-1K** encoding routine:
   * Encodes Room Number, Stay Date Window, and Unique Card UID (`RFID-ROOM-TIMESTAMP`).
   * Saves the generated keycard track to the guest's stay record.
4. Hand the programmed keycard and welcome voucher to the guest.
5. The room status automatically transitions in real time to **`Occupied`** across all hotel screens.

---

## 3. Express Check-Out Protocol

1. Navigate to `/check-in` or `/stay-management`.
2. Select the room or guest departing today.
3. Click **"Check Out"**:
   * Review all open folio charges (Room rate, mini-bar, in-room dining, laundry).
   * Verify deposit return or apply deposit to outstanding folio balance.
   * Collect final payment via Cash, POS Terminal, or **"Pay Online"** link (Telebirr / CBE Birr / Chapa).
4. Click **Complete Check-Out**:
   * The reservation status updates to **`Checked Out`**.
   * The room status automatically transitions to **`Cleaning / Dirty`**, alerting Housekeeping in real time.
   * Send the guest a finalized VAT invoice PDF via email or SMS receipt.

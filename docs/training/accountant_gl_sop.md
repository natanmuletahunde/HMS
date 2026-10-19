# Nexus HMS - General Ledger, Chart of Accounts & Finance SOP

**Document Reference:** `NEXUS-SOP-ACC-001`  
**System Module:** Financial / General Ledger / Procurement / Invoicing  
**Target Roles:** Chief Accountant, Financial Controller, Auditor  

---

## 1. Scope & Objective
This SOP guides the accounting department through navigating the General Ledger (GL), Chart of Accounts (COA), Journal Voucher entries, automated procurement stock-in reconciliation, and Ethiopian VAT tax reporting.

---

## 2. Standard Chart of Accounts (COA) Structure

Nexus HMS comes pre-configured with standard Ethiopian Enterprise Hospitality Accounts:

| Account Code | Account Name | Type | Normal Balance | Description |
| :--- | :--- | :--- | :---: | :--- |
| **1010** | Operating Cash & Vault | Asset | Debit | Front desk floats, cashier vault funds |
| **1020** | CBE Birr / Commercial Bank | Asset | Debit | Main operating bank account |
| **1030** | Telebirr Merchant Clearing | Asset | Debit | Digital mobile money payment clearing |
| **1100** | Accounts Receivable (City Ledger) | Asset | Debit | Corporate corporate accounts & travel agencies |
| **1200** | F&B Inventory Asset | Asset | Debit | Storeroom goods, beverages, dry foods |
| **2010** | Accounts Payable (Suppliers) | Liability | Credit | Unsettled purchase orders & vendor payables |
| **2050** | VAT Payable (15%) | Liability | Credit | Output VAT collected on sales |
| **4010** | Room Accommodation Revenue | Revenue | Credit | Room night billing revenue |
| **4020** | Restaurant & Bar Revenue | Revenue | Credit | Culinary & beverage POS sales |
| **5010** | Cost of Goods Sold (F&B) | Expense | Debit | Kitchen and bar inventory consumption |
| **5020** | Guest Amenities & Laundry | Expense | Debit | Guest supplies, cleaning chemicals |

---

## 3. Automated Dual-Entry Posting Workflows

1. **Room Night & Stay Billing**:
   * Debit: `1100 Accounts Receivable / Guest Folio`
   * Credit: `4010 Room Revenue` + `2050 VAT Payable (15%)`
2. **Guest Settlement (Telebirr / Card / Cash)**:
   * Debit: `1010 Cash` or `1020 Bank` or `1030 Telebirr Clearing`
   * Credit: `1100 Accounts Receivable / Guest Folio`
3. **Procurement PO Receipt (Auto Stock-In)**:
   * When Storekeeper marks Purchase Order as **`Received`**:
   * Debit: `1200 F&B Inventory Asset` (quantity auto-incremented in Storeroom)
   * Credit: `2010 Accounts Payable / Vendor`
   * Zero manual journal entry needed!

---

## 4. End-of-Day / Month-End Financial Audit

1. Navigate to `/financial` -> **General Ledger**.
2. Run the **Trial Balance** report to verify `Total Debits == Total Credits`.
3. Check the **Revenue Summary** tab to review Departmental RevPAR, ADR, and Occupancy percentages.
4. Export the monthly **VAT & Tax Schedule** (15% VAT breakdown) for ERCA tax filing.

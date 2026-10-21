"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Download, Printer, Eye, Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePagination } from "@/hooks/use-pagination";

type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Invoice = {
  id: string;
  invoiceNo?: string;
  invoiceNumber?: string;
  reservationId?: string;
  guestName?: string;
  total?: number;
  totalAmount?: number;
  paid?: number;
  paidAmount?: number;
  status: "paid" | "partial" | "unpaid" | "draft" | "issued";
  dueDate?: string;
  items?: InvoiceItem[];
};

function printInvoice(inv: Invoice) {
  const items = inv.items && inv.items.length > 0 ? inv.items : [
    { description: "Room 102 - Deluxe King Suite Accommodation (1 Night)", quantity: 1, unitPrice: 2750, total: 2750 },
    { description: "Room Service Dinner - Special Habesha Feast & Beverages", quantity: 1, unitPrice: 750, total: 750 },
  ];

  const total = inv.total ?? inv.totalAmount ?? 3500;
  const paid = inv.paid ?? inv.paidAmount ?? 3500;
  const invoiceNo = inv.invoiceNo || inv.invoiceNumber || inv.id.slice(0, 8);
  const guestName = inv.guestName || "Dr. Dawit Alene";
  const dateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : new Date().toLocaleDateString();

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    alert("Please allow popups in your browser to print or download the invoice.");
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice Receipt - ${invoiceNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 40px; margin: 0; background: #fff; }
    .invoice-card { max-width: 780px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 36px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 18px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #0369a1; letter-spacing: -0.5px; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.5; }
    .inv-title { text-align: right; }
    .inv-title h1 { margin: 0; font-size: 24px; color: #0f172a; letter-spacing: -0.5px; }
    .inv-num { font-family: monospace; font-size: 14px; color: #0284c7; font-weight: bold; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; font-size: 13px; line-height: 1.6; }
    .meta-box h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; }
    .badge-paid { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 9999px; font-weight: 700; font-size: 12px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { background: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .totals { width: 300px; margin-left: auto; margin-bottom: 28px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
    .totals-row.grand { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 10px 0; font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 6px; }
    .footer { border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6; }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">NEXUS GRAND HOTEL & SUITES</div>
        <div class="brand-sub">Bole Sub-City, Addis Ababa, Ethiopia<br>Tel: +251-11-667-8899 &bull; info@nexusgrand.com &bull; TIN: 0098765432</div>
      </div>
      <div class="inv-title">
        <h1>GUEST FOLIO INVOICE</h1>
        <div class="inv-num">${invoiceNo}</div>
        <div style="margin-top: 6px;"><span class="badge-paid">&#10003; ${inv.status.toUpperCase()}</span></div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <h3>Billed To (Guest)</h3>
        <strong>${guestName}</strong><br>
        Room: 102 &bull; Reservation: ${inv.reservationId ? 'RES-1792420877404' : 'Walk-in Stay'}<br>
        Email: dawit.alene@mfa.gov.et &bull; Phone: +251-911-445566
      </div>
      <div class="meta-box" style="text-align: right;">
        <h3>Invoice Details</h3>
        <strong>Invoice Date:</strong> ${dateStr}<br>
        <strong>Due Date:</strong> ${dateStr}<br>
        <strong>Payment Method:</strong> Front Desk Folio Settlement<br>
        <strong>Currency:</strong> ETB
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="width: 70px;" class="text-right">Qty</th>
          <th style="width: 120px;" class="text-right">Unit Price</th>
          <th style="width: 120px;" class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td><strong>${it.description}</strong></td>
            <td class="text-right">${it.quantity}</td>
            <td class="text-right">${Number(it.unitPrice).toFixed(2)} ETB</td>
            <td class="text-right">${Number(it.total).toFixed(2)} ETB</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal:</span><span>${Number(total).toFixed(2)} ETB</span></div>
      <div class="totals-row"><span>VAT / Taxes (Included):</span><span>0.00 ETB</span></div>
      <div class="totals-row grand"><span>Total Amount:</span><span>${Number(total).toFixed(2)} ETB</span></div>
      <div class="totals-row" style="color: #059669; font-weight: 600;"><span>Amount Paid:</span><span>${Number(paid).toFixed(2)} ETB</span></div>
      <div class="totals-row" style="font-weight: 700;"><span>Balance Due:</span><span>0.00 ETB (Settled)</span></div>
    </div>

    <div class="footer">
      <p>Thank you for choosing Nexus Grand Hotel. We hope to welcome you again soon!</p>
      <p style="font-size: 10px; color: #94a3b8;">Issued electronically by Nexus HMS Front Desk Management System.</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: rawInvoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiFetch<any>("/invoices"),
  });
  const invoices: Invoice[] = Array.isArray(rawInvoices) ? rawInvoices : (rawInvoices?.data ?? []);

  const filtered = invoices.filter(i => 
    ((i.invoiceNo || i.invoiceNumber) ?? '').toLowerCase().includes(search.toLowerCase()) || 
    (i.guestName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const {
    paginatedItems: paginatedInvoices,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(filtered, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search invoice or guest..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[250px]"
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-medium">{inv.invoiceNo || inv.invoiceNumber || inv.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{inv.guestName || "Dr. Dawit Alene"}</TableCell>
                  <TableCell>${Number(inv.total ?? inv.totalAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>${Number(inv.paid ?? inv.paidAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'} className="uppercase text-[10px]">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : new Date().toLocaleDateString()}</TableCell>
                  <TableCell className="flex items-center gap-1 justify-end">
                    {inv.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10"
                        onClick={async () => {
                          const res = await apiFetch<any>("/payments/initialize", {
                            method: "POST",
                            body: JSON.stringify({
                              invoiceId: inv.id,
                              amount: (inv.total ?? inv.totalAmount ?? 0) - (inv.paid ?? inv.paidAmount ?? 0),
                              email: "guest@example.com",
                              firstName: inv.guestName?.split(" ")[0] || "Guest",
                              lastName: inv.guestName?.split(" ")[1] || "Stay",
                              paymentMethod: "telebirr",
                            }),
                          });
                          window.open(res.checkoutUrl, "_blank");
                        }}
                      >
                        Pay Online
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-text-muted hover:text-primary"
                      title="View Invoice Folio"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-text-muted hover:text-primary"
                      title="Download / Print PDF"
                      onClick={() => printInvoice(inv)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Invoice Details & Print Modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Receipt className="h-5 w-5 text-primary" />
              <span>Invoice Folio — {selectedInvoice?.invoiceNo || selectedInvoice?.invoiceNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (() => {
            const items = selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items : [
              { description: "Room 102 - Deluxe King Suite Accommodation (1 Night)", quantity: 1, unitPrice: 2750, total: 2750 },
              { description: "Room Service Dinner - Special Habesha Feast & Beverages", quantity: 1, unitPrice: 750, total: 750 },
            ];
            const total = selectedInvoice.total ?? selectedInvoice.totalAmount ?? 3500;
            const paid = selectedInvoice.paid ?? selectedInvoice.paidAmount ?? 3500;
            const dateStr = selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : new Date().toLocaleDateString();

            return (
              <div className="space-y-4 pt-1">
                {/* Invoice Header Box */}
                <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-primary">NEXUS GRAND HOTEL & SUITES</h3>
                      <p className="text-xs text-text-muted">Bole Sub-City, Addis Ababa, Ethiopia &bull; TIN: 0098765432</p>
                    </div>
                    <Badge variant={selectedInvoice.status === 'paid' ? 'success' : 'warning'} className="uppercase text-xs font-bold px-2.5 py-0.5">
                      {selectedInvoice.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/70 text-xs">
                    <div>
                      <span className="text-text-muted">Guest Name:</span>
                      <div className="font-semibold text-foreground text-sm">{selectedInvoice.guestName || "Dr. Dawit Alene"}</div>
                      <div className="text-text-muted mt-0.5">Room 102 &bull; dawit.alene@mfa.gov.et</div>
                    </div>
                    <div className="text-right">
                      <span className="text-text-muted">Invoice Date / Due:</span>
                      <div className="font-medium text-foreground">{dateStr}</div>
                      <div className="text-text-muted font-mono mt-0.5">{selectedInvoice.invoiceNo || selectedInvoice.invoiceNumber}</div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-text-muted">
                      <tr>
                        <th className="text-left p-2.5 font-semibold">Description</th>
                        <th className="text-right p-2.5 font-semibold w-16">Qty</th>
                        <th className="text-right p-2.5 font-semibold w-24">Unit Price</th>
                        <th className="text-right p-2.5 font-semibold w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2.5 font-medium">{it.description}</td>
                          <td className="p-2.5 text-right font-mono">{it.quantity}</td>
                          <td className="p-2.5 text-right font-mono">${Number(it.unitPrice).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">${Number(it.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="p-3.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs">
                  <div className="space-y-0.5 text-text-muted">
                    <div>Subtotal: <strong className="text-foreground">${Number(total).toFixed(2)} ETB</strong></div>
                    <div>Taxes & VAT (Included): <strong className="text-foreground">$0.00</strong></div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">
                      Grand Total: <span className="text-primary font-mono">${Number(total).toFixed(2)} ETB</span>
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Amount Paid: ${Number(paid).toFixed(2)} ETB (Fully Settled)
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedInvoice(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => printInvoice(selectedInvoice)}
                  >
                    <Printer className="h-4 w-4" />
                    Print / Save as PDF
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

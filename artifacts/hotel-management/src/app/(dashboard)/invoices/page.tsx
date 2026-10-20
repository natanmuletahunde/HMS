"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination 
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";

type Invoice = {
  id: string;
  invoiceNo: string;
  guestName: string;
  total: number;
  paid: number;
  status: "paid" | "partial" | "unpaid";
  dueDate: string;
};

export default function InvoicesPage() {
  const [search, setSearch] = useState("");

  const { data: rawInvoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiFetch<any>("/invoices"),
  });
  const invoices: Invoice[] = Array.isArray(rawInvoices) ? rawInvoices : (rawInvoices?.data ?? []);

  const filtered = invoices.filter(i => 
    (i.invoiceNo ?? '').toLowerCase().includes(search.toLowerCase()) || 
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
                  <TableCell className="font-mono text-xs font-medium">{inv.invoiceNo}</TableCell>
                  <TableCell>{inv.guestName}</TableCell>
                  <TableCell>${Number(inv.total ?? 0).toFixed(2)}</TableCell>
                  <TableCell>${Number(inv.paid ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'} className="uppercase text-[10px]">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
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
                              amount: inv.total - inv.paid,
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
                    <Button variant="ghost" size="icon" className="h-7 w-7">
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
    </div>
  );
}

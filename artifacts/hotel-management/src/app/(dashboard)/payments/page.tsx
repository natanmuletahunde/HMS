"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination 
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";

type Payment = {
  id: string;
  invoiceNo: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
};

export default function PaymentsPage() {
  const [search, setSearch] = useState("");

  const { data: rawPayments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => apiFetch<any>("/payments"),
  });
  const rawList: any[] = Array.isArray(rawPayments)
    ? rawPayments
    : Array.isArray(rawPayments?.data)
      ? rawPayments.data
      : [];

  const payments: Payment[] = rawList.map((p) => ({
    id: p.id,
    invoiceNo: p.invoiceNo || p.invoiceNumber || p.invoiceId || "—",
    amount: Number(p.amount ?? 0),
    method: p.method || "card",
    reference: p.reference || "",
    date: p.date || p.createdAt || new Date().toISOString(),
  }));

  const filtered = payments.filter(
    (p) =>
      (p.invoiceNo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.method ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const {
    paginatedItems: paginatedPayments,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(filtered, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search invoice or reference..." 
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
              <TableHead>Date</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-text-muted">
                  No payments found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.date).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.invoiceNo}</TableCell>
                  <TableCell className="font-medium text-success">+${Number(payment.amount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {payment.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-muted">{payment.reference || "-"}</TableCell>
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

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type FinancialDashboard = {
  todayRevenue: number;
  todayExpenses: number;
  netIncome: number;
  totalTransactions: number;
  revenueByCategory?: Array<{ category: string; amount: number }>;
  recentTransactions?: Transaction[];
};

type Transaction = {
  id: string;
  transactionNumber?: string;
  transactionType: string;
  category?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  description?: string;
  transactionDate?: string;
  createdAt?: string;
  status?: string;
};

type CashRegister = {
  id: string;
  name: string;
  location?: string;
  status: string;
  currentBalance?: number;
  currency?: string;
  assignedTo?: string;
  currentShift?: { id: string; cashierId?: string; openingBalance?: number };
};

type CreditNote = {
  id: string;
  noteNumber?: string;
  type: string;
  amount: number;
  reason?: string;
  status: string;
  issuedBy?: string;
  createdAt?: string;
};

const TXN_TYPE_BADGE: Record<string, string> = {
  revenue: "success",
  expense: "danger",
  deposit: "info",
  refund: "warning",
  transfer: "secondary",
};

type TabType = "dashboard" | "transactions" | "registers" | "credit-notes" | "ledger";

export default function FinancialPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Transactions filters
  const [txnType, setTxnType] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isNewTxnOpen, setIsNewTxnOpen] = useState(false);

  // Register dialogs
  const [openShiftDialog, setOpenShiftDialog] = useState<CashRegister | null>(null);
  const [closeShiftDialog, setCloseShiftDialog] = useState<CashRegister | null>(null);
  const [isAddRegisterOpen, setIsAddRegisterOpen] = useState(false);

  // Credit notes
  const [isNewCNOpen, setIsNewCNOpen] = useState(false);

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useQuery<FinancialDashboard>({
    queryKey: ["financial-dashboard"],
    queryFn: () => apiFetch<FinancialDashboard>("/financial/dashboard"),
    enabled: tab === "dashboard",
  });

  const { data: ledgerAccounts = [], isLoading: ledgerLoading } = useQuery<
    Array<{ code: string; name: string; type: string; normalBalance: string; balance: number }>
  >({
    queryKey: ["general-ledger"],
    queryFn: () => apiFetch<any>("/financial/general-ledger"),
    enabled: tab === "ledger",
  });

  const TABS: { key: TabType; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "ledger", label: "General Ledger (COA)" },
    { key: "transactions", label: "Transactions" },
    { key: "registers", label: "Cash Registers" },
    { key: "credit-notes", label: "Credit Notes" },
  ];

  const txnParams = new URLSearchParams();
  if (txnType !== "all") txnParams.set("transactionType", txnType);
  if (paymentMethodFilter !== "all") txnParams.set("paymentMethod", paymentMethodFilter);
  if (startDate) txnParams.set("startDate", startDate);
  if (endDate) txnParams.set("endDate", endDate);

  const { data: transactions = [], isLoading: txnLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions", txnType, paymentMethodFilter, startDate, endDate],
    queryFn: () => apiFetch<Transaction[]>(`/financial/transactions?${txnParams}`),
    enabled: tab === "transactions",
  });

  const { data: registers = [], isLoading: registersLoading } = useQuery<CashRegister[]>({
    queryKey: ["cash-registers"],
    queryFn: () => apiFetch<CashRegister[]>("/financial/cash-registers"),
    enabled: tab === "registers",
  });

  const { data: creditNotes = [], isLoading: cnLoading } = useQuery<CreditNote[]>({
    queryKey: ["credit-notes"],
    queryFn: () => apiFetch<CreditNote[]>("/financial/credit-notes"),
    enabled: tab === "credit-notes",
  });

  function invalidate(keys: string[]) {
    keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  }

  const createTxnMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/financial/transactions", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["transactions", "financial-dashboard"]); setIsNewTxnOpen(false); toast({ title: "Transaction created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addRegisterMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/financial/cash-registers", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["cash-registers"]); setIsAddRegisterOpen(false); toast({ title: "Register added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openShiftMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/financial/cash-shifts/open", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["cash-registers"]); setOpenShiftDialog(null); toast({ title: "Shift opened" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeShiftMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/financial/cash-shifts/${id}/close`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["cash-registers"]); setCloseShiftDialog(null); toast({ title: "Shift closed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createCNMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/financial/credit-notes", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["credit-notes"]); setIsNewCNOpen(false); toast({ title: "Credit note created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Financial</h1>
        {tab === "transactions" && (
          <Button onClick={() => setIsNewTxnOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Transaction
          </Button>
        )}
        {tab === "registers" && (
          <Button onClick={() => setIsAddRegisterOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Register
          </Button>
        )}
        {tab === "credit-notes" && (
          <Button onClick={() => setIsNewCNOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Credit Note
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Today Revenue", value: dashboard?.todayRevenue != null ? `$${Number(dashboard.todayRevenue).toFixed(2)}` : undefined, color: "text-success" },
              { label: "Today Expenses", value: dashboard?.todayExpenses != null ? `$${Number(dashboard.todayExpenses).toFixed(2)}` : undefined, color: "text-danger" },
              { label: "Net Income", value: dashboard?.netIncome != null ? `$${Number(dashboard.netIncome).toFixed(2)}` : undefined, color: "text-primary" },
              { label: "Total Transactions", value: dashboard?.totalTransactions, color: "text-info" },
            ].map((s) => (
              <Card key={s.label} className="bg-surface/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          {dashboard?.revenueByCategory && dashboard.revenueByCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Revenue by Category</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.revenueByCategory.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell className="capitalize">{c.category}</TableCell>
                        <TableCell className="text-right font-medium">${Number(c.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>TXN #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentTransactions.slice(0, 10).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-xs">{txn.transactionNumber ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={(TXN_TYPE_BADGE[txn.transactionType] ?? "muted") as any} className="text-[10px] capitalize">
                            {txn.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{txn.category ?? "—"}</TableCell>
                        <TableCell className="text-right">${Number(txn.amount).toFixed(2)}</TableCell>
                        <TableCell className="capitalize text-xs">{txn.paymentMethod?.replace(/_/g, " ") ?? "—"}</TableCell>
                        <TableCell className="text-xs text-text-muted">
                          {(txn.transactionDate ?? txn.createdAt) ? new Date(txn.transactionDate ?? txn.createdAt!).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* GENERAL LEDGER TAB (TASK 2.4) */}
      {tab === "ledger" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Standard Hotel Chart of Accounts & General Ledger (SRS §3.13 / §4.6)</CardTitle>
              <p className="text-xs text-text-muted">
                Real-time posting verifying double-entry rules: Room Accommodation (4010), F&B (4020), Operating Cash (1010), and 15% Output VAT (2020).
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Normal Balance</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerLoading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : ledgerAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-text-muted">
                        No general ledger accounts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerAccounts.map((acc) => (
                      <TableRow key={acc.code} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-semibold text-primary">{acc.code}</TableCell>
                        <TableCell className="font-medium">{acc.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              acc.type === "Asset"
                                ? "info"
                                : acc.type === "Revenue"
                                ? "success"
                                : acc.type === "Expense"
                                ? "danger"
                                : "outline"
                            }
                            className="text-[10px] uppercase"
                          >
                            {acc.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-text-muted">{acc.normalBalance}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ${Number(acc.balance).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={txnType} onValueChange={setTxnType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="room_charge">Room Charge</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" placeholder="Start Date" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" placeholder="End Date" />
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TXN #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txnLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>{[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-text-muted">No transactions found.</TableCell></TableRow>
                ) : transactions.map((txn) => (
                  <TableRow key={txn.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{txn.transactionNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(TXN_TYPE_BADGE[txn.transactionType] ?? "muted") as any} className="text-[10px] capitalize">
                        {txn.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{txn.category ?? "—"}</TableCell>
                    <TableCell className="text-right">${Number(txn.amount).toFixed(2)}</TableCell>
                    <TableCell>{txn.currency ?? "USD"}</TableCell>
                    <TableCell className="capitalize text-xs">{txn.paymentMethod?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">{txn.referenceNumber ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {(txn.transactionDate ?? txn.createdAt) ? new Date(txn.transactionDate ?? txn.createdAt!).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(txn.status === "completed" ? "success" : txn.status === "pending" ? "warning" : "muted") as any} className="text-[10px] capitalize">
                        {txn.status ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* CASH REGISTERS TAB */}
      {tab === "registers" && (
        <div className="space-y-4">
          {registersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
            </div>
          ) : registers.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted">No registers found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registers.map((reg) => (
                <Card key={reg.id} className="bg-surface/50 border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{reg.name}</div>
                        {reg.location && <div className="text-xs text-text-muted">{reg.location}</div>}
                      </div>
                      <Badge variant={(reg.status === "open" ? "success" : "muted") as any} className="text-[10px] uppercase">
                        {reg.status}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {reg.currency ?? "$"}{Number(reg.currentBalance ?? 0).toFixed(2)}
                    </div>
                    {reg.assignedTo && <div className="text-xs text-text-muted">Assigned: {reg.assignedTo}</div>}
                    <div className="flex gap-2">
                      {reg.status === "closed" ? (
                        <Button size="sm" className="flex-1" onClick={() => setOpenShiftDialog(reg)}>Open Shift</Button>
                      ) : (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setCloseShiftDialog(reg)}>Close Shift</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREDIT NOTES TAB */}
      {tab === "credit-notes" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Note #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cnLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>{[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : creditNotes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-text-muted">No credit notes found.</TableCell></TableRow>
              ) : creditNotes.map((cn) => (
                <TableRow key={cn.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{cn.noteNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(cn.type === "credit" ? "success" : "danger") as any} className="text-[10px] uppercase">
                      {cn.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${Number(cn.amount).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{cn.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(cn.status === "active" ? "success" : cn.status === "voided" ? "danger" : "muted") as any} className="text-[10px] capitalize">
                      {cn.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{cn.issuedBy ?? "—"}</TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {cn.createdAt ? new Date(cn.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Transaction Dialog */}
      <Dialog open={isNewTxnOpen} onOpenChange={setIsNewTxnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.amount) body.amount = Number(body.amount);
            createTxnMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Transaction Type *</Label>
                <select name="transactionType" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                  <option value="deposit">Deposit</option>
                  <option value="refund">Refund</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Input name="category" placeholder="e.g. room_revenue" />
              </div>
              <div className="grid gap-1.5">
                <Label>Amount *</Label>
                <Input name="amount" type="number" step="0.01" min="0" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Payment Method</Label>
                <select name="paymentMethod" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="room_charge">Room Charge</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Transaction Date</Label>
                <Input name="transactionDate" type="date" />
              </div>
              <div className="grid gap-1.5">
                <Label>Reference #</Label>
                <Input name="referenceNumber" placeholder="Invoice, PO #, etc." />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Description</Label>
                <textarea name="description" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createTxnMutation.isPending}>
              {createTxnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Transaction
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Register Dialog */}
      <Dialog open={isAddRegisterOpen} onOpenChange={setIsAddRegisterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Cash Register</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            addRegisterMutation.mutate(body);
          }}>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name *</Label>
                <Input name="name" required placeholder="e.g. Front Desk Register" />
              </div>
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Input name="location" placeholder="e.g. Lobby" />
              </div>
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <Input name="currency" defaultValue="USD" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addRegisterMutation.isPending}>
              {addRegisterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Register
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Open Shift Dialog */}
      <Dialog open={!!openShiftDialog} onOpenChange={(o) => !o && setOpenShiftDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Open Shift — {openShiftDialog?.name}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = { registerId: openShiftDialog?.id };
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.openingBalance) body.openingBalance = Number(body.openingBalance);
            openShiftMutation.mutate(body);
          }}>
            <div className="grid gap-1.5">
              <Label>Cashier ID</Label>
              <Input name="cashierId" placeholder="Enter cashier ID" />
            </div>
            <div className="grid gap-1.5">
              <Label>Opening Balance *</Label>
              <Input name="openingBalance" type="number" step="0.01" min="0" required defaultValue="0" />
            </div>
            <Button type="submit" className="w-full" disabled={openShiftMutation.isPending}>
              {openShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open Shift
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={!!closeShiftDialog} onOpenChange={(o) => !o && setCloseShiftDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Close Shift — {closeShiftDialog?.name}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.closingBalance) body.closingBalance = Number(body.closingBalance);
            const shiftId = closeShiftDialog?.currentShift?.id ?? closeShiftDialog?.id ?? "";
            closeShiftMutation.mutate({ id: shiftId, body });
          }}>
            <div className="grid gap-1.5">
              <Label>Closing Balance *</Label>
              <Input name="closingBalance" type="number" step="0.01" min="0" required />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full" disabled={closeShiftMutation.isPending}>
              {closeShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Shift
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Credit Note Dialog */}
      <Dialog open={isNewCNOpen} onOpenChange={setIsNewCNOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Credit Note</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.amount) body.amount = Number(body.amount);
            createCNMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type *</Label>
                <select name="type" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Amount *</Label>
                <Input name="amount" type="number" step="0.01" min="0" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Guest ID (optional)</Label>
                <Input name="guestId" placeholder="Guest ID" />
              </div>
              <div className="grid gap-1.5">
                <Label>Issued By *</Label>
                <Input name="issuedBy" required />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Reason *</Label>
                <textarea name="reason" rows={2} required className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createCNMutation.isPending}>
              {createCNMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Credit Note
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

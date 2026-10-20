"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type Supplier = {
  id: string;
  supplierCode: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  rating?: number;
  status: string;
  paymentTerms?: string;
  address?: string;
  city?: string;
  country?: string;
};

type PurchaseRequest = {
  id: string;
  requestNumber: string;
  department?: string;
  requestedBy?: string;
  priority: string;
  status: string;
  totalEstimatedCost?: number;
  requiredDate?: string;
  createdAt?: string;
  items?: Array<{ itemName: string; unit: string; quantity: number; estimatedUnitCost: number }>;
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  supplierId?: string;
  supplierName?: string;
  itemsCount?: number;
  totalAmount?: number;
  status: string;
  orderDate?: string;
  expectedDelivery?: string;
  items?: Array<{ itemName: string; unit: string; quantity: number; unitCost: number }>;
};

type GoodsReceipt = {
  id: string;
  receiptNumber: string;
  orderId?: string;
  orderNumber?: string;
  supplierName?: string;
  receivedDate?: string;
  itemsCount?: number;
  status: string;
  items?: Array<{ itemName: string; quantityOrdered: number; quantityReceived: number; quantityAccepted: number }>;
};

const PR_STATUS_BADGE: Record<string, string> = {
  draft: "muted",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  ordered: "info",
};

const PO_STATUS_BADGE: Record<string, string> = {
  draft: "muted",
  confirmed: "info",
  sent: "info",
  received: "success",
  cancelled: "danger",
};

const GR_STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  completed: "success",
  partial: "info",
};

type TabType = "suppliers" | "requests" | "orders" | "receipts";

export default function ProcurementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("suppliers");

  // Suppliers
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("all");
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  // Purchase Requests
  const [prStatusTab, setPrStatusTab] = useState("all");
  const [isNewPROpen, setIsNewPROpen] = useState(false);
  const [prItems, setPrItems] = useState<Array<{ itemName: string; unit: string; quantity: number; estimatedUnitCost: number }>>([]);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; type: "pr" | "po" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Purchase Orders
  const [poStatusFilter, setPoStatusFilter] = useState("all");
  const [isNewPOOpen, setIsNewPOOpen] = useState(false);
  const [poItems, setPoItems] = useState<Array<{ itemName: string; unit: string; quantity: number; unitCost: number }>>([]);

  // Goods Receipts
  const [isNewGROpen, setIsNewGROpen] = useState(false);
  const [grItems, setGrItems] = useState<Array<{ itemName: string; quantityOrdered: number; quantityReceived: number; quantityAccepted: number }>>([]);

  // Queries
  const supplierParams = new URLSearchParams();
  if (supplierSearch) supplierParams.set("search", supplierSearch);
  if (supplierStatusFilter !== "all") supplierParams.set("status", supplierStatusFilter);

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", supplierSearch, supplierStatusFilter],
    queryFn: () => apiFetch<Supplier[]>(`/procurement/suppliers?${supplierParams}`),
    enabled: tab === "suppliers",
  });

  const prParams = new URLSearchParams();
  if (prStatusTab !== "all") prParams.set("status", prStatusTab);

  const { data: purchaseRequests = [], isLoading: prLoading } = useQuery<PurchaseRequest[]>({
    queryKey: ["purchase-requests", prStatusTab],
    queryFn: () => apiFetch<PurchaseRequest[]>(`/procurement/purchase-requests?${prParams}`),
    enabled: tab === "requests",
  });

  const poParams = new URLSearchParams();
  if (poStatusFilter !== "all") poParams.set("status", poStatusFilter);

  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders", poStatusFilter],
    queryFn: () => apiFetch<PurchaseOrder[]>(`/procurement/purchase-orders?${poParams}`),
    enabled: tab === "orders",
  });

  const { data: goodsReceipts = [], isLoading: grLoading } = useQuery<GoodsReceipt[]>({
    queryKey: ["goods-receipts"],
    queryFn: () => apiFetch<GoodsReceipt[]>("/procurement/goods-receipts"),
    enabled: tab === "receipts",
  });

  function invalidateSuppliers() { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); }
  function invalidatePR() { queryClient.invalidateQueries({ queryKey: ["purchase-requests"] }); }
  function invalidatePO() { queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }); }
  function invalidateGR() { queryClient.invalidateQueries({ queryKey: ["goods-receipts"] }); }

  const addSupplierMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/procurement/suppliers", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateSuppliers(); setIsAddSupplierOpen(false); toast({ title: "Supplier added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchPRMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/procurement/purchase-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidatePR(); toast({ title: "Request updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createPRMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/procurement/purchase-requests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidatePR(); setIsNewPROpen(false); setPrItems([]); toast({ title: "Purchase request created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createPOMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/procurement/purchase-orders", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidatePO(); setIsNewPOOpen(false); setPoItems([]); toast({ title: "Purchase order created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchPOMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/procurement/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidatePO(); toast({ title: "Order updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createGRMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/procurement/goods-receipts", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateGR(); setIsNewGROpen(false); setGrItems([]); toast({ title: "Goods receipt created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const suppliersPagination = usePagination(suppliers, 5);
  const requestsPagination = usePagination(purchaseRequests, 5);
  const ordersPagination = usePagination(purchaseOrders, 5);
  const receiptsPagination = usePagination(goodsReceipts, 5);

  const TABS: { key: TabType; label: string }[] = [
    { key: "suppliers", label: "Suppliers" },
    { key: "requests", label: "Purchase Requests" },
    { key: "orders", label: "Purchase Orders" },
    { key: "receipts", label: "Goods Receipt" },
  ];

  const PR_STATUS_TABS = ["all", "draft", "pending", "approved", "rejected", "ordered"];

  function addPRItem() {
    setPrItems(prev => [...prev, { itemName: "", unit: "", quantity: 1, estimatedUnitCost: 0 }]);
  }
  function updatePRItem(idx: number, field: string, val: string | number) {
    setPrItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }
  function removePRItem(idx: number) { setPrItems(prev => prev.filter((_, i) => i !== idx)); }

  function addPOItem() {
    setPoItems(prev => [...prev, { itemName: "", unit: "", quantity: 1, unitCost: 0 }]);
  }
  function updatePOItem(idx: number, field: string, val: string | number) {
    setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }
  function removePOItem(idx: number) { setPoItems(prev => prev.filter((_, i) => i !== idx)); }

  function addGRItem() {
    setGrItems(prev => [...prev, { itemName: "", quantityOrdered: 0, quantityReceived: 0, quantityAccepted: 0 }]);
  }
  function updateGRItem(idx: number, field: string, val: string | number) {
    setGrItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }
  function removeGRItem(idx: number) { setGrItems(prev => prev.filter((_, i) => i !== idx)); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Procurement</h1>
        {tab === "suppliers" && (
          <Button onClick={() => setIsAddSupplierOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        )}
        {tab === "requests" && (
          <Button onClick={() => { setIsNewPROpen(true); setPrItems([]); }}>
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        )}
        {tab === "orders" && (
          <Button onClick={() => { setIsNewPOOpen(true); setPoItems([]); }}>
            <Plus className="mr-2 h-4 w-4" /> New PO
          </Button>
        )}
        {tab === "receipts" && (
          <Button onClick={() => { setIsNewGROpen(true); setGrItems([]); }}>
            <Plus className="mr-2 h-4 w-4" /> New Receipt
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

      {/* SUPPLIERS TAB */}
      {tab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search suppliers..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              className="w-[200px]"
            />
            <Select value={supplierStatusFilter} onValueChange={setSupplierStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliersLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-text-muted">No suppliers found.</TableCell></TableRow>
                ) : suppliersPagination.paginatedItems.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{s.supplierCode}</TableCell>
                    <TableCell className="font-medium">{s.companyName}</TableCell>
                    <TableCell>{s.contactPerson ?? "—"}</TableCell>
                    <TableCell>{s.phone ?? "—"}</TableCell>
                    <TableCell>{s.email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`h-3 w-3 ${n <= (s.rating ?? 0) ? "text-warning fill-warning" : "text-text-muted"}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(s.status === "active" ? "success" : s.status === "blacklisted" ? "danger" : "muted") as any} className="text-[10px] uppercase">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => apiFetch(`/procurement/suppliers/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: s.status === "active" ? "inactive" : "active" }) }).then(() => invalidateSuppliers())}>
                            {s.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...suppliersPagination} pageSize={5} />
          </div>
        </div>
      )}

      {/* PURCHASE REQUESTS TAB */}
      {tab === "requests" && (
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto">
            {PR_STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setPrStatusTab(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                  prStatusTab === s ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted hover:bg-muted/70"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : purchaseRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-text-muted">No requests found.</TableCell></TableRow>
                ) : requestsPagination.paginatedItems.map((pr) => (
                  <TableRow key={pr.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{pr.requestNumber}</TableCell>
                    <TableCell>{pr.department ?? "—"}</TableCell>
                    <TableCell>{pr.requestedBy ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(pr.priority === "urgent" ? "danger" : pr.priority === "high" ? "warning" : "muted") as any} className="text-[10px] uppercase">
                        {pr.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${Number(pr.totalEstimatedCost ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={(PR_STATUS_BADGE[pr.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {pr.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {pr.status === "draft" && (
                            <DropdownMenuItem onClick={() => patchPRMutation.mutate({ id: pr.id, body: { status: "pending" } })}>Submit for Approval</DropdownMenuItem>
                          )}
                          {pr.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => patchPRMutation.mutate({ id: pr.id, body: { status: "approved" } })}>Approve</DropdownMenuItem>
                              <DropdownMenuItem className="text-danger" onClick={() => { setRejectDialog({ id: pr.id, type: "pr" }); setRejectReason(""); }}>Reject</DropdownMenuItem>
                            </>
                          )}
                          {pr.status === "approved" && (
                            <DropdownMenuItem onClick={() => patchPRMutation.mutate({ id: pr.id, body: { status: "ordered" } })}>Create PO</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...requestsPagination} pageSize={5} />
          </div>
        </div>
      )}

      {/* PURCHASE ORDERS TAB */}
      {tab === "orders" && (
        <div className="space-y-4">
          <Select value={poStatusFilter} onValueChange={setPoStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : purchaseOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-text-muted">No orders found.</TableCell></TableRow>
                ) : ordersPagination.paginatedItems.map((po) => (
                  <TableRow key={po.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{po.orderNumber}</TableCell>
                    <TableCell>{po.supplierName ?? "—"}</TableCell>
                    <TableCell className="text-right">{po.itemsCount ?? 0}</TableCell>
                    <TableCell className="text-right">${Number(po.totalAmount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={(PO_STATUS_BADGE[po.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {po.status === "draft" && (
                            <DropdownMenuItem onClick={() => patchPOMutation.mutate({ id: po.id, body: { status: "confirmed" } })}>Confirm</DropdownMenuItem>
                          )}
                          {(po.status === "confirmed" || po.status === "sent") && (
                            <DropdownMenuItem onClick={() => patchPOMutation.mutate({ id: po.id, body: { status: "received" } })}>Mark Received</DropdownMenuItem>
                          )}
                          {po.status !== "cancelled" && po.status !== "received" && (
                            <DropdownMenuItem className="text-danger" onClick={() => patchPOMutation.mutate({ id: po.id, body: { status: "cancelled" } })}>Cancel</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...ordersPagination} pageSize={5} />
          </div>
        </div>
      )}

      {/* GOODS RECEIPTS TAB */}
      {tab === "receipts" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>{[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : goodsReceipts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-text-muted">No receipts found.</TableCell></TableRow>
              ) : receiptsPagination.paginatedItems.map((gr) => (
                <TableRow key={gr.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{gr.receiptNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{gr.orderNumber ?? "—"}</TableCell>
                  <TableCell>{gr.supplierName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {gr.receivedDate ? new Date(gr.receivedDate).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">{gr.itemsCount ?? gr.items?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={(GR_STATUS_BADGE[gr.status] ?? "muted") as any} className="text-[10px] uppercase">
                      {gr.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination {...receiptsPagination} pageSize={5} />
        </div>
      )}

      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            addSupplierMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Company Name *</Label>
                <Input name="companyName" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Contact Person</Label>
                <Input name="contactPerson" />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input name="phone" />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div className="grid gap-1.5">
                <Label>Payment Terms</Label>
                <Input name="paymentTerms" placeholder="e.g. NET30" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Address</Label>
                <Input name="address" />
              </div>
              <div className="grid gap-1.5">
                <Label>City</Label>
                <Input name="city" />
              </div>
              <div className="grid gap-1.5">
                <Label>Country</Label>
                <Input name="country" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addSupplierMutation.isPending}>
              {addSupplierMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Supplier
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Purchase Request Dialog */}
      <Dialog open={isNewPROpen} onOpenChange={setIsNewPROpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            body.items = prItems;
            createPRMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Department *</Label>
                <Input name="department" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Requested By *</Label>
                <Input name="requestedBy" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <select name="priority" defaultValue="normal" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Required Date</Label>
                <Input name="requiredDate" type="date" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Notes</Label>
                <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPRItem}><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
              </div>
              {prItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                  <div>
                    <Input placeholder="Item name" value={item.itemName} onChange={(e) => updatePRItem(idx, "itemName", e.target.value)} />
                  </div>
                  <div>
                    <Input placeholder="Unit" value={item.unit} onChange={(e) => updatePRItem(idx, "unit", e.target.value)} />
                  </div>
                  <div>
                    <Input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={(e) => updatePRItem(idx, "quantity", Number(e.target.value))} />
                  </div>
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Unit Cost" step="0.01" value={item.estimatedUnitCost} onChange={(e) => updatePRItem(idx, "estimatedUnitCost", Number(e.target.value))} />
                    <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 text-danger" onClick={() => removePRItem(idx)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={createPRMutation.isPending}>
              {createPRMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Purchase Order Dialog */}
      <Dialog open={isNewPOOpen} onOpenChange={setIsNewPOOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            body.items = poItems;
            createPOMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Supplier *</Label>
                <select name="supplierId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Expected Delivery</Label>
                <Input name="expectedDelivery" type="date" />
              </div>
            </div>
            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPOItem}><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
              </div>
              {poItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                  <Input placeholder="Item name" value={item.itemName} onChange={(e) => updatePOItem(idx, "itemName", e.target.value)} />
                  <Input placeholder="Unit" value={item.unit} onChange={(e) => updatePOItem(idx, "unit", e.target.value)} />
                  <Input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={(e) => updatePOItem(idx, "quantity", Number(e.target.value))} />
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Unit Cost" step="0.01" value={item.unitCost} onChange={(e) => updatePOItem(idx, "unitCost", Number(e.target.value))} />
                    <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 text-danger" onClick={() => removePOItem(idx)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={createPOMutation.isPending}>
              {createPOMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create PO
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Goods Receipt Dialog */}
      <Dialog open={isNewGROpen} onOpenChange={setIsNewGROpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Goods Receipt</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            body.items = grItems;
            createGRMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Purchase Order</Label>
                <select name="orderId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select PO</option>
                  {purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.orderNumber}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Received Date *</Label>
                <Input name="receivedDate" type="date" required />
              </div>
            </div>
            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addGRItem}><Plus className="h-3 w-3 mr-1" /> Add Row</Button>
              </div>
              {grItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                  <Input placeholder="Item name" value={item.itemName} onChange={(e) => updateGRItem(idx, "itemName", e.target.value)} />
                  <Input type="number" placeholder="Ordered" min="0" value={item.quantityOrdered} onChange={(e) => updateGRItem(idx, "quantityOrdered", Number(e.target.value))} />
                  <Input type="number" placeholder="Received" min="0" value={item.quantityReceived} onChange={(e) => updateGRItem(idx, "quantityReceived", Number(e.target.value))} />
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Accepted" min="0" value={item.quantityAccepted} onChange={(e) => updateGRItem(idx, "quantityAccepted", Number(e.target.value))} />
                    <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 text-danger" onClick={() => removeGRItem(idx)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={createGRMutation.isPending}>
              {createGRMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Receipt
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => {
                if (!rejectDialog) return;
                patchPRMutation.mutate({ id: rejectDialog.id, body: { status: "rejected", rejectionReason: rejectReason } });
                setRejectDialog(null);
              }}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

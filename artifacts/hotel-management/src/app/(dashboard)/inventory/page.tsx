"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Loader2, MoreHorizontal, ArrowRightLeft, Warehouse, 
  Store, CheckCircle2, Clock, Send, ShieldCheck, 
  Boxes, Truck, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Filter, Search
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type InventoryDashboard = {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  categoryBreakdown?: Array<{ category: string; count: number; value: number }>;
};

type InventoryItem = {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  reorderLevel: number;
  purchasePrice: number;
  storageLocation?: string;
  status: string;
};

type InventoryLocation = {
  id: string;
  code: string;
  name: string;
  type: string;
  department?: string;
  description?: string;
};

type LocationStock = {
  id: string;
  locationId: string;
  itemId: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: "adequate" | "running_low" | "depleted";
  locationCode: string;
  locationName: string;
  locationType: string;
};

type StockMovement = {
  id: string;
  itemName?: string;
  movementType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  createdAt?: string;
  date?: string;
};

type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
};

type FloorRequisition = {
  id: string;
  requisitionNumber: string;
  department: string;
  requestedBy: string;
  status: "pending" | "approved" | "issued" | "rejected";
  issuedBy?: string;
  issuedAt?: string;
  notes?: string;
  createdAt: string;
  items: Array<{
    id: string;
    itemId: string;
    itemName: string;
    itemCode: string;
    unit: string;
    requestedQty: number;
    issuedQty?: number;
  }>;
};

type Category = { id: string; name: string } | string;

const ITEM_STATUS_BADGE: Record<string, string> = {
  active: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

const MOVEMENT_TYPE_BADGE: Record<string, string> = {
  stock_in: "success",
  stock_out: "warning",
  adjustment: "info",
  damaged: "danger",
  expired: "danger",
};

type TabType = "dashboard" | "main_stock" | "mini_stock" | "floor_requisitions" | "items" | "movements";

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Items / Stock filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMiniStore, setSelectedMiniStore] = useState<string>("MINI_REST");

  // Dialogs
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [stockDialog, setStockDialog] = useState<{ item: InventoryItem; type: "in" | "out" | "adjust" } | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockRef, setStockRef] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");

  // Transfer Dialog
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSource, setTransferSource] = useState("MAIN_WH");
  const [transferTarget, setTransferTarget] = useState("MINI_REST");
  const [transferItemId, setTransferItemId] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferRef, setTransferRef] = useState("");

  // Issue Requisition Dialog
  const [issueReqDialog, setIssueReqDialog] = useState<FloorRequisition | null>(null);
  const [issueQtys, setIssueQtys] = useState<Record<string, number>>({});

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useQuery<InventoryDashboard>({
    queryKey: ["inventory-dashboard"],
    queryFn: () => apiFetch<InventoryDashboard>("/inventory/dashboard"),
    enabled: tab === "dashboard",
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery<Category[]>({
    queryKey: ["inventory-categories"],
    queryFn: () => apiFetch<Category[]>("/inventory/categories"),
  });

  const { data: locations = [] } = useQuery<InventoryLocation[]>({
    queryKey: ["inventory-locations"],
    queryFn: () => apiFetch<InventoryLocation[]>("/inventory/locations"),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["procurement-suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/procurement/suppliers"),
  });

  const itemsParams = new URLSearchParams();
  if (search) itemsParams.set("search", search);
  if (categoryFilter !== "all") itemsParams.set("category", categoryFilter);

  const { data: items = [], isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory-items", search, categoryFilter],
    queryFn: () => apiFetch<InventoryItem[]>(`/inventory?${itemsParams}`),
    enabled: tab === "items" || tab === "main_stock" || isTransferOpen,
  });

  // Query: Main Warehouse Stock
  const { data: mainStocks = [], isLoading: mainStocksLoading } = useQuery<LocationStock[]>({
    queryKey: ["location-stocks", "MAIN_WH", search, categoryFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (categoryFilter !== "all") q.set("category", categoryFilter);
      return apiFetch<LocationStock[]>(`/inventory/locations/MAIN_WH/stocks?${q.toString()}`);
    },
    enabled: tab === "main_stock",
  });

  // Query: Mini Store Stock
  const { data: miniStocks = [], isLoading: miniStocksLoading } = useQuery<LocationStock[]>({
    queryKey: ["location-stocks", selectedMiniStore, search],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      return apiFetch<LocationStock[]>(`/inventory/locations/${selectedMiniStore}/stocks?${q.toString()}`);
    },
    enabled: tab === "mini_stock",
  });

  // Query: Floor Requisitions (Coordinator queue)
  const { data: requisitions = [], isLoading: requisitionsLoading } = useQuery<FloorRequisition[]>({
    queryKey: ["coordinator-floor-requisitions"],
    queryFn: () => apiFetch<FloorRequisition[]>("/inventory/floor-requisitions"),
    enabled: tab === "floor_requisitions",
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["inventory-movements"],
    queryFn: () => apiFetch<StockMovement[]>("/inventory/movements"),
    enabled: tab === "movements",
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["location-stocks"] });
    queryClient.invalidateQueries({ queryKey: ["coordinator-floor-requisitions"] });
    queryClient.invalidateQueries({ queryKey: ["staff-supplies"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
  }

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setIsAddItemOpen(false); toast({ title: "Item added successfully" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editItemMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/inventory/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setEditItem(null); toast({ title: "Item updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stockInMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory/stock-in", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { 
      invalidateAll(); 
      setStockDialog(null); 
      setStockQty(""); 
      setStockRef(""); 
      setSelectedSupplier("");
      toast({ title: "Stock Received", description: "Items added to central inventory and stock balances updated." }); 
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stockOutMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory/stock-out", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setStockDialog(null); setStockQty(""); setStockRef(""); toast({ title: "Stock Dispatched" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory/stock-adjustment", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setStockDialog(null); setStockQty(""); setStockRef(""); toast({ title: "Stock Adjusted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Transfer Mutation (Main Warehouse -> Mini Stock)
  const transferMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory/transfer", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidateAll();
      setIsTransferOpen(false);
      setTransferItemId("");
      setTransferQty("");
      setTransferRef("");
      toast({ 
        title: "Stock Transfer Completed", 
        description: "Items moved from Main Warehouse to Departmental Mini Stock." 
      });
    },
    onError: (e: Error) => toast({ title: "Transfer Failed", description: e.message, variant: "destructive" }),
  });

  // Issue Requisition Mutation (Coordinator -> Frontline Staff)
  const issueMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/inventory/floor-requisitions/${id}/issue`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidateAll();
      setIssueReqDialog(null);
      setIssueQtys({});
      toast({ 
        title: "Requisition Issued", 
        description: "Supplies dispensed from Mini Stock to frontline team." 
      });
    },
    onError: (e: Error) => toast({ title: "Issuance Failed", description: e.message, variant: "destructive" }),
  });

  function getCategoryName(c: Category) {
    return typeof c === "string" ? c : c.name;
  }

  function handleStockAction() {
    if (!stockDialog) return;
    const qty = Number(stockQty);
    if (!qty || qty <= 0) return;
    const referenceText = selectedSupplier 
      ? `Supplier: ${selectedSupplier}${stockRef ? ` | ${stockRef}` : ""}`
      : stockRef || undefined;

    const body = { itemId: stockDialog.item.id, quantity: qty, reference: referenceText };
    if (stockDialog.type === "in") stockInMutation.mutate(body);
    else if (stockDialog.type === "out") stockOutMutation.mutate(body);
    else adjustMutation.mutate({ ...body, newQuantity: qty });
  }

  function handleTransferSubmit() {
    const qty = Number(transferQty);
    if (!transferItemId || !qty || qty <= 0) {
      toast({ title: "Validation error", description: "Select an item and positive quantity.", variant: "destructive" });
      return;
    }
    transferMutation.mutate({
      fromLocationId: transferSource,
      toLocationId: transferTarget,
      itemId: transferItemId,
      quantity: qty,
      reference: transferRef || undefined,
    });
  }

  function openIssueModal(req: FloorRequisition) {
    setIssueReqDialog(req);
    const initial: Record<string, number> = {};
    req.items.forEach((item) => {
      initial[item.id] = item.requestedQty;
    });
    setIssueQtys(initial);
  }

  function handleConfirmIssue() {
    if (!issueReqDialog) return;
    const itemsPayload = issueReqDialog.items.map((i) => ({
      requisitionItemId: i.id,
      itemId: i.itemId,
      issuedQty: issueQtys[i.id] ?? i.requestedQty,
    }));
    issueMutation.mutate({
      id: issueReqDialog.id,
      body: {
        issuedBy: "Store Coordinator",
        items: itemsPayload,
      },
    });
  }

  const categoryBreakdownPagination = usePagination(dashboard?.categoryBreakdown ?? [], 5);
  const itemsPagination = usePagination(items, 5);
  const mainStocksPagination = usePagination(mainStocks, 5);
  const miniStocksPagination = usePagination(miniStocks, 5);
  const requisitionsPagination = usePagination(requisitions, 5);
  const movementsPagination = usePagination(movements, 5);

  const TABS: { key: TabType; label: string; icon: any; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard", icon: Boxes },
    { key: "main_stock", label: "Main Warehouse", icon: Warehouse },
    { key: "mini_stock", label: "Mini Stocks", icon: Store },
    { 
      key: "floor_requisitions", 
      label: "Staff Distribution", 
      icon: ArrowRightLeft,
      badge: requisitions.filter(r => r.status === "pending").length || undefined
    },
    { key: "items", label: "Master Catalog", icon: Boxes },
    { key: "movements", label: "Movements Log", icon: Truck },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Inventory Management</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Multi-Tier Stock
            </Badge>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Main central warehouse, departmental sub-stores & frontline floor distribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === "main_stock" && (
            <Button
              onClick={() => setIsTransferOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-9 px-3.5 shadow-sm"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer to Mini Stock
            </Button>
          )}

          {tab === "items" && (
            <Button 
              onClick={() => setIsAddItemOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs h-9 px-3.5 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(""); }}
              className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-all flex items-center gap-2 border-b-2 -mb-1 ${
                isActive 
                  ? "border-primary text-primary bg-primary/5 font-semibold" 
                  : "border-transparent text-text-muted hover:text-text hover:bg-surface/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Items", value: dashboard?.totalItems, color: "text-primary" },
              { label: "Low Stock", value: dashboard?.lowStock, color: "text-amber-500" },
              { label: "Out of Stock", value: dashboard?.outOfStock, color: "text-rose-500" },
              { label: "Total Asset Value", value: dashboard?.totalValue != null ? `$${Number(dashboard.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined, color: "text-emerald-500" },
            ].map((s) => (
              <Card key={s.label} className="bg-surface/50 border-border shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-text-muted">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Multi-tier Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border bg-surface/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Main Warehouse</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Tier 1: Central</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="text-text-muted">Stock-in directly from verified vendors and global suppliers.</p>
                <div className="pt-2 flex justify-between items-center text-text font-medium border-t border-border/50">
                  <span>Capacity Allocation</span>
                  <span className="text-primary font-bold">75% of System Stock</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-sm font-semibold">Mini Stocks (Sub-Stores)</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Tier 2: Departments</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="text-text-muted">Restaurant/Bar & Housekeeping sub-stores replenished via Main transfers.</p>
                <div className="pt-2 flex justify-between items-center text-text font-medium border-t border-border/50">
                  <span>Active Stores</span>
                  <span className="text-amber-500 font-bold">2 Sub-Stores</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-sm font-semibold">Floor Distribution</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Tier 3: Frontline</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="text-text-muted">Managed by Coordinators & Managers, dispensing directly to Waiters & Housekeepers.</p>
                <div className="pt-2 flex justify-between items-center text-text font-medium border-t border-border/50">
                  <span>Pending Requests</span>
                  <span className="text-emerald-500 font-bold">{requisitions.filter(r => r.status === "pending").length} Pending</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
            <Card className="border-border">
              <CardHeader><CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryBreakdownPagination.paginatedItems.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell className="capitalize font-medium text-xs">{c.category}</TableCell>
                        <TableCell className="text-right text-xs">{c.count}</TableCell>
                        <TableCell className="text-right text-xs font-mono">${Number(c.value).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination {...categoryBreakdownPagination} pageSize={5} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: MAIN WAREHOUSE */}
      {tab === "main_stock" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface/40 p-2.5 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-text">Central Warehouse Inventory</span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Main Warehouse</Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-surface border-border"
                />
              </div>
            </div>
          </div>

          <Card className="border-border shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-surface/80">
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold uppercase">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Category</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Main Stock</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mainStocksLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-7 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : mainStocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-text-muted text-xs">
                      No items found in Main Warehouse.
                    </TableCell>
                  </TableRow>
                ) : (
                  mainStocksPagination.paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="py-2.5">
                        <div className="font-medium text-xs text-text">{item.name}</div>
                        <div className="text-[11px] text-text-muted font-mono">{item.itemCode}</div>
                      </TableCell>
                      <TableCell className="text-xs capitalize text-text-muted py-2.5">{item.category}</TableCell>
                      <TableCell className="text-right text-xs py-2.5">
                        <span className="font-bold text-text">{item.currentStock}</span>
                        <span className="text-text-muted ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        {item.status === "adequate" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5">
                            Adequate
                          </Badge>
                        )}
                        {item.status === "running_low" && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2 py-0.5">
                            Running Low
                          </Badge>
                        )}
                        {item.status === "depleted" && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs px-2 py-0.5">
                            Depleted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              const itm = items.find(i => i.id === item.itemId) || {
                                id: item.itemId,
                                itemCode: item.itemCode,
                                name: item.name,
                                category: item.category,
                                unit: item.unit,
                                currentStock: item.currentStock,
                                minStock: item.minStock,
                                reorderLevel: item.minStock,
                                purchasePrice: 0,
                                status: item.status
                              };
                              setStockDialog({ item: itm as InventoryItem, type: "in" });
                              setStockQty("");
                              setStockRef("");
                            }}
                          >
                            <ArrowDownRight className="h-3 w-3 mr-1 text-emerald-500" />
                            Stock In (Vendor)
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-primary/90 text-primary-foreground"
                            onClick={() => {
                              setTransferItemId(item.itemId);
                              setTransferQty(Math.min(50, Math.floor(item.currentStock * 0.2)).toString());
                              setIsTransferOpen(true);
                            }}
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Transfer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination {...mainStocksPagination} pageSize={6} />
          </Card>
        </div>
      )}

      {/* TAB 3: MINI STOCKS */}
      {tab === "mini_stock" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface/40 p-2.5 rounded-lg border border-border">
            {/* Store Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMiniStore("MINI_REST")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedMiniStore === "MINI_REST"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-text-muted hover:text-text hover:bg-surface"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                Restaurant & Bar Mini Stock
              </button>
              <button
                onClick={() => setSelectedMiniStore("MINI_HK")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedMiniStore === "MINI_HK"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-text-muted hover:text-text hover:bg-surface"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                Housekeeping Floor Mini Stock
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Search sub-store items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-surface border-border"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTransferTarget(selectedMiniStore);
                  setIsTransferOpen(true);
                }}
                className="h-8 text-xs"
              >
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Receive from Main
              </Button>
            </div>
          </div>

          <Card className="border-border shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-surface/80">
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold uppercase">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Category</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Mini Stock Balance</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {miniStocksLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : miniStocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-text-muted text-xs">
                      No stock allocated to this sub-store yet. Transfer items from Main Warehouse.
                    </TableCell>
                  </TableRow>
                ) : (
                  miniStocksPagination.paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="py-2.5">
                        <div className="font-medium text-xs text-text">{item.name}</div>
                        <div className="text-[11px] text-text-muted font-mono">{item.itemCode}</div>
                      </TableCell>
                      <TableCell className="text-xs capitalize text-text-muted py-2.5">{item.category}</TableCell>
                      <TableCell className="text-right text-xs py-2.5">
                        <span className="font-bold text-text">{item.currentStock}</span>
                        <span className="text-text-muted ml-1">{item.unit}</span>
                        <div className="text-[10px] text-text-muted">Min: {item.minStock}</div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        {item.status === "adequate" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5">
                            Adequate
                          </Badge>
                        )}
                        {item.status === "running_low" && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2 py-0.5">
                            Running Low
                          </Badge>
                        )}
                        {item.status === "depleted" && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs px-2 py-0.5">
                            Depleted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            setTransferTarget(selectedMiniStore);
                            setTransferItemId(item.itemId);
                            setIsTransferOpen(true);
                          }}
                        >
                          Request Refill
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination {...miniStocksPagination} pageSize={6} />
          </Card>
        </div>
      )}

      {/* TAB 4: FLOOR REQUISITIONS & STAFF DISTRIBUTION */}
      {tab === "floor_requisitions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface/40 p-2.5 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-text">Coordinator Review & Staff Distribution</span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">Store Coordinator</Badge>
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              Approve floor requests and issue supplies from Mini Stock directly to frontline staff
            </p>
          </div>

          <Card className="border-border shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-surface/80">
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold uppercase">Requisition #</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Department & Requester</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Requested Items</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitionsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : requisitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-text-muted text-xs">
                      No floor requisitions submitted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requisitionsPagination.paginatedItems.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold text-primary py-3">
                        {req.requisitionNumber}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <div className="font-medium text-text">{req.requestedBy}</div>
                        <Badge variant="outline" className="text-[10px] capitalize mt-0.5">
                          {req.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <div className="space-y-1">
                          {req.items?.map((itm) => (
                            <div key={itm.id} className="text-xs text-text-muted">
                              <span className="font-medium text-text">{itm.itemName}</span>:{" "}
                              <span className="font-semibold text-primary">{itm.requestedQty}</span> {itm.unit}
                              {itm.issuedQty !== undefined && itm.issuedQty !== null && (
                                <span className="text-emerald-500 text-[11px] ml-1.5">(Issued: {itm.issuedQty})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-text-muted py-3">
                        {new Date(req.createdAt).toLocaleDateString()}{" "}
                        <span className="text-[10px]">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {req.status === "pending" && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-0.5">
                            Pending Review
                          </Badge>
                        )}
                        {req.status === "issued" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5">
                            Issued to Staff
                          </Badge>
                        )}
                        {req.status === "rejected" && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs px-2.5 py-0.5">
                            Rejected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {req.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => openIssueModal(req)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Issue Stock
                          </Button>
                        ) : (
                          <span className="text-xs text-text-muted font-medium">Completed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination {...requisitionsPagination} pageSize={6} />
          </Card>
        </div>
      )}

      {/* TAB 5: MASTER CATALOG (ITEMS) */}
      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] text-xs h-9"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(catsLoading ? [] : categories).map((c) => (
                  <SelectItem key={getCategoryName(c)} value={getCategoryName(c)}>{getCategoryName(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Unit</TableHead>
                  <TableHead className="text-xs text-right">Total System Stock</TableHead>
                  <TableHead className="text-xs text-right">Min Stock</TableHead>
                  <TableHead className="text-xs text-right">Purchase Price</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="w-[80px] text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-text-muted text-xs">No items found.</TableCell>
                  </TableRow>
                ) : itemsPagination.paginatedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                    <TableCell className="font-medium text-xs">{item.name}</TableCell>
                    <TableCell className="capitalize text-xs text-text-muted">{item.category}</TableCell>
                    <TableCell className="text-xs">{item.unit}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{item.currentStock}</TableCell>
                    <TableCell className="text-right font-mono text-text-muted text-xs">{item.minStock}</TableCell>
                    <TableCell className="text-right text-xs font-mono">${Number(item.purchasePrice).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={(ITEM_STATUS_BADGE[item.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setStockDialog({ item, type: "in" }); setStockQty(""); setStockRef(""); setSelectedSupplier(""); }}>
                            Stock In (Vendor)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setStockDialog({ item, type: "out" }); setStockQty(""); setStockRef(""); }}>
                            Stock Out
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setStockDialog({ item, type: "adjust" }); setStockQty(""); setStockRef(""); }}>
                            Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditItem(item)}>Edit Item</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...itemsPagination} pageSize={5} />
          </div>
        </div>
      )}

      {/* TAB 6: MOVEMENTS LOG */}
      {tab === "movements" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Quantity</TableHead>
                <TableHead className="text-xs text-right">Previous</TableHead>
                <TableHead className="text-xs text-right">New Balance</TableHead>
                <TableHead className="text-xs">Reference / Vendor</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-text-muted text-xs">No movements recorded yet.</TableCell>
                </TableRow>
              ) : movementsPagination.paginatedItems.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-xs">{m.itemName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(MOVEMENT_TYPE_BADGE[m.movementType] ?? "muted") as any} className="text-[10px] uppercase">
                      {m.movementType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{m.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-text-muted text-xs">{m.previousStock}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{m.newStock}</TableCell>
                  <TableCell className="text-xs text-text-muted">{m.reference ?? "—"}</TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {(m.createdAt ?? m.date) ? new Date(m.createdAt ?? m.date!).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination {...movementsPagination} pageSize={6} />
        </div>
      )}

      {/* MODAL 1: TRANSFER FROM MAIN WAREHOUSE TO MINI STOCK */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Transfer Stock to Mini Store
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs">Source Location</Label>
              <Select value={transferSource} onValueChange={setTransferSource}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN_WH">Main Central Warehouse (Tier 1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Target Mini Store</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINI_REST">Restaurant & Bar Mini Stock</SelectItem>
                  <SelectItem value="MINI_HK">Housekeeping Floor Mini Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Item to Transfer *</Label>
              <Select value={transferItemId} onValueChange={setTransferItemId}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="-- Select Item --" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} ({i.unit}) — Available in Main: {i.currentStock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Quantity *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter transfer quantity"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Reference / Transfer Reason</Label>
              <Input
                placeholder="e.g. Daily floor replenishment"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleTransferSubmit}
              disabled={transferMutation.isPending || !transferItemId || !transferQty}
              className="bg-primary text-primary-foreground font-medium"
            >
              {transferMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Execute Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ISSUE FLOOR REQUISITION */}
      <Dialog open={!!issueReqDialog} onOpenChange={(o) => !o && setIssueReqDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Issue Supplies to {issueReqDialog?.department}
            </DialogTitle>
          </DialogHeader>

          {issueReqDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-surface/50 p-2.5 rounded-lg border border-border text-xs space-y-1">
                <div><span className="text-text-muted">Requisition:</span> <span className="font-mono font-semibold">{issueReqDialog.requisitionNumber}</span></div>
                <div><span className="text-text-muted">Requested By:</span> <span className="font-medium text-text">{issueReqDialog.requestedBy}</span></div>
                {issueReqDialog.notes && (
                  <div><span className="text-text-muted">Staff Note:</span> <span className="italic text-text">{issueReqDialog.notes}</span></div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Specify Issued Quantities</Label>
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {issueReqDialog.items.map((i) => (
                    <div key={i.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-medium text-text">{i.itemName}</div>
                        <div className="text-[11px] text-text-muted">Requested: {i.requestedQty} {i.unit}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max={i.requestedQty}
                          value={issueQtys[i.id] ?? i.requestedQty}
                          onChange={(e) => setIssueQtys({ ...issueQtys, [i.id]: Number(e.target.value) })}
                          className="w-20 h-7 text-xs text-right"
                        />
                        <span className="text-text-muted">{i.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIssueReqDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleConfirmIssue}
              disabled={issueMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {issueMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm & Issue to Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: STOCK IN FROM VENDORS / OUT / ADJUST */}
      <Dialog open={!!stockDialog} onOpenChange={(o) => !o && setStockDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {stockDialog?.type === "in" ? "Stock In from Vendor" : stockDialog?.type === "out" ? "Stock Out" : "Adjust Stock"}
              {stockDialog && ` — ${stockDialog.item.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="text-xs text-text-muted">
              Current stock: <span className="font-bold text-text">{stockDialog?.item.currentStock} {stockDialog?.item.unit}</span>
            </div>

            {stockDialog?.type === "in" && (
              <div className="grid gap-1">
                <Label className="text-xs">Active Vendor / Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="-- Select Supplier --" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1">
              <Label className="text-xs">{stockDialog?.type === "adjust" ? "New Quantity" : "Quantity"} *</Label>
              <Input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder={stockDialog?.type === "adjust" ? "New total quantity" : "Enter quantity"}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Reference / Invoice #</Label>
              <Input 
                value={stockRef} 
                onChange={(e) => setStockRef(e.target.value)} 
                placeholder="PO #, Invoice #, etc." 
                className="h-8 text-xs"
              />
            </div>

            <Button 
              className="w-full text-xs h-8 mt-2" 
              onClick={handleStockAction} 
              disabled={!stockQty || stockInMutation.isPending || stockOutMutation.isPending || adjustMutation.isPending}
            >
              {(stockInMutation.isPending || stockOutMutation.isPending || adjustMutation.isPending) && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Confirm Stock Action
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD ITEM */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-base">Add Master Inventory Item</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            ["currentStock", "minStock", "reorderLevel", "purchasePrice"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
            addItemMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="grid gap-1 col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input name="name" required className="h-8 text-xs" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Category *</Label>
                <select name="category" required className="flex h-8 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={getCategoryName(c)} value={getCategoryName(c)}>{getCategoryName(c)}</option>)}
                </select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Unit *</Label>
                <Input name="unit" required placeholder="e.g. kg, pcs, bottle" className="h-8 text-xs" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Current Stock</Label>
                <Input name="currentStock" type="number" min="0" defaultValue="0" className="h-8 text-xs" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Min Stock</Label>
                <Input name="minStock" type="number" min="0" defaultValue="10" className="h-8 text-xs" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Purchase Price ($)</Label>
                <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue="0" className="h-8 text-xs" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Storage Location</Label>
                <Input name="storageLocation" placeholder="Main Warehouse" className="h-8 text-xs" />
              </div>
            </div>
            <Button type="submit" className="w-full text-xs h-8" disabled={addItemMutation.isPending}>
              {addItemMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save Item
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: EDIT ITEM */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-base">Edit Item</DialogTitle></DialogHeader>
          {editItem && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const body: Record<string, unknown> = {};
              fd.forEach((v, k) => { if (v !== "") body[k] = v; });
              ["currentStock", "minStock", "reorderLevel", "purchasePrice"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
              editItemMutation.mutate({ id: editItem.id, body });
            }}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="grid gap-1 col-span-2">
                  <Label className="text-xs">Name *</Label>
                  <Input name="name" required defaultValue={editItem.name} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Category *</Label>
                  <select name="category" required defaultValue={editItem.category} className="flex h-8 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs">
                    {categories.map((c) => <option key={getCategoryName(c)} value={getCategoryName(c)}>{getCategoryName(c)}</option>)}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Unit *</Label>
                  <Input name="unit" required defaultValue={editItem.unit} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Min Stock</Label>
                  <Input name="minStock" type="number" min="0" defaultValue={editItem.minStock} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Purchase Price ($)</Label>
                  <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={editItem.purchasePrice} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Storage Location</Label>
                  <Input name="storageLocation" defaultValue={editItem.storageLocation ?? ""} className="h-8 text-xs" />
                </div>
              </div>
              <Button type="submit" className="w-full text-xs h-8" disabled={editItemMutation.isPending}>
                {editItemMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

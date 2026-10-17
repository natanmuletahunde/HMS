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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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

type TabType = "dashboard" | "items" | "movements" | "alerts";

export default function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Items filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialogs
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [stockDialog, setStockDialog] = useState<{ item: InventoryItem; type: "in" | "out" | "adjust" } | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockRef, setStockRef] = useState("");

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

  const itemsParams = new URLSearchParams();
  if (search) itemsParams.set("search", search);
  if (categoryFilter !== "all") itemsParams.set("category", categoryFilter);
  if (statusFilter !== "all") itemsParams.set("status", statusFilter);

  const { data: items = [], isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory", search, categoryFilter, statusFilter],
    queryFn: () => apiFetch<InventoryItem[]>(`/inventory?${itemsParams}`),
    enabled: tab === "items" || tab === "alerts",
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["inventory-movements"],
    queryFn: () => apiFetch<StockMovement[]>("/inventory/movements"),
    enabled: tab === "movements",
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory-alerts"],
    queryFn: () => apiFetch<InventoryItem[]>("/inventory/alerts"),
    enabled: tab === "alerts",
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
  }

  const addItemMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setIsAddItemOpen(false); toast({ title: "Item added" }); },
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
    onSuccess: () => { invalidateAll(); setStockDialog(null); setStockQty(""); setStockRef(""); toast({ title: "Stock added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stockOutMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory/stock-out", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setStockDialog(null); setStockQty(""); setStockRef(""); toast({ title: "Stock removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/inventory/stock-adjustment", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setStockDialog(null); setStockQty(""); setStockRef(""); toast({ title: "Stock adjusted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function getCategoryName(c: Category) {
    return typeof c === "string" ? c : c.name;
  }

  function handleStockAction() {
    if (!stockDialog) return;
    const qty = Number(stockQty);
    if (!qty || qty <= 0) return;
    const body = { itemId: stockDialog.item.id, quantity: qty, reference: stockRef || undefined };
    if (stockDialog.type === "in") stockInMutation.mutate(body);
    else if (stockDialog.type === "out") stockOutMutation.mutate(body);
    else adjustMutation.mutate({ ...body, newQuantity: qty });
  }

  const alertItems = tab === "alerts" ? alerts : items.filter(i => i.status === "low_stock" || i.status === "out_of_stock");

  const TABS: { key: TabType; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "items", label: "Items" },
    { key: "movements", label: "Stock Movements" },
    { key: "alerts", label: "Alerts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        {tab === "items" && (
          <Button onClick={() => setIsAddItemOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
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
              { label: "Total Items", value: dashboard?.totalItems, color: "text-primary" },
              { label: "Low Stock", value: dashboard?.lowStock, color: "text-warning" },
              { label: "Out of Stock", value: dashboard?.outOfStock, color: "text-danger" },
              { label: "Total Value", value: dashboard?.totalValue != null ? `$${Number(dashboard.totalValue).toFixed(2)}` : undefined, color: "text-success" },
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
          {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Category Breakdown</CardTitle></CardHeader>
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
                    {dashboard.categoryBreakdown.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell className="capitalize">{c.category}</TableCell>
                        <TableCell className="text-right">{c.count}</TableCell>
                        <TableCell className="text-right">${Number(c.value).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ITEMS TAB */}
      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px]"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(catsLoading ? [] : categories).map((c) => (
                  <SelectItem key={getCategoryName(c)} value={getCategoryName(c)}>{getCategoryName(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(10)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-text-muted">No items found.</TableCell>
                  </TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-mono">{item.currentStock}</TableCell>
                    <TableCell className="text-right font-mono text-text-muted">{item.minStock}</TableCell>
                    <TableCell className="text-right font-mono text-text-muted">{item.reorderLevel}</TableCell>
                    <TableCell className="text-right">${Number(item.purchasePrice).toFixed(2)}</TableCell>
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
                          <DropdownMenuItem onClick={() => { setStockDialog({ item, type: "in" }); setStockQty(""); setStockRef(""); }}>Stock In</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setStockDialog({ item, type: "out" }); setStockQty(""); setStockRef(""); }}>Stock Out</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setStockDialog({ item, type: "adjust" }); setStockQty(""); setStockRef(""); }}>Adjust Stock</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditItem(item)}>Edit</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* MOVEMENTS TAB */}
      {tab === "movements" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Previous Stock</TableHead>
                <TableHead className="text-right">New Stock</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-text-muted">No movements found.</TableCell>
                </TableRow>
              ) : movements.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{m.itemName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(MOVEMENT_TYPE_BADGE[m.movementType] ?? "muted") as any} className="text-[10px] uppercase">
                      {m.movementType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-text-muted">{m.previousStock}</TableCell>
                  <TableCell className="text-right font-mono">{m.newStock}</TableCell>
                  <TableCell className="text-xs text-text-muted">{m.reference ?? "—"}</TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {(m.createdAt ?? m.date) ? new Date(m.createdAt ?? m.date!).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ALERTS TAB */}
      {tab === "alerts" && (
        <div className="space-y-4">
          {alertsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : alertItems.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted">No alerts. All stock levels are healthy.</div>
          ) : (
            <div className="rounded-md border border-border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell className="text-right font-mono text-danger font-bold">{item.currentStock}</TableCell>
                      <TableCell className="text-right font-mono text-text-muted">{item.minStock}</TableCell>
                      <TableCell>
                        <Badge variant={(ITEM_STATUS_BADGE[item.status] ?? "muted") as any} className="text-[10px] uppercase">
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setStockDialog({ item, type: "in" }); setStockQty(""); setStockRef(""); }}>
                          Stock In
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            ["currentStock", "minStock", "reorderLevel", "purchasePrice"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
            addItemMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Name *</Label>
                <Input name="name" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Category *</Label>
                <select name="category" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={getCategoryName(c)} value={getCategoryName(c)}>{getCategoryName(c)}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Unit *</Label>
                <Input name="unit" required placeholder="e.g. kg, pcs, ltr" />
              </div>
              <div className="grid gap-1.5">
                <Label>Current Stock</Label>
                <Input name="currentStock" type="number" min="0" defaultValue="0" />
              </div>
              <div className="grid gap-1.5">
                <Label>Min Stock</Label>
                <Input name="minStock" type="number" min="0" defaultValue="0" />
              </div>
              <div className="grid gap-1.5">
                <Label>Reorder Level</Label>
                <Input name="reorderLevel" type="number" min="0" defaultValue="0" />
              </div>
              <div className="grid gap-1.5">
                <Label>Purchase Price</Label>
                <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue="0" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Storage Location</Label>
                <Input name="storageLocation" placeholder="e.g. Warehouse A, Shelf 3" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addItemMutation.isPending}>
              {addItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          {editItem && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const body: Record<string, unknown> = {};
              fd.forEach((v, k) => { if (v !== "") body[k] = v; });
              ["currentStock", "minStock", "reorderLevel", "purchasePrice"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
              editItemMutation.mutate({ id: editItem.id, body });
            }}>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5 col-span-2">
                  <Label>Name *</Label>
                  <Input name="name" required defaultValue={editItem.name} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Category *</Label>
                  <select name="category" required defaultValue={editItem.category} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                    {categories.map((c) => <option key={getCategoryName(c)} value={getCategoryName(c)}>{getCategoryName(c)}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Unit *</Label>
                  <Input name="unit" required defaultValue={editItem.unit} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Min Stock</Label>
                  <Input name="minStock" type="number" min="0" defaultValue={editItem.minStock} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Reorder Level</Label>
                  <Input name="reorderLevel" type="number" min="0" defaultValue={editItem.reorderLevel} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Purchase Price</Label>
                  <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={editItem.purchasePrice} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Storage Location</Label>
                  <Input name="storageLocation" defaultValue={editItem.storageLocation ?? ""} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={editItemMutation.isPending}>
                {editItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Action Dialog */}
      <Dialog open={!!stockDialog} onOpenChange={(o) => !o && setStockDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {stockDialog?.type === "in" ? "Stock In" : stockDialog?.type === "out" ? "Stock Out" : "Adjust Stock"}
              {stockDialog && ` — ${stockDialog.item.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-text-muted">
              Current stock: <span className="font-bold text-text">{stockDialog?.item.currentStock} {stockDialog?.item.unit}</span>
            </div>
            <div className="grid gap-1.5">
              <Label>{stockDialog?.type === "adjust" ? "New Quantity" : "Quantity"} *</Label>
              <Input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder={stockDialog?.type === "adjust" ? "New total quantity" : "Enter quantity"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Reference</Label>
              <Input value={stockRef} onChange={(e) => setStockRef(e.target.value)} placeholder="PO #, Invoice #, etc." />
            </div>
            <Button className="w-full" onClick={handleStockAction} disabled={!stockQty || stockInMutation.isPending || stockOutMutation.isPending || adjustMutation.isPending}>
              {(stockInMutation.isPending || stockOutMutation.isPending || adjustMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

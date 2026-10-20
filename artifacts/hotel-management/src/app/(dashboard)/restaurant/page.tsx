"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal, Minus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

// Types
type RestaurantDashboard = {
  totalOrders: number;
  activeOrders: number;
  occupiedTables: number;
  todayRevenue: number;
};

type MenuItem = {
  id: string;
  name: string;
  category: string;
  kitchenSection?: string;
  price: number;
  preparationTime?: number;
  description?: string;
  isAvailable: boolean;
};

type RestaurantTable = {
  id: string;
  tableNumber: string | number;
  capacity: number;
  section?: string;
  floor?: number;
  status: string;
};

type OrderItem = {
  menuItemId: string;
  name?: string;
  quantity: number;
  price?: number;
};

type Order = {
  id: string;
  orderNumber: string;
  orderType: string;
  tableId?: string;
  tableNumber?: string | number;
  guestName?: string;
  items?: OrderItem[];
  itemsCount?: number;
  total?: number;
  totalAmount?: number;
  status: string;
  createdAt?: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "muted",
  preparing: "warning",
  ready: "info",
  served: "success",
  cancelled: "danger",
};

const TABLE_STATUS_COLOR: Record<string, string> = {
  available: "border-success",
  occupied: "border-danger",
  reserved: "border-warning",
  cleaning: "border-muted",
};

const MENU_CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Drinks", "Dessert", "Coffee", "Juice", "Fast Food", "Traditional"];

export default function RestaurantPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"dashboard" | "menu" | "tables" | "orders" | "kitchen">("dashboard");

  // Menu state
  const [menuCategory, setMenuCategory] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Tables state
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);

  // Orders state
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderType, setOrderType] = useState("all");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderItems, setNewOrderItems] = useState<Array<{ menuItemId: string; name: string; quantity: number; price: number }>>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState("");

  // Kitchen auto-refresh
  const [kitchenTick, setKitchenTick] = useState(0);
  useEffect(() => {
    if (tab !== "kitchen") return;
    const interval = setInterval(() => setKitchenTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [tab]);

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useQuery<RestaurantDashboard>({
    queryKey: ["restaurant-dashboard"],
    queryFn: () => apiFetch<RestaurantDashboard>("/restaurant/dashboard"),
    enabled: tab === "dashboard",
  });

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["restaurant-menu"],
    queryFn: () => apiFetch<MenuItem[]>("/restaurant/menu-items"),
    enabled: tab === "menu" || tab === "orders" || tab === "kitchen",
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ["restaurant-tables"],
    queryFn: () => apiFetch<RestaurantTable[]>("/restaurant/tables"),
    enabled: tab === "tables" || tab === "orders",
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["restaurant-orders", orderStatus, orderType],
    queryFn: () => {
      const p = new URLSearchParams();
      if (orderStatus !== "all") p.set("status", orderStatus);
      if (orderType !== "all") p.set("orderType", orderType);
      return apiFetch<Order[]>(`/restaurant/orders?${p}`);
    },
    enabled: tab === "orders" || tab === "dashboard",
  });

  const { data: kitchenOrders = [], isLoading: kitchenLoading } = useQuery<Order[]>({
    queryKey: ["restaurant-kitchen", kitchenTick],
    queryFn: () => apiFetch<Order[]>("/restaurant/kitchen"),
    enabled: tab === "kitchen",
  });

  function invalidateOrders() {
    queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-dashboard"] });
  }

  const menuItemMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/restaurant/menu-items", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["restaurant-menu"] }); setIsAddMenuOpen(false); toast({ title: "Menu item added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleAvailMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiFetch(`/restaurant/menu-items/${id}`, { method: "PATCH", body: JSON.stringify({ isAvailable }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["restaurant-menu"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addTableMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/restaurant/tables", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["restaurant-tables"] }); setIsAddTableOpen(false); toast({ title: "Table added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createOrderMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/restaurant/orders", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateOrders(); setIsNewOrderOpen(false); setNewOrderItems([]); toast({ title: "Order placed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/restaurant/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { invalidateOrders(); toast({ title: "Order updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredMenu = menuItems.filter((item) => {
    if (menuCategory !== "All" && item.category.toLowerCase() !== menuCategory.toLowerCase()) return false;
    if (menuSearch && !item.name.toLowerCase().includes(menuSearch.toLowerCase())) return false;
    return true;
  });

  const activeOrders = orders.filter(o => ["pending", "preparing", "ready"].includes(o.status));
  const activeOrdersPagination = usePagination(activeOrders, 5);
  const allOrdersPagination = usePagination(orders, 5);

  const pendingKitchen = kitchenOrders.filter(o => o.status === "pending");
  const preparingKitchen = kitchenOrders.filter(o => o.status === "preparing");
  const readyKitchen = kitchenOrders.filter(o => o.status === "ready");

  function addOrderItem(menuItemId: string) {
    const item = menuItems.find(i => i.id === menuItemId);
    if (!item) return;
    setNewOrderItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId);
      if (existing) return prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId, name: item.name, quantity: 1, price: item.price }];
    });
  }

  function updateOrderItemQty(menuItemId: string, delta: number) {
    setNewOrderItems(prev => {
      const updated = prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i);
      return updated.filter(i => i.quantity > 0);
    });
  }

  function getElapsedMinutes(createdAt?: string) {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  }

  const TABS = ["dashboard", "menu", "tables", "orders", "kitchen"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Restaurant</h1>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors capitalize ${
              tab === t ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Orders", value: dashboard?.totalOrders, color: "text-primary" },
              { label: "Active Orders", value: dashboard?.activeOrders, color: "text-warning" },
              { label: "Occupied Tables", value: dashboard?.occupiedTables, color: "text-danger" },
              { label: "Today Revenue", value: dashboard?.todayRevenue != null ? `$${Number(dashboard.todayRevenue).toFixed(2)}` : undefined, color: "text-success" },
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
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-16 text-center text-text-muted">No active orders</TableCell></TableRow>
                  ) : activeOrdersPagination.paginatedItems.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                      <TableCell>{order.tableNumber ?? "—"}</TableCell>
                      <TableCell>{order.guestName ?? "—"}</TableCell>
                      <TableCell>{order.itemsCount ?? order.items?.length ?? 0}</TableCell>
                      <TableCell>${Number(order.total ?? order.totalAmount ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_BADGE[order.status] ?? "muted") as any} className="text-[10px] uppercase">
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={activeOrdersPagination.currentPage}
                totalPages={activeOrdersPagination.totalPages}
                totalItems={activeOrdersPagination.totalItems}
                pageSize={5}
                onPrev={activeOrdersPagination.onPrev}
                onNext={activeOrdersPagination.onNext}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* MENU TAB */}
      {tab === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {MENU_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMenuCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    menuCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted hover:bg-muted/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Button onClick={() => setIsAddMenuOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Menu Item
            </Button>
          </div>
          <Input
            placeholder="Search menu..."
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            className="w-[260px]"
          />
          {menuLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-text-muted">No menu items found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMenu.map((item) => (
                <Card key={item.id} className={`border-border ${!item.isAvailable ? "opacity-60" : ""}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      <Badge variant={"secondary" as any} className="text-[10px] capitalize shrink-0">{item.category}</Badge>
                    </div>
                    <div className="text-lg font-bold text-primary">${Number(item.price).toFixed(2)}</div>
                    {item.preparationTime && <div className="text-xs text-text-muted">{item.preparationTime} min prep</div>}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">{item.isAvailable ? "Available" : "Unavailable"}</span>
                      <button
                        onClick={() => toggleAvailMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.isAvailable ? "bg-success" : "bg-muted"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${item.isAvailable ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TABLES TAB */}
      {tab === "tables" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddTableOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Table
            </Button>
          </div>
          {tablesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
            </div>
          ) : tables.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-text-muted">No tables found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => (
                <Card key={table.id} className={`border-2 ${TABLE_STATUS_COLOR[table.status] ?? "border-border"}`}>
                  <CardContent className="p-4 text-center space-y-1">
                    <div className="text-3xl font-bold">#{table.tableNumber}</div>
                    <div className="text-xs text-text-muted">{table.capacity} seats</div>
                    {table.section && <div className="text-xs text-text-muted">{table.section}</div>}
                    <Badge variant={(table.status === "available" ? "success" : table.status === "occupied" ? "danger" : table.status === "reserved" ? "warning" : "muted") as any} className="text-[10px] uppercase">
                      {table.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-3">
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Order Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dine_in">Dine-in</SelectItem>
                  <SelectItem value="takeaway">Takeaway</SelectItem>
                  <SelectItem value="room_service">Room Service</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsNewOrderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-text-muted">No orders found.</TableCell>
                  </TableRow>
                ) : allOrdersPagination.paginatedItems.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell className="capitalize text-xs">{(order.orderType ?? "").replace(/_/g, " ")}</TableCell>
                    <TableCell>{order.tableNumber ?? "—"}</TableCell>
                    <TableCell>{order.guestName ?? "—"}</TableCell>
                    <TableCell>${Number(order.total ?? order.totalAmount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={(STATUS_BADGE[order.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "—"}
                    </TableCell>
                    <TableCell>
                      {!["served", "cancelled"].includes(order.status) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status === "pending" && <DropdownMenuItem onClick={() => updateOrderMutation.mutate({ id: order.id, status: "preparing" })}>Start Preparing</DropdownMenuItem>}
                            {order.status === "preparing" && <DropdownMenuItem onClick={() => updateOrderMutation.mutate({ id: order.id, status: "ready" })}>Mark Ready</DropdownMenuItem>}
                            {order.status === "ready" && <DropdownMenuItem onClick={() => updateOrderMutation.mutate({ id: order.id, status: "served" })}>Mark Served</DropdownMenuItem>}
                            <DropdownMenuItem className="text-danger" onClick={() => updateOrderMutation.mutate({ id: order.id, status: "cancelled" })}>Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={allOrdersPagination.currentPage}
              totalPages={allOrdersPagination.totalPages}
              totalItems={allOrdersPagination.totalItems}
              pageSize={5}
              onPrev={allOrdersPagination.onPrev}
              onNext={allOrdersPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* KITCHEN TAB */}
      {tab === "kitchen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Auto-refreshes every 30 seconds</span>
            <Button variant="outline" size="sm" onClick={() => setKitchenTick(t => t + 1)}>Refresh</Button>
          </div>
          {kitchenLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Pending", orders: pendingKitchen, nextStatus: "preparing", btnLabel: "Start Preparing" },
                { label: "Preparing", orders: preparingKitchen, nextStatus: "ready", btnLabel: "Mark Ready" },
                { label: "Ready", orders: readyKitchen, nextStatus: "served", btnLabel: "Mark Served" },
              ].map(({ label, orders: col, nextStatus, btnLabel }) => (
                <div key={label} className="rounded-lg border border-border bg-surface/50 p-3 space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-text-muted">{label} ({col.length})</h3>
                  {col.length === 0 ? (
                    <p className="text-text-muted text-xs text-center py-4">No orders</p>
                  ) : col.map((order) => (
                    <Card key={order.id} className="border-border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-sm">#{order.orderNumber}</span>
                          <span className="text-xs text-text-muted">Table {order.tableNumber ?? "—"}</span>
                        </div>
                        <div className="text-xs text-text-muted space-y-0.5">
                          {order.items?.slice(0, 4).map((item, i) => (
                            <div key={i}>• {item.name ?? `Item ${i + 1}`} × {item.quantity}</div>
                          ))}
                          {(order.items?.length ?? 0) > 4 && <div className="text-text-muted">+{(order.items?.length ?? 0) - 4} more</div>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-warning">{getElapsedMinutes(order.createdAt)}m ago</span>
                          <Button size="sm" className="h-6 text-xs px-2" onClick={() => updateOrderMutation.mutate({ id: order.id, status: nextStatus })}>
                            {btnLabel}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Menu Item Dialog */}
      <Dialog open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.price) body.price = Number(body.price);
            if (body.preparationTime) body.preparationTime = Number(body.preparationTime);
            menuItemMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Name *</Label>
                <Input name="name" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Category *</Label>
                <select name="category" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  {MENU_CATEGORIES.slice(1).map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Kitchen Section</Label>
                <Input name="kitchenSection" placeholder="e.g. Grill, Bar" />
              </div>
              <div className="grid gap-1.5">
                <Label>Price *</Label>
                <Input name="price" type="number" step="0.01" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Prep Time (min)</Label>
                <Input name="preparationTime" type="number" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Description</Label>
                <textarea name="description" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={menuItemMutation.isPending}>
              {menuItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Table Dialog */}
      <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Restaurant Table</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.capacity) body.capacity = Number(body.capacity);
            if (body.floor) body.floor = Number(body.floor);
            addTableMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Table Number *</Label>
                <Input name="tableNumber" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Capacity *</Label>
                <Input name="capacity" type="number" min="1" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Section</Label>
                <Input name="section" placeholder="e.g. Main, Terrace" />
              </div>
              <div className="grid gap-1.5">
                <Label>Floor</Label>
                <Input name="floor" type="number" defaultValue="1" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addTableMutation.isPending}>
              {addTableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Table
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Order Dialog */}
      <Dialog open={isNewOrderOpen} onOpenChange={(o) => { if (!o) { setIsNewOrderOpen(false); setNewOrderItems([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            body.items = newOrderItems.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }));
            createOrderMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Order Type *</Label>
                <select name="orderType" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="dine_in">Dine-in</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="room_service">Room Service</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Table</Label>
                <select name="tableId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select Table</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>Table {t.tableNumber}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Guest Name</Label>
                <Input name="guestName" placeholder="Guest name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Add Items</Label>
              <div className="flex gap-2">
                <select
                  value={selectedMenuItem}
                  onChange={(e) => setSelectedMenuItem(e.target.value)}
                  className="flex h-10 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="">Select menu item...</option>
                  {menuItems.filter(m => m.isAvailable).map((item) => (
                    <option key={item.id} value={item.id}>{item.name} — ${Number(item.price).toFixed(2)}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={() => { if (selectedMenuItem) { addOrderItem(selectedMenuItem); setSelectedMenuItem(""); } }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newOrderItems.length > 0 && (
                <div className="space-y-1 border border-border rounded-md p-2">
                  {newOrderItems.map((item) => (
                    <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateOrderItemQty(item.menuItemId, -1)} className="h-6 w-6 rounded border flex items-center justify-center">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => updateOrderItemQty(item.menuItemId, 1)} className="h-6 w-6 rounded border flex items-center justify-center">
                          <Plus className="h-3 w-3" />
                        </button>
                        <span className="text-text-muted w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={createOrderMutation.isPending || newOrderItems.length === 0}>
              {createOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Order
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


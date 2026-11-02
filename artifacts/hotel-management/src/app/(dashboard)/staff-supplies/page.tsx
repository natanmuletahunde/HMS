"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Search, PackageCheck, AlertTriangle, XCircle, 
  CheckCircle2, Clock, Check, Send, Sparkles, UtensilsCrossed, 
  Boxes, RefreshCw, Trash2
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { normalizeRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type StaffSupplyItem = {
  id: string;
  itemId: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: "adequate" | "running_low" | "depleted";
  locationId: string;
  locationCode: string;
  locationName: string;
  locationType: string;
};

type FloorRequisitionItem = {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  unit: string;
  requestedQty: number;
  issuedQty?: number;
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
  items: FloorRequisitionItem[];
};

export default function StaffSuppliesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userRole = normalizeRole(user?.role || (user as any)?.roleName);
  
  // Default department based on user role
  const defaultDept = userRole === "waiter" || userRole === "restaurant_manager" ? "waiter" : "housekeeping";
  const [department, setDepartment] = useState<string>(defaultDept);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<"inventory" | "requisitions">("inventory");

  // Requisition Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; requestedQty: number }>>([]);
  const [requestNotes, setRequestNotes] = useState("");

  // Query: Staff supplies
  const queryParams = new URLSearchParams();
  if (department !== "all") queryParams.set("department", department);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search.trim()) queryParams.set("search", search.trim());

  const { data: rawSupplies = [], isLoading: suppliesLoading } = useQuery<any>({
    queryKey: ["staff-supplies", department, statusFilter, search],
    queryFn: () => apiFetch<StaffSupplyItem[]>(`/inventory/staff-supplies?${queryParams.toString()}`),
  });

  const supplies: StaffSupplyItem[] = useMemo(() => {
    const list = Array.isArray(rawSupplies) ? rawSupplies : ((rawSupplies as any)?.data || []);
    return list.map((item: any) => ({
      ...item,
      currentStock: item.currentStock ?? item.currentLevel ?? 0,
      minStock: item.minStock ?? item.minRequired ?? 0,
    }));
  }, [rawSupplies]);

  // Query: Requisitions history
  const reqQueryParams = new URLSearchParams();
  if (department !== "all") reqQueryParams.set("department", department);

  const { data: rawRequisitions = [], isLoading: requisitionsLoading } = useQuery<any>({
    queryKey: ["floor-requisitions", department],
    queryFn: () => apiFetch<FloorRequisition[]>(`/inventory/floor-requisitions?${reqQueryParams.toString()}`),
    enabled: activeView === "requisitions",
  });

  const requisitions: FloorRequisition[] = useMemo(() => {
    return Array.isArray(rawRequisitions) ? rawRequisitions : ((rawRequisitions as any)?.data || []);
  }, [rawRequisitions]);

  const suppliesPagination = usePagination(supplies, 5);
  const requisitionsPagination = usePagination(requisitions, 5);

  // Auto-reset page to 1 when filters or tabs change
  useEffect(() => {
    suppliesPagination.setCurrentPage(1);
  }, [department, statusFilter, search]);

  useEffect(() => {
    requisitionsPagination.setCurrentPage(1);
  }, [department, activeView]);

  // Create Requisition Mutation
  const createRequisitionMutation = useMutation({
    mutationFn: (body: any) =>
      apiFetch("/inventory/floor-requisitions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["staff-supplies"] });
      setIsRequestModalOpen(false);
      setSelectedItems([]);
      setRequestNotes("");
      toast({
        title: "Requisition Submitted",
        description: "Your supply request was dispatched to the Store Coordinator.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to create requisition",
        variant: "destructive",
      });
    },
  });

  // Quick single-item request trigger
  const handleQuickRequest = (item: StaffSupplyItem) => {
    const recommendedQty = Math.max(1, (item.minStock * 2) - item.currentStock);
    setSelectedItems([{ itemId: item.itemId, requestedQty: recommendedQty }]);
    setIsRequestModalOpen(true);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = supplies.length;
    const adequate = supplies.filter((s) => s.status === "adequate").length;
    const runningLow = supplies.filter((s) => s.status === "running_low").length;
    const depleted = supplies.filter((s) => s.status === "depleted").length;
    return { total, adequate, runningLow, depleted };
  }, [supplies]);

  const handleSubmitRequisition = () => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", description: "Please add at least one item to request.", variant: "destructive" });
      return;
    }
    const hasInvalidQty = selectedItems.some((i) => !i.requestedQty || i.requestedQty <= 0);
    if (hasInvalidQty) {
      toast({ title: "Invalid quantities", description: "All requested quantities must be greater than 0.", variant: "destructive" });
      return;
    }

    createRequisitionMutation.mutate({
      department,
      requestedBy: user?.name || user?.email || "Frontline Staff",
      notes: requestNotes.trim() || undefined,
      items: selectedItems,
    });
  };

  const addItemToRequisition = (itemId: string) => {
    if (selectedItems.some((i) => i.itemId === itemId)) return;
    const itm = supplies.find((s) => s.itemId === itemId);
    const defaultQty = itm ? Math.max(1, itm.minStock - itm.currentStock) : 1;
    setSelectedItems((prev) => [...prev, { itemId, requestedQty: defaultQty }]);
  };

  const removeItemFromRequisition = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, requestedQty: qty } : i))
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Frontline Supplies</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setSelectedItems([]);
              setRequestNotes("");
              setIsRequestModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-medium px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4 stroke-[2.5]" />
            Request Supplies
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Tracked Supplies"
          value={stats.total}
          loading={suppliesLoading}
          icon={Boxes}
          variant="default"
        />
        <StatCard
          title="Adequate Stock"
          value={stats.adequate}
          loading={suppliesLoading}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Running Low"
          value={stats.runningLow}
          loading={suppliesLoading}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Depleted / Empty"
          value={stats.depleted}
          loading={suppliesLoading}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface/40 p-2.5 rounded-lg border border-border">
        {/* Department & View Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => { setActiveView("inventory"); setDepartment("housekeeping"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === "inventory" && department === "housekeeping"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Housekeeping Floor
          </button>
          <button
            onClick={() => { setActiveView("inventory"); setDepartment("waiter"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === "inventory" && department === "waiter"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Dining & Waiters
          </button>
          <button
            onClick={() => setActiveView("requisitions")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeView === "requisitions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            My Requests
          </button>
        </div>

        {/* Search & Status Filters (for inventory view) */}
        {activeView === "inventory" && (
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32 bg-surface border-border">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="adequate">Adequate</SelectItem>
                <SelectItem value="running_low">Running Low</SelectItem>
                <SelectItem value="depleted">Depleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeView === "inventory" ? (
        <Card className="border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-surface/80">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Item</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Category</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Location</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3 text-right">Floor Stock</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3 text-center">Status</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliesLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : supplies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-text-muted text-sm">
                    No items found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                suppliesPagination.paginatedItems.map((item) => {
                  return (
                    <TableRow key={item.id} className="border-border hover:bg-surface/50 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-medium text-sm text-text">{item.name}</div>
                        <div className="text-xs text-text-muted font-mono">{item.itemCode}</div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-text-muted font-medium">
                        {item.category}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                          {item.locationName}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className="font-bold text-sm text-text">{item.currentStock}</span>
                        <span className="text-xs text-text-muted ml-1">{item.unit}</span>
                        <div className="text-[11px] text-text-muted">Min: {item.minStock}</div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {item.status === "adequate" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                            Adequate
                          </Badge>
                        )}
                        {item.status === "running_low" && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-0.5 font-medium animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                            Running Low
                          </Badge>
                        )}
                        {item.status === "depleted" && (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs px-2.5 py-0.5 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                            Depleted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          size="sm"
                          variant={item.status !== "adequate" ? "default" : "outline"}
                          className={`h-7 px-2.5 text-xs font-medium ${
                            item.status === "depleted"
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : item.status === "running_low"
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : ""
                          }`}
                          onClick={() => handleQuickRequest(item)}
                        >
                          Request Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={suppliesPagination.currentPage}
            totalPages={suppliesPagination.totalPages}
            totalItems={suppliesPagination.totalItems}
            pageSize={5}
            onPrev={suppliesPagination.onPrev}
            onNext={suppliesPagination.onNext}
          />
        </Card>
      ) : (
        /* Requisitions History View */
        <Card className="border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-surface/80">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Requisition #</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Requested By</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Items Requested</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3">Date</TableHead>
                <TableHead className="font-semibold text-xs text-text-muted uppercase tracking-wider py-3 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitionsLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : requisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-text-muted text-sm">
                    No requisitions recorded for this department yet.
                  </TableCell>
                </TableRow>
              ) : (
                requisitionsPagination.paginatedItems.map((req) => (
                  <TableRow key={req.id} className="border-border hover:bg-surface/50">
                    <TableCell className="font-mono text-xs font-semibold text-primary py-3">
                      {req.requisitionNumber}
                    </TableCell>
                    <TableCell className="text-xs text-text py-3">
                      <div className="font-medium">{req.requestedBy}</div>
                      <div className="text-[11px] text-text-muted capitalize">{req.department}</div>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="space-y-1">
                        {req.items?.map((itm) => (
                          <div key={itm.id} className="text-text-muted text-xs">
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
                      <span className="text-[11px]">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {req.status === "pending" && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-2.5 py-0.5">
                          Pending Coordinator
                        </Badge>
                      )}
                      {req.status === "issued" && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5">
                          Issued & Delivered
                        </Badge>
                      )}
                      {req.status === "rejected" && (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs px-2.5 py-0.5">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={requisitionsPagination.currentPage}
            totalPages={requisitionsPagination.totalPages}
            totalItems={requisitionsPagination.totalItems}
            pageSize={5}
            onPrev={requisitionsPagination.onPrev}
            onNext={requisitionsPagination.onNext}
          />
        </Card>
      )}

      {/* Request Supplies Dialog */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              New Floor Supply Requisition
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Department selector */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="housekeeping">Housekeeping Floor</SelectItem>
                  <SelectItem value="waiter">Dining / Waiter Station</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Item Picker */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Add Item from Floor Catalog</label>
              <Select
                value=""
                onValueChange={(val) => {
                  if (val) addItemToRequisition(val);
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="-- Choose an item to add --" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {supplies.map((s) => (
                    <SelectItem key={s.itemId} value={s.itemId}>
                      {s.name} ({s.unit}) — Current Stock: {s.currentStock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected items table */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-muted block">Items to Request ({selectedItems.length})</label>
              {selectedItems.length === 0 ? (
                <div className="p-4 border border-dashed border-border rounded-lg text-center text-xs text-text-muted">
                  No items selected yet. Choose an item above or click &ldquo;Request Stock&rdquo; from the table.
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border max-h-48 overflow-y-auto">
                  {selectedItems.map((sel) => {
                    const itm = supplies.find((s) => s.itemId === sel.itemId);
                    return (
                      <div key={sel.itemId} className="p-2.5 flex items-center justify-between gap-3 bg-surface/30">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-xs text-text truncate">{itm?.name || "Item"}</div>
                          <div className="text-[11px] text-text-muted">
                            Current Stock: {itm?.currentStock} {itm?.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={sel.requestedQty}
                            onChange={(e) => updateItemQty(sel.itemId, Number(e.target.value))}
                            className="w-20 h-7 text-xs text-right"
                          />
                          <span className="text-xs text-text-muted">{itm?.unit}</span>
                          <button
                            type="button"
                            onClick={() => removeItemFromRequisition(sel.itemId)}
                            className="text-text-muted hover:text-rose-500 p-1 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Note to Coordinator (Optional)</label>
              <Textarea
                placeholder="e.g. Urgent morning replenishment for 3rd floor..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitRequisition}
              disabled={createRequisitionMutation.isPending || selectedItems.length === 0}
              className="bg-primary text-primary-foreground font-medium"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {createRequisitionMutation.isPending ? "Submitting..." : "Submit Requisition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

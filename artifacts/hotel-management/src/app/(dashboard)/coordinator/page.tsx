"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { 
  ChefHat, Clock, Send, RefreshCw, Bell, UserCheck, Calendar,
  Check, Search, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type CoordinatorOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  isComplimentary?: boolean;
};

type CoordinatorOrder = {
  id: string;
  orderNumber: string;
  tableNumber?: number | null;
  guestName?: string | null;
  diningCase?: "walk_in" | "in_house_table" | "room_service";
  roomNumber?: string | null;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  coordinatorId?: string | null;
  coordinatorName?: string | null;
  waiterId?: string | null;
  waiterName?: string | null;
  kitchenOfficerId?: string | null;
  kitchenOfficerName?: string | null;
  routedVia?: "coordinator" | "direct_kitchen";
  coordinatorStatus?: "pending" | "dispatched" | "qa_verified" | "bypassed";
  coordinatorNotes?: string | null;
  kitchenNotes?: string | null;
  notifiedParty?: "waiter" | "coordinator" | null;
  readyAt?: string | null;
  createdAt: string;
  items: CoordinatorOrderItem[];
};

export default function CoordinatorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Exactly two primary tabs reflecting the real restaurant coordinator flow
  const [activeTab, setActiveTab] = useState<"orders_from_waiter" | "ready_from_kitchen">("orders_from_waiter");
  
  // Tab 1 (Dispatch) State
  const [selectedOrder, setSelectedOrder] = useState<CoordinatorOrder | null>(null);
  const [coordinatorNotes, setCoordinatorNotes] = useState("");
  const [selectedStation, setSelectedStation] = useState<string>("Hot Line & Stoves");
  const [selectedPriority, setSelectedPriority] = useState<string>("normal");
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // Tab 2 (Food QA & Hand-Off) State
  const [qaOrder, setQaOrder] = useState<CoordinatorOrder | null>(null);
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [verifiedItemIds, setVerifiedItemIds] = useState<Record<string, boolean>>({});
  const [tempChecked, setTempChecked] = useState(true);
  const [presentationChecked, setPresentationChecked] = useState(true);
  const [qaNotes, setQaNotes] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState<"all" | "walk_in" | "in_house_table" | "room_service">("all");

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }, []);

  // Fetch all orders with 4s auto-refresh
  const { data: rawOrders = [], isFetching, refetch } = useQuery<CoordinatorOrder[]>({
    queryKey: ["coordinator-workbench-orders"],
    queryFn: () => apiFetch("/restaurant/orders"),
    refetchInterval: 4000,
  });

  // Cross-tab real-time sync for coordinator workbench
  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("hms_orders_channel");
      channel.onmessage = () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
      };
    } catch {}

    const handleSync = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
    };

    window.addEventListener("hms_order_sync", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("hms_order_sync", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refetch, queryClient]);

  // Coordinator Dispatch Mutation
  const dispatchMutation = useMutation({
    mutationFn: ({ id, notes, station, priority }: { id: string; notes?: string; station?: string; priority?: string }) =>
      apiFetch(`/restaurant/orders/${id}/dispatch-kitchen`, {
        method: "PATCH",
        body: JSON.stringify({
          coordinatorId: user?.id,
          notes: notes ? `[${priority === 'rush' ? 'RUSH • ' : ''}${station || 'Hot Line'}] ${notes}` : `Routed to ${station || 'Kitchen Station'}${priority === 'rush' ? ' (PRIORITY RUSH)' : ''}`,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
      queryClient.invalidateQueries({ queryKey: ["coordinator-dashboard-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("hms_order_sync"));
        try {
          const channel = new BroadcastChannel("hms_orders_channel");
          channel.postMessage({ type: "ORDER_DISPATCHED", timestamp: Date.now() });
          channel.close();
        } catch {}
      }
      setIsDispatchModalOpen(false);
      setSelectedOrder(null);
      setCoordinatorNotes("");
      toast({
        title: "Ticket Dispatched to Kitchen! 🍳",
        description: `Order forwarded to Kitchen for station: ${selectedStation}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Dispatch Failed", description: err.message, variant: "destructive" });
    },
  });

  // Notify Waiter / Mark Hand-off Mutation
  const handoffMutation = useMutation({
    mutationFn: ({ id, status, coordinatorStatus, notifiedParty, notes }: { id: string; status: string; coordinatorStatus?: string; notifiedParty?: string; notes?: string }) =>
      apiFetch(`/restaurant/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ 
          status,
          ...(coordinatorStatus ? { coordinatorStatus } : {}),
          ...(notifiedParty ? { notifiedParty } : {}),
          ...(notes ? { notes } : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
      queryClient.invalidateQueries({ queryKey: ["coordinator-dashboard-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("hms_order_sync"));
        try {
          const channel = new BroadcastChannel("hms_orders_channel");
          channel.postMessage({ type: "ORDER_HANDOFF", timestamp: Date.now() });
          channel.close();
        } catch {}
      }
    },
  });

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  // Default Mock Items for Coordinator Queue matching the 3 Hotel Dining Scenarios
  const defaultCoordinatorQueue: CoordinatorOrder[] = useMemo(() => [
    {
      id: "coord-101",
      orderNumber: "ORD-904",
      tableNumber: 4,
      diningCase: "walk_in",
      status: "pending",
      routedVia: "coordinator",
      coordinatorStatus: "pending",
      waiterName: "Helen (Server 1)",
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      items: [
        { id: "i1", name: "Grilled Beef Tenderloin", quantity: 2, unitPrice: 32, total: 64, notes: "Medium-rare, pepper sauce on side" },
        { id: "i2", name: "Caesar Salad", quantity: 1, unitPrice: 12, total: 12, notes: "No croutons" },
      ],
    },
    {
      id: "coord-102",
      orderNumber: "ORD-908",
      tableNumber: 2,
      guestName: "Abebe Bikila",
      diningCase: "in_house_table",
      roomNumber: "204",
      status: "pending",
      routedVia: "coordinator",
      coordinatorStatus: "pending",
      waiterName: "Dawit (Server 2)",
      createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      items: [
        { id: "i3", name: "Traditional Breakfast Combo", quantity: 2, unitPrice: 18, total: 36, isComplimentary: true },
        { id: "i4", name: "Fresh Orange Juice", quantity: 2, unitPrice: 5, total: 10 },
      ],
    },
    {
      id: "coord-103",
      orderNumber: "ORD-912",
      roomNumber: "305",
      diningCase: "room_service",
      status: "pending",
      routedVia: "coordinator",
      coordinatorStatus: "pending",
      waiterName: "In-Room Service Staff",
      createdAt: new Date(Date.now() - 11 * 60000).toISOString(),
      items: [
        { id: "i5", name: "Club Sandwich with Fries", quantity: 1, unitPrice: 16, total: 16, notes: "Crispy fries" },
        { id: "i6", name: "Iced Cappuccino", quantity: 1, unitPrice: 6, total: 6 },
      ],
    },
  ], []);

  // Default Pass Queue Mocks for Tab 2
  const defaultPassQueue: CoordinatorOrder[] = useMemo(() => [
    {
      id: "pass-201",
      orderNumber: "ORD-892",
      tableNumber: 7,
      diningCase: "walk_in",
      status: "ready",
      waiterName: "Helen (Server 1)",
      coordinatorStatus: "pending",
      kitchenNotes: "Plated under heat lamp station 2 • Extra napkins on tray",
      readyAt: new Date(Date.now() - 3 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      items: [
        { id: "p1", name: "Pan-Seared Salmon", quantity: 2, unitPrice: 28, total: 56, notes: "Lemon herb butter" },
        { id: "p2", name: "Mashed Potato", quantity: 2, unitPrice: 6, total: 12 },
      ],
    },
    {
      id: "pass-202",
      orderNumber: "ORD-887",
      roomNumber: "410",
      diningCase: "room_service",
      status: "ready",
      waiterName: "Room Delivery Runner",
      coordinatorStatus: "pending",
      kitchenNotes: "Covered tray with cloche dome • Temperature verified hot",
      readyAt: new Date(Date.now() - 6 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 28 * 60000).toISOString(),
      items: [
        { id: "p3", name: "Chicken Alfredo Fettuccine", quantity: 1, unitPrice: 22, total: 22, notes: "Extra parmesan" },
        { id: "p4", name: "Tiramisu Dessert", quantity: 1, unitPrice: 9, total: 9 },
      ],
    },
  ], []);

  // TAB 1: Incoming from waiter
  const pendingDispatch = useMemo(() => {
    const list = rawOrders.filter(
      (o) =>
        (o.status === "pending" || o.status === "preparing") &&
        (o.coordinatorStatus === "pending" || !o.coordinatorStatus)
    );
    if (list.length > 0) return list;
    return defaultCoordinatorQueue;
  }, [rawOrders, defaultCoordinatorQueue]);

  // TAB 2: Ready from kitchen at Pass
  const readyAtPass = useMemo(() => {
    const list = rawOrders.filter((o) => o.status === "ready");
    if (list.length > 0) return list;
    return defaultPassQueue;
  }, [rawOrders, defaultPassQueue]);

  // Filtered Tab 1 List
  const filteredPending = useMemo(() => {
    return pendingDispatch.filter((o) => {
      if (scenarioFilter !== "all" && o.diningCase !== scenarioFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.orderNumber || "").toLowerCase().includes(q) ||
        (o.guestName || "").toLowerCase().includes(q) ||
        String(o.tableNumber || "").includes(q) ||
        String(o.roomNumber || "").includes(q) ||
        (o.waiterName || "").toLowerCase().includes(q)
      );
    });
  }, [pendingDispatch, searchQuery, scenarioFilter]);

  // Filtered Tab 2 List
  const filteredReady = useMemo(() => {
    return readyAtPass.filter((o) => {
      if (scenarioFilter !== "all" && o.diningCase !== scenarioFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.orderNumber || "").toLowerCase().includes(q) ||
        (o.guestName || "").toLowerCase().includes(q) ||
        String(o.tableNumber || "").includes(q) ||
        String(o.roomNumber || "").includes(q) ||
        (o.waiterName || "").toLowerCase().includes(q)
      );
    });
  }, [readyAtPass, searchQuery, scenarioFilter]);

  // Pagination for both tables (Limit: 5)
  const pendingPagination = usePagination(filteredPending, 5);
  const readyPagination = usePagination(filteredReady, 5);

  // Auto-reset page when tab or filters change
  useEffect(() => {
    pendingPagination.setCurrentPage(1);
    readyPagination.setCurrentPage(1);
  }, [activeTab, scenarioFilter, searchQuery]);

  // Open Dispatch Modal
  const openDispatch = (order: CoordinatorOrder) => {
    setSelectedOrder(order);
    setCoordinatorNotes(order.coordinatorNotes || "");
    setSelectedStation("Hot Line & Stoves");
    setSelectedPriority("normal");
    setIsDispatchModalOpen(true);
  };

  // Open Food QA Inspection Modal
  const openQaModal = (order: CoordinatorOrder) => {
    setQaOrder(order);
    const initialChecked: Record<string, boolean> = {};
    order.items?.forEach((item) => {
      initialChecked[item.id] = false;
    });
    setVerifiedItemIds(initialChecked);
    setTempChecked(true);
    setPresentationChecked(true);
    setQaNotes("");
    setIsQaModalOpen(true);
  };

  const toggleItemVerified = (itemId: string) => {
    setVerifiedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const markAllItemsVerified = () => {
    if (!qaOrder?.items) return;
    const allChecked: Record<string, boolean> = {};
    qaOrder.items.forEach((it) => {
      allChecked[it.id] = true;
    });
    setVerifiedItemIds(allChecked);
  };

  const allItemsChecked = useMemo(() => {
    if (!qaOrder?.items || qaOrder.items.length === 0) return true;
    return qaOrder.items.every((it) => verifiedItemIds[it.id]);
  }, [qaOrder, verifiedItemIds]);

  const handleVerifyAndPageWaiter = () => {
    if (!qaOrder) return;
    
    if (qaOrder.id.startsWith("pass-")) {
      toast({
        title: "Food Accuracy Verified ✓ Floor Server Paged",
        description: `Verified all dishes for ${qaOrder.tableNumber ? `Table #${qaOrder.tableNumber}` : `Room #${qaOrder.roomNumber}`}. Server ${qaOrder.waiterName || "Waiter"} alerted.`,
      });
      setIsQaModalOpen(false);
      return;
    }

    handoffMutation.mutate({
      id: qaOrder.id,
      status: "ready",
      coordinatorStatus: "qa_verified",
      notifiedParty: "waiter",
      notes: qaNotes.trim() ? `[QA Verified] ${qaNotes.trim()}` : "[QA Verified: Food matches guest order]",
    });

    toast({
      title: "Food Accuracy Verified ✓ Floor Server Paged",
      description: `Verified all dishes for ${qaOrder.tableNumber ? `Table #${qaOrder.tableNumber}` : `Room #${qaOrder.roomNumber}`}. Server ${qaOrder.waiterName || "Waiter"} alerted.`,
    });

    setIsQaModalOpen(false);
  };

  const handleMarkServed = (order: CoordinatorOrder) => {
    if (order.id.startsWith("pass-")) {
      toast({
        title: "Order Served to Guest ✓",
        description: `Order #${order.orderNumber} handed off and served. Ticket completed.`,
      });
      return;
    }

    handoffMutation.mutate({
      id: order.id,
      status: "served",
    });

    toast({
      title: "Order Served to Guest ✓",
      description: `Order #${order.orderNumber} served to guest. Dining cycle complete.`,
    });
  };

  const TABS = [
    { id: "orders_from_waiter", label: "Orders from Waiter (Dispatch) 🍳", count: pendingDispatch.length },
    { id: "ready_from_kitchen", label: "Ready from Kitchen (Pass & QA Check) 🛎️", count: readyAtPass.length },
  ] as const;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* HEADER: Identity, Date, User Status & Refresh                             */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-0.5">
            OPERATIONS
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
            Coordinator Operations
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 font-semibold shadow-xs">
              <Sparkles className="h-3.5 w-3.5" /> Dashboard →
            </Button>
          </Link>

          {/* Date Picker Pill */}
          <div className="bg-surface border border-border rounded-xl px-3 py-1 flex items-center gap-2 text-xs font-semibold text-text">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>{formattedDate}</span>
          </div>

          {/* Active Coordinator Pill */}
          <div className="bg-surface border border-border rounded-xl px-3 py-1 flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Coordinator: {user?.name || "Helen Haile"}</span>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="h-8 px-2.5 rounded-xl border border-border text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation: Clean 2-Tab Operational System */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === t.id 
                ? "border-[#0D9488] text-[#0D9488] font-bold" 
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <span>{t.label}</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
              activeTab === t.id ? "bg-[#0D9488]/15 text-[#0D9488] font-bold" : "bg-muted text-text-muted font-normal"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Scenario Filters Bar (Shared across both operational views) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search order #, table, room, or server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(["all", "walk_in", "in_house_table", "room_service"] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setScenarioFilter(sc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  scenarioFilter === sc
                    ? "bg-[#0D9488] text-white font-bold shadow-xs"
                    : "bg-white dark:bg-card border border-border text-slate-600 dark:text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {sc === "all" ? "All Scenarios" : sc === "walk_in" ? "Walk-In" : sc === "in_house_table" ? "In-House" : "Room Service"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDERS FROM WAITER (ORDER DISPATCH)                                 */}
      {/* ========================================================================= */}
      {activeTab === "orders_from_waiter" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-muted/50 text-[11px] uppercase font-bold text-slate-500">
                <TableRow>
                  <TableHead className="w-28">Order #</TableHead>
                  <TableHead className="w-28">Scenario</TableHead>
                  <TableHead className="w-24">Location</TableHead>
                  <TableHead className="w-32">Server / Waiter</TableHead>
                  <TableHead>Ordered Dishes & Special Requests</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="w-36 text-right">Dispatch Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {pendingPagination.paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-text-muted">
                      No incoming tickets pending dispatch under this filter. All caught up!
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPagination.paginatedItems.map((ord) => {
                    const elapsed = getElapsedMinutes(ord.createdAt);
                    const isUrgent = elapsed >= 8;
                    const isRoom = ord.diningCase === "room_service";
                    const isInHouse = ord.diningCase === "in_house_table";

                    return (
                      <TableRow key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-muted/30">
                        <TableCell>
                          <div className="font-mono font-bold text-slate-900 dark:text-foreground">
                            {ord.orderNumber.startsWith("ORD-") ? ord.orderNumber : `#${ord.orderNumber}`}
                          </div>
                          <div className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
                            isUrgent ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-400"
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{elapsed}m ago</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isRoom ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" :
                            isInHouse ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" :
                            "bg-slate-100 text-slate-700 dark:bg-muted dark:text-slate-300"
                          }`}>
                            {isRoom ? "Room Service" : isInHouse ? "In-House" : "Walk-In"}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-[#0D9488]">
                          {ord.tableNumber ? `Table #${ord.tableNumber}` : ord.roomNumber ? `Room #${ord.roomNumber}` : "Bar / Direct"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-muted-foreground">
                          {ord.waiterName || "Floor Server"}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800 dark:text-foreground">
                            {ord.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ") || "Standard Dishes"}
                          </div>
                          <div className="text-[11px] text-text-muted mt-0.5">
                            {isInHouse && ord.guestName && (
                              <span className="mr-2 font-medium">Guest: {ord.guestName}</span>
                            )}
                            {ord.items?.some(i => i.notes) && (
                              <span className="text-amber-600 ml-2 font-medium">
                                • Notes: {ord.items.filter(i => i.notes).map(i => `${i.name}: ${i.notes}`).join(", ")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Awaiting Review
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openDispatch(ord)}
                            className="h-8 px-3.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs gap-1.5 shadow-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Review & Dispatch →</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={pendingPagination.currentPage}
              totalPages={pendingPagination.totalPages}
              totalItems={pendingPagination.totalItems}
              pageSize={5}
              onPrev={pendingPagination.onPrev}
              onNext={pendingPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: READY FROM KITCHEN (PASS & QUALITY ASSURANCE CHECK)                 */}
      {/* ========================================================================= */}
      {activeTab === "ready_from_kitchen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-foreground">
                Heat Pass & Food Quality Verification 🛎️
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Plated dishes waiting under heat lamps. Verify that food accurately matches what the guest ordered before handing off to the server.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted">Pass Tickets:</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-mono font-bold">
                {readyAtPass.length} Ready at Pass
              </Badge>
            </div>
          </div>

          <div className="bg-white dark:bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-muted/50 text-[11px] uppercase font-bold text-slate-500">
                <TableRow>
                  <TableHead className="w-28">Order #</TableHead>
                  <TableHead className="w-28">Scenario</TableHead>
                  <TableHead className="w-24">Location</TableHead>
                  <TableHead className="w-32">Server / Runner</TableHead>
                  <TableHead>Plated Dishes from Kitchen</TableHead>
                  <TableHead className="w-32 text-center">Heat Pass Timer</TableHead>
                  <TableHead className="w-32 text-center">QA Status</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {readyPagination.paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-text-muted">
                      No plated tickets waiting at the pass right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  readyPagination.paginatedItems.map((ord) => {
                    const elapsed = getElapsedMinutes(ord.readyAt || ord.createdAt);
                    const isUrgent = elapsed >= 5;
                    const isRoom = ord.diningCase === "room_service";
                    const isInHouse = ord.diningCase === "in_house_table";
                    const isQaVerified = ord.coordinatorStatus === "qa_verified";

                    return (
                      <TableRow key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-muted/30">
                        <TableCell>
                          <div className="font-mono font-bold text-slate-900 dark:text-foreground">
                            {ord.orderNumber.startsWith("ORD-") ? ord.orderNumber : `#${ord.orderNumber}`}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            Guest: {ord.guestName || "Guest"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isRoom ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" :
                            isInHouse ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" :
                            "bg-slate-100 text-slate-700 dark:bg-muted dark:text-slate-300"
                          }`}>
                            {isRoom ? "Room Service" : isInHouse ? "In-House" : "Walk-In"}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-[#0D9488]">
                          {ord.tableNumber ? `Table #${ord.tableNumber}` : ord.roomNumber ? `Room #${ord.roomNumber}` : "Pass"}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-muted-foreground">
                          {ord.waiterName || "Floor Server"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {ord.items?.map((it, idx) => (
                              <div key={idx} className="font-medium text-slate-800 dark:text-foreground">
                                <span className="text-emerald-600 font-bold mr-1">{it.quantity}x</span>
                                {it.name}
                                {it.notes && (
                                  <span className="text-[11px] text-amber-600 ml-1.5 italic">({it.notes})</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {ord.kitchenNotes && (
                            <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-1">
                              <strong>Chef Note:</strong> {ord.kitchenNotes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            isUrgent 
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse border border-amber-300" 
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{elapsed}m at pass</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isQaVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              QA Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Awaiting QA
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openQaModal(ord)}
                              className="h-8 px-2.5 text-xs font-semibold gap-1 text-slate-700 dark:text-foreground hover:bg-slate-50"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                              <span>Inspect Food 🔍</span>
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleMarkServed(ord)}
                              className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Served ✓</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={readyPagination.currentPage}
              totalPages={readyPagination.totalPages}
              totalItems={readyPagination.totalItems}
              pageSize={5}
              onPrev={readyPagination.onPrev}
              onNext={readyPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DISPATCH TO KITCHEN MODAL                                         */}
      {/* ========================================================================= */}
      <Dialog open={isDispatchModalOpen} onOpenChange={setIsDispatchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ChefHat className="h-5 w-5 text-teal-600" />
              <span>Validate & Forward Ticket #{selectedOrder?.orderNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-200/60 dark:border-border space-y-1">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Order #{selectedOrder.orderNumber}</span>
                  <span className="text-[#0D9488] font-mono">
                    {selectedOrder.diningCase === "room_service" ? `Room #${selectedOrder.roomNumber}` : `Table #${selectedOrder.tableNumber || 1}`}
                  </span>
                </div>
                <p className="text-slate-400">
                  Guest: <span className="font-semibold text-slate-900 dark:text-foreground">{selectedOrder.guestName || "Walk-in Guest"}</span> • Server: <span className="font-semibold text-slate-900 dark:text-foreground">{selectedOrder.waiterName || "Floor Waiter"}</span>
                </p>
                <div className="pt-2 border-t border-slate-200/40 text-[11px] text-slate-600 dark:text-muted-foreground">
                  Dishes: {selectedOrder.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                </div>
              </div>

              {/* Station Selector */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-foreground">Assign Kitchen Station Line</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select station line" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hot Line & Stoves">🍳 Hot Line & Stoves (Steaks, Soups, Hot Entrees)</SelectItem>
                    <SelectItem value="Grill & Fryer">🔥 Grill & Fryer (Burgers, Fries, BBQ)</SelectItem>
                    <SelectItem value="Cold Pantry & Salads">🥗 Cold Pantry & Salads (Salads, Starters, Cold Platters)</SelectItem>
                    <SelectItem value="Beverage & Bar">🍹 Beverage & Bar (Fresh Juices, Mocktails, Coffee)</SelectItem>
                    <SelectItem value="Bakery & Dessert">🍰 Bakery & Dessert (Pastries, Cakes, Desserts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-foreground">Expediting Priority</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPriority("normal")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      selectedPriority === "normal"
                        ? "border-[#0D9488] bg-teal-50 text-teal-800 font-bold"
                        : "border-border hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    Standard Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriority("rush")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      selectedPriority === "rush"
                        ? "border-amber-500 bg-amber-50 text-amber-800 font-bold"
                        : "border-border hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    ⚡ VIP / Rush Ticket
                  </button>
                </div>
              </div>

              {/* Coordinator Notes */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-foreground">Coordinator Instructions / Plating Alert</Label>
                <Textarea
                  placeholder="e.g. VIP guest, prioritize steak temperature medium-rare; alert pass runner once plated."
                  value={coordinatorNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCoordinatorNotes(e.target.value)}
                  rows={3}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold"
              onClick={() => {
                if (selectedOrder) {
                  if (selectedOrder.id.startsWith("coord-")) {
                    toast({
                      title: "Ticket Dispatched to Kitchen! 🍳",
                      description: `Order ${selectedOrder.orderNumber} routed to ${selectedStation}.`,
                    });
                    setIsDispatchModalOpen(false);
                    setSelectedOrder(null);
                  } else {
                    dispatchMutation.mutate({
                      id: selectedOrder.id,
                      notes: coordinatorNotes.trim() || undefined,
                      station: selectedStation,
                      priority: selectedPriority,
                    });
                  }
                }
              }}
              disabled={dispatchMutation.isPending}
            >
              {dispatchMutation.isPending ? "Dispatching..." : "Approve & Send to Kitchen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: FOOD QUALITY & ACCURACY CHECK (PASS INSPECTION MODAL)             */}
      {/* ========================================================================= */}
      <Dialog open={isQaModalOpen} onOpenChange={setIsQaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <span>Food Quality & Accuracy Check</span>
            </DialogTitle>
          </DialogHeader>

          {qaOrder && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-muted/40 border border-teal-200/60 dark:border-border space-y-1">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Ticket #{qaOrder.orderNumber}</span>
                  <span className="text-[#0D9488] font-mono">
                    {qaOrder.diningCase === "room_service" ? `Room #${qaOrder.roomNumber}` : `Table #${qaOrder.tableNumber || 1}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-text-muted">
                  <span>Guest: <strong className="text-slate-800 dark:text-foreground">{qaOrder.guestName || "Guest"}</strong></span>
                  <span>Server: <strong className="text-slate-800 dark:text-foreground">{qaOrder.waiterName || "Floor Waiter"}</strong></span>
                </div>
                {qaOrder.kitchenNotes && (
                  <div className="pt-1.5 border-t border-teal-200/40 text-[11px] text-teal-800 dark:text-teal-300">
                    <strong>Pass Note from Chef:</strong> {qaOrder.kitchenNotes}
                  </div>
                )}
              </div>

              {/* Interactive Dish Accuracy Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-800 dark:text-foreground uppercase tracking-wider text-[11px]">
                    Verify Plated Dishes Match Order
                  </Label>
                  <button
                    type="button"
                    onClick={markAllItemsVerified}
                    className="text-[11px] font-semibold text-teal-600 hover:underline cursor-pointer"
                  >
                    Select All Verified ✓
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {qaOrder.items?.map((it) => {
                    const isChecked = !!verifiedItemIds[it.id];
                    return (
                      <div
                        key={it.id}
                        onClick={() => toggleItemVerified(it.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked 
                            ? "bg-teal-50/80 border-teal-400 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200" 
                            : "bg-slate-50 dark:bg-muted/30 border-border text-slate-700 dark:text-muted-foreground hover:bg-slate-100/60"
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>{it.quantity}x {it.name}</span>
                            <span className="font-mono text-[11px] text-text-muted">${it.total}</span>
                          </div>
                          {it.notes ? (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                              ★ Guest Request: {it.notes}
                            </div>
                          ) : (
                            <div className="text-[10px] text-text-muted">Standard Chef Recipe</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temperature & Presentation Safety Checks */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-muted/30 border border-border space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-800 dark:text-foreground">
                  <input
                    type="checkbox"
                    checked={tempChecked}
                    onChange={(e) => setTempChecked(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Plating temperature and appearance verified hot & fresh</span>
                </label>

                {qaOrder.diningCase === "room_service" && (
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-slate-800 dark:text-foreground">
                    <input
                      type="checkbox"
                      checked={presentationChecked}
                      onChange={(e) => setPresentationChecked(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Room Service tray cover / cloche dome secured</span>
                  </label>
                )}
              </div>

              {/* Optional Expediter QA Note */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-text-muted">Expediter Note to Waiter (Optional)</Label>
                <Input
                  placeholder="e.g. Steak knife on side; take immediately to Table 4"
                  value={qaNotes}
                  onChange={(e) => setQaNotes(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsQaModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleVerifyAndPageWaiter}
              disabled={!allItemsChecked || !tempChecked}
              className={`font-bold text-xs gap-1.5 ${
                allItemsChecked && tempChecked
                  ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Verify & Page Waiter ({qaOrder?.waiterName || "Server"})</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

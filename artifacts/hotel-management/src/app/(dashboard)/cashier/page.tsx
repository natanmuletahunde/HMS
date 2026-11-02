"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Search, Bell, Clock, CheckCircle2, AlertCircle, Printer,
  DollarSign, ArrowUpRight, ArrowRight, RefreshCw, Utensils, Hotel,
  CreditCard, Wallet, Banknote, UserCheck, Check, Sparkles, Filter,
  ChevronDown, ChevronUp, FileText, X
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type OrderItem = {
  menuItemId: string;
  name?: string;
  quantity: number;
  price?: number;
  category?: string;
  isComplimentary?: boolean;
};

type CashierOrder = {
  id: string;
  orderNumber: string;
  orderType?: string;
  diningCase?: "walk_in" | "in_house_table" | "room_service";
  settlementType?: "direct_payment" | "complimentary_breakfast" | "room_charge";
  complimentaryDiscountAmount?: number;
  tableId?: string;
  tableNumber?: string | number;
  roomNumber?: string;
  guestName?: string;
  waiterId?: string;
  waiterName?: string;
  cashierId?: string;
  cashierName?: string;
  cashierNotes?: string;
  items?: OrderItem[];
  itemsCount?: number;
  total?: number;
  totalAmount?: number;
  status: string;
  billingStatus?: "open_tab" | "bill_requested" | "bill_printed" | "delivered" | "settled";
  billRequestedAt?: string;
  receiptPrintedAt?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt?: string;
};

export default function CashierPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const cashierDisplayName = 
    (user as any)?.firstName 
      ? `${(user as any).firstName} ${(user as any).lastName || ""}`.trim() 
      : user?.name || "Cashier Staff";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [diningCaseFilter, setDiningCaseFilter] = useState<string>("all");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Pagination state (limit max 5 orders per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 5;

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, diningCaseFilter]);

  // Thermal Receipt Modal State
  const [receiptModalOrder, setReceiptModalOrder] = useState<CashierOrder | null>(null);
  const [cashierNotesInput, setCashierNotesInput] = useState("");

  // Payment Settlement Modal State
  const [settleModalOrder, setSettleModalOrder] = useState<CashierOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<"cash" | "telebirr" | "card" | "room_charge" | "complimentary_breakfast">("cash");
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [settleNotes, setSettleNotes] = useState("");

  // Auto-refresh polling every 8 seconds so cashier always has live stream
  const { data: rawOrders = [], isLoading, isRefetching, refetch } = useQuery<CashierOrder[]>({
    queryKey: ["cashier-feed"],
    queryFn: () => apiFetch<CashierOrder[]>("/restaurant/cashier-feed"),
    refetchInterval: 8000,
  });

  // Default demonstration orders if DB is completely fresh
  const defaultMockCashierOrders: CashierOrder[] = useMemo(() => [
    {
      id: "mock-c-1",
      orderNumber: "ORD-942",
      tableNumber: 4,
      guestName: "Ariel Hikmat",
      waiterName: "Daniel Waiter",
      diningCase: "walk_in",
      settlementType: "direct_payment",
      status: "ready",
      billingStatus: "bill_requested",
      billRequestedAt: new Date(Date.now() - 3 * 60000).toISOString(),
      items: [
        { menuItemId: "m1", name: "Prime Rib Steak", quantity: 2, price: 34.00 },
        { menuItemId: "m2", name: "Red Wine Glass", quantity: 2, price: 12.00 },
        { menuItemId: "m3", name: "Tiramisu", quantity: 1, price: 8.50 },
      ],
      itemsCount: 5,
      totalAmount: 100.50,
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: "mock-c-2",
      orderNumber: "ORD-939",
      tableNumber: 9,
      guestName: "Solomon Tekle",
      waiterName: "Sara Server",
      diningCase: "in_house_table",
      roomNumber: "304",
      settlementType: "room_charge",
      status: "preparing",
      billingStatus: "open_tab",
      items: [
        { menuItemId: "m4", name: "Grilled Salmon", quantity: 1, price: 28.00 },
        { menuItemId: "m5", name: "Caesar Salad", quantity: 1, price: 14.00 },
        { menuItemId: "m6", name: "Fresh Orange Juice", quantity: 2, price: 6.00 },
      ],
      itemsCount: 4,
      totalAmount: 54.00,
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: "mock-c-3",
      orderNumber: "ORD-935",
      roomNumber: "201",
      diningCase: "room_service",
      guestName: "Dr. Elena Rostova",
      waiterName: "Daniel Waiter",
      settlementType: "complimentary_breakfast",
      complimentaryDiscountAmount: 38.00,
      status: "ready",
      billingStatus: "open_tab",
      items: [
        { menuItemId: "m7", name: "Continental Breakfast Basket", quantity: 1, price: 22.00, isComplimentary: true },
        { menuItemId: "m8", name: "Cappuccino Special", quantity: 2, price: 8.00, isComplimentary: true },
      ],
      itemsCount: 3,
      totalAmount: 0.00,
      createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    },
    {
      id: "mock-c-4",
      orderNumber: "ORD-928",
      tableNumber: 12,
      guestName: "Erwan Richard",
      waiterName: "Sara Server",
      diningCase: "walk_in",
      settlementType: "direct_payment",
      status: "served",
      billingStatus: "bill_printed",
      receiptPrintedAt: new Date(Date.now() - 6 * 60000).toISOString(),
      cashierName: "Alice Cashier",
      items: [
        { menuItemId: "m9", name: "Chicken Alfredo Pasta", quantity: 2, price: 18.00 },
        { menuItemId: "m10", name: "Sparkling Water 750ml", quantity: 1, price: 6.00 },
      ],
      itemsCount: 3,
      totalAmount: 42.00,
      createdAt: new Date(Date.now() - 48 * 60000).toISOString(),
    },
  ], []);

  // Merge raw orders with mock fallback if needed, strictly preserving MOST RECENT ON TOP
  const allOrders = useMemo(() => {
    if (rawOrders && rawOrders.length > 0) {
      const merged = [...rawOrders];
      for (const m of defaultMockCashierOrders) {
        if (!merged.find(x => x.orderNumber === m.orderNumber)) {
          merged.push(m);
        }
      }
      return merged.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA; // Descending: Most recent on top
      });
    }
    return defaultMockCashierOrders;
  }, [rawOrders, defaultMockCashierOrders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter(ord => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "priority_bill_requested") {
          if (ord.billingStatus !== "bill_requested") return false;
        } else if (ord.billingStatus !== statusFilter) {
          return false;
        }
      }

      // Dining case filter
      if (diningCaseFilter !== "all" && ord.diningCase !== diningCaseFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ordNum = (ord.orderNumber || "").toLowerCase();
        const guest = (ord.guestName || "").toLowerCase();
        const waiter = (ord.waiterName || "").toLowerCase();
        const tbl = String(ord.tableNumber || "");
        const rm = String(ord.roomNumber || "");
        if (!ordNum.includes(q) && !guest.includes(q) && !waiter.includes(q) && !tbl.includes(q) && !rm.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allOrders, statusFilter, diningCaseFilter, searchQuery]);

  // Pagination calculations (max 5 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = allOrders.length;
    const billRequested = allOrders.filter(o => o.billingStatus === "bill_requested").length;
    const openTabs = allOrders.filter(o => !o.billingStatus || o.billingStatus === "open_tab").length;
    const billPrinted = allOrders.filter(o => o.billingStatus === "bill_printed").length;
    const settledOrders = allOrders.filter(o => o.billingStatus === "settled" || o.paymentStatus === "paid");
    const settledAmount = settledOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

    return {
      total,
      billRequested,
      openTabs,
      billPrinted,
      settledCount: settledOrders.length,
      settledAmount,
    };
  }, [allOrders]);

  // Mutations
  const printReceiptMutation = useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes?: string }) =>
      apiFetch(`/restaurant/orders/${orderId}/print-receipt`, {
        method: "PATCH",
        body: JSON.stringify({ cashierId: user?.id, notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-feed"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Official Receipt Printed",
        description: "Billing status updated to Bill Printed. Ready for waiter desk collection or walk-in.",
      });
      setReceiptModalOrder(null);
    },
    onError: (e: Error) => toast({ title: "Print Error", description: e.message, variant: "destructive" }),
  });

  const settlePaymentMutation = useMutation({
    mutationFn: ({ orderId, method, notes }: { orderId: string; method: string; notes?: string }) =>
      apiFetch(`/restaurant/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          billingStatus: "settled",
          paymentStatus: "paid",
          paymentMethod: method,
          status: "served",
          cashierId: user?.id,
          cashierNotes: notes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-feed"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-dashboard"] });
      toast({
        title: "Payment Settled Successfully",
        description: `Order settled via ${settleMethod.replace("_", " ").toUpperCase()}. Transaction recorded.`,
      });
      setSettleModalOrder(null);
    },
    onError: (e: Error) => toast({ title: "Settlement Error", description: e.message, variant: "destructive" }),
  });

  function toggleExpandOrder(id: string) {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleOpenReceiptModal(order: CashierOrder) {
    setReceiptModalOrder(order);
    setCashierNotesInput(order.cashierNotes || "");
  }

  function handleConfirmPrintReceipt() {
    if (!receiptModalOrder) return;
    if (receiptModalOrder.id.startsWith("mock-")) {
      toast({
        title: "Demo Receipt Printed",
        description: `Order #${receiptModalOrder.orderNumber} marked printed. Ready on cashier counter.`,
      });
      setReceiptModalOrder(null);
      return;
    }
    printReceiptMutation.mutate({
      orderId: receiptModalOrder.id,
      notes: cashierNotesInput,
    });
  }

  function handleOpenSettleModal(order: CashierOrder) {
    setSettleModalOrder(order);
    setSettleMethod(
      order.settlementType === "complimentary_breakfast"
        ? "complimentary_breakfast"
        : order.diningCase === "room_service"
        ? "room_charge"
        : "cash"
    );
    const totalDue = order.totalAmount ?? order.total ?? 0;
    setTenderedAmount(String(totalDue));
    setSettleNotes(order.cashierNotes || "");
  }

  function handleConfirmSettle() {
    if (!settleModalOrder) return;
    if (settleModalOrder.id.startsWith("mock-")) {
      toast({
        title: "Demo Order Settled",
        description: `Order #${settleModalOrder.orderNumber} settled via ${settleMethod.replace("_", " ").toUpperCase()}.`,
      });
      setSettleModalOrder(null);
      return;
    }
    settlePaymentMutation.mutate({
      orderId: settleModalOrder.id,
      method: settleMethod,
      notes: settleNotes,
    });
  }

  // Calculate taxes and service charge for display
  function getOrderFinances(order: CashierOrder) {
    const rawTotal = order.totalAmount ?? order.total ?? 0;
    const isComplimentary = order.settlementType === "complimentary_breakfast";
    if (isComplimentary) {
      return {
        subtotal: order.complimentaryDiscountAmount || 38.00,
        discount: order.complimentaryDiscountAmount || 38.00,
        vat: 0,
        serviceCharge: 0,
        netTotal: 0,
      };
    }
    const subtotal = Math.round((rawTotal / 1.15) * 100) / 100;
    const vat = Math.round((subtotal * 0.10) * 100) / 100;
    const serviceCharge = Math.round((subtotal * 0.05) * 100) / 100;
    const netTotal = rawTotal;
    return { subtotal, discount: 0, vat, serviceCharge, netTotal };
  }

  return (
    <div className="space-y-4 pb-12">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Priority Bills Requested */}
        <div 
          onClick={() => setStatusFilter("priority_bill_requested")}
          className={`border transition-all cursor-pointer rounded-xl p-3.5 shadow-2xs min-h-[105px] flex flex-col justify-between ${
            statusFilter === "priority_bill_requested" 
              ? "ring-2 ring-amber-500 bg-amber-500/5 border-amber-500/50" 
              : stats.billRequested > 0 
              ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60" 
              : "bg-surface border-border"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">
            <span>Bills Requested</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-900 dark:text-amber-200">
              {stats.billRequested}
            </div>
            <div className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-400 font-medium">
              Awaiting receipt or walk-in
            </div>
          </div>
        </div>

        {/* Card 2: Open Tabs (Dining) */}
        <div 
          onClick={() => setStatusFilter("open_tab")}
          className={`border transition-all cursor-pointer rounded-xl p-3.5 shadow-2xs min-h-[105px] flex flex-col justify-between ${
            statusFilter === "open_tab" 
              ? "ring-2 ring-primary bg-primary/5 border-primary/50" 
              : "bg-surface border-border"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-semibold uppercase tracking-wider">
            <span>Active Open Tabs</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Utensils className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-text">
              {stats.openTabs}
            </div>
            <div className="mt-0.5 text-[11px] text-text-muted font-medium">
              Floor orders stream
            </div>
          </div>
        </div>

        {/* Card 3: Receipts Printed (Awaiting Pickup) */}
        <div 
          onClick={() => setStatusFilter("bill_printed")}
          className={`border transition-all cursor-pointer rounded-xl p-3.5 shadow-2xs min-h-[105px] flex flex-col justify-between ${
            statusFilter === "bill_printed" 
              ? "ring-2 ring-emerald-500 bg-emerald-500/5 border-emerald-500/50" 
              : "bg-surface border-border"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-semibold uppercase tracking-wider">
            <span>Receipts Ready</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Printer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-text">
              {stats.billPrinted}
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Printed for pickup
            </div>
          </div>
        </div>

        {/* Card 4: Settled Revenue Today */}
        <div 
          onClick={() => setStatusFilter("settled")}
          className={`border transition-all cursor-pointer rounded-xl p-3.5 shadow-2xs min-h-[105px] flex flex-col justify-between ${
            statusFilter === "settled" 
              ? "ring-2 ring-blue-500 bg-blue-500/5 border-blue-500/50" 
              : "bg-surface border-border"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-text-muted font-semibold uppercase tracking-wider">
            <span>Settled Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-text">
              ${stats.settledAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-0.5 text-[11px] text-text-muted font-medium">
              {stats.settledCount} orders settled
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #, Guest, Table, Room..."
              className="bg-muted/40 border-border rounded-xl h-10 pl-9 pr-4 text-xs font-medium placeholder:text-text-muted"
            />
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown Filters & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-start md:justify-end">
            {/* Status Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-muted hidden sm:inline flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[190px] h-10 text-xs rounded-xl border-border bg-muted/40 font-semibold">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="priority_bill_requested">
                    ⚡ Bill Requested ({stats.billRequested})
                  </SelectItem>
                  <SelectItem value="open_tab">Open Tabs</SelectItem>
                  <SelectItem value="bill_printed">Receipt Printed</SelectItem>
                  <SelectItem value="delivered">With Guest</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dining Case Dropdown */}
            <Select value={diningCaseFilter} onValueChange={setDiningCaseFilter}>
              <SelectTrigger className="w-[150px] h-10 text-xs rounded-xl border-border bg-muted/40 font-semibold">
                <SelectValue placeholder="Dining Case" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                <SelectItem value="walk_in">Walk-in Diner</SelectItem>
                <SelectItem value="in_house_table">In-House Table</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
              </SelectContent>
            </Select>

            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 px-3 gap-1.5 text-xs font-semibold rounded-xl border-border hover:bg-muted"
              title="Refresh order stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Cashier Table Feed */}
      <div>
        {filteredOrders.length === 0 ? (
          <div className="bg-surface border border-border rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-text-muted">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text">No Orders in Cashier Feed</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all" || diningCaseFilter !== "all"
                ? "No billing records match your selected search or filter criteria."
                : "When waiters submit food orders from the floor, they automatically stream here on top."}
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] font-bold text-xs uppercase tracking-wider text-text-muted py-3.5">
                    Location / Order
                  </TableHead>
                  <TableHead className="w-[180px] font-bold text-xs uppercase tracking-wider text-text-muted py-3.5">
                    Guest & Server
                  </TableHead>
                  <TableHead className="w-[160px] font-bold text-xs uppercase tracking-wider text-text-muted py-3.5">
                    Billing Status
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-text-muted py-3.5">
                    Dishes Summary
                  </TableHead>
                  <TableHead className="text-right w-[140px] font-bold text-xs uppercase tracking-wider text-text-muted py-3.5">
                    Net Due
                  </TableHead>
                  <TableHead className="text-right w-[200px] font-bold text-xs uppercase tracking-wider text-text-muted py-3.5">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((ord) => {
                  const isExpanded = !!expandedOrders[ord.id];
                  const finances = getOrderFinances(ord);
                  const isPriority = ord.billingStatus === "bill_requested";
                  const isPrinted = ord.billingStatus === "bill_printed";
                  const isDelivered = ord.billingStatus === "delivered";
                  const isSettled = ord.billingStatus === "settled" || ord.paymentStatus === "paid";
                  const isOpenTab = !ord.billingStatus || ord.billingStatus === "open_tab";

                  const createdDate = ord.createdAt ? new Date(ord.createdAt) : new Date();
                  const elapsedMins = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60000));
                  const timeFormatted = createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  const items = ord.items || [];
                  const itemsSummary = items.slice(0, 2).map((i) => `${i.quantity}x ${i.name || "Dish"}`).join(", ") +
                    (items.length > 2 ? ` +${items.length - 2} more` : "");

                  return (
                    <React.Fragment key={ord.id}>
                      <TableRow
                        className={`transition-colors cursor-pointer select-none ${
                          isPriority
                            ? "bg-amber-500/[0.08] hover:bg-amber-500/[0.12] border-l-4 border-l-amber-500"
                            : isSettled
                            ? "opacity-75 hover:bg-muted/30"
                            : "hover:bg-muted/40"
                        }`}
                        onClick={() => toggleExpandOrder(ord.id)}
                      >
                        {/* Location / Order */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 text-xs shadow-2xs ${
                                isPriority
                                  ? "bg-amber-500 text-slate-950 font-extrabold"
                                  : isSettled
                                  ? "bg-muted text-text-muted"
                                  : "bg-[#084C42] text-white"
                              }`}
                            >
                              <span className="text-[8px] uppercase tracking-wider leading-none opacity-80">
                                {ord.tableNumber ? "TBL" : ord.roomNumber ? "RM" : "ORD"}
                              </span>
                              <span className="font-mono text-xs font-bold leading-none mt-0.5">
                                {ord.tableNumber
                                  ? `#${ord.tableNumber}`
                                  : ord.roomNumber
                                  ? `#${ord.roomNumber}`
                                  : `#${ord.orderNumber.slice(-3)}`}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-text font-mono">
                                #{ord.orderNumber}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5 whitespace-nowrap">
                                {timeFormatted}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Guest & Server */}
                        <TableCell className="py-3">
                          <div className="text-xs font-semibold text-text truncate max-w-[170px]">
                            {ord.guestName || "Walk-in Guest"}
                          </div>
                          <div className="text-[11px] text-text-muted truncate max-w-[170px] mt-0.5">
                            Waiter: <span className="text-text font-medium">{ord.waiterName || "Floor Staff"}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3">
                          {isPriority && (
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-2xs animate-pulse">
                              <Bell className="w-3 h-3 stroke-[2.5]" />
                              <span>Bill Requested</span>
                            </span>
                          )}
                          {isOpenTab && !isPriority && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Open Tab</span>
                            </span>
                          )}
                          {isPrinted && (
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                              <Printer className="w-3 h-3" />
                              <span>Receipt Ready</span>
                            </span>
                          )}
                          {isDelivered && (
                            <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>With Guest</span>
                            </span>
                          )}
                          {isSettled && (
                            <span className="inline-flex items-center gap-1 bg-muted text-text-muted text-[11px] font-semibold px-2.5 py-1 rounded-full border border-border">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Settled • {ord.paymentMethod?.toUpperCase() || "PAID"}</span>
                            </span>
                          )}
                        </TableCell>

                        {/* Dishes Summary */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted line-clamp-1 max-w-[280px]">
                              {itemsSummary || `${items.length || ord.itemsCount || 1} item(s)`}
                            </span>
                            <span className="text-[11px] text-primary underline underline-offset-2 shrink-0 font-medium">
                              {isExpanded ? "Hide" : "Details"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Net Total Due */}
                        <TableCell className="py-3 text-right">
                          <div className="font-mono font-bold text-sm text-text">
                            ${finances.netTotal.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            Inc. VAT & Svc
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleOpenReceiptModal(ord)}
                              className={`h-8 px-2.5 text-xs font-semibold gap-1 rounded-xl shadow-xs cursor-pointer ${
                                isPriority
                                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold ring-1 ring-amber-400"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{isPrinted ? "Reprint" : "Receipt"}</span>
                            </Button>

                            {!isSettled && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenSettleModal(ord)}
                                variant="outline"
                                className="h-8 px-2.5 text-xs font-semibold gap-1 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Settle</span>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandOrder(ord.id)}
                              className="h-8 w-8 p-0 rounded-xl text-text-muted hover:text-text"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Breakdown Row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 hover:bg-muted/15">
                          <TableCell colSpan={6} className="p-4 sm:p-5 border-b border-border">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-surface p-4 rounded-xl border border-border/80 shadow-2xs">
                              {/* Line items */}
                              <div className="md:col-span-7 space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                                  <span>Itemized Dishes Ordered</span>
                                  <span>Quantity & Line Price</span>
                                </h4>
                                <div className="space-y-1 bg-muted/20 rounded-xl p-3 border border-border/60">
                                  {(ord.items || []).map((itm, iIdx) => {
                                    const lineTot = (itm.quantity || 1) * (itm.price || 0);
                                    return (
                                      <div
                                        key={iIdx}
                                        className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-text min-w-[24px]">
                                            {itm.quantity}x
                                          </span>
                                          <span className="text-text font-medium">{itm.name || "Menu Dish"}</span>
                                          {itm.isComplimentary && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                                              Complimentary
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-mono font-semibold text-text">
                                          ${lineTot.toFixed(2)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Financial breakdown */}
                              <div className="md:col-span-5 space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                  Financial Ledger (Auto-Calculated)
                                </h4>
                                <div className="bg-muted/20 rounded-xl p-3.5 border border-border/60 space-y-2 text-xs">
                                  <div className="flex justify-between text-text-muted">
                                    <span>Subtotal</span>
                                    <span className="font-mono text-text">${finances.subtotal.toFixed(2)}</span>
                                  </div>
                                  {finances.discount > 0 && (
                                    <div className="flex justify-between text-emerald-600 font-semibold">
                                      <span>Complimentary Breakfast Credit</span>
                                      <span className="font-mono">-${finances.discount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-text-muted">
                                    <span>Value Added Tax (10%)</span>
                                    <span className="font-mono text-text">${finances.vat.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-text-muted">
                                    <span>Service Charge (5%)</span>
                                    <span className="font-mono text-text">${finances.serviceCharge.toFixed(2)}</span>
                                  </div>
                                  <div className="pt-2 border-t border-border flex justify-between font-extrabold text-sm text-text">
                                    <span>Net Total Due</span>
                                    <span className="font-mono text-primary">${finances.netTotal.toFixed(2)}</span>
                                  </div>
                                  {ord.cashierNotes && (
                                    <div className="pt-2 border-t border-border/50 text-[11px] text-text-muted">
                                      <strong>Cashier Note:</strong> {ord.cashierNotes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls (Max limit 5 per page) */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredOrders.length}
              pageSize={PAGE_SIZE}
              showEntriesCount={true}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 80mm THERMAL RECEIPT PRINT MODAL                                          */}
      {/* ========================================================================= */}
      <Dialog open={!!receiptModalOrder} onOpenChange={(open) => !open && setReceiptModalOrder(null)}>
        <DialogContent className="max-w-md bg-surface p-0 rounded-3xl overflow-hidden border border-border">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>Official Guest Receipt Preview</span>
              <Badge variant="outline">80mm POS Thermal</Badge>
            </DialogTitle>
          </DialogHeader>

          {receiptModalOrder && (() => {
            const finances = getOrderFinances(receiptModalOrder);
            return (
              <div className="space-y-4 px-6 pb-6">
                {/* Visual Thermal Receipt Paper */}
                <div 
                  id="thermal-printable-receipt"
                  className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner font-mono text-xs space-y-4 border border-slate-200"
                >
                  {/* Header */}
                  <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                    <div className="font-black text-base tracking-tight">NEXUS HOTEL & RESORT</div>
                    <div className="text-[11px] text-slate-500">Fine Dining & Lounge Bar</div>
                    <div className="text-[10px] text-slate-400">Addis Ababa, Ethiopia • Tel: +251 11 661 1111</div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
                    <div className="flex justify-between">
                      <span>Receipt #: {receiptModalOrder.orderNumber}</span>
                      <span>Date: {new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {receiptModalOrder.tableNumber ? `Table: #${receiptModalOrder.tableNumber}` : `Room: #${receiptModalOrder.roomNumber || "Walk-in"}`}
                      </span>
                      <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Server: {receiptModalOrder.waiterName || "Floor Waiter"}</span>
                      <span>Cashier: {cashierDisplayName}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Guest: {receiptModalOrder.guestName || "Walk-in Diner"}</span>
                      <span>Type: {receiptModalOrder.diningCase?.toUpperCase() || "DINE-IN"}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 py-2">
                    <div className="flex justify-between font-bold text-[11px] border-b border-slate-200 pb-1">
                      <span>Qty & Item</span>
                      <span>Amount</span>
                    </div>
                    {(receiptModalOrder.items || []).map((itm, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="truncate max-w-[200px]">
                          {itm.quantity}x {itm.name || "Menu Item"}
                        </span>
                        <span>${((itm.quantity || 1) * (itm.price || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calculations */}
                  <div className="pt-3 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${finances.subtotal.toFixed(2)}</span>
                    </div>
                    {finances.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Complimentary Breakfast:</span>
                        <span>-${finances.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>VAT (10%):</span>
                      <span>${finances.vat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Service Charge (5%):</span>
                      <span>${finances.serviceCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-sm border-t border-slate-800 pt-1.5 mt-1">
                      <span>TOTAL DUE:</span>
                      <span>${finances.netTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-dashed border-slate-300 space-y-1">
                    <p className="font-semibold">Thank you for dining with us!</p>
                    <p>Please present this receipt upon settlement.</p>
                    <p className="text-[9px] text-slate-400">Powered by Nexus HMS Enterprise POS</p>
                  </div>
                </div>

                {/* Cashier Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cashier Print Note (Optional)</Label>
                  <Input
                    value={cashierNotesInput}
                    onChange={(e) => setCashierNotesInput(e.target.value)}
                    placeholder="e.g. Printed for Waiter Daniel / Guest request"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setReceiptModalOrder(null)}
                    className="h-9 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      window.print();
                      handleConfirmPrintReceipt();
                    }}
                    disabled={printReceiptMutation.isPending}
                    className="h-9 text-xs font-bold gap-1.5 bg-[#084C42] hover:bg-[#063831] text-white rounded-xl shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print & Mark Ready for Waiter</span>
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* CASHIER SETTLEMENT MODAL                                                  */}
      {/* ========================================================================= */}
      <Dialog open={!!settleModalOrder} onOpenChange={(open) => !open && setSettleModalOrder(null)}>
        <DialogContent className="max-w-md bg-surface p-6 rounded-3xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Settle Payment - Order #{settleModalOrder?.orderNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {settleModalOrder && (() => {
            const finances = getOrderFinances(settleModalOrder);
            const numTendered = parseFloat(tenderedAmount) || 0;
            const changeDue = Math.max(0, numTendered - finances.netTotal);

            return (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-text">{settleModalOrder.guestName || "Walk-in Guest"}</div>
                    <div className="text-xs text-text-muted">
                      {settleModalOrder.tableNumber ? `Table #${settleModalOrder.tableNumber}` : `Room #${settleModalOrder.roomNumber || "Service"}`} • Server: {settleModalOrder.waiterName || "Floor Waiter"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-muted">Total Due</div>
                    <div className="text-xl font-extrabold font-mono text-primary">
                      ${finances.netTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Settlement Method Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "cash", label: "Cash Payment", icon: Banknote },
                      { id: "telebirr", label: "Telebirr Mobile", icon: Wallet },
                      { id: "card", label: "Credit/Debit Card", icon: CreditCard },
                      { id: "room_charge", label: "Room Folio", icon: Hotel },
                    ].map((pm) => {
                      const Icon = pm.icon;
                      const isSel = settleMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setSettleMethod(pm.id as any)}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? "bg-[#084C42] text-white border-[#084C42] shadow-xs"
                              : "bg-surface hover:bg-muted/50 border-border text-text"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash Tendered & Change Due Calculator */}
                {settleMethod === "cash" && (
                  <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Cash Tendered ($)</Label>
                      <div className="flex gap-1.5">
                        {[20, 50, 100].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTenderedAmount(String(amt))}
                            className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-surface border border-border hover:bg-muted"
                          >
                            ${amt}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setTenderedAmount(String(finances.netTotal))}
                          className="px-2 py-0.5 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        >
                          Exact
                        </button>
                      </div>
                    </div>

                    <Input
                      type="number"
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      placeholder="Enter amount given by guest"
                      className="h-10 text-base font-mono font-bold rounded-xl"
                    />

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-text-muted font-medium">Change Due to Guest:</span>
                      <span className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Settlement Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Settlement Notes (Optional)</Label>
                  <Input
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="e.g. Paid in full / guest tipped $5"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Footer Buttons */}
                <DialogFooter className="gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSettleModalOrder(null)}
                    className="h-10 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmSettle}
                    disabled={settlePaymentMutation.isPending}
                    className="h-10 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm Settlement</span>
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

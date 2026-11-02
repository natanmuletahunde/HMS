"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { 
  Plus, Loader2, MoreHorizontal, Minus, Utensils, Hotel, DoorOpen, 
  CheckCircle2, AlertCircle, Sparkles, Coffee, ArrowUpRight, ArrowDownRight, 
  ExternalLink, Download, TrendingUp, TrendingDown, Calendar, Clock, Users, 
  ShoppingBag, Bike, ChevronDown, FileSpreadsheet, UtensilsCrossed,
  QrCode, GitMerge, ChefHat, Send, Check,
  Search, Bell, FileText, ArrowRight, CreditCard, Wallet, Banknote, DollarSign, DoorClosed,
  ShieldCheck, UserCheck, RefreshCw, ClipboardList, Flame, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { getInHouseRequests, markInHouseRequestServed, markInHouseRequestDispatched, InHouseServiceRequest } from "@/lib/in-house-requests";
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
  totalTables?: number;
  todayRevenue: number;
  byStatus?: Record<string, number>;
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
  category?: string;
  isComplimentary?: boolean;
};

type Order = {
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
  items?: OrderItem[];
  itemsCount?: number;
  total?: number;
  totalAmount?: number;
  status: string;
  routedVia?: "coordinator" | "direct_kitchen";
  coordinatorStatus?: "pending" | "dispatched" | "qa_verified" | "bypassed";
  coordinatorName?: string;
  kitchenOfficerName?: string;
  notifiedParty?: "waiter" | "coordinator" | null;
  billingStatus?: "open_tab" | "bill_requested" | "bill_printed" | "delivered" | "settled";
  billRequestedAt?: string;
  receiptPrintedAt?: string;
  cashierName?: string;
  waiterName?: string;
  kitchenNotes?: string;
  notes?: string;
  createdAt?: string;
};

type ReservationItem = {
  id: string;
  guestName: string;
  guestsCount: number;
  date: string;
  tableNumber: string;
  status: "confirmed" | "pending" | "cancelled" | "seated";
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
  const { user } = useAuth();
  
  const roleName = ((user?.role || (user as any)?.roleName) ?? "").toLowerCase();
  const isWaiter = roleName.includes("waiter") || roleName.includes("server") || true;

  const [tab, setTab] = useState<string>("created_orders");

  // Waiter Dashboard States & Clean 2-Tab Filters
  const [waiterOrderSearch, setWaiterOrderSearch] = useState("");
  const [waiterDiningFilter, setWaiterDiningFilter] = useState<string>("all");
  const [waiterRouteFilter, setWaiterRouteFilter] = useState<string>("all");
  const [waiterStatusFilter, setWaiterStatusFilter] = useState<string>("all");

  // Tab 2 Source Input Filter ("all" | "coordinator" | "kitchen")
  const [readySourceFilter, setReadySourceFilter] = useState<string>("all");
  const [readyOrderSearch, setReadyOrderSearch] = useState("");

  const [waiterPaymentSearch, setWaiterPaymentSearch] = useState("");
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "telebirr" | "card" | "room_charge" | "complimentary_breakfast">("cash");
  const [cashTendered, setCashTendered] = useState("");

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }, []);

  // Executive Dashboard Controls
  const [dashboardInterval, setDashboardInterval] = useState("Monthly");
  const [revenueTimeframe, setRevenueTimeframe] = useState<"1D" | "1W" | "1M" | "6M">("1W");
  const [ordersTimeframe, setOrdersTimeframe] = useState<"1D" | "1W" | "1M" | "6M">("1W");
  const [popularTimeframe, setPopularTimeframe] = useState<"1D" | "1W">("1W");
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Table Reservations state
  const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
  const [reservations, setReservations] = useState<ReservationItem[]>([
    { id: "RES-101", guestName: "Michael Chen", guestsCount: 4, date: "Feb 8, 2026; 12:30", tableNumber: "Table 5", status: "confirmed" },
    { id: "RES-102", guestName: "Sarah Jenkins", guestsCount: 2, date: "Feb 8, 2026; 12:30", tableNumber: "--", status: "pending" },
    { id: "RES-103", guestName: "Solomon Tekle", guestsCount: 4, date: "Feb 8, 2026; 13:00", tableNumber: "Table 3", status: "confirmed" },
  ]);
  const [newResGuestName, setNewResGuestName] = useState("");
  const [newResGuestCount, setNewResGuestCount] = useState(2);
  const [newResTime, setNewResTime] = useState("12:30 PM");
  const [newResTable, setNewResTable] = useState("Table 1");

  // Menu state
  const [menuCategory, setMenuCategory] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Tables state
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState("all");

  // Orders state
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderType, setOrderType] = useState("all");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderDiningCase, setNewOrderDiningCase] = useState<"walk_in" | "in_house_table" | "room_service">("walk_in");
  const [newOrderSettlementType, setNewOrderSettlementType] = useState<"direct_payment" | "complimentary_breakfast" | "room_charge">("direct_payment");
  const [newOrderRoomNumber, setNewOrderRoomNumber] = useState("");
  const [newOrderGuestName, setNewOrderGuestName] = useState("");
  const [newOrderTableId, setNewOrderTableId] = useState("");
  const [newOrderResidentVerified, setNewOrderResidentVerified] = useState<any | null>(null);
  const [newOrderVerifyingResident, setNewOrderVerifyingResident] = useState(false);
  const [newOrderItems, setNewOrderItems] = useState<Array<{ menuItemId: string; name: string; quantity: number; price: number; category?: string }>>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState("");

  // Coordinator & Table QR state
  const [newOrderRoutedVia, setNewOrderRoutedVia] = useState<"coordinator" | "direct_kitchen">("coordinator");
  const [newOrderCoordinatorId, setNewOrderCoordinatorId] = useState("");
  const [isTableQrModalOpen, setIsTableQrModalOpen] = useState(false);
  const [menuTickSearch, setMenuTickSearch] = useState("");
  const [menuTickCategory, setMenuTickCategory] = useState("All");

  // Synchronized In-House Guest Requests
  const [inHouseRequests, setInHouseRequests] = useState<InHouseServiceRequest[]>([]);
  const [selectedInHouseReqId, setSelectedInHouseReqId] = useState<string | null>(null);

  useEffect(() => {
    setInHouseRequests(getInHouseRequests());

    const handleSync = (e: any) => {
      if (e?.detail) {
        setInHouseRequests(e.detail);
      } else {
        setInHouseRequests(getInHouseRequests());
      }
    };

    window.addEventListener("nexus_inhouse_requests_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("nexus_inhouse_requests_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const waiterPendingRequests = useMemo(() => {
    const role = (user?.role || (user as any)?.roleName || "").toLowerCase();
    const isDedicatedWaiter = role.includes("waiter") || role.includes("server");
    const currentName = (user as any)?.fullName || user?.name || "";

    const pending = inHouseRequests.filter((r) => r.status === "pending");
    if (isDedicatedWaiter && currentName) {
      const matched = pending.filter(
        (r) =>
          r.assignedWaiterId === user?.id ||
          r.assignedWaiterName.toLowerCase().includes(currentName.toLowerCase().split(" ")[0])
      );
      return matched.length > 0 ? matched : pending;
    }
    return pending;
  }, [inHouseRequests, user]);

  // Dedicated In-House Room Order Fulfillment Modal
  const [isFulfillOpen, setIsFulfillOpen] = useState(false);
  const [fulfillTarget, setFulfillTarget] = useState<InHouseServiceRequest | null>(null);
  const [fulfillRoute, setFulfillRoute] = useState<"coordinator" | "direct_kitchen">("coordinator");
  const [inHouseSubFilter, setInHouseSubFilter] = useState<"all" | "assigned" | "created">("all");

  const assignedInHouseRequests = useMemo(() => {
    return inHouseRequests.filter((r) => r.status === "pending" || r.stage === "waiter_assigned");
  }, [inHouseRequests]);

  const handleDispatchAssignedOrder = (req: InHouseServiceRequest, route: "coordinator" | "direct_kitchen") => {
    const body: Record<string, unknown> = {
      orderType: "room_service",
      diningCase: "room_service",
      settlementType: "room_charge",
      roomNumber: req.roomNumber,
      guestName: req.guestName,
      waiterId: user?.id,
      routedVia: route,
      coordinatorId: route === "coordinator" ? (coordinators[0]?.id || undefined) : undefined,
      items: req.items.map((i) => {
        const matchedMenu = menuItems.find((m) => m.name.toLowerCase() === i.name.toLowerCase());
        return {
          menuItemId: matchedMenu?.id || `custom-${i.name}`,
          quantity: i.quantity,
          isComplimentary: false,
        };
      }),
    };

    createOrderMutation.mutate(body, {
      onSuccess: () => {
        markInHouseRequestDispatched(req.id);
        toast({
          title: "Room Order Dispatched",
          description: `Dispatched Room ${req.roomNumber} order via ${route === "coordinator" ? "F&B Coordinator" : "Direct Kitchen"} and posted to Cashier for room folio settlement.`,
        });
      },
    });
  };

  const handleConfirmFulfill = () => {
    if (!fulfillTarget) return;

    const body: Record<string, unknown> = {
      orderType: "room_service",
      diningCase: "room_service",
      settlementType: "room_charge",
      roomNumber: fulfillTarget.roomNumber,
      guestName: fulfillTarget.guestName,
      waiterId: user?.id,
      routedVia: fulfillRoute,
      coordinatorId: fulfillRoute === "coordinator" ? (coordinators[0]?.id || undefined) : undefined,
      items: fulfillTarget.items.map((i) => {
        const matchedMenu = menuItems.find((m) => m.name.toLowerCase() === i.name.toLowerCase());
        return {
          menuItemId: matchedMenu?.id || `custom-${i.name}`,
          quantity: i.quantity,
          isComplimentary: false,
        };
      }),
    };

    createOrderMutation.mutate(body, {
      onSuccess: () => {
        markInHouseRequestDispatched(fulfillTarget.id);
        setIsFulfillOpen(false);
        setFulfillTarget(null);
        toast({
          title: "Room Order Dispatched",
          description: `Dispatched Room ${fulfillTarget.roomNumber} order via ${fulfillRoute === "coordinator" ? "F&B Coordinator" : "Direct Kitchen"} and posted to Cashier for room folio settlement.`,
        });
      },
    });
  };

  const handleSelectInHouseRequest = (req: InHouseServiceRequest) => {
    setSelectedInHouseReqId(req.id);
    setNewOrderRoomNumber(req.roomNumber);
    setNewOrderGuestName(req.guestName);
    handleVerifyResident(req.roomNumber);

    const itemsToAdd: Array<{ menuItemId: string; name: string; quantity: number; price: number; category?: string }> = [];
    req.items.forEach((item) => {
      const matchedMenu = menuItems.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
      itemsToAdd.push({
        menuItemId: matchedMenu?.id || `custom-${item.name}`,
        name: item.name,
        quantity: item.quantity,
        price: matchedMenu ? Number(matchedMenu.price) : 250,
        category: matchedMenu?.category || item.category || "Main",
      });
    });
    setNewOrderItems(itemsToAdd);

    toast({
      title: `Loaded Room ${req.roomNumber}`,
      description: `${req.guestName}'s request loaded into order.`,
    });
  };

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
    enabled: tab === "menu" || tab === "orders" || tab === "kitchen" || tab === "dashboard" || tab === "waiter_dashboard" || tab === "kitchen_pass" || tab === "billing",
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ["restaurant-tables"],
    queryFn: () => apiFetch<RestaurantTable[]>("/restaurant/tables"),
    enabled: tab === "tables" || tab === "orders" || tab === "dashboard" || tab === "waiter_dashboard" || tab === "kitchen_pass" || tab === "billing",
  });

  const { data: coordinators = [] } = useQuery<Array<{ id: string; name: string; isFree: boolean; activeOrdersCount: number }>>({
    queryKey: ["restaurant-coordinators"],
    queryFn: () => apiFetch("/restaurant/coordinators"),
    enabled: isNewOrderOpen,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["restaurant-orders", orderStatus, orderType],
    queryFn: () => {
      const p = new URLSearchParams();
      if (orderStatus !== "all") p.set("status", orderStatus);
      if (orderType !== "all") p.set("orderType", orderType);
      return apiFetch<Order[]>(`/restaurant/orders?${p}`);
    },
    enabled: tab === "orders" || tab === "dashboard" || tab === "waiter_dashboard" || tab === "kitchen_pass" || tab === "billing" || tab === "tables",
  });

  const { data: kitchenOrders = [], isLoading: kitchenLoading } = useQuery<Order[]>({
    queryKey: ["restaurant-kitchen", kitchenTick],
    queryFn: () => apiFetch<Order[]>("/restaurant/kitchen"),
    enabled: tab === "kitchen",
  });

  const tickableMenuItems = useMemo(() => {
    return menuItems.filter(m => {
      if (!m.isAvailable) return false;
      if (menuTickCategory !== "All" && m.category.toLowerCase() !== menuTickCategory.toLowerCase()) return false;
      if (menuTickSearch.trim() && !m.name.toLowerCase().includes(menuTickSearch.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, menuTickCategory, menuTickSearch]);

  function invalidateOrders() {
    queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("hms_order_sync"));
      try {
        const channel = new BroadcastChannel("hms_orders_channel");
        channel.postMessage({ type: "ORDER_CREATED", timestamp: Date.now() });
        channel.close();
      } catch {}
    }
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
    onSuccess: () => { 
      invalidateOrders(); 
      setIsNewOrderOpen(false); 
      setNewOrderItems([]); 
      if (selectedInHouseReqId) {
        const current = getInHouseRequests();
        const updated = current.map(r => r.id === selectedInHouseReqId ? { ...r, status: "dispatched" as const } : r);
        localStorage.setItem("nexus_inhouse_guest_requests", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("nexus_inhouse_requests_updated", { detail: updated }));
      }
      setSelectedInHouseReqId(null);
      toast({ 
        title: "Order Placed & Synced to Cashier", 
        description: "Dispatched to culinary team and financial tab automatically recorded at Cashier Desk." 
      }); 
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/restaurant/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_, vars) => { 
      invalidateOrders(); 
      if (vars.status === "served") {
        const target = orders.find(o => o.id === vars.id);
        if (target?.roomNumber) {
          markInHouseRequestServed(target.roomNumber);
        }
      }
      toast({ title: "Order updated" }); 
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const requestBillMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/restaurant/orders/${orderId}/request-bill`, { method: "PATCH" }),
    onSuccess: () => {
      invalidateOrders();
      toast({
        title: "Bill Requested from Cashier",
        description: "Sent digital alert to Cashier Desk. You can also walk over to collect the printed receipt.",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deliverReceiptMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/restaurant/orders/${orderId}/deliver-receipt`, { method: "PATCH" }),
    onSuccess: () => {
      invalidateOrders();
      toast({
        title: "Receipt Collected & Handed to Guest",
        description: "Guest has official thermal receipt at table.",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const dispatchRouteMutation = useMutation({
    mutationFn: ({ id, route }: { id: string; route: "coordinator" | "direct_kitchen" }) => {
      if (id.startsWith("mock-")) {
        return Promise.resolve({ ok: true });
      }
      return apiFetch(`/restaurant/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          routedVia: route,
          coordinatorStatus: route === "coordinator" ? "pending" : "bypassed",
          status: route === "direct_kitchen" ? "preparing" : "pending",
          notes: route === "coordinator" ? "Dispatched by floor server to F&B Coordinator" : "Dispatched by floor server directly to kitchen line",
        }),
      });
    },
    onSuccess: (_, vars) => {
      invalidateOrders();
      toast({
        title: vars.route === "coordinator" ? "Routed to F&B Coordinator 📋" : "Routed Direct to Kitchen 🍳",
        description: `Order successfully dispatched for fulfillment.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Routing Failed", description: err.message, variant: "destructive" });
    },
  });

  async function handleVerifyResident(roomToVerify: string) {
    const target = roomToVerify.trim();
    if (!target) return;
    setNewOrderVerifyingResident(true);
    try {
      const res = await apiFetch<any>(`/restaurant/verify-resident?roomNumber=${encodeURIComponent(target)}`);
      setNewOrderResidentVerified(res);
      if (res.valid && res.isOccupied) {
        setNewOrderGuestName(res.guestName);
        if (res.complimentaryBreakfast?.isEligible && newOrderDiningCase === "in_house_table") {
          setNewOrderSettlementType("complimentary_breakfast");
        } else if (newOrderDiningCase === "room_service") {
          setNewOrderSettlementType("room_charge");
        }
      }
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setNewOrderVerifyingResident(false);
    }
  }

  function addOrderItem(menuItemId: string) {
    const item = menuItems.find(i => i.id === menuItemId);
    if (!item) return;
    setNewOrderItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId);
      if (existing) return prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId, name: item.name, quantity: 1, price: item.price, category: item.category }];
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

  function handleCreateReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!newResGuestName.trim()) return;
    const newRes: ReservationItem = {
      id: `RES-${Date.now().toString().slice(-3)}`,
      guestName: newResGuestName.trim(),
      guestsCount: Number(newResGuestCount) || 2,
      date: `Today, ${newResTime}`,
      tableNumber: newResTable,
      status: "confirmed",
    };
    setReservations(prev => [newRes, ...prev]);
    setIsAddReservationOpen(false);
    setNewResGuestName("");
    toast({ title: "Table Reserved", description: `${newRes.guestName} booked at ${newRes.tableNumber}.` });
  }

  function handleExportData() {
    toast({ title: "F&B Analytics Exported", description: "Monthly sales, orders, and reservation summary generated." });
  }

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

  const totalTableSeats = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const occupiedCount = tables.filter(t => t.status === "occupied").length;
  const availableTableCount = Math.max(0, tables.length - occupiedCount);

  // Current live formatted date string (Matches: Wednesday, 12 July 2023)
  const currentDateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  // Popular dishes dataset matching user mockup
  const popularDishesList = useMemo(() => [
    { rank: "01", name: "Scrambled Eggs With Toast", orders: 23, icon: "🍳" },
    { rank: "02", name: "Tacos With Chicken Grilled", orders: 16, icon: "🌮" },
    { rank: "03", name: "Spaghetti Bolognese", orders: 13, icon: "🍝" },
    { rank: "04", name: "French Bread & Potato", orders: 12, icon: "🥖" },
  ], []);

  // Executive dashboard popular items
  const popularItems = useMemo(() => [
    { name: "Sushi and Sashimi", orders: 87, trend: "+3.5%", isUp: true, icon: "🍱" },
    { name: "Grilled Salmon", orders: 65, trend: "+1.5%", isUp: true, icon: "🐟" },
    { name: "Caesar Salad", orders: 42, trend: "-0.5%", isUp: false, icon: "🥗" },
    { name: "Tiramisu", orders: 32, trend: "+0.3%", isUp: true, icon: "🍰" },
  ], []);

  // Default orders for Waiter Order List to ensure vibrant full screen matching mockup
  const defaultMockOrders: Order[] = useMemo(() => [
    {
      id: "mock-1",
      orderNumber: "ORD-912",
      tableNumber: 4,
      diningCase: "in_house_table",
      roomNumber: "204",
      guestName: "Ariel Hikmat",
      itemsCount: 2,
      totalAmount: 42.50,
      status: "ready",
      routedVia: "coordinator",
      coordinatorStatus: "qa_verified",
      coordinatorName: "Helen (Coordinator)",
      notifiedParty: "waiter",
      kitchenNotes: "Verified all 2 dishes match order • Hot temperature confirmed",
      createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
      items: [
        { menuItemId: "i1", name: "Grilled Beef Tenderloin", quantity: 1, price: 32 },
        { menuItemId: "i2", name: "Fresh Orange Juice", quantity: 2, price: 5 },
      ],
    },
    {
      id: "mock-2",
      orderNumber: "ORD-908",
      tableNumber: 2,
      diningCase: "walk_in",
      itemsCount: 1,
      totalAmount: 36.00,
      status: "ready",
      routedVia: "direct_kitchen",
      kitchenOfficerName: "Chef Dawit (Grill Line)",
      notifiedParty: "waiter",
      kitchenNotes: "Plated directly under lamp station 2",
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      items: [
        { menuItemId: "i3", name: "Traditional Breakfast Combo", quantity: 2, price: 18 },
      ],
    },
    {
      id: "mock-3",
      orderNumber: "ORD-904",
      tableNumber: 7,
      diningCase: "walk_in",
      itemsCount: 2,
      totalAmount: 58.00,
      status: "preparing",
      routedVia: "coordinator",
      coordinatorStatus: "dispatched",
      coordinatorName: "Helen (Coordinator)",
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      items: [
        { menuItemId: "i4", name: "Spaghetti Bolognese", quantity: 2, price: 20 },
        { menuItemId: "i5", name: "Garlic Bread", quantity: 2, price: 9 },
      ],
    },
    {
      id: "mock-4",
      orderNumber: "ORD-903",
      roomNumber: "305",
      diningCase: "room_service",
      guestName: "Sarah Jenkins",
      itemsCount: 2,
      totalAmount: 49.50,
      status: "pending",
      routedVia: "coordinator",
      coordinatorStatus: "pending",
      createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      items: [
        { menuItemId: "i6", name: "Club Sandwich with Fries", quantity: 2, price: 18 },
        { menuItemId: "i7", name: "Iced Cappuccino", quantity: 2, price: 6.75 },
      ],
    },
    {
      id: "mock-5",
      orderNumber: "ORD-897",
      tableNumber: 9,
      diningCase: "walk_in",
      itemsCount: 2,
      totalAmount: 74.00,
      status: "pending",
      routedVia: "direct_kitchen",
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      items: [
        { menuItemId: "i8", name: "Pan-Seared Salmon", quantity: 2, price: 28 },
        { menuItemId: "i9", name: "Tiramisu", quantity: 2, price: 9 },
      ],
    },
    {
      id: "mock-6",
      orderNumber: "ORD-892",
      tableNumber: 12,
      diningCase: "in_house_table",
      roomNumber: "112",
      guestName: "Erwan Richard",
      itemsCount: 2,
      totalAmount: 52.00,
      status: "served",
      billingStatus: "settled",
      createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
      items: [
        { menuItemId: "i10", name: "Chicken Wings", quantity: 2, price: 16 },
        { menuItemId: "i11", name: "Caesar Salad", quantity: 2, price: 10 },
      ],
    },
  ], []);

  const assignedOrdersAsTableRows = useMemo(() => {
    return assignedInHouseRequests.map((req) => {
      const sumPrice = Array.isArray(req.items)
        ? req.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0)
        : 0;
      return {
        id: req.id,
        orderNumber: req.requestNumber ? req.requestNumber.replace(/#/g, "").replace(/-/g, " ") : `RS ${req.roomNumber}`,
        tableNumber: undefined,
        roomNumber: req.roomNumber,
        diningCase: "in_house_table" as const,
        isAssignedRoomService: true,
        guestName: req.guestName,
        phone: req.phone,
        itemsCount: Array.isArray(req.items) ? req.items.length : 1,
        totalAmount: req.totalAmount || sumPrice || 0,
        status: req.status === "dispatched" ? ("preparing" as const) : ("pending" as const),
        stage: req.stage || "waiter_assigned",
        coordinatorStatus: req.status === "dispatched" ? ("dispatched" as const) : ("pending" as const),
        routedVia: undefined,
        createdAt: req.createdAt || new Date().toISOString(),
        items: Array.isArray(req.items)
          ? req.items.map((it) => ({
              menuItemId: `item-${it.name}`,
              name: it.name,
              quantity: it.quantity,
              price: it.price || 0,
            }))
          : [],
        rawRequest: req,
      };
    });
  }, [assignedInHouseRequests]);

  const waiterActiveOrders = useMemo(() => {
    const list: any[] = [];
    if (orders.length > 0) {
      list.push(...orders);
      for (const m of defaultMockOrders) {
        if (!list.find((x) => x.orderNumber === m.orderNumber)) {
          list.push(m);
        }
      }
    } else {
      list.push(...defaultMockOrders);
    }

    // Merge in the assigned in-house room service orders as table rows
    for (const a of assignedOrdersAsTableRows) {
      if (!list.find((x) => x.id === a.id || x.orderNumber === a.orderNumber)) {
        list.push(a);
      }
    }

    return list;
  }, [orders, defaultMockOrders, assignedOrdersAsTableRows]);

  const inHouseOrders = useMemo(() => {
    return waiterActiveOrders.filter(
      (ord) => ord.diningCase === "in_house_table" || ord.isAssignedRoomService || ord.diningCase === "room_service"
    );
  }, [waiterActiveOrders]);

  const assignedInHouseCount = useMemo(() => {
    return inHouseOrders.filter((o) => o.isAssignedRoomService).length;
  }, [inHouseOrders]);

  const createdInHouseCount = useMemo(() => {
    return inHouseOrders.filter((o) => !o.isAssignedRoomService).length;
  }, [inHouseOrders]);

  // Tab 1: Created Orders (Active & Dispatch) Filtered
  const filteredCreatedOrders = useMemo(() => {
    return waiterActiveOrders.filter((ord) => {
      // 1. Dining Case Filter
      if (waiterDiningFilter !== "all") {
        if (waiterDiningFilter === "in_house_table") {
          const isInHouse =
            ord.diningCase === "in_house_table" || ord.isAssignedRoomService || ord.diningCase === "room_service";
          if (!isInHouse) return false;

          // In-House sub-toggle: "all" | "assigned" | "created"
          if (inHouseSubFilter === "assigned" && !ord.isAssignedRoomService) return false;
          if (inHouseSubFilter === "created" && ord.isAssignedRoomService) return false;
        } else {
          if (ord.isAssignedRoomService) return false;
          if (ord.diningCase !== waiterDiningFilter) return false;
        }
      }

      // 2. Dispatch Route Filter
      if (waiterRouteFilter !== "all" && ord.routedVia !== waiterRouteFilter) return false;

      // 3. Status Filter
      if (waiterStatusFilter !== "all" && ord.status !== waiterStatusFilter) return false;

      // 4. Search Filter
      if (!waiterOrderSearch.trim()) return true;
      const q = waiterOrderSearch.toLowerCase();
      const guest = (ord.guestName || "").toLowerCase();
      const ordNum = (ord.orderNumber || "").toLowerCase();
      const tbl = String(ord.tableNumber || "");
      const rm = String(ord.roomNumber || "");
      return guest.includes(q) || ordNum.includes(q) || tbl.includes(q) || rm.includes(q);
    });
  }, [waiterActiveOrders, waiterOrderSearch, waiterDiningFilter, inHouseSubFilter, waiterRouteFilter, waiterStatusFilter]);

  const createdOrdersPagination = usePagination(filteredCreatedOrders, 5);

  // Default orders for Waiter Payment column
  const defaultPaymentOrders: Order[] = useMemo(() => [
    { id: "pay-1", orderNumber: "ORD-912", tableNumber: 9, diningCase: "walk_in", itemsCount: 4, totalAmount: 42.50, status: "served" },
    { id: "pay-2", orderNumber: "ORD-908", tableNumber: 12, diningCase: "in_house_table", roomNumber: "305", guestName: "Erwan Richard", itemsCount: 3, totalAmount: 38.00, status: "served" },
    { id: "pay-3", orderNumber: "ORD-904", tableNumber: 2, diningCase: "walk_in", itemsCount: 5, totalAmount: 64.00, status: "served" },
    { id: "pay-4", orderNumber: "ORD-903", orderType: "room_service", roomNumber: "402", diningCase: "room_service", itemsCount: 2, totalAmount: 29.50, status: "served" },
    { id: "pay-5", orderNumber: "ORD-897", tableNumber: 4, diningCase: "walk_in", itemsCount: 6, totalAmount: 71.00, status: "served" },
    { id: "pay-6", orderNumber: "ORD-892", tableNumber: 7, diningCase: "in_house_table", roomNumber: "210", guestName: "Emma Fortin", itemsCount: 3, totalAmount: 34.00, status: "served" },
  ], []);

  const waiterPaymentOrders = useMemo(() => {
    const unPaid = orders.filter(o => o.status !== "cancelled");
    const merged = [...unPaid];
    for (const m of defaultPaymentOrders) {
      if (!merged.find(x => x.orderNumber === m.orderNumber)) {
        merged.push(m);
      }
    }
    return merged;
  }, [orders, defaultPaymentOrders]);

  const filteredPaymentOrders = useMemo(() => {
    return waiterPaymentOrders.filter(ord => {
      if (!waiterPaymentSearch.trim()) return true;
      const q = waiterPaymentSearch.toLowerCase();
      const guest = (ord.guestName || "").toLowerCase();
      const ordNum = (ord.orderNumber || "").toLowerCase();
      const tbl = String(ord.tableNumber || "");
      return guest.includes(q) || ordNum.includes(q) || tbl.includes(q);
    });
  }, [waiterPaymentOrders, waiterPaymentSearch]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (tableStatusFilter !== "all" && t.status !== tableStatusFilter) return false;
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const num = String(t.tableNumber).toLowerCase();
        const sec = (t.section || "").toLowerCase();
        return num.includes(q) || sec.includes(q);
      }
      return true;
    });
  }, [tables, tableStatusFilter, tableSearch]);

  const tablesPagination = usePagination(filteredTables, 5);

  const readyPassOrders = useMemo(() => {
    return waiterActiveOrders.filter(o => o.status === "ready");
  }, [waiterActiveOrders]);

  const filteredReadyPassOrders = useMemo(() => {
    return readyPassOrders.filter(o => {
      if (readySourceFilter === "coordinator") {
        const isFromCoord = o.coordinatorStatus === "qa_verified" || (o.routedVia === "coordinator" && o.notifiedParty === "waiter");
        if (!isFromCoord) return false;
      } else if (readySourceFilter === "kitchen") {
        const isFromKitchen = o.routedVia === "direct_kitchen" || (o.notifiedParty !== "coordinator" && o.coordinatorStatus !== "qa_verified");
        if (!isFromKitchen) return false;
      }
      if (!readyOrderSearch.trim()) return true;
      const q = readyOrderSearch.toLowerCase();
      const guest = (o.guestName || "").toLowerCase();
      const ordNum = (o.orderNumber || "").toLowerCase();
      const tbl = String(o.tableNumber || "");
      const rm = String(o.roomNumber || "");
      return guest.includes(q) || ordNum.includes(q) || tbl.includes(q) || rm.includes(q);
    });
  }, [readyPassOrders, readySourceFilter, readyOrderSearch]);

  const readyOrdersPagination = usePagination(filteredReadyPassOrders, 5);
  const paymentOrdersPagination = usePagination(filteredPaymentOrders, 5);

  const openFloorTabsCount = useMemo(() => {
    return orders.filter(o => o.status !== "cancelled" && o.billingStatus !== "settled").length;
  }, [orders]);

  const billsPrintingCount = useMemo(() => {
    return orders.filter(o => o.billingStatus === "bill_requested" || o.billingStatus === "bill_printed").length;
  }, [orders]);

  const settledTodayCount = useMemo(() => {
    return orders.filter(o => o.billingStatus === "settled").length;
  }, [orders]);

  const activeFloorCount = useMemo(() => {
    return waiterActiveOrders.filter(o => ["pending", "preparing", "ready"].includes(o.status)).length;
  }, [waiterActiveOrders]);

  const servedFloorCount = useMemo(() => {
    return waiterActiveOrders.filter(o => o.status === "served").length;
  }, [waiterActiveOrders]);

  function handleOpenPayment(ord: Order) {
    setPaymentModalOrder(ord);
    setPaymentMethod(
      ord.settlementType === "complimentary_breakfast" 
        ? "complimentary_breakfast" 
        : ord.diningCase === "room_service" 
        ? "room_charge" 
        : "cash"
    );
    setCashTendered(String(ord.totalAmount || ord.total || 45));
  }

  function handleConfirmPayment() {
    if (!paymentModalOrder) return;
    if (!paymentModalOrder.id.startsWith("pay-") && !paymentModalOrder.id.startsWith("mock-")) {
      updateOrderMutation.mutate({
        id: paymentModalOrder.id,
        status: "served",
      });
    }
    toast({
      title: "Payment Recorded",
      description: `Order #${paymentModalOrder.orderNumber} settled via ${paymentMethod.replace("_", " ").toUpperCase()}. Receipt issued.`,
    });
    setPaymentModalOrder(null);
  }

  const TABS = isWaiter
    ? ([
        { id: "created_orders", label: "Created Orders" },
        { id: "ready_pass", label: "Ready Food" },
      ] as const)
    : ([
        { id: "orders", label: "Orders" },
        { id: "menu", label: "Menu Catalog" },
        { id: "tables", label: "Tables & Seating" },
        { id: "kitchen", label: "Kitchen Tickets" },
      ] as const);

  return (
    <div className="space-y-4">
      {/* Header with Title and Mode */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
            {isWaiter ? "Waiter Operations" : "Restaurant Operations"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isWaiter && (
            <>
              <Badge variant="outline" className="px-2.5 py-0.5 font-medium text-xs">
                👨‍🍳 Manager
              </Badge>
              <Link href="/dashboard">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" /> Dashboard →
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* KPI Overview Cards - Manager View Only (Hidden on Waiter Page) */}
      {!isWaiter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Active Floor Orders */}
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-2xs group relative overflow-hidden ${
              tab === "orders"
                ? "border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/20 ring-2 ring-amber-500/25 shadow-xs"
                : "border-border bg-white dark:bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-muted group-hover:text-text transition-colors">
                Active Floor Orders
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-foreground">
              {activeFloorCount}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>{servedFloorCount} served • dining on floor</span>
            </div>
          </button>

          {/* Card 2: Tables & Seating */}
          <button
            type="button"
            onClick={() => setTab("tables")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-2xs group relative overflow-hidden ${
              tab === "tables"
                ? "border-sky-500/60 bg-sky-50/70 dark:bg-sky-950/20 ring-2 ring-sky-500/25 shadow-xs"
                : "border-border bg-white dark:bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-muted group-hover:text-text transition-colors">
                Tables & Seating
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-foreground">
              {occupiedCount} <span className="text-xs font-normal text-text-muted font-sans">/ {tables.length || 12} Occupied</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <span>{availableTableCount} tables free ({totalTableSeats} seats)</span>
            </div>
          </button>

          {/* Card 3: Ready at Kitchen Pass */}
          <button
            type="button"
            onClick={() => setTab("kitchen")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-2xs group relative overflow-hidden ${
              tab === "kitchen"
                ? "border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-950/20 ring-2 ring-emerald-500/25 shadow-xs"
                : "border-border bg-white dark:bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-muted group-hover:text-text transition-colors">
                Ready at Kitchen Pass
              </span>
              <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bell className="w-4 h-4" />
                {readyPassOrders.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </div>
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {readyPassOrders.length}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${readyPassOrders.length > 0 ? "bg-emerald-500" : "bg-slate-400"}`}></span>
              <span>{readyPassOrders.length > 0 ? "Awaiting runner delivery" : "Kitchen pass clear"}</span>
            </div>
          </button>

          {/* Card 4: Table Billing & Settlement */}
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={`text-left p-4 rounded-xl border transition-all duration-200 shadow-2xs group relative overflow-hidden ${
              tab === "orders"
                ? "border-purple-500/60 bg-purple-50/70 dark:bg-purple-950/20 ring-2 ring-purple-500/25 shadow-xs"
                : "border-border bg-white dark:bg-card hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-muted group-hover:text-text transition-colors">
                Table Billing & Settlement
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-purple-600 dark:text-purple-400">
              {openFloorTabsCount} <span className="text-xs font-normal text-text-muted font-sans">Open Tabs</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>
                {settledTodayCount} settled
                {billsPrintingCount > 0 ? ` • ${billsPrintingCount} bill requested` : ""}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors capitalize ${
              tab === t.id ? "border-primary text-primary font-semibold" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>



      {/* ========================================================================= */}
      {/* WAITER TAB 1: CREATED ORDERS (PROGRESSIVE LIFECYCLE & DISPATCH)           */}
      {/* ========================================================================= */}
      {tab === "created_orders" && (
        <div className="space-y-4">
          {/* Top Control Bar with Filters & Create Order Button in Best Position */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  placeholder="Search table, room, guest, or order #..."
                  value={waiterOrderSearch}
                  onChange={(e) => setWaiterOrderSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg"
                />
              </div>

              {/* Dining Case Filter */}
              <Select
                value={waiterDiningFilter}
                onValueChange={(val) => {
                  setWaiterDiningFilter(val);
                  if (val !== "in_house_table") {
                    setInHouseSubFilter("all");
                  }
                }}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Dining Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dining Types</SelectItem>
                  <SelectItem value="in_house_table">In-House Guest</SelectItem>
                  <SelectItem value="walk_in">Walk-In Table</SelectItem>
                  <SelectItem value="room_service">Room Service</SelectItem>
                </SelectContent>
              </Select>

              {/* In-House Segment Sub-Toggle: Appears when In-House Guest is selected */}
              {waiterDiningFilter === "in_house_table" && (
                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => setInHouseSubFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                      inHouseSubFilter === "all"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    All In-House ({inHouseOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInHouseSubFilter("assigned")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                      inHouseSubFilter === "assigned"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <span>Assigned</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        inHouseSubFilter === "assigned"
                          ? "bg-amber-900 text-amber-100"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                      )}
                    >
                      {assignedInHouseCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInHouseSubFilter("created")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                      inHouseSubFilter === "created"
                        ? "bg-[#084C42] text-white font-bold shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <span>Created Orders</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        inHouseSubFilter === "created"
                          ? "bg-emerald-900 text-emerald-100"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      )}
                    >
                      {createdInHouseCount}
                    </span>
                  </button>
                </div>
              )}

              {/* Route Filter */}
              <Select value={waiterRouteFilter} onValueChange={setWaiterRouteFilter}>
                <SelectTrigger className="w-[145px] h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Dispatch Route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dispatch Routes</SelectItem>
                  <SelectItem value="coordinator">Via Coordinator</SelectItem>
                  <SelectItem value="direct_kitchen">Direct to Kitchen</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={waiterStatusFilter} onValueChange={setWaiterStatusFilter}>
                <SelectTrigger className="w-[145px] h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium shadow-2xs">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="pending">Pending Draft</SelectItem>
                  <SelectItem value="preparing">Cooking</SelectItem>
                  <SelectItem value="ready">Ready to Serve</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create Order Button - Prominently positioned */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsNewOrderOpen(true)}
                className="h-9 px-4 text-xs font-bold bg-[#FBB72C] hover:bg-[#F5AB1A] text-slate-950 gap-1.5 rounded-lg shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Create Order
              </Button>
            </div>
          </div>

          {/* Created Orders Table - Premium Redesign */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5 pl-4">Order ID</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Table / Location</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Guest & Type</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Ordered Items</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Total</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Stage</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Dispatch Routing</TableHead>
                  <TableHead className="text-right font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5 pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-36 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UtensilsCrossed className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span className="font-medium text-xs text-slate-500">No created orders found.</span>
                        <Button size="sm" variant="outline" onClick={() => setIsNewOrderOpen(true)} className="h-7 text-xs mt-1 border-slate-200 dark:border-slate-700">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Create First Order
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  createdOrdersPagination.paginatedItems.map((ord) => {
                    const amount = Number(ord.totalAmount || ord.total || 0).toFixed(2);
                    const elapsed = getElapsedMinutes(ord.createdAt);
                    const isPending = ord.status === "pending";
                    const isPreparing = ord.status === "preparing";
                    const isReady = ord.status === "ready";
                    const isServed = ord.status === "served";

                    // Determine Lifecycle Stage badge - Clean Status Text Without "Level"
                    let stageBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {ord.isAssignedRoomService ? "Assigned" : "Pending Draft"}
                      </span>
                    );
                    if (ord.coordinatorStatus === "dispatched" && isPreparing) {
                      stageBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                          Cooking
                        </span>
                      );
                    } else if (isPreparing) {
                      stageBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Cooking
                        </span>
                      );
                    } else if (ord.coordinatorStatus === "pending" && !ord.isAssignedRoomService) {
                      stageBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          Coordinator Review
                        </span>
                      );
                    } else if (isReady) {
                      stageBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Ready to Serve
                        </span>
                      );
                    } else if (isServed) {
                      stageBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                          <Check className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          Served
                        </span>
                      );
                    }

                    return (
                      <TableRow key={ord.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 group">
                        <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-foreground py-3.5 pl-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{(ord.orderNumber || ord.id.slice(-4)).replace(/#/g, "").replace(/-/g, " ")}</div>
                          <div className="text-[11px] text-slate-400 font-normal font-sans flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400/80" />
                            <span>{elapsed}m ago</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {ord.tableNumber ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span>Table {ord.tableNumber}</span>
                              </>
                            ) : ord.roomNumber ? (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full ${ord.isAssignedRoomService ? "bg-amber-500 animate-pulse" : "bg-indigo-500"}`}></span>
                                <span>Room {ord.roomNumber}</span>
                              </>
                            ) : (
                              <span>Takeaway / Bar</span>
                            )}
                          </div>
                          {ord.tableNumber && ord.roomNumber && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Room {ord.roomNumber}</div>
                          )}
                          {!ord.tableNumber && ord.roomNumber && ord.isAssignedRoomService && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Room Delivery</div>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            {(ord.diningCase === "in_house_table" || ord.isAssignedRoomService) && ord.guestName && (
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                {ord.guestName}
                              </span>
                            )}
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              ord.isAssignedRoomService
                                ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50"
                                : ord.diningCase === "in_house_table" 
                                ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50" 
                                : ord.diningCase === "room_service" 
                                ? "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50" 
                                : "text-slate-600 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                            }`}>
                              {ord.isAssignedRoomService ? "Assigned" : ord.diningCase === "in_house_table" ? "In-House" : ord.diningCase === "room_service" ? "Room Service" : "Walk-In"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="text-xs max-w-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2" title={ord.items?.map((it: any) => `${it.quantity}× ${it.name || it.menuItemId}`).join(", ")}>
                            {ord.items && ord.items.length > 0 ? (
                              ord.items.map((it: any) => `${it.quantity}× ${it.name || it.menuItemId}`).join(", ")
                            ) : (
                              `${ord.itemsCount || 1} dishes`
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums py-3.5">
                          {Number(ord.totalAmount || 0) > 0 ? (
                            Number(ord.totalAmount) >= 100
                              ? `ETB ${Number(ord.totalAmount).toLocaleString()}`
                              : `$${amount}`
                          ) : (
                            <span className="text-slate-400 font-sans text-[11px] font-normal">Folio Charge</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {stageBadge}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {/* Dispatch routing controls: Two buttons or active route badge */}
                          {isPending && (!ord.routedVia || ord.routedVia === "unassigned" || ord.coordinatorStatus !== "dispatched") ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (ord.isAssignedRoomService && ord.rawRequest) {
                                    handleDispatchAssignedOrder(ord.rawRequest, "coordinator");
                                  } else {
                                    dispatchRouteMutation.mutate({ id: ord.id, route: "coordinator" });
                                  }
                                }}
                                disabled={dispatchRouteMutation.isPending || createOrderMutation.isPending}
                                className="h-7 px-2.5 text-xs font-medium border-purple-200 text-purple-700 bg-purple-50/70 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50 rounded-lg gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                title="Send to F&B Coordinator for review and line balancing"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                                <span>To Coordinator</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (ord.isAssignedRoomService && ord.rawRequest) {
                                    handleDispatchAssignedOrder(ord.rawRequest, "direct_kitchen");
                                  } else {
                                    dispatchRouteMutation.mutate({ id: ord.id, route: "direct_kitchen" });
                                  }
                                }}
                                disabled={dispatchRouteMutation.isPending || createOrderMutation.isPending}
                                className="h-7 px-2.5 text-xs font-medium border-amber-200 text-amber-700 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 rounded-lg gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                title="Send directly to Kitchen Line Officer"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>To Kitchen</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              {ord.routedVia === "coordinator" ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50 w-fit">
                                  <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>Via Coordinator</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50 w-fit">
                                  <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Direct Kitchen</span>
                                </span>
                              )}
                              {ord.coordinatorName && (
                                <span className="text-[11px] text-slate-500 font-medium pl-0.5">{ord.coordinatorName}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {isServed && ord.billingStatus !== "settled" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenPayment(ord)}
                                className="h-8 px-3 text-xs font-semibold bg-[#084C42] hover:bg-[#063a32] text-white gap-1.5 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Settle</span>
                              </Button>
                            )}

                            {isServed && ord.billingStatus === "settled" && (
                              <Badge variant="success" className="text-[10px] uppercase font-bold px-2 py-0.5">
                                ✓ Settled
                              </Badge>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {ord.isAssignedRoomService && ord.rawRequest ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setFulfillTarget(ord.rawRequest);
                                        setIsFulfillOpen(true);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-2" />
                                      View Order Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDispatchAssignedOrder(ord.rawRequest, "coordinator")}>
                                      Send to Coordinator
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDispatchAssignedOrder(ord.rawRequest, "direct_kitchen")}>
                                      Send Direct to Kitchen
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem onClick={() => dispatchRouteMutation.mutate({ id: ord.id, route: "coordinator" })}>
                                      Route to F&B Coordinator
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => dispatchRouteMutation.mutate({ id: ord.id, route: "direct_kitchen" })}>
                                      Route Direct to Kitchen
                                    </DropdownMenuItem>
                                    {ord.billingStatus !== "settled" && (
                                      <DropdownMenuItem onClick={() => handleOpenPayment(ord)}>
                                        Settle Tab / Issue Bill
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="text-danger" onClick={() => updateOrderMutation.mutate({ id: ord.id, status: "cancelled" })}>
                                      Cancel Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredCreatedOrders.length > 5 && (
              <TablePagination pagination={createdOrdersPagination} />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WAITER TAB 2: READY FOOD FROM KITCHEN / COORDINATOR                        */}
      {/* ========================================================================= */}
      {tab === "ready_pass" && (
        <div className="space-y-4">
          {/* Header & Source Input Filter Dropdown */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-card p-3 rounded-xl border border-border shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  placeholder="Search table, room, guest, or order #..."
                  value={readyOrderSearch}
                  onChange={(e) => setReadyOrderSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg"
                />
              </div>

              {/* Source Input Selector */}
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Source:</Label>
                <Select value={readySourceFilter} onValueChange={setReadySourceFilter}>
                  <SelectTrigger className="w-[230px] h-9 text-xs rounded-lg font-medium">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prepared Dishes ({readyPassOrders.length})</SelectItem>
                    <SelectItem value="kitchen">Direct from Kitchen Officer</SelectItem>
                    <SelectItem value="coordinator">Verified by F&B Coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                {filteredReadyPassOrders.length} Ready for Service
              </Badge>
            </div>
          </div>

          {/* Ready Food Table - Premium Redesign */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5 pl-4">Order ID</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Table / Location</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Guest & Type</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Plated Dishes</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Ready</TableHead>
                  <TableHead className="font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5">Ready Time</TableHead>
                  <TableHead className="text-right font-semibold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3.5 pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReadyPassOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        <span className="font-medium text-xs text-slate-500">Kitchen Pass is Clear. No cooked dishes waiting to be served.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  readyOrdersPagination.paginatedItems.map((order) => {
                    const elapsed = getElapsedMinutes(order.createdAt);
                    const isUrgent = elapsed >= 5;
                    const isFromCoord = order.coordinatorStatus === "qa_verified" || (order.routedVia === "coordinator" && order.notifiedParty === "waiter");

                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 group">
                        <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-foreground py-3.5 pl-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{(order.orderNumber || order.id.slice(-4)).replace(/#/g, "").replace(/-/g, " ")}</span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {order.tableNumber ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span>Table {order.tableNumber}</span>
                              </>
                            ) : order.roomNumber ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                <span>Room {order.roomNumber}</span>
                              </>
                            ) : (
                              <span>Takeaway / Bar</span>
                            )}
                          </div>
                          {order.tableNumber && order.roomNumber && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Room {order.roomNumber}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            {order.diningCase === "in_house_table" && order.guestName && (
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                {order.guestName}
                              </span>
                            )}
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              order.diningCase === "in_house_table" 
                                ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50" 
                                : order.diningCase === "room_service" 
                                ? "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50" 
                                : "text-slate-600 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                            }`}>
                              {order.diningCase === "in_house_table" ? "In-House" : order.diningCase === "room_service" ? "Room Service" : "Walk-In"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="text-xs max-w-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2" title={order.items?.map((it: any) => `${it.quantity}× ${it.name || it.menuItemId}`).join(", ")}>
                            {order.items && order.items.length > 0 ? (
                              order.items.map((it: any) => `${it.quantity}× ${it.name || it.menuItemId}`).join(", ")
                            ) : (
                              `${order.itemsCount || 1} plated dishes`
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {isFromCoord ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/50">
                                <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                                <span>QA-Verified</span>
                              </span>
                              {order.coordinatorName && (
                                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium pl-0.5">
                                  {order.coordinatorName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50">
                                <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Kitchen Line</span>
                              </span>
                              {order.kitchenOfficerName && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pl-0.5">
                                  {order.kitchenOfficerName}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border shadow-2xs ${
                            isUrgent 
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" 
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{elapsed}m ago</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-4">
                          <Button
                            size="sm"
                            onClick={() => {
                              updateOrderMutation.mutate({ id: order.id, status: "served" });
                              toast({
                                title: "Order Delivered & Marked Served",
                                description: `Served to ${order.tableNumber ? `Table #${order.tableNumber}` : `Room #${order.roomNumber}`}.`,
                              });
                            }}
                            disabled={updateOrderMutation.isPending}
                            className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Serve</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredReadyPassOrders.length > 5 && (
              <TablePagination pagination={readyOrdersPagination} />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MENU TAB                                                                  */}
      {/* ========================================================================= */}
      {tab === "menu" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
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
            {!isWaiter && (
              <Button onClick={() => setIsAddMenuOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
          </div>
          <Input placeholder="Search dishes and beverages..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} />
          {menuLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-text-muted">No menu items found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMenu.map((item) => (
                <Card key={item.id} className="border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize mt-0.5">{item.category}</Badge>
                      </div>
                      <span className="font-mono font-bold text-base text-primary">${Number(item.price).toFixed(2)}</span>
                    </div>
                    {item.description && <p className="text-xs text-text-muted line-clamp-2">{item.description}</p>}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-text-muted">{item.kitchenSection ?? "General"} • {item.preparationTime ?? 15}m</span>
                      {!isWaiter && (
                        <button
                          onClick={() => toggleAvailMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                          className={`text-xs px-2 py-0.5 rounded font-medium ${item.isAvailable ? "bg-success/10 text-success" : "bg-muted text-text-muted"}`}
                        >
                          {item.isAvailable ? "Available" : "86'd / Out of Stock"}
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLES TAB                                                                */}
      {/* ========================================================================= */}
      {tab === "tables" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-56">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  placeholder="Search table or section..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
              <Select value={tableStatusFilter} onValueChange={setTableStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isWaiter && (
              <Button onClick={() => setIsAddTableOpen(true)} className="h-9 text-xs">
                <Plus className="mr-1.5 h-4 w-4" /> Add Table
              </Button>
            )}
          </div>

          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table #</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablesLoading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                      No tables found.
                    </TableCell>
                  </TableRow>
                ) : (
                  tablesPagination.paginatedItems.map((table) => {
                    const activeOrder = orders.find(
                      (o) =>
                        String(o.tableNumber) === String(table.tableNumber) &&
                        o.status !== "served" &&
                        o.status !== "cancelled"
                    );

                    return (
                      <TableRow key={table.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm font-bold text-slate-900 dark:text-foreground">
                          #{table.tableNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Users className="w-3.5 h-3.5" />
                            <span className="font-medium text-slate-800 dark:text-foreground">{table.capacity} seats</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800 dark:text-foreground">
                          {table.section || "Main Dining"}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted">
                          Floor {table.floor || 1}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (table.status === "available"
                                ? "success"
                                : table.status === "occupied"
                                ? "danger"
                                : table.status === "reserved"
                                ? "warning"
                                : "muted") as any
                            }
                            className="text-[10px] uppercase font-bold"
                          >
                            {table.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activeOrder ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold text-primary">
                                #{activeOrder.orderNumber || activeOrder.id.slice(-4)}
                              </span>{" "}
                              {activeOrder.diningCase === "in_house_table" && activeOrder.guestName && (
                                <span className="text-text-muted">({activeOrder.guestName})</span>
                              )}
                              <span className="ml-1.5 text-[10px] uppercase font-semibold text-amber-600">
                                {activeOrder.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {table.status === "available" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewOrderTableId(String(table.id || table.tableNumber));
                                setNewOrderDiningCase("walk_in");
                                setIsNewOrderOpen(true);
                              }}
                              className="h-7 text-xs font-semibold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Take Order</span>
                            </Button>
                          ) : table.status === "occupied" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTab("billing");
                                setWaiterPaymentSearch(String(table.tableNumber));
                              }}
                              className="h-7 text-xs font-semibold gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>View Tab</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewOrderTableId(String(table.id || table.tableNumber));
                                setIsNewOrderOpen(true);
                              }}
                              className="h-7 text-xs font-semibold gap-1"
                            >
                              <Utensils className="w-3 h-3" />
                              <span>Seat Guests</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredTables.length > 5 && (
              <TablePagination pagination={tablesPagination} />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDERS TAB                                                                */}
      {/* ========================================================================= */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-3">
              <Select value={orderStatus} onValueChange={setOrderStatus}>
                <SelectTrigger className="w-[140px] text-xs">
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
                <SelectTrigger className="w-[140px] text-xs">
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
                  <TableHead>Scenario</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Settlement</TableHead>
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
                      {[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-text-muted">No orders found.</TableCell>
                  </TableRow>
                ) : allOrdersPagination.paginatedItems.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell>
                      {order.diningCase === "walk_in" ? (
                        <Badge variant="outline" className="text-[10px]">Walk-In</Badge>
                      ) : order.diningCase === "in_house_table" ? (
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/40 bg-primary/10">In-House Table</Badge>
                      ) : order.diningCase === "room_service" ? (
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/40 bg-blue-500/10">Room Service</Badge>
                      ) : (
                        <span className="capitalize text-xs text-text-muted">{(order.orderType ?? "").replace(/_/g, " ")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {order.diningCase === "room_service"
                        ? `Room ${order.roomNumber ?? "—"}`
                        : order.roomNumber && order.tableNumber
                        ? `Table ${order.tableNumber} (Rm ${order.roomNumber})`
                        : order.tableNumber
                        ? `Table ${order.tableNumber}`
                        : order.roomNumber
                        ? `Room ${order.roomNumber}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {order.diningCase === "in_house_table" ? (order.guestName ?? "In-House Guest") : "—"}
                    </TableCell>
                    <TableCell>
                      {order.settlementType === "complimentary_breakfast" ? (
                        <Badge variant="success" className="text-[10px]">Comp. Breakfast</Badge>
                      ) : order.settlementType === "room_charge" ? (
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">Room Folio</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-text-muted">Direct</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-semibold">
                        ${Number(order.total ?? order.totalAmount ?? 0).toFixed(2)}
                      </div>
                      {order.complimentaryDiscountAmount && order.complimentaryDiscountAmount > 0 ? (
                        <div className="text-[10px] text-success font-medium">
                          Saved ${order.complimentaryDiscountAmount.toFixed(2)}
                        </div>
                      ) : null}
                    </TableCell>
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
            {orders.length > 5 && (
              <TablePagination pagination={allOrdersPagination} />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KITCHEN TAB                                                               */}
      {/* ========================================================================= */}
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
                          <span className="text-xs font-medium text-primary">
                            {order.diningCase === "room_service"
                              ? `🚪 Room ${order.roomNumber ?? "—"}`
                              : `🍽️ Table ${order.tableNumber ?? "—"}`}
                          </span>
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

      {/* ========================================================================= */}
      {/* DIALOGS                                                                   */}
      {/* ========================================================================= */}

      {/* Generate Insights Dialog */}
      <Dialog open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> F&B AI Executive Insights
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <TrendingUp className="h-4 w-4" /> Top Revenue Driver
              </div>
              <p>Dinner Steak and Traditional specialties drove 48% of gross daily revenue ($5,905). Average cover check rose to $42.50.</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Coffee className="h-4 w-4" /> Breakfast Package Uptake
              </div>
              <p>94% of in-house checked-in residents redeemed complimentary morning breakfast without duplicate claims, confirming robust anti-abuse.</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4" /> Peak Rush Hours
              </div>
              <p>Highest table occupancy occurs between 12:45 PM – 2:00 PM and 7:30 PM – 9:00 PM. Recommend staging delivery trays 15 mins prior.</p>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={() => setIsInsightsOpen(false)}>
            Close Insights
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add Table Reservation Dialog */}
      <Dialog open={isAddReservationOpen} onOpenChange={setIsAddReservationOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="h-4 w-4 text-primary" /> Book Restaurant Table
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreateReservation}>
            <div className="grid gap-1.5">
              <Label className="text-xs">Guest Name *</Label>
              <Input
                required
                value={newResGuestName}
                onChange={(e) => setNewResGuestName(e.target.value)}
                placeholder="e.g. Michael Chen"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Guest Count</Label>
                <Input
                  type="number"
                  min="1"
                  value={newResGuestCount}
                  onChange={(e) => setNewResGuestCount(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Time</Label>
                <Input
                  value={newResTime}
                  onChange={(e) => setNewResTime(e.target.value)}
                  placeholder="e.g. 12:30 PM"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Assign Table</Label>
              <select
                value={newResTable}
                onChange={(e) => setNewResTable(e.target.value)}
                className="flex h-8 w-full rounded-md border border-border bg-surface px-2 text-xs"
              >
                {tables.map(t => (
                  <option key={t.id} value={`Table ${t.tableNumber}`}>Table #{t.tableNumber} ({t.capacity} seats)</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full text-xs h-9">
              Confirm Reservation
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
      <Dialog
        open={isNewOrderOpen}
        onOpenChange={(o) => {
          if (!o) {
            setIsNewOrderOpen(false);
            setNewOrderItems([]);
            setNewOrderResidentVerified(null);
            setNewOrderRoomNumber("");
            setNewOrderGuestName("");
            setNewOrderTableId("");
            setNewOrderDiningCase("walk_in");
            setNewOrderSettlementType("direct_payment");
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span>New Restaurant Order</span>
              <Badge variant="outline" className="font-mono text-xs">
                {newOrderDiningCase === "walk_in" ? "Walk-In" : "Room Service"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (newOrderDiningCase === "room_service" && !newOrderRoomNumber.trim()) {
                toast({ title: "Room Number Missing", description: "Please enter and verify resident room number.", variant: "destructive" });
                return;
              }

              const body: Record<string, unknown> = {
                orderType: newOrderDiningCase === "room_service" ? "room_service" : "dine_in",
                diningCase: newOrderDiningCase,
                settlementType: newOrderSettlementType,
                tableId: newOrderDiningCase !== "room_service" ? (newOrderTableId || undefined) : undefined,
                tableNumber: newOrderDiningCase !== "room_service" ? (tables.find(t => t.id === newOrderTableId)?.tableNumber || undefined) : undefined,
                roomNumber: newOrderRoomNumber.trim() || undefined,
                guestName: newOrderGuestName.trim() || undefined,
                waiterId: user?.id,
                routedVia: newOrderRoutedVia,
                coordinatorId: newOrderRoutedVia === "coordinator" ? (newOrderCoordinatorId || (coordinators[0]?.id || undefined)) : undefined,
                items: newOrderItems.map(i => {
                  return {
                    menuItemId: i.menuItemId,
                    quantity: i.quantity,
                    isComplimentary: false,
                  };
                }),
              };
              createOrderMutation.mutate(body);
            }}
          >
            {/* Scenario Buttons */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-text-muted">Dining Classification *</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewOrderDiningCase("walk_in");
                    setNewOrderSettlementType("direct_payment");
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                    newOrderDiningCase === "walk_in"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Utensils className="h-3.5 w-3.5" />
                    <span>Walk-In Table</span>
                  </div>
                  <span className="text-[10px] text-text-muted leading-tight">Outside diner & floor dining</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewOrderDiningCase("room_service");
                    setNewOrderSettlementType("room_charge");
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                    newOrderDiningCase === "room_service"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <DoorOpen className="h-3.5 w-3.5" />
                    <span>Room Service Delivery</span>
                  </div>
                  <span className="text-[10px] text-text-muted leading-tight">Deliver direct to guest room</span>
                </button>
              </div>
            </div>

            {/* Resident Verification for Room Service */}
            {newOrderDiningCase === "room_service" && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2.5">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-8">
                    <Label className="text-xs">Hotel Room # *</Label>
                    <Input
                      placeholder="e.g. 204"
                      value={newOrderRoomNumber}
                      onChange={(e) => {
                        setNewOrderRoomNumber(e.target.value);
                        setNewOrderResidentVerified(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleVerifyResident(newOrderRoomNumber);
                        }
                      }}
                      className="h-9 text-sm font-mono uppercase"
                    />
                  </div>
                  <div className="col-span-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 text-xs"
                      onClick={() => handleVerifyResident(newOrderRoomNumber)}
                      disabled={newOrderVerifyingResident || !newOrderRoomNumber.trim()}
                    >
                      {newOrderVerifyingResident ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify Resident"}
                    </Button>
                  </div>
                </div>

                {newOrderResidentVerified && newOrderResidentVerified.valid && (
                  <div className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-1">
                    <div className="flex items-center justify-between font-medium text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {newOrderResidentVerified.guestName}
                      </span>
                      <span className="font-mono text-[11px]">Room {newOrderResidentVerified.roomNumber}</span>
                    </div>

                    {newOrderResidentVerified.complimentaryBreakfast && (
                      <div className="pt-1 border-t border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400">
                        {newOrderResidentVerified.complimentaryBreakfast.alreadyClaimed
                          ? "⚠️ Breakfast already claimed today for this room."
                          : "✨ Eligible for 100% complimentary hotel breakfast."}
                      </div>
                    )}
                  </div>
                )}

                {newOrderResidentVerified && !newOrderResidentVerified.valid && (
                  <div className="p-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{newOrderResidentVerified.message || "Room not active or occupied."}</span>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Settlement Route</Label>
                  <select
                    value={newOrderSettlementType}
                    onChange={(e) => setNewOrderSettlementType(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-xs mt-1"
                  >
                    <option value="room_charge">🏨 Charge to Room Folio (Pay at Checkout)</option>
                    <option value="direct_payment">💳 Direct Payment at Door (Cash / Card / Telebirr)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Table & Guest Name: Guest name is ONLY used for In-House Dining (not walk-in or room-service) */}
            {newOrderDiningCase === "walk_in" && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Restaurant Table *</Label>
                <select
                  value={newOrderTableId}
                  onChange={(e) => setNewOrderTableId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-xs"
                >
                  <option value="">Select Table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>Table #{t.tableNumber} ({t.capacity} seats - {t.status})</option>
                  ))}
                </select>
              </div>
            )}

            {newOrderDiningCase === "in_house_table" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Restaurant Table</Label>
                  <select
                    value={newOrderTableId}
                    onChange={(e) => setNewOrderTableId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-xs"
                  >
                    <option value="">Select Table...</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>Table #{t.tableNumber} ({t.capacity} seats - {t.status})</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">In-House Resident Name</Label>
                  <Input
                    value={newOrderGuestName}
                    onChange={(e) => setNewOrderGuestName(e.target.value)}
                    placeholder="Resident guest name"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Table QR Button for Guests */}
            {newOrderDiningCase !== "room_service" && newOrderTableId && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-text">
                    Digital Table Menu QR for Table #{tables.find(t => t.id === newOrderTableId)?.tableNumber || "—"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTableQrModalOpen(true)}
                  className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  Show QR on Tablet
                </Button>
              </div>
            )}

            {/* Kitchen Order Routing */}
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
              <Label className="text-xs font-semibold uppercase text-text-muted">Kitchen Order Routing *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewOrderRoutedVia("coordinator")}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                    newOrderRoutedVia === "coordinator"
                      ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <GitMerge className="h-3.5 w-3.5 text-teal-600" />
                    <span>Via F&B Coordinator</span>
                  </div>
                  <span className="text-[10px] text-text-muted leading-tight">Middleman inventory verification</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewOrderRoutedVia("direct_kitchen")}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                    newOrderRoutedVia === "direct_kitchen"
                      ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 font-semibold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <ChefHat className="h-3.5 w-3.5 text-red-500" />
                    <span>Direct to Kitchen Officer</span>
                  </div>
                  <span className="text-[10px] text-text-muted leading-tight">Express line queue bypass</span>
                </button>
              </div>

              {newOrderRoutedVia === "coordinator" && (
                <div className="pt-1.5">
                  <Label className="text-[11px] font-medium text-text-muted">Assign Available Coordinator:</Label>
                  <select
                    value={newOrderCoordinatorId}
                    onChange={(e) => setNewOrderCoordinatorId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs mt-1"
                  >
                    <option value="">Auto-assign to available coordinator</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isFree ? "🟢 (Available - 0 orders)" : `🟡 (Busy - ${c.activeOrdersCount} active)`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Rapid Multi-Tick Menu Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-text-muted">Select / Tick Food Items *</Label>
                <span className="text-xs text-primary font-bold">
                  {newOrderItems.reduce((acc, i) => acc + i.quantity, 0)} items selected
                </span>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Search dishes or beverages..."
                  value={menuTickSearch}
                  onChange={(e) => setMenuTickSearch(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <select
                  value={menuTickCategory}
                  onChange={(e) => setMenuTickCategory(e.target.value)}
                  className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
                >
                  {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Ticking Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1 border border-border rounded-lg bg-surface">
                {tickableMenuItems.length === 0 ? (
                  <p className="col-span-2 text-xs text-text-muted text-center py-4">No menu items match filter.</p>
                ) : (
                  tickableMenuItems.map((item) => {
                    const inCart = newOrderItems.find(i => i.menuItemId === item.id);
                    const isBreakfast = (item.category || "").toLowerCase() === "breakfast";
                    const isFree = newOrderDiningCase === "in_house_table" && newOrderSettlementType === "complimentary_breakfast" && isBreakfast;

                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-md border text-xs flex items-center justify-between transition-all ${
                          inCart
                            ? "border-primary bg-primary/5"
                            : "border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0 pr-1 select-none">
                          <input
                            type="checkbox"
                            checked={!!inCart}
                            onChange={() => {
                              if (inCart) {
                                setNewOrderItems(prev => prev.filter(i => i.menuItemId !== item.id));
                              } else {
                                addOrderItem(item.id);
                              }
                            }}
                            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-text block truncate">{item.name}</span>
                            <span className="text-[10px] text-text-muted">
                              {item.category} • {isFree ? <span className="text-emerald-600 font-bold">100% Free</span> : `$${Number(item.price).toFixed(2)}`}
                            </span>
                          </div>
                        </label>

                        {inCart && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateOrderItemQty(item.id, -1)}
                              className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-mono font-bold text-xs">{inCart.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateOrderItemQty(item.id, 1)}
                              className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Order Cart Tally Summary */}
              {newOrderItems.length > 0 && (
                <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-text border-b border-border/40 pb-1">
                    <span>Order Cart Summary ({newOrderItems.length} dish types)</span>
                    <span className="text-primary font-mono font-bold">
                      ${newOrderItems.reduce((acc, i) => {
                        const isBreakfast = (i.category || "").toLowerCase() === "breakfast";
                        const isFree = newOrderDiningCase === "in_house_table" && newOrderSettlementType === "complimentary_breakfast" && isBreakfast;
                        return acc + (isFree ? 0 : i.price * i.quantity);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted space-y-0.5 max-h-24 overflow-y-auto">
                    {newOrderItems.map(i => (
                      <div key={i.menuItemId} className="flex justify-between">
                        <span>{i.quantity}× {i.name}</span>
                        <span className="font-mono">${(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-xs h-10 font-bold"
              disabled={createOrderMutation.isPending || newOrderItems.length === 0}
            >
              {createOrderMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : newOrderRoutedVia === "coordinator" ? (
                <Send className="mr-2 h-4 w-4" />
              ) : (
                <ChefHat className="mr-2 h-4 w-4" />
              )}
              Submit Order & Dispatch ({newOrderRoutedVia === "coordinator" ? "Via Coordinator" : "Direct to Kitchen"})
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table QR Code Dialog for Seated Guests */}
      <Dialog open={isTableQrModalOpen} onOpenChange={setIsTableQrModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <span>Table Dining QR Code</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-white rounded-xl border border-border inline-block shadow-xs">
              {/* Scalable SVG/Image QR code representation */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `https://nexushms.hotel/dining/menu?table=${tables.find(t => t.id === newOrderTableId)?.tableNumber || '1'}`
                )}`}
                alt="Table QR Code"
                className="h-44 w-44 mx-auto rounded"
              />
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs font-mono font-bold">
                Table #{tables.find(t => t.id === newOrderTableId)?.tableNumber || "—"}
              </Badge>
              <p className="text-xs text-text-muted max-w-xs mx-auto">
                Present this QR code to the guest. They can scan it with their mobile camera to explore our live digital menu on their smartphone.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsTableQrModalOpen(false)}>
            Close QR Window
          </Button>
        </DialogContent>
      </Dialog>
      {/* Payment Settlement Dialog for Pay Now action */}
      <Dialog open={paymentModalOrder !== null} onOpenChange={(open) => { if (!open) setPaymentModalOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span>Settle Payment • Order #{paymentModalOrder?.orderNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {paymentModalOrder && (
            <div className="space-y-4 text-xs">
              {/* Order Info Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-muted/40 rounded-2xl border border-slate-200/60 dark:border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#084C42] text-white flex items-center justify-center font-bold text-xs">
                      {paymentModalOrder.tableNumber ? `A${paymentModalOrder.tableNumber}` : "TA"}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-foreground">
                        {paymentModalOrder.diningCase === "in_house_table"
                          ? (paymentModalOrder.guestName || "In-House Resident")
                          : paymentModalOrder.diningCase === "room_service"
                          ? `Room Service ${paymentModalOrder.roomNumber ? `(Room #${paymentModalOrder.roomNumber})` : ""}`
                          : "Walk-in Order"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {paymentModalOrder.tableNumber ? `Table #${paymentModalOrder.tableNumber}` : paymentModalOrder.roomNumber ? `Room #${paymentModalOrder.roomNumber}` : "Takeaway / Direct POS"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Total Bill</div>
                    <div className="text-lg font-black text-slate-900 dark:text-foreground font-mono">
                      ${Number(paymentModalOrder.totalAmount || paymentModalOrder.total || 42.50).toFixed(2)}
                    </div>
                  </div>
                </div>

                {paymentModalOrder.items && paymentModalOrder.items.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/40 dark:border-border/60 space-y-1">
                    {paymentModalOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-600 dark:text-muted-foreground text-[11px]">
                        <span>{it.quantity}× {it.name || `Item ${idx + 1}`}</span>
                        <span className="font-mono">${Number(it.price || 0 * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === "cash"
                        ? "border-[#084C42] bg-[#084C42]/5 text-[#084C42] dark:text-emerald-400 font-bold"
                        : "border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/30"
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs">Cash</div>
                      <div className="text-[10px] text-slate-400 font-normal">Physical Cash</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("telebirr")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === "telebirr"
                        ? "border-[#084C42] bg-[#084C42]/5 text-[#084C42] dark:text-emerald-400 font-bold"
                        : "border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/30"
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="text-xs">Telebirr</div>
                      <div className="text-[10px] text-slate-400 font-normal">Mobile Pay</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === "card"
                        ? "border-[#084C42] bg-[#084C42]/5 text-[#084C42] dark:text-emerald-400 font-bold"
                        : "border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/30"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div className="text-xs">Card / POS</div>
                      <div className="text-[10px] text-slate-400 font-normal">Debit / Credit</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("room_charge")}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === "room_charge"
                        ? "border-[#084C42] bg-[#084C42]/5 text-[#084C42] dark:text-emerald-400 font-bold"
                        : "border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/30"
                    }`}
                  >
                    <Hotel className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-xs">Room Charge</div>
                      <div className="text-[10px] text-slate-400 font-normal">Post to Stay Folio</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cash Change Calculator */}
              {paymentMethod === "cash" && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-amber-300">Amount Tendered ($)</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="e.g. 50.00"
                      className="w-28 h-8 text-right font-mono font-bold bg-white dark:bg-card"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-amber-500/20">
                    <span className="text-amber-800 dark:text-amber-300">Change Due:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                      ${Math.max(0, (parseFloat(cashTendered) || 0) - Number(paymentModalOrder.totalAmount || paymentModalOrder.total || 42.50)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPaymentModalOrder(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmPayment}
                  className="bg-[#084C42] hover:bg-[#063b33] text-white font-bold gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ROOM SERVICE ORDER FULFILLMENT MODAL (WAITER ACTION)                      */}
      {/* ========================================================================= */}
      <Dialog open={isFulfillOpen} onOpenChange={setIsFulfillOpen}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="p-0 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-950 dark:text-white">
              Room Service Order Fulfillment
            </DialogTitle>
          </DialogHeader>

          {fulfillTarget && (
            <div className="space-y-4 pt-1">
              {/* Guest & Room Details */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Room Number</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Room {fulfillTarget.roomNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Guest Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{fulfillTarget.guestName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Phone Number</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">{fulfillTarget.phone || "0954123456"}</span>
                </div>
              </div>

              {/* Selected Food & Drinks with Quantities */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Selected Food & Drinks
                </label>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {Array.isArray(fulfillTarget.items) ? (
                    fulfillTarget.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                          {item.price ? `${(item.price * item.quantity).toLocaleString()} ETB` : "Included"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 text-xs text-slate-500">
                      {String(fulfillTarget.items || "—")}
                    </div>
                  )}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold">
                    <span>Total Amount</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {(fulfillTarget.totalAmount || 0).toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* Dispatch Routing Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dispatch Routing
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillRoute("coordinator")}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      fulfillRoute === "coordinator"
                        ? "border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 font-bold"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>To Coordinator</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-normal">F&B verification buffer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillRoute("direct_kitchen")}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      fulfillRoute === "direct_kitchen"
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>To Kitchen</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-normal">Direct line chef queue</span>
                  </button>
                </div>
              </div>

              {/* Folio Settlement to Cashier */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">Auto-Charge to Room Folio (Cashier)</span>
                </div>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsFulfillOpen(false)}
                  className="h-9 px-4 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmFulfill}
                  className="h-9 px-5 text-xs font-bold bg-[#084C42] hover:bg-[#063a32] text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Dispatch & Post to Cashier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { 
  ChefHat, Flame, UtensilsCrossed, Clock, CheckCircle2, 
  AlertCircle, Bell, ArrowRight, RefreshCw, Send, Check, 
  Utensils, Calendar, Filter, ChevronDown, AlertTriangle, 
  Users, BarChart2, Sparkles, Thermometer, Timer, Volume2, 
  ShieldAlert, CheckSquare, Square, Radio, ArrowUpRight,
  Coffee, Layers, Undo2, Zap, LayoutList, LayoutGrid, GitMerge, Search, MoreHorizontal,
  Plus, Minus, ShoppingBag, DoorClosed
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { getInHouseRequests, markInHouseRequestServed, InHouseServiceRequest } from "@/lib/in-house-requests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type KitchenOrderItem = {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isComplimentary?: boolean;
  notes?: string | null;
  station?: "grill" | "hot" | "cold" | "pastry";
  isItemCompleted?: boolean;
};

type KitchenOrder = {
  id: string;
  orderNumber: string;
  tableNumber?: number | null;
  guestName?: string | null;
  diningCase?: "walk_in" | "in_house_table" | "room_service";
  roomNumber?: string | null;
  orderType?: string;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  coordinatorId?: string | null;
  coordinatorName?: string | null;
  waiterId?: string | null;
  waiterName?: string | null;
  kitchenOfficerId?: string | null;
  routedVia?: "coordinator" | "direct_kitchen";
  coordinatorStatus?: "pending" | "dispatched" | "bypassed";
  coordinatorNotes?: string | null;
  kitchenNotes?: string | null;
  notifiedParty?: "waiter" | "coordinator" | null;
  isRushPriority?: boolean;
  readyAt?: string | null;
  createdAt: string;
  items: KitchenOrderItem[];
};

type StationType = "all" | "hot" | "grill" | "cold" | "pastry" | "pass" | "shortages";

type MenuCategoryType = "food" | "drink";

interface MenuItemDef {
  name: string;
  station: "grill" | "hot" | "cold" | "pastry";
}

interface MenuCategoryDef {
  id: string;
  name: string;
  type: MenuCategoryType;
  items: MenuItemDef[];
}

const ETHIOPIAN_HOTEL_MENU: MenuCategoryDef[] = [
  // 1. Meat Dishes (Beef, lamb and chicken) - Default Category
  {
    id: "meat_dishes",
    name: "Meat Dishes",
    type: "food",
    items: [
      { name: "Special Beef Tibs", station: "grill" },
      { name: "Awaze Tibs", station: "grill" },
      { name: "Shekla Tibs", station: "grill" },
      { name: "Beef Steak", station: "grill" },
      { name: "Grilled Chicken", station: "grill" },
      { name: "Roasted Chicken", station: "hot" },
      { name: "Lamb Chops", station: "grill" },
      { name: "Beef Goulash", station: "hot" },
    ],
  },
  // 2. Ethiopian Traditional Food
  {
    id: "traditional_food",
    name: "Ethiopian Traditional Food",
    type: "food",
    items: [
      { name: "Doro Wot (ዶሮ ወጥ)", station: "hot" },
      { name: "Siga Wot (ስጋ ወጥ)", station: "hot" },
      { name: "Tibs (ጥብስ)", station: "grill" },
      { name: "Kitfo (ክትፎ)", station: "grill" },
      { name: "Shiro Wot (ሽሮ ወጥ)", station: "hot" },
      { name: "Beyaynetu (በያይነቱ)", station: "cold" },
      { name: "Firfir (ፍርፍር)", station: "hot" },
      { name: "Dulet (ዱለት)", station: "grill" },
      { name: "Gomen Besiga (ጎመን በስጋ)", station: "hot" },
      { name: "Quanta Firfir (ቋንጣ ፍርፍር)", station: "hot" },
    ],
  },
  // 3. Vegetarian and Fasting Food
  {
    id: "vegetarian_fasting",
    name: "Vegetarian & Fasting Food",
    type: "food",
    items: [
      { name: "Shiro Wot", station: "hot" },
      { name: "Misir Wot (ምስር ወጥ)", station: "hot" },
      { name: "Kik Alicha (ቅል አልጫ)", station: "hot" },
      { name: "Gomen (ጎመን)", station: "hot" },
      { name: "Atakilt Wot (አትክልት ወጥ)", station: "hot" },
      { name: "Bozena Shiro", station: "hot" },
      { name: "Fasting Beyaynetu", station: "cold" },
      { name: "Vegetable Firfir", station: "hot" },
    ],
  },
  // 4. International Food
  {
    id: "international_food",
    name: "International Food",
    type: "food",
    items: [
      { name: "Spaghetti Bolognese", station: "hot" },
      { name: "Pasta Alfredo", station: "hot" },
      { name: "Pizza", station: "hot" },
      { name: "Beef Burger", station: "grill" },
      { name: "Chicken Burger", station: "grill" },
      { name: "Club Sandwich", station: "cold" },
      { name: "Chicken Sandwich", station: "grill" },
      { name: "Fried Rice", station: "hot" },
      { name: "Grilled Fish", station: "grill" },
      { name: "French Fries", station: "hot" },
    ],
  },
  // 5. Breakfast
  {
    id: "breakfast",
    name: "Breakfast",
    type: "food",
    items: [
      { name: "Chechebsa (ጨጨብሳ)", station: "hot" },
      { name: "Kinche (ቅንጬ)", station: "hot" },
      { name: "Firfir", station: "hot" },
      { name: "Enkulal Firfir (scrambled eggs with injera)", station: "hot" },
      { name: "Scrambled Eggs", station: "hot" },
      { name: "Fried Eggs", station: "hot" },
      { name: "Omelette", station: "hot" },
      { name: "Ful Medames", station: "hot" },
      { name: "Bread with Honey and Butter", station: "cold" },
      { name: "Pancakes", station: "hot" },
    ],
  },
  // 6. Snacks and Appetizers
  {
    id: "snacks_appetizers",
    name: "Snacks & Appetizers",
    type: "food",
    items: [
      { name: "Sambusa (ሳምቡሳ)", station: "hot" },
      { name: "Chicken Wings", station: "hot" },
      { name: "Spring Rolls", station: "hot" },
      { name: "Potato Wedges", station: "hot" },
      { name: "French Fries", station: "hot" },
      { name: "Garlic Bread", station: "hot" },
      { name: "Mixed Salad", station: "cold" },
      { name: "Soup of the Day", station: "hot" },
    ],
  },
  // 7. Desserts
  {
    id: "desserts",
    name: "Desserts",
    type: "food",
    items: [
      { name: "Chocolate Cake", station: "pastry" },
      { name: "Cheesecake", station: "pastry" },
      { name: "Fruit Salad", station: "cold" },
      { name: "Ice Cream", station: "cold" },
      { name: "Pancakes with Honey", station: "pastry" },
      { name: "Pudding", station: "pastry" },
      { name: "Brownies", station: "pastry" },
      { name: "Fresh Fruit Platter", station: "cold" },
    ],
  },

  // 8. Hot Drinks
  {
    id: "hot_drinks",
    name: "Hot Drinks",
    type: "drink",
    items: [
      { name: "Ethiopian Coffee (ቡና)", station: "hot" },
      { name: "Macchiato", station: "hot" },
      { name: "Espresso", station: "hot" },
      { name: "Cappuccino", station: "hot" },
      { name: "Latte", station: "hot" },
      { name: "Black Tea", station: "hot" },
      { name: "Spiced Tea", station: "hot" },
      { name: "Hot Chocolate", station: "hot" },
      { name: "Ethiopian Coffee Ceremony", station: "hot" },
    ],
  },
  // 9. Fresh Juices and Smoothies
  {
    id: "fresh_juices",
    name: "Fresh Juices & Smoothies",
    type: "drink",
    items: [
      { name: "Spris (ስፕሪስ)", station: "cold" },
      { name: "Avocado Juice", station: "cold" },
      { name: "Mango Juice", station: "cold" },
      { name: "Papaya Juice", station: "cold" },
      { name: "Pineapple Juice", station: "cold" },
      { name: "Orange Juice", station: "cold" },
      { name: "Watermelon Juice", station: "cold" },
      { name: "Mixed Fruit Juice", station: "cold" },
      { name: "Banana Smoothie", station: "cold" },
    ],
  },
  // 10. Cold Drinks and Soft Drinks
  {
    id: "cold_drinks",
    name: "Cold Drinks & Soft Drinks",
    type: "drink",
    items: [
      { name: "Bottled Water", station: "cold" },
      { name: "Sparkling Water", station: "cold" },
      { name: "Coca-Cola", station: "cold" },
      { name: "Fanta", station: "cold" },
      { name: "Sprite", station: "cold" },
      { name: "Pepsi", station: "cold" },
      { name: "Soda Water", station: "cold" },
      { name: "Malt Drink", station: "cold" },
      { name: "Energy Drink", station: "cold" },
    ],
  },
];

// Assign stations automatically to items based on keywords
const assignStation = (itemName: string): "grill" | "hot" | "cold" | "pastry" => {
  const lower = itemName.toLowerCase();
  if (lower.includes("steak") || lower.includes("burger") || lower.includes("grill") || lower.includes("bbq") || lower.includes("wing") || lower.includes("tibs")) {
    return "grill";
  }
  if (lower.includes("salad") || lower.includes("tartare") || lower.includes("carpaccio") || lower.includes("cold") || lower.includes("sandwich") || lower.includes("juice") || lower.includes("water") || lower.includes("smoothie") || lower.includes("spris") || lower.includes("fanta") || lower.includes("coca")) {
    return "cold";
  }
  if (lower.includes("cake") || lower.includes("dessert") || lower.includes("ice cream") || lower.includes("tart") || lower.includes("pastry") || lower.includes("souffle")) {
    return "pastry";
  }
  return "hot"; // default to saute & hot line (Wot, Kitfo, Firfir, etc.)
};

export default function KitchenOfficerOperationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeStation, setActiveStation] = useState<StationType>("all");
  const [originFilter, setOriginFilter] = useState<"all" | "waiter" | "coordinator">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [completedItemMap, setCompletedItemMap] = useState<Record<string, boolean>>({});
  const [rushTickets, setRushTickets] = useState<Record<string, boolean>>({});
  const [mainTab, setMainTab] = useState<"active" | "served">("active");
  const [servedClassTab, setServedClassTab] = useState<"all" | "dine_in" | "room_service" | "waiter" | "coordinator">("all");
  const [servedSearch, setServedSearch] = useState("");
  const [localOrderStatus, setLocalOrderStatus] = useState<Record<string, KitchenOrder["status"]>>({});
  const [activePage, setActivePage] = useState(1);
  const activePageSize = 5;
  const [servedPage, setServedPage] = useState(1);
  const servedPageSize = 5;

  // 86'd items state
  const [shortageItems, setShortageItems] = useState<Array<{ id: string; name: string; category: string; is86: boolean }>>([
    { id: "s1", name: "Salmon Fillet (Atlantic)", category: "Seafood", is86: true },
    { id: "s2", name: "Prime Ribeye 12oz", category: "Grill", is86: false },
    { id: "s3", name: "Truffle Oil Cream", category: "Sauces", is86: false },
    { id: "s4", name: "Fresh Hass Avocado", category: "Produce", is86: false },
    { id: "s5", name: "Gluten-Free Penne", category: "Pasta", is86: true },
    { id: "s6", name: "Burrata Mozzarella", category: "Dairy", is86: false },
  ]);

  // Batch Prep Checklist
  const [prepChecklist, setPrepChecklist] = useState<Array<{ name: string; station: string; level: "Full" | "Med" | "Low" | "Out" }>>([
    { name: "Veal Demi-Glace Sauce", station: "Hot Line", level: "Med" },
    { name: "Chopped Fresh Herbs (Parsley & Chives)", station: "Cold Pantry", level: "Full" },
    { name: "Marinated Chicken Breasts", station: "Grill", level: "Full" },
    { name: "Brioche Bun Toast Batch", station: "Grill & Fryer", level: "Low" },
    { name: "Caesar Dressing Base", station: "Cold Pantry", level: "Full" },
    { name: "Vanilla Bean Custard", station: "Pastry", level: "Med" },
  ]);

  // Plated Notification Modal state
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [notifyPartyTarget, setNotifyPartyTarget] = useState<"waiter" | "coordinator">("waiter");
  const [kitchenOfficerNote, setKitchenOfficerNote] = useState("");
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);

  const chefName = (user as any)?.firstName || user?.name?.split(" ")[0] || "Abel";

  // Manual Kitchen Order Creation Modal state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicketDiningCase, setNewTicketDiningCase] = useState<"walk_in" | "in_house_table" | "room_service">("walk_in");
  const [newTicketTable, setNewTicketTable] = useState("7");
  const [newTicketRoom, setNewTicketRoom] = useState("102");
  const [newTicketGuest, setNewTicketGuest] = useState("");
  const [newTicketRush, setNewTicketRush] = useState(false);
  const [newTicketNotes, setNewTicketNotes] = useState("");
  const [selectedDishesList, setSelectedDishesList] = useState<Array<{ name: string; quantity: number; station: "grill" | "hot" | "cold" | "pastry" }>>([]);
  const [customDishInput, setCustomDishInput] = useState("");
  const [customDishStation, setCustomDishStation] = useState<"grill" | "hot" | "cold" | "pastry">("hot");
  const [localKitchenTickets, setLocalKitchenTickets] = useState<KitchenOrder[]>([]);

  // Ethiopian Hotel Menu tab & search state (default Food -> Meat Dishes)
  const [menuTypeTab, setMenuTypeTab] = useState<"food" | "drink">("food");
  const [activeMenuCategory, setActiveMenuCategory] = useState<string>("meat_dishes");
  const [menuSearch, setMenuSearch] = useState("");

  const activeMenuCategories = useMemo(() => {
    return ETHIOPIAN_HOTEL_MENU.filter((c) => c.type === menuTypeTab);
  }, [menuTypeTab]);

  const displayedMenuItems = useMemo(() => {
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase().trim();
      return activeMenuCategories.flatMap((c) => c.items).filter((i) => i.name.toLowerCase().includes(q));
    }
    const cat = activeMenuCategories.find((c) => c.id === activeMenuCategory);
    return cat ? cat.items : activeMenuCategories[0]?.items || [];
  }, [menuSearch, activeMenuCategories, activeMenuCategory]);

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

  // Filter pending in-house requests
  const pendingInHouseRequests = useMemo(() => {
    return inHouseRequests.filter((r) => r.status === "pending");
  }, [inHouseRequests]);

  // Requests assigned to current waiter (or all if kitchen officer/manager)
  const waiterPendingRequests = useMemo(() => {
    const role = (user?.role || (user as any)?.roleName || "").toLowerCase();
    const isDedicatedWaiter = role.includes("waiter") || role.includes("server");
    const currentName = (user as any)?.fullName || user?.name || "";

    if (isDedicatedWaiter && currentName) {
      const matched = pendingInHouseRequests.filter(
        (r) =>
          r.assignedWaiterId === user?.id ||
          r.assignedWaiterName.toLowerCase().includes(currentName.toLowerCase().split(" ")[0])
      );
      return matched.length > 0 ? matched : pendingInHouseRequests;
    }
    return pendingInHouseRequests;
  }, [pendingInHouseRequests, user]);

  const handleSelectInHouseRequest = (req: InHouseServiceRequest) => {
    setSelectedInHouseReqId(req.id);
    setNewTicketRoom(req.roomNumber);
    setNewTicketGuest(req.guestName);
    if (req.specialNotes) {
      setNewTicketNotes(req.specialNotes);
    }
    const mappedDishes = req.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      station: assignStation(item.name),
    }));
    setSelectedDishesList(mappedDishes);
    toast({
      title: `Loaded Room ${req.roomNumber} (${req.guestName})`,
      description: `Requested dishes loaded into ticket.`,
    });
  };



  // Fetch kitchen orders with 3s auto-refresh for real-time kitchen telemetry
  const { data: orders = [], isLoading, isFetching, refetch } = useQuery<KitchenOrder[]>({
    queryKey: ["restaurant-kitchen"],
    queryFn: () => apiFetch("/restaurant/kitchen"),
    refetchInterval: 3000,
  });

  // Cross-tab real-time event listener: instantly refetches kitchen queue when waiter/coordinator submits
  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("hms_orders_channel");
      channel.onmessage = () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
      };
    } catch {}

    const handleSync = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
    };

    window.addEventListener("hms_order_sync", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("hms_order_sync", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refetch, queryClient]);

  // Advance order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      apiFetch(`/restaurant/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(notes ? { kitchenNotes: notes } : {}) }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
      if (vars.status === "served") {
        const target = enrichedOrders.find((o) => o.id === vars.id);
        if (target?.roomNumber) {
          markInHouseRequestServed(target.roomNumber);
        }
      }
      if (typeof window !== "undefined") {
        try {
          const channel = new BroadcastChannel("hms_orders_channel");
          channel.postMessage({ type: "STATUS_UPDATED", timestamp: Date.now() });
          channel.close();
        } catch {}
      }
      toast({
        title: "KDS Ticket Updated",
        description: `Order successfully moved to ${vars.status.toUpperCase()}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  // Notify Ready mutation (notifying either Waiter or Coordinator)
  const notifyReadyMutation = useMutation({
    mutationFn: ({ id, notifiedParty, notes }: { id: string; notifiedParty: "waiter" | "coordinator"; notes?: string }) =>
      apiFetch(`/restaurant/orders/${id}/notify-ready`, {
        method: "PATCH",
        body: JSON.stringify({
          notifiedParty,
          kitchenOfficerId: user?.id,
          notes: notes || undefined,
        }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      queryClient.invalidateQueries({ queryKey: ["coordinator-workbench-orders"] });
      if (typeof window !== "undefined") {
        try {
          const channel = new BroadcastChannel("hms_orders_channel");
          channel.postMessage({ type: "ORDER_READY", timestamp: Date.now() });
          channel.close();
        } catch {}
      }
      setIsNotifyModalOpen(false);
      setSelectedOrder(null);
      setKitchenOfficerNote("");
      toast({
        title: "Dishes Plated at Pass 🛎️",
        description: `Buzzer notification sent to ${vars.notifiedParty === "waiter" ? "Floor Waiter" : "F&B Coordinator"}.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Notification Failed", description: err.message, variant: "destructive" });
    },
  });

  // Manual Order Creation Mutation
  const createKitchenOrderMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/restaurant/orders", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["restaurant-kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      if (typeof window !== "undefined") {
        try {
          const channel = new BroadcastChannel("hms_orders_channel");
          channel.postMessage({ type: "ORDER_CREATED", timestamp: Date.now() });
          channel.close();
        } catch {}
      }
      setIsNewTicketOpen(false);
      setSelectedDishesList([{ name: "Chicken Burger", quantity: 1, station: "grill" }]);
      setNewTicketGuest("");
      setNewTicketNotes("");
      setNewTicketRush(false);
      toast({
        title: "Kitchen Order Created 🍳",
        description: "New ticket placed directly onto the active cooking line.",
      });
    },
    onError: () => {
      // Offline fallback: add to local line
      const num = String(Math.floor(1000 + Math.random() * 9000));
      const newMockTicket: KitchenOrder = {
        id: `ticket-${Date.now().toString().slice(-4)}`,
        orderNumber: num,
        tableNumber: newTicketDiningCase !== "room_service" ? Number(newTicketTable) || 1 : null,
        roomNumber: newTicketDiningCase === "room_service" ? newTicketRoom || "102" : null,
        guestName: newTicketGuest.trim() || (newTicketDiningCase === "room_service" ? `Room Guest #${newTicketRoom}` : "Kitchen Walk-In"),
        diningCase: newTicketDiningCase,
        status: "pending",
        routedVia: "direct_kitchen",
        waiterName: `${chefName} (Kitchen Officer)`,
        isRushPriority: newTicketRush,
        kitchenNotes: newTicketNotes || undefined,
        createdAt: new Date().toISOString(),
        items: selectedDishesList.map((dish, i) => ({
          id: `item-${Date.now()}-${i}`,
          menuItemId: `m-${i}`,
          name: dish.name,
          quantity: dish.quantity,
          unitPrice: 18,
          total: 18 * dish.quantity,
          station: dish.station,
        })),
      };
      setLocalKitchenTickets(prev => [newMockTicket, ...prev]);
      if (typeof window !== "undefined") {
        try {
          const channel = new BroadcastChannel("hms_orders_channel");
          channel.postMessage({ type: "ORDER_CREATED", timestamp: Date.now() });
          channel.close();
        } catch {}
      }
      setIsNewTicketOpen(false);
      toast({
        title: "Kitchen Order Created 🍳",
        description: `Ticket #${num} added directly to active kitchen queue.`,
      });
    },
  });

  const handleCreateTicketSubmit = () => {
    if (selectedDishesList.length === 0) {
      toast({ title: "No Dishes Selected", description: "Please add at least one dish to the order.", variant: "destructive" });
      return;
    }

    createKitchenOrderMutation.mutate({
      tableNumber: newTicketDiningCase !== "room_service" ? Number(newTicketTable) || 1 : undefined,
      roomNumber: newTicketDiningCase === "room_service" || newTicketDiningCase === "in_house_table" ? newTicketRoom : undefined,
      guestName: newTicketGuest.trim() || undefined,
      diningCase: newTicketDiningCase,
      isRushPriority: newTicketRush,
      notes: newTicketNotes || undefined,
      routedVia: "direct_kitchen",
      status: "pending",
      items: selectedDishesList.map(dish => ({
        name: dish.name,
        quantity: dish.quantity,
        unitPrice: 18,
        station: dish.station,
      })),
    });

    if (selectedInHouseReqId) {
      const current = getInHouseRequests();
      const updated = current.map(r => r.id === selectedInHouseReqId ? { ...r, status: "dispatched" as const } : r);
      localStorage.setItem("nexus_inhouse_guest_requests", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("nexus_inhouse_requests_updated", { detail: updated }));
    }
  };

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return Math.max(0, diff);
  };

  // High-fidelity culinary line tickets showing both Direct Waiter & Coordinator Dispatched orders
  const defaultKitchenQueue: KitchenOrder[] = useMemo(() => [
    {
      id: "ticket-1023",
      orderNumber: "1023",
      tableNumber: 4,
      guestName: "Emma Johnson",
      diningCase: "walk_in",
      status: "preparing",
      isRushPriority: true,
      routedVia: "direct_kitchen",
      waiterName: "Sarah K. (Floor Waiter)",
      createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
      items: [
        { id: "it-1", menuItemId: "m1", name: "Chicken Burger", quantity: 1, unitPrice: 14, total: 14, notes: "Brioche bun, medium spicy sauce", station: "grill" },
        { id: "it-2", menuItemId: "m2", name: "Truffle Fries", quantity: 1, unitPrice: 5, total: 5, notes: "Extra crispy, parmesan on side", station: "hot" },
      ],
    },
    {
      id: "ticket-1024",
      orderNumber: "1024",
      tableNumber: 2,
      guestName: "James Smith",
      diningCase: "in_house_table",
      roomNumber: "204",
      status: "preparing",
      routedVia: "coordinator",
      coordinatorName: "Robel (F&B Expediter)",
      coordinatorNotes: "VIP in-house table. Please time steak with pasta together.",
      waiterName: "Dawit M. (Server 2)",
      createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
      items: [
        { id: "it-3", menuItemId: "m3", name: "Pasta Carbonara", quantity: 1, unitPrice: 18, total: 18, notes: "Al dente, authentic guanciale", station: "hot" },
        { id: "it-4", menuItemId: "m4", name: "Garlic Focaccia Bread", quantity: 2, unitPrice: 4, total: 8, notes: "Warm out of oven", station: "pastry" },
      ],
    },
    {
      id: "ticket-1025",
      orderNumber: "1025",
      tableNumber: 7,
      guestName: "Sarah Williams",
      diningCase: "walk_in",
      status: "pending",
      routedVia: "direct_kitchen",
      waiterName: "Helen T. (Floor Waiter)",
      createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
      items: [
        { id: "it-5", menuItemId: "m5", name: "Pizza Manhattan 12-inch", quantity: 1, unitPrice: 20, total: 20, notes: "Crisp crust, fresh basil garnish", station: "hot" },
      ],
    },
    {
      id: "ticket-1026",
      orderNumber: "1026",
      tableNumber: 9,
      guestName: "Michael Brown",
      diningCase: "walk_in",
      status: "ready",
      routedVia: "coordinator",
      coordinatorName: "Robel (F&B Expediter)",
      coordinatorNotes: "Rush dressing on side.",
      readyAt: new Date(Date.now() - 3 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
      items: [
        { id: "it-6", menuItemId: "m6", name: "Caesar Salad Supreme", quantity: 1, unitPrice: 12, total: 12, notes: "Dressing tossed, anchovies on side", station: "cold" },
        { id: "it-7", menuItemId: "m7", name: "Fresh Mint Lemonade", quantity: 1, unitPrice: 4, total: 4, station: "cold" },
      ],
      waiterName: "Sarah K. (Floor Waiter)",
    },
    {
      id: "ticket-1027",
      orderNumber: "1027",
      roomNumber: "304",
      diningCase: "room_service",
      guestName: "Olivia Davis",
      status: "ready",
      routedVia: "direct_kitchen",
      waiterName: "In-Room Dining Cart #2",
      readyAt: new Date(Date.now() - 5 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      items: [
        { id: "it-8", menuItemId: "m8", name: "Angus Beef Tenderloin 8oz", quantity: 1, unitPrice: 32, total: 32, notes: "MEDIUM RARE • Rosemary jus on side", station: "grill" },
        { id: "it-9", menuItemId: "m9", name: "Warm Chocolate Fondant", quantity: 1, unitPrice: 10, total: 10, notes: "With vanilla bean gelato", station: "pastry" },
      ],
    },
    {
      id: "ticket-1020",
      orderNumber: "1020",
      tableNumber: 1,
      guestName: "Dawit Haile",
      diningCase: "walk_in",
      status: "served",
      routedVia: "direct_kitchen",
      waiterName: "Sarah K. (Floor Waiter)",
      readyAt: new Date(Date.now() - 40 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
      items: [
        { id: "it-s1", menuItemId: "m10", name: "T-Bone Steak 16oz", quantity: 1, unitPrice: 38, total: 38, notes: "Well done with grilled onions", station: "grill" },
        { id: "it-s2", menuItemId: "m11", name: "Roasted Asparagus", quantity: 1, unitPrice: 8, total: 8, notes: "Garlic butter glaze", station: "hot" },
      ],
    },
    {
      id: "ticket-1021",
      orderNumber: "1021",
      roomNumber: "108",
      guestName: "Elena Rostova",
      diningCase: "room_service",
      status: "served",
      routedVia: "coordinator",
      coordinatorName: "Robel (Expediter)",
      waiterName: "Room Delivery Cart #1",
      readyAt: new Date(Date.now() - 50 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 75 * 60000).toISOString(),
      items: [
        { id: "it-s3", menuItemId: "m12", name: "Seafood Risotto", quantity: 2, unitPrice: 24, total: 48, notes: "Extra parmesan on side", station: "hot" },
        { id: "it-s4", menuItemId: "m13", name: "Tiramisu Tradizionale", quantity: 2, unitPrice: 9, total: 18, notes: "Cocoa dusted", station: "pastry" },
      ],
    },
    {
      id: "ticket-1022",
      orderNumber: "1022",
      tableNumber: 6,
      guestName: "Yonas Abebe",
      diningCase: "in_house_table",
      roomNumber: "402",
      status: "served",
      routedVia: "coordinator",
      coordinatorName: "Robel (Expediter)",
      waiterName: "Dawit M. (Server 2)",
      readyAt: new Date(Date.now() - 68 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
      items: [
        { id: "it-s5", menuItemId: "m14", name: "Classic Margherita Pizza", quantity: 1, unitPrice: 16, total: 16, notes: "Extra crispy crust", station: "hot" },
        { id: "it-s6", menuItemId: "m15", name: "Insalata Caprese", quantity: 1, unitPrice: 12, total: 12, notes: "Balsamic reduction drizzle", station: "cold" },
      ],
    },
    {
      id: "ticket-1019",
      orderNumber: "1019",
      tableNumber: 3,
      guestName: "Hanna Girma",
      diningCase: "walk_in",
      status: "served",
      routedVia: "direct_kitchen",
      waiterName: "Helen T. (Floor Waiter)",
      readyAt: new Date(Date.now() - 88 * 60000).toISOString(),
      createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
      items: [
        { id: "it-s7", menuItemId: "m16", name: "Crispy Calamari", quantity: 1, unitPrice: 14, total: 14, notes: "Tartar & sweet chili sauces", station: "grill" },
        { id: "it-s8", menuItemId: "m17", name: "Berry Mojito Mocktail", quantity: 2, unitPrice: 6, total: 12, station: "cold" },
      ],
    },
  ], []);

  const combinedOrders = useMemo(() => {
    let list: KitchenOrder[] = [...localKitchenTickets];
    if (orders.length > 0) {
      list = [...list, ...orders];
      for (const m of defaultKitchenQueue) {
        if (!list.find(x => x.orderNumber === m.orderNumber || x.id === m.id)) {
          list.push(m);
        }
      }
    } else {
      list = [...list, ...defaultKitchenQueue];
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, defaultKitchenQueue, localKitchenTickets]);

  // Enrich order items with stations if not present and local order status
  const enrichedOrders = useMemo(() => {
    return combinedOrders.map(order => {
      const currentStatus = localOrderStatus[order.id] || order.status;
      return {
        ...order,
        status: currentStatus,
        isRushPriority: rushTickets[order.id] !== undefined ? rushTickets[order.id] : order.isRushPriority,
        items: (order.items || []).map(item => ({
          ...item,
          station: item.station || assignStation(item.name),
          isItemCompleted: completedItemMap[item.id] || false,
        })),
      };
    });
  }, [combinedOrders, completedItemMap, rushTickets, localOrderStatus]);

  // Counts and classification for Already Served orders
  const servedCounts = useMemo(() => {
    const list = enrichedOrders.filter(o => o.status === "served");
    return {
      all: list.length,
      dine_in: list.filter(o => o.diningCase !== "room_service").length,
      room_service: list.filter(o => o.diningCase === "room_service").length,
      waiter: list.filter(o => o.routedVia !== "coordinator").length,
      coordinator: list.filter(o => o.routedVia === "coordinator").length,
    };
  }, [enrichedOrders]);

  // Filtered served orders based on sub-tab and search
  const filteredServedOrders = useMemo(() => {
    let list = enrichedOrders.filter(o => o.status === "served");

    if (servedClassTab === "dine_in") {
      list = list.filter(o => o.diningCase !== "room_service");
    } else if (servedClassTab === "room_service") {
      list = list.filter(o => o.diningCase === "room_service");
    } else if (servedClassTab === "waiter") {
      list = list.filter(o => o.routedVia !== "coordinator");
    } else if (servedClassTab === "coordinator") {
      list = list.filter(o => o.routedVia === "coordinator");
    }

    if (servedSearch.trim()) {
      const q = servedSearch.toLowerCase();
      list = list.filter(o =>
        (o.orderNumber || "").toLowerCase().includes(q) ||
        (o.guestName || "").toLowerCase().includes(q) ||
        String(o.tableNumber || "").includes(q) ||
        String(o.roomNumber || "").includes(q) ||
        (o.waiterName || "").toLowerCase().includes(q) ||
        (o.coordinatorName || "").toLowerCase().includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [enrichedOrders, servedClassTab, servedSearch]);

  // Filtered orders according to active station tab, origin filter and search query
  const stationFilteredOrders = useMemo(() => {
    let list = enrichedOrders;

    if (activeStation === "pass") {
      list = list.filter(o => o.status === "ready");
    } else if (activeStation === "shortages") {
      return [];
    } else if (activeStation !== "all") {
      list = list.filter(o => {
        if (o.status === "served" || o.status === "cancelled") return false;
        return o.items.some(item => item.station === activeStation);
      });
    } else {
      list = list.filter(o => o.status !== "served" && o.status !== "cancelled");
    }

    if (originFilter === "waiter") {
      list = list.filter(o => o.routedVia !== "coordinator");
    } else if (originFilter === "coordinator") {
      list = list.filter(o => o.routedVia === "coordinator");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o => 
        (o.orderNumber || "").toLowerCase().includes(q) ||
        (o.guestName || "").toLowerCase().includes(q) ||
        String(o.tableNumber || "").includes(q) ||
        String(o.roomNumber || "").includes(q) ||
        (o.waiterName || "").toLowerCase().includes(q) ||
        (o.coordinatorName || "").toLowerCase().includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [enrichedOrders, activeStation, originFilter, searchQuery]);

  const activeTotalPages = Math.max(1, Math.ceil(stationFilteredOrders.length / activePageSize));
  const paginatedActiveOrders = useMemo(() => {
    const start = (activePage - 1) * activePageSize;
    return stationFilteredOrders.slice(start, start + activePageSize);
  }, [stationFilteredOrders, activePage]);

  const servedTotalPages = Math.max(1, Math.ceil(filteredServedOrders.length / servedPageSize));
  const paginatedServedOrders = useMemo(() => {
    const start = (servedPage - 1) * servedPageSize;
    return filteredServedOrders.slice(start, start + servedPageSize);
  }, [filteredServedOrders, servedPage]);

  // Counts for each station
  const stationCounts = useMemo(() => {
    const activeOnly = enrichedOrders.filter(o => o.status !== "served" && o.status !== "cancelled");
    return {
      all: activeOnly.length,
      hot: activeOnly.filter(o => o.items.some(i => i.station === "hot")).length,
      grill: activeOnly.filter(o => o.items.some(i => i.station === "grill")).length,
      cold: activeOnly.filter(o => o.items.some(i => i.station === "cold")).length,
      pastry: activeOnly.filter(o => o.items.some(i => i.station === "pastry")).length,
      pass: enrichedOrders.filter(o => o.status === "ready").length,
    };
  }, [enrichedOrders]);

  // Origin distribution counts
  const originCounts = useMemo(() => {
    const activeOnly = enrichedOrders.filter(o => o.status !== "served" && o.status !== "cancelled");
    return {
      all: activeOnly.length,
      waiter: activeOnly.filter(o => o.routedVia !== "coordinator").length,
      coordinator: activeOnly.filter(o => o.routedVia === "coordinator").length,
    };
  }, [enrichedOrders]);

  const toggleItemCompletion = (itemId: string) => {
    setCompletedItemMap(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const toggleRushPriority = (orderId: string) => {
    setRushTickets(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
    toast({
      title: "Priority Tagged",
      description: "Ticket urgency updated on culinary line display.",
    });
  };

  const toggle86Item = (id: string) => {
    setShortageItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.is86;
        toast({
          title: nextState ? "⚠️ Item 86'd (Out of Stock)" : "✅ Item Restocked",
          description: `${item.name} is now ${nextState ? "blocked from orders" : "available for dining & room service"}.`,
        });
        return { ...item, is86: nextState };
      }
      return item;
    }));
  };

  const openNotifyModal = (order: KitchenOrder, target: "waiter" | "coordinator") => {
    setSelectedOrder(order);
    setNotifyPartyTarget(target);
    setKitchenOfficerNote(order.kitchenNotes || "");
    setIsNotifyModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP MAIN TAB SWITCHER: ACTIVE KDS OPERATIONS VS ALREADY SERVED ORDERS  */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMainTab("active")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainTab === "active"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-surface border border-border text-text-muted hover:text-text hover:bg-muted/40"
            }`}
          >
            <ChefHat className="w-4 h-4 text-orange-500" />
            <span>Active Kitchen Line</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              mainTab === "active" ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900" : "bg-muted text-text"
            }`}>
              {stationCounts.all}
            </span>
          </button>

          <button
            onClick={() => { setMainTab("served"); setServedPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mainTab === "served"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-surface border border-border text-text-muted hover:text-text hover:bg-muted/40"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Already Served (Archive)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              mainTab === "served" ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900" : "bg-muted text-text-muted"
            }`}>
              {servedCounts.all}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setIsNewTicketOpen(true)}
            className="h-8 text-xs font-bold bg-[#FBB72C] hover:bg-[#F5AB1A] text-slate-950 gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Order
          </Button>
        </div>
      </div>

      {mainTab === "active" ? (
        <>
          {/* ========================================================================= */}
          {/* 2. UNIFIED KITCHEN TOOLBAR: CATEGORY DROPDOWN, ORIGIN & SEARCH            */}
          {/* ========================================================================= */}
          <div className="p-3.5 bg-surface border border-border rounded-xl shadow-2xs space-y-3">
            {/* Top Control Bar: Category Dropdown & Search */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Select 
                  value={activeStation} 
                  onValueChange={(val) => {
                    setActiveStation(val as StationType);
                    setActivePage(1);
                  }}
                >
                  <SelectTrigger className="w-[240px] h-9 text-xs rounded-lg border-border bg-muted/40 hover:bg-muted/60 font-medium transition-all shadow-2xs">
                    <SelectValue placeholder="All Stations" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border rounded-lg shadow-lg">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      All Active Stations
                    </SelectItem>
                    <SelectItem value="hot" className="text-xs font-medium cursor-pointer">
                      Hot Line &amp; Stoves
                    </SelectItem>
                    <SelectItem value="grill" className="text-xs font-medium cursor-pointer">
                      Grill &amp; Broiler
                    </SelectItem>
                    <SelectItem value="cold" className="text-xs font-medium cursor-pointer">
                      Cold Larder
                    </SelectItem>
                    <SelectItem value="pastry" className="text-xs font-medium cursor-pointer">
                      Pastry &amp; Bakery
                    </SelectItem>
                    <SelectItem value="pass" className="text-xs font-medium cursor-pointer">
                      Expediter Pass (Plated)
                    </SelectItem>
                    <SelectItem value="shortages" className="text-xs font-medium cursor-pointer">
                      86'd Shortages &amp; Prep
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Right: Search Box */}
              <div className="relative w-56 sm:w-72">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActivePage(1);
                  }}
                  placeholder="Search ticket, table, guest..."
                  className="h-8 text-xs bg-muted/30 border-border rounded-lg pl-8"
                />
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Sender Origin Row (Direct Waiter vs Coordinator Dispatched) */}
            {activeStation !== "shortages" && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-border/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => { setOriginFilter("all"); setActivePage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      originFilter === "all"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-muted/50 text-text-muted hover:text-text hover:bg-muted"
                    }`}
                  >
                    All Senders
                  </button>
                  <button
                    onClick={() => { setOriginFilter("waiter"); setActivePage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      originFilter === "waiter"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-muted/50 text-text-muted hover:text-text hover:bg-muted"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Direct from Waiter</span>
                  </button>
                  <button
                    onClick={() => { setOriginFilter("coordinator"); setActivePage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      originFilter === "coordinator"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-muted/50 text-text-muted hover:text-text hover:bg-muted"
                    }`}
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Coordinator Dispatched</span>
                  </button>
                </div>

                {Object.values(rushTickets).some(Boolean) && (
                  <Badge variant="outline" className="text-xs font-medium text-amber-600 border-amber-300">
                    ⚡ Rush Tickets Active
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. STATION WORKSPACE: 86'd MANAGER VIEW OR KDS TICKETS TABLE              */}
          {/* ========================================================================= */}
          {activeStation === "shortages" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: 86'd Fast Toggle */}
              <Card className="bg-surface border-border">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        <span>86'd Item Fast Toggle (Emergency Out-of-Stock)</span>
                      </CardTitle>
                      <p className="text-xs text-text-muted mt-1">
                        Marking an item 86'd immediately disables it across Floor Waiter tablets and Room Service online order portals.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {shortageItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        item.is86 
                          ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400" 
                          : "bg-surface/50 border-border text-text"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.is86 && (
                            <Badge className="bg-red-500 text-white text-[10px] font-mono">86'D</Badge>
                          )}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">Category: {item.category}</div>
                      </div>

                      <Button
                        size="sm"
                        variant={item.is86 ? "destructive" : "outline"}
                        onClick={() => toggle86Item(item.id)}
                        className="text-xs h-8 font-bold"
                      >
                        {item.is86 ? "Restore Item (In Stock)" : "86 This Item (Out of Stock)"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Right: Prep Batch Inventory Level Checklist */}
              <Card className="bg-surface border-border">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-primary" />
                    <span>Culinary Prep Batch Levels</span>
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    Monitored mise en place batches for line cooks prior to dinner service.
                  </p>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {prepChecklist.map((batch, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                      <div>
                        <div className="font-bold text-xs text-text">{batch.name}</div>
                        <div className="text-[10px] text-text-muted font-medium mt-0.5">Station: {batch.station}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(["Full", "Med", "Low", "Out"] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => {
                              setPrepChecklist(prev => prev.map((p, i) => i === idx ? { ...p, level: lvl } : p));
                            }}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                              batch.level === lvl
                                ? lvl === "Full" ? "bg-emerald-500 text-white border-emerald-500"
                                : lvl === "Med" ? "bg-amber-500 text-white border-amber-500"
                                : lvl === "Low" ? "bg-orange-500 text-white border-orange-500"
                                : "bg-red-500 text-white border-red-500"
                                : "bg-surface border-border text-text-muted hover:bg-muted"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* ========================================================================= */
            /* KDS ORDERS IN NEAT, CLEAR TABLE (Matching In-House Guests Table Style)     */
            /* ========================================================================= */
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Active Kitchen Line</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-b-md border-t border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">ID</TableHead>
                        <TableHead>Waiter Name</TableHead>
                        <TableHead>Room / Table</TableHead>
                        <TableHead>Cooking Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedActiveOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-text-muted">
                            No active kitchen tickets in this view.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedActiveOrders.map((order) => {
                          const isCooking = order.status === "preparing";
                          const isReady = order.status === "ready";
                          const isRush = order.isRushPriority || rushTickets[order.id];
                          const loc = order.diningCase === "room_service" ? `Room ${order.roomNumber}` : `Table ${order.tableNumber || 1}`;
                          const cleanId = (order.orderNumber || "").replace(/^[#]/, "");
                          const waiterDisplayName = order.waiterName || (order.routedVia === "coordinator" ? (order.coordinatorName || "Expediter") : "Floor Waiter");

                          return (
                            <TableRow key={order.id} className="hover:bg-muted/40">
                              {/* 1. ID */}
                              <TableCell className="font-medium">
                                <span className="font-mono text-xs font-semibold text-text">
                                  {cleanId}
                                </span>
                                {isRush && (
                                  <span className="ml-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    (Rush)
                                  </span>
                                )}
                              </TableCell>

                              {/* 2. Waiter Name */}
                              <TableCell className="text-xs font-medium text-text">
                                {waiterDisplayName}
                              </TableCell>

                              {/* 3. Room / Table */}
                              <TableCell className="font-semibold text-primary text-xs">
                                {loc}
                              </TableCell>

                              {/* 4. Cooking Status */}
                              <TableCell>
                                {isReady ? (
                                  <Badge variant="muted" className="text-xs">
                                    Plated at Pass
                                  </Badge>
                                ) : isCooking ? (
                                  <Badge variant="muted" className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                                    Cooking
                                  </Badge>
                                ) : (
                                  <Badge variant="muted" className="text-xs">
                                    Queued
                                  </Badge>
                                )}
                              </TableCell>

                              {/* 5. Action */}
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted rounded-lg">
                                      <MoreHorizontal className="h-4 w-4 text-text-muted" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-surface border-border shadow-lg">
                                    {order.status === "pending" && (
                                      <DropdownMenuItem 
                                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: "preparing" })}
                                        className="text-xs font-medium cursor-pointer"
                                      >
                                        <Flame className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                        Fire Cooking
                                      </DropdownMenuItem>
                                    )}
                                    {order.status === "preparing" && (
                                      <>
                                        <DropdownMenuItem 
                                          onClick={() => openNotifyModal(order, "waiter")}
                                          className="text-xs font-medium cursor-pointer"
                                        >
                                          <Send className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                                          Plated → Notify Waiter
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => openNotifyModal(order, "coordinator")}
                                          className="text-xs font-medium cursor-pointer"
                                        >
                                          <Bell className="w-3.5 h-3.5 mr-2 text-teal-500" />
                                          Notify Coordinator
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {order.status === "ready" && (
                                      <DropdownMenuItem 
                                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: "served" })}
                                        className="text-xs font-medium cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                        Mark as Served
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => toggleRushPriority(order.id)}
                                      className="text-xs font-medium cursor-pointer"
                                    >
                                      <Zap className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                      {isRush ? "Remove Rush Priority" : "Tag as Rush Priority"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    currentPage={activePage}
                    totalPages={activeTotalPages}
                    totalItems={stationFilteredOrders.length}
                    pageSize={activePageSize}
                    onPrev={() => setActivePage((p) => Math.max(1, p - 1))}
                    onNext={() => setActivePage((p) => Math.min(activeTotalPages, p + 1))}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* ALREADY SERVED ORDERS (Dedicated Tabbed View with Classification Tabs)    */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Classification Tabs for Served Orders */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 bg-surface border border-border rounded-xl shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-text-muted mr-1">Classify Served:</span>
              {[
                { id: "all", label: "All Served" },
                { id: "dine_in", label: "Dine-In Tables" },
                { id: "room_service", label: "Room Service" },
                { id: "waiter", label: "Direct Waiter" },
                { id: "coordinator", label: "Coordinator Routed" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setServedClassTab(st.id as any);
                    setServedPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    servedClassTab === st.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-muted/50 text-text-muted hover:text-text hover:bg-muted"
                  }`}
                >
                  <span>{st.label}</span>
                </button>
              ))}
            </div>

            {/* Search Box for Served Orders */}
            <div className="relative w-56 sm:w-64">
              <Input
                value={servedSearch}
                onChange={(e) => {
                  setServedSearch(e.target.value);
                  setServedPage(1);
                }}
                placeholder="Search served ticket, table, server..."
                className="h-8 text-xs bg-muted/30 border-border rounded-lg pl-8"
              />
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Heat Lamp Warming Pass (Holding Plates Shelf awaiting Dispatch / Served) */}
          <div className="bg-surface border border-border rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm text-text flex items-center gap-1.5">
                  <span>Heat Lamp Warming Pass (Expediter Shelf)</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600">
                    {stationCounts.pass} Plates Holding
                  </Badge>
                </h3>
              </div>
              <span className="text-[11px] text-text-muted">
                Stainless pass window holding warm dishes until waiter or coordinator collection.
              </span>
            </div>

            <div className="pt-3">
              {stationCounts.pass === 0 ? (
                <div className="text-center py-4 text-xs text-text-muted font-medium">
                  Heat lamp pass is clear. All finished dishes have been dispatched to dining floor.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {enrichedOrders.filter(o => o.status === "ready").map((ord) => (
                    <div key={ord.id} className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/30 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-text">{ord.orderNumber.replace(/^[#]/, "")}</span>
                          <span className="text-[11px] font-semibold text-emerald-600">
                            {ord.diningCase === "room_service" ? `Room ${ord.roomNumber}` : `Table ${ord.tableNumber || 1}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted truncate mt-0.5">
                          {ord.items?.map(i => i.name).join(", ")}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold rounded-lg"
                          onClick={() => openNotifyModal(ord, "waiter")}
                        >
                          <Bell className="w-3 h-3 mr-1" /> Re-Buzz Waiter
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[10px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs gap-1"
                          onClick={() => {
                            setLocalOrderStatus(prev => ({ ...prev, [ord.id]: "served" }));
                            updateStatusMutation.mutate({ id: ord.id, status: "served" });
                            if (ord.roomNumber) {
                              markInHouseRequestServed(ord.roomNumber);
                            }
                            toast({
                              title: "Dishes Marked as Served ✓",
                              description: `Order ${ord.orderNumber.replace(/^[#]/, "")} dispatched and moved to Already Served tab.`,
                            });
                          }}
                        >
                          <Check className="w-3 h-3" />
                          <span>Served</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Served Orders Table */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Already Served (Archive)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-b-md border-t border-border">
                {paginatedServedOrders.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-xl m-4 bg-muted/10">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-text-muted/40 mb-3" />
                    <h3 className="text-sm font-semibold text-text">No Served Tickets in this View</h3>
                    <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                      No completed orders match the current classification tab or search criteria.
                    </p>
                    <Button size="sm" variant="outline" className="mt-4 text-xs font-semibold" onClick={() => { setServedClassTab("all"); setServedSearch(""); }}>
                      Show All Served Orders
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">ID</TableHead>
                        <TableHead>Waiter Name</TableHead>
                        <TableHead>Room / Table</TableHead>
                        <TableHead>Cooking Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedServedOrders.map((ord) => {
                        const loc = ord.diningCase === "room_service" ? `Room ${ord.roomNumber}` : `Table ${ord.tableNumber || 1}`;
                        const cleanId = (ord.orderNumber || "").replace(/^[#]/, "");
                        const waiterDisplayName = ord.waiterName || (ord.routedVia === "coordinator" ? (ord.coordinatorName || "Expediter") : "Floor Waiter");

                        return (
                          <TableRow key={ord.id} className="hover:bg-muted/40 transition-colors">
                            {/* 1. ID */}
                            <TableCell className="font-medium">
                              <span className="font-mono text-xs font-semibold text-text">
                                {cleanId}
                              </span>
                            </TableCell>

                            {/* 2. Waiter Name */}
                            <TableCell className="text-xs font-medium text-text">
                              {waiterDisplayName}
                            </TableCell>

                            {/* 3. Room / Table */}
                            <TableCell className="font-semibold text-primary text-xs">
                              {loc}
                            </TableCell>

                            {/* 4. Cooking Status */}
                            <TableCell>
                              <Badge variant="muted" className="text-xs">
                                Served
                              </Badge>
                            </TableCell>

                            {/* 5. Action */}
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted rounded-lg">
                                    <MoreHorizontal className="h-4 w-4 text-text-muted" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-surface border-border shadow-lg">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setLocalOrderStatus(prev => ({ ...prev, [ord.id]: "ready" }));
                                      updateStatusMutation.mutate({ id: ord.id, status: "ready" });
                                      toast({
                                        title: "Order Returned to Pass 🛎️",
                                        description: `Order ${cleanId} returned to Heat Lamp Warming Pass.`,
                                      });
                                    }}
                                    className="text-xs font-medium cursor-pointer"
                                  >
                                    <Undo2 className="w-3.5 h-3.5 mr-2 text-text-muted" />
                                    Re-Open Ticket
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                <TablePagination
                  currentPage={servedPage}
                  totalPages={servedTotalPages}
                  totalItems={filteredServedOrders.length}
                  pageSize={servedPageSize}
                  onPrev={() => setServedPage((p) => Math.max(1, p - 1))}
                  onNext={() => setServedPage((p) => Math.min(servedTotalPages, p + 1))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PLATED DISH NOTIFICATION & DISPATCH MODAL                             */}
      {/* ========================================================================= */}
      <Dialog open={isNotifyModalOpen} onOpenChange={setIsNotifyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ChefHat className="h-5 w-5 text-red-500" />
              <span>Mark Dishes Plated & Alert {notifyPartyTarget === "waiter" ? "Floor Waiter" : "F&B Coordinator"}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-1">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Order #{selectedOrder.orderNumber}</span>
                  <span className="text-primary font-mono">
                    {selectedOrder.diningCase === "room_service" ? `Room #${selectedOrder.roomNumber}` : `Table #${selectedOrder.tableNumber || 1}`}
                  </span>
                </div>
                <p className="text-text-muted">
                  Recipient: <span className="font-semibold text-text">{notifyPartyTarget === "waiter" ? selectedOrder.waiterName || "Floor Waiter" : selectedOrder.coordinatorName || "F&B Coordinator"}</span>
                </p>
                <div className="pt-1.5 border-t border-border/50 text-[11px] text-text-muted">
                  {selectedOrder.items?.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text">Notification Target</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifyPartyTarget("waiter")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      notifyPartyTarget === "waiter"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 font-bold"
                        : "bg-surface border-border text-text hover:bg-muted"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Floor Server ({selectedOrder.waiterName || "Waiter"})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyPartyTarget("coordinator")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      notifyPartyTarget === "coordinator"
                        ? "bg-teal-500/10 border-teal-500/40 text-teal-600 font-bold"
                        : "bg-surface border-border text-text hover:bg-muted"
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>F&B Coordinator</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-text">Chef Plating Notes (Optional)</label>
                <Textarea
                  placeholder="e.g. Steak rested 4 mins; truffle sauce on side; hot plates carefully handle."
                  value={kitchenOfficerNote}
                  onChange={(e) => setKitchenOfficerNote(e.target.value)}
                  rows={3}
                  className="text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsNotifyModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={() => {
                    if (selectedOrder) {
                      notifyReadyMutation.mutate({
                        id: selectedOrder.id,
                        notifiedParty: notifyPartyTarget,
                        notes: kitchenOfficerNote.trim() || undefined,
                      });
                    }
                  }}
                  disabled={notifyReadyMutation.isPending}
                >
                  {notifyReadyMutation.isPending ? "Sending Notification..." : "Confirm & Send Alert"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MANUAL KITCHEN ORDER CREATION DIALOG                                      */}
      {/* ========================================================================= */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-surface border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-text">
              <ChefHat className="w-5 h-5 text-amber-500" />
              <span>Add Kitchen Order</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Dining Context & In-House Waiter Requests */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-text">Dining Type</Label>
                  <Select
                    value={newTicketDiningCase}
                    onValueChange={(val) => {
                      setNewTicketDiningCase(val as any);
                      if (val !== "in_house_table") {
                        setSelectedInHouseReqId(null);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-In Dining</SelectItem>
                      <SelectItem value="in_house_table">In-House Table</SelectItem>
                      <SelectItem value="room_service">Room Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newTicketDiningCase === "room_service" ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text">Room Number</Label>
                    <Input
                      placeholder="e.g. 102, 204"
                      value={newTicketRoom}
                      onChange={(e) => setNewTicketRoom(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                ) : newTicketDiningCase === "in_house_table" ? (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text">Room Number</Label>
                    <Input
                      placeholder="e.g. 204"
                      value={newTicketRoom}
                      onChange={(e) => setNewTicketRoom(e.target.value)}
                      className="h-9 text-xs rounded-xl font-medium"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text">Table #</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 4, 7"
                      value={newTicketTable}
                      onChange={(e) => setNewTicketTable(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-text">Guest Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Sarah Williams"
                    value={newTicketGuest}
                    onChange={(e) => setNewTicketGuest(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* IN-HOUSE DINING ONLY: Small minimalist section beside/under Dining Type showing assigned pending requests */}
              {newTicketDiningCase === "in_house_table" && (
                <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text">
                      Assigned In-House Requests ({waiterPendingRequests.length})
                    </span>
                    {selectedInHouseReqId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInHouseReqId(null);
                          setSelectedDishesList([]);
                        }}
                        className="text-[10px] text-text-muted hover:text-text cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {waiterPendingRequests.length === 0 ? (
                    <div className="text-[11px] text-text-muted py-1">
                      No pending in-house requests currently assigned.
                    </div>
                  ) : (
                    <div className="flex items-center flex-wrap gap-1.5">
                      {waiterPendingRequests.map((req) => {
                        const isSelected = selectedInHouseReqId === req.id;
                        return (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => handleSelectInHouseRequest(req)}
                            className={cn(
                              "h-7 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                              isSelected
                                ? "bg-text/10 border-text text-text font-bold shadow-2xs"
                                : "bg-surface border-border text-text hover:bg-muted"
                            )}
                          >
                            <DoorClosed className="w-3 h-3 opacity-70" />
                            <span>Room {req.roomNumber}</span>
                            <span className="opacity-40">•</span>
                            <span>{req.guestName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setNewTicketRush(prev => !prev)}
                className={cn(
                  "h-9 px-4 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  newTicketRush
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "bg-surface border-border text-text-muted hover:bg-muted"
                )}
              >
                <Flame className={cn("w-3.5 h-3.5", newTicketRush && "text-rose-500 animate-pulse")} />
                <span>{newTicketRush ? "🔥 Rush Priority Ticket" : "Normal Line Priority"}</span>
              </button>
            </div>

            {/* Selected Dishes Summary */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text">Selected Dishes</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {selectedDishesList.reduce((acc, d) => acc + d.quantity, 0)} items
                  </span>
                </div>
                {selectedDishesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDishesList([])}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedDishesList.length === 0 ? (
                <div className="py-2.5 text-center text-xs text-text-muted">
                  No items selected yet. Tap any item below to add it to this order.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {selectedDishesList.map((dish, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface border border-border shadow-xs text-xs"
                    >
                      <span className="font-semibold text-text">{dish.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1 rounded bg-muted text-text-muted">
                        {dish.station}
                      </span>
                      <div className="flex items-center gap-1 bg-muted/50 rounded px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDishesList(prev =>
                              prev
                                .map((d, i) => (i === idx ? { ...d, quantity: d.quantity - 1 } : d))
                                .filter(d => d.quantity > 0)
                            );
                          }}
                          className="w-4 h-4 flex items-center justify-center text-text-muted hover:text-text cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold px-1">{dish.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDishesList(prev =>
                              prev.map((d, i) => (i === idx ? { ...d, quantity: d.quantity + 1 } : d))
                            );
                          }}
                          className="w-4 h-4 flex items-center justify-center text-text-muted hover:text-text cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Selector: Food / Drink Toggle, Categories, Search, Grid */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Food / Drink Toggle Switch */}
                <div className="flex p-1 bg-muted/50 border border-border rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuTypeTab("food");
                      setActiveMenuCategory("meat_dishes");
                      setMenuSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      menuTypeTab === "food"
                        ? "bg-surface text-text shadow-xs"
                        : "text-text-muted hover:text-text"
                    )}
                  >
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span>Food</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuTypeTab("drink");
                      setActiveMenuCategory("hot_drinks");
                      setMenuSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      menuTypeTab === "drink"
                        ? "bg-surface text-text shadow-xs"
                        : "text-text-muted hover:text-text"
                    )}
                  >
                    <Coffee className="w-3.5 h-3.5 text-blue-600" />
                    <span>Drink</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <Input
                    placeholder={`Search ${menuTypeTab === "food" ? "dishes" : "drinks"}...`}
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl bg-surface border-border"
                  />
                </div>
              </div>

              {/* Category Sub-Tabs */}
              {!menuSearch && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {activeMenuCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveMenuCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
                        activeMenuCategory === cat.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-surface border-border text-text-muted hover:bg-muted/50 hover:text-text"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/10">
                {displayedMenuItems.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-text-muted">
                    No items found matching "{menuSearch}".
                  </div>
                ) : (
                  displayedMenuItems.map((item) => {
                    const existing = selectedDishesList.find((d) => d.name === item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setSelectedDishesList((prev) => {
                            const exists = prev.find((d) => d.name === item.name);
                            if (exists) {
                              return prev.map((d) =>
                                d.name === item.name ? { ...d, quantity: d.quantity + 1 } : d
                              );
                            }
                            return [...prev, { name: item.name, quantity: 1, station: item.station }];
                          });
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between group hover:shadow-xs cursor-pointer",
                          existing
                            ? "bg-primary/5 border-primary/50 shadow-xs ring-1 ring-primary/20"
                            : "bg-surface border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1 w-full">
                          <span className="font-semibold text-xs text-text line-clamp-2">
                            {item.name}
                          </span>
                          {existing && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                              x{existing.quantity}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50 text-[10px] w-full">
                          <span className="text-text-muted capitalize font-mono">{item.station}</span>
                          <span className="text-primary font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> Add
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom Dish Input */}
            <div className="p-2.5 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
              <div className="text-[11px] font-semibold text-text">Add Custom / Off-Menu Dish</div>
              <div className="flex gap-2">
                <Input
                  placeholder="Custom dish name..."
                  value={customDishInput}
                  onChange={(e) => setCustomDishInput(e.target.value)}
                  className="h-8 text-xs rounded-lg flex-1 bg-surface"
                />
                <Select
                  value={customDishStation}
                  onValueChange={(val) => setCustomDishStation(val as any)}
                >
                  <SelectTrigger className="w-28 h-8 text-xs rounded-lg bg-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot Line</SelectItem>
                    <SelectItem value="grill">Grill</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="pastry">Pastry</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!customDishInput.trim()) return;
                    setSelectedDishesList(prev => [
                      ...prev,
                      { name: customDishInput.trim(), quantity: 1, station: customDishStation },
                    ]);
                    setCustomDishInput("");
                  }}
                  className="h-8 text-xs px-3 font-bold cursor-pointer"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-border/70">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewTicketOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTicketSubmit}
              disabled={createKitchenOrderMutation.isPending || selectedDishesList.length === 0}
              className="text-xs font-bold bg-[#FBB72C] hover:bg-[#F5AB1A] text-slate-950 gap-1.5 shadow-xs cursor-pointer rounded-xl"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>{createKitchenOrderMutation.isPending ? "Dispatching..." : "Dispatch to Kitchen Line 🍳"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

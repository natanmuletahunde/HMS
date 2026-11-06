"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import {
  GlassWater,
  CupSoda,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  Search,
  Flame,
  Check,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type BeverageOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string | null;
  station?: string;
  kitchenStatus?: string;
  category?: string | null;
  roundNumber?: number;
};

type BeverageOrder = {
  id: string;
  orderNumber: string;
  tableNumber?: number | null;
  roomNumber?: string | null;
  guestName?: string | null;
  orderType: string;
  status: string;
  pacingPreference?: string;
  waiterId?: string | null;
  waiterName?: string | null;
  coordinatorId?: string | null;
  coordinatorName?: string | null;
  items: BeverageOrderItem[];
  createdAt: string;
  readyAt?: string | null;
  kitchenNotes?: string | null;
};

type BeverageCategory = "all" | "spris" | "fresh_juice" | "soda_water" | "traditional_cold" | "pass";

export default function BeveragesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BeverageCategory>("all");
  const [selectedOrder, setSelectedOrder] = useState<BeverageOrder | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [bevNotes, setBevNotes] = useState("");
  const [sentOrderIds, setSentOrderIds] = useState<Record<string, boolean>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Fetch active juice & soft drink orders from dedicated backend endpoint
  const { data: beverageOrders = [], isLoading, refetch } = useQuery<BeverageOrder[]>({
    queryKey: ["restaurant-beverage-orders"],
    queryFn: () => apiFetch<BeverageOrder[]>("/restaurant/beverages"),
    refetchInterval: 3000,
  });

  // Start Prep mutation for Beverage Station
  const startPrepMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/restaurant/orders/${orderId}/start-prep`, {
        method: "PATCH",
        body: JSON.stringify({ stationSource: "juice" }),
      }),
    onSuccess: (_, orderId) => {
      setLocalStatuses((prev) => ({ ...prev, [orderId]: "preparing" }));
      queryClient.invalidateQueries({ queryKey: ["restaurant-beverage-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Juice Preparation Started 🧃",
        description: "Juice blending and cold drinks marked as preparing in the queue.",
      });
    },
  });

  // Notify Waiter Ready mutation (Beverage Pass Dispatch)
  const notifyReadyMutation = useMutation({
    mutationFn: ({
      id,
      notes,
    }: {
      id: string;
      notes?: string;
    }) =>
      apiFetch(`/restaurant/orders/${id}/notify-ready`, {
        method: "PATCH",
        body: JSON.stringify({
          notifiedParty: "waiter",
          kitchenOfficerId: user?.id,
          notes: notes || undefined,
          stationSource: "juice",
        }),
      }),
    onSuccess: (_, vars) => {
      setSentOrderIds((prev) => ({ ...prev, [vars.id]: true }));
      setLocalStatuses((prev) => ({ ...prev, [vars.id]: "ready" }));
      queryClient.invalidateQueries({ queryKey: ["restaurant-beverage-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Drinks Sent to Beverage Pass 🧃",
        description: "Floor waiter notified for immediate table delivery.",
      });
      setIsSendModalOpen(false);
    },
  });

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let list = beverageOrders.map((o) => ({
      ...o,
      status: localStatuses[o.id] || o.status,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          String(o.tableNumber || "").includes(q) ||
          (o.guestName || "").toLowerCase().includes(q) ||
          (o.waiterName || "").toLowerCase().includes(q) ||
          o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    }

    if (selectedCategory === "spris") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["spris", "ስፕሪስ", "mixed juice", "layered", "smoothie"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "fresh_juice") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["mango", "avocado", "papaya", "orange", "lemonade", "apple", "pineapple", "watermelon", "carrot", "beet", "detox"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "soda_water") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["coke", "coca", "fanta", "sprite", "pepsi", "mirinda", "water", "mineral", "energy drink", "red bull", "malt"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "traditional_cold") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["keribo", "ቀሪቦ", "irgo", "እርጎ", "borde", "ቦርዴ", "cheka"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "pass") {
      list = list.filter((o) => o.status === "ready" || o.status === "partially_ready");
    }

    return list;
  }, [beverageOrders, searchQuery, selectedCategory, localStatuses]);

  // Counts for Beverage Staff KPIs
  const counts = useMemo(() => {
    return {
      all: beverageOrders.length,
      sprisSmoothie: beverageOrders.filter((o) =>
        o.items.some((i) => ["spris", "ስፕሪስ", "mixed juice", "smoothie"].some((k) => i.name.toLowerCase().includes(k)))
      ).length,
      sodasWater: beverageOrders.filter((o) =>
        o.items.some((i) => ["coke", "coca", "fanta", "sprite", "pepsi", "mirinda", "water", "mineral", "energy drink"].some((k) => i.name.toLowerCase().includes(k)))
      ).length,
      drinksFirst: beverageOrders.filter((o) => o.pacingPreference === "drinks_first" && o.status !== "served").length,
      readyPass: beverageOrders.filter((o) => o.status === "ready" || o.status === "partially_ready").length,
    };
  }, [beverageOrders]);

  const openDispatchModal = (order: BeverageOrder) => {
    setSelectedOrder(order);
    setBevNotes("");
    setIsSendModalOpen(true);
  };

  const handleSendBeverages = () => {
    if (!selectedOrder) return;
    notifyReadyMutation.mutate({
      id: selectedOrder.id,
      notes: bevNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-card/90 via-card/50 to-emerald-500/5 p-4 rounded-2xl border border-border shadow-xs backdrop-blur-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <GlassWater className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
                Juice & Cold Beverage Station (JDS)
              </h1>
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
                Beverage Staff & Juice Bar
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Freshly squeezed tropical juices, authentic layered Spris (ስፕሪስ), cold soft drinks, bottled waters, and traditional beverages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1.5 h-9 rounded-xl border-border hover:bg-muted/50 cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span className="text-xs font-medium">Sync Juice Tickets</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlights - 4 Specific Beverage Staff Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Active Juice Tickets</span>
            <p className="text-2xl font-bold text-text mt-1">{counts.all}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <GlassWater className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Layered Spris (ስፕሪስ)</span>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{counts.sprisSmoothie}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Chilled Sodas & Water</span>
            <p className="text-2xl font-bold text-cyan-500 mt-1">{counts.sodasWater}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <CupSoda className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Ready at Beverage Pass</span>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{counts.readyPass}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Category Filters - Specific to Beverage Station */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Cold Drinks" },
            { id: "spris", label: "🥑 Layered Spris (ስፕሪስ)" },
            { id: "fresh_juice", label: "🥭 Fresh Fruit Juices" },
            { id: "soda_water", label: "🥤 Sodas & Bottled Water" },
            { id: "traditional_cold", label: "🥛 Traditional (ቀሪቦ, እርጎ)" },
            { id: "pass", label: "🛎️ Ready at Beverage Pass" },
          ].map((cat) => {
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as BeverageCategory)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border shrink-0",
                  isSel
                    ? "bg-emerald-600 text-white shadow-xs border-emerald-600"
                    : "bg-surface border-border text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-muted/40"
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Spris, mango, sodas, table..."
            className="pl-8 h-9 text-xs rounded-xl bg-surface border-border"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <GlassWater className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-sm font-semibold text-text">No Pending Beverage Tickets</h3>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            When waitstaff place table or room orders with fresh fruit juices, authentic layered Spris (ስፕሪስ), cold soft drinks, or bottled waters, tickets will appear here for immediate blending and pouring.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isReady = order.status === "ready" || order.status === "partially_ready" || sentOrderIds[order.id];
            const isDrinksFirst = order.pacingPreference === "drinks_first";

            return (
              <div
                key={order.id}
                className={cn(
                  "rounded-2xl border p-4 bg-card shadow-xs flex flex-col justify-between transition-all",
                  isReady
                    ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10"
                    : "border-border hover:border-emerald-500/40"
                )}
              >
                {/* Ticket Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div>
                      <span className="text-base font-bold text-text">
                        {order.tableNumber ? `Table #${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : "Juice Walk-In"}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted ml-2">
                        {order.orderNumber}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 uppercase",
                        isReady
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      )}
                    >
                      {isReady ? "Ready at Pass" : order.status}
                    </Badge>
                  </div>

                  {/* Waiter & Time Info */}
                  <div className="flex items-center justify-between text-[11px] text-text-muted py-2 border-b border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Waiter: {order.waiterName || "Floor Staff"}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Serve Drinks First Banner */}
                  {isDrinksFirst && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span>Serve Juices First 🧃 — Blend & Dispatch Early!</span>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="mt-3 space-y-1.5">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between text-xs py-1 border-b border-border/20 last:border-none"
                      >
                        <div className="flex items-start gap-1.5">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.quantity}×
                          </span>
                          <div>
                            <span className="font-medium text-text">{item.name}</span>
                            {item.notes && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] text-text-muted capitalize">
                          {item.kitchenStatus || "pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Footer Action Buttons */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                  {!isReady ? (
                    <>
                      {order.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startPrepMutation.mutate(order.id)}
                          disabled={startPrepMutation.isPending}
                          className="h-8 text-xs font-semibold gap-1 flex-1 cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          Start Blending
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => openDispatchModal(order)}
                        className="h-8 text-xs font-semibold gap-1.5 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send to Beverage Pass 🧃
                      </Button>
                    </>
                  ) : (
                    <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Sent to Waiter ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GlassWater className="w-5 h-5 text-emerald-600" />
              Send Juices to Beverage Pass
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-text-muted">
              Notify floor waiter{" "}
              <strong className="text-text">{selectedOrder?.waiterName || "assigned to table"}</strong> that fresh juices and cold beverages for{" "}
              <strong className="text-text">
                {selectedOrder?.tableNumber ? `Table #${selectedOrder.tableNumber}` : `Room ${selectedOrder?.roomNumber}`}
              </strong>{" "}
              are blended, chilled, and ready on the Beverage Pass counter.
            </p>
            <div className="space-y-1">
              <label className="font-semibold text-text">Beverage Staff Notes for Waiter (Optional):</label>
              <Textarea
                value={bevNotes}
                onChange={(e) => setBevNotes(e.target.value)}
                placeholder="e.g., Layered Spris with straws, extra chilled water bottles..."
                className="text-xs h-20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setIsSendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendBeverages}
              disabled={notifyReadyMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Confirm & Buzz Waiter 🧃
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

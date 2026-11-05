"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import {
  Coffee,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  RefreshCw,
  Search,
  GlassWater,
  Flame,
  Check,
  AlertTriangle,
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

type BarOrderItem = {
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

type BarOrder = {
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
  items: BarOrderItem[];
  createdAt: string;
  readyAt?: string | null;
  kitchenNotes?: string | null;
};

export default function BarDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "cocktail" | "coffee" | "juice" | "wine" | "pass">("all");
  const [selectedOrder, setSelectedOrder] = useState<BarOrder | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [barNotes, setBarNotes] = useState("");
  const [sentOrderIds, setSentOrderIds] = useState<Record<string, boolean>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Fetch active drink orders from the dedicated backend endpoint
  const { data: barOrders = [], isLoading, refetch } = useQuery<BarOrder[]>({
    queryKey: ["restaurant-coffee-orders"],
    queryFn: () => apiFetch<BarOrder[]>("/restaurant/coffee"),
    refetchInterval: 3000,
  });

  // Start Prep mutation for Bar
  const startPrepMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/restaurant/orders/${orderId}/start-prep`, {
        method: "PATCH",
        body: JSON.stringify({ stationSource: "coffee" }),
      }),
    onSuccess: (_, orderId) => {
      setLocalStatuses((prev) => ({ ...prev, [orderId]: "preparing" }));
      queryClient.invalidateQueries({ queryKey: ["restaurant-coffee-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Beverage Preparation Started ☕",
        description: "Drink items marked as preparing in the bar queue.",
      });
    },
  });

  // Notify Waiter Ready mutation (Coffee Pass Dispatch)
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
          stationSource: "coffee",
        }),
      }),
    onSuccess: (_, vars) => {
      setSentOrderIds((prev) => ({ ...prev, [vars.id]: true }));
      setLocalStatuses((prev) => ({ ...prev, [vars.id]: "ready" }));
      queryClient.invalidateQueries({ queryKey: ["restaurant-coffee-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Drinks Sent to Coffee Pass ☕",
        description: "Floor waiter notified for immediate table beverage delivery.",
      });
      setIsSendModalOpen(false);
    },
  });

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let list = barOrders.map((o) => ({
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

    if (selectedCategory === "cocktail") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["mojito", "cocktail", "margarita", "gin", "vodka", "whiskey", "rum"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "coffee") {
      list = list.filter((o) =>
        o.items.some(
          (i) =>
            (i.category || "").toLowerCase() === "coffee" ||
            ["espresso", "latte", "cappuccino", "macchiato", "coffee", "tea", "ቡና"].some((k) =>
              i.name.toLowerCase().includes(k)
            )
        )
      );
    } else if (selectedCategory === "juice") {
      list = list.filter((o) =>
        o.items.some(
          (i) =>
            (i.category || "").toLowerCase() === "juice" ||
            ["juice", "smoothie", "detox", "water", "soda"].some((k) =>
              i.name.toLowerCase().includes(k)
            )
        )
      );
    } else if (selectedCategory === "wine") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["wine", "beer", "draft", "champagne"].some((k) => i.name.toLowerCase().includes(k))
        )
      );
    } else if (selectedCategory === "pass") {
      list = list.filter((o) => o.status === "ready" || o.status === "partially_ready");
    }

    return list;
  }, [barOrders, searchQuery, selectedCategory, localStatuses]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: barOrders.length,
      drinksFirst: barOrders.filter((o) => o.pacingPreference === "drinks_first" && o.status !== "served").length,
      readyPass: barOrders.filter((o) => o.status === "ready" || o.status === "partially_ready").length,
    };
  }, [barOrders]);

  const openDispatchModal = (order: BarOrder) => {
    setSelectedOrder(order);
    setBarNotes("");
    setIsSendModalOpen(true);
  };

  const handleSendDrinks = () => {
    if (!selectedOrder) return;
    notifyReadyMutation.mutate({
      id: selectedOrder.id,
      notes: barNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-card/90 via-card/50 to-cyan-500/5 p-4 rounded-2xl border border-border shadow-xs backdrop-blur-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-xs">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
                Bar Display System (BDS)
              </h1>
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse mr-1.5"></span>
                Bar Station Command
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Dedicated beverage production, espresso bar tickets, and instant Coffee Pass dispatch.
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
            <span className="text-xs font-medium">Sync Tickets</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Active Beverage Tickets</span>
            <p className="text-2xl font-bold text-text mt-1">{counts.all}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">"Serve Drinks First" Queue</span>
            <p className="text-2xl font-bold text-amber-500 mt-1">{counts.drinksFirst}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Ready at Coffee Pass</span>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{counts.readyPass}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Category Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Drinks", icon: Coffee },
            { id: "cocktail", label: "☕ Cocktails", icon: Coffee },
            { id: "coffee", label: "☕ Espresso Bar", icon: Coffee },
            { id: "juice", label: "🧃 Juices & Cold", icon: GlassWater },
            { id: "wine", label: "🍷 Coffee & Beer", icon: Coffee },
            { id: "pass", label: "🛎️ Coffee Pass Ready", icon: CheckCircle2 },
          ].map((cat) => {
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border shrink-0",
                  isSel
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm border-slate-300 dark:border-zinc-700 ring-2 ring-primary/20"
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
            placeholder="Search drinks or table..."
            className="pl-8 h-9 text-xs rounded-xl bg-surface border-border"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <Coffee className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="font-bold text-base text-text">No Active Drink Tickets</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
            When waitstaff place table orders with beverages or juices, drink tickets will appear here for immediate preparation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isSent = sentOrderIds[order.id] || order.status === "ready" || order.status === "partially_ready";
            const isPending = order.status === "pending";
            const isDrinksFirst = order.pacingPreference === "drinks_first";

            return (
              <div
                key={order.id}
                className={cn(
                  "p-4 rounded-2xl border bg-card shadow-xs transition-all flex flex-col justify-between space-y-4 relative",
                  isDrinksFirst
                    ? "border-amber-500/40 bg-amber-500/[0.02]"
                    : "border-border"
                )}
              >
                {/* Top Bar */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text">
                          {order.tableNumber ? `Table #${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : "Walk-in"}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono border-border">
                          {order.orderNumber}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                        <Users className="w-3 h-3" />
                        <span>Waiter: {order.waiterName || "Floor Staff"}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                          isSent
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : "bg-cyan-500/10 text-cyan-500 border-cyan-500/30"
                        )}
                      >
                        {isSent ? "Ready at Pass" : isPending ? "Pending" : "In Prep"}
                      </Badge>
                      <div className="flex items-center justify-end gap-1 text-[11px] text-text-muted mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Drinks First High Priority Banner */}
                  {isDrinksFirst && (
                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Serve Drinks First ☕ — Pour & Dispatch Early!</span>
                    </div>
                  )}
                </div>

                {/* Drinks Items List */}
                <div className="space-y-1.5 border-t border-b border-border py-2.5 my-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-semibold text-text truncate">{item.name}</span>
                        {item.notes && (
                          <span className="text-[10px] text-text-muted italic truncate">({item.notes})</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0 border-border text-text-muted">
                        {item.kitchenStatus || "pending"}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-2 flex items-center gap-2">
                  {isPending && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startPrepMutation.mutate(order.id)}
                      disabled={startPrepMutation.isPending}
                      className="h-9 font-bold text-xs gap-1.5 rounded-xl border-cyan-500/40 text-cyan-600 hover:bg-cyan-500/10 cursor-pointer flex-1"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Start Brewing</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => openDispatchModal(order)}
                    disabled={isSent || notifyReadyMutation.isPending}
                    className={cn(
                      "h-9 font-bold text-xs gap-1.5 rounded-xl cursor-pointer shadow-xs transition-all flex-1",
                      isSent
                        ? "bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 cursor-default"
                        : "bg-cyan-600 hover:bg-cyan-700 text-white"
                    )}
                  >
                    {isSent ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Sent to Waiter ✓</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Coffee Pass ☕</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-text">
              <Coffee className="w-5 h-5 text-cyan-500" />
              <span>Send Drinks Order to Coffee Pass</span>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-200 text-xs flex items-start gap-2">
                <Coffee className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Dispatches drinks directly to the Coffee Pass and triggers an immediate buzzer notification to Waiter{" "}
                  <strong>{selectedOrder.waiterName || "Floor Staff"}</strong> to pick up beverages for{" "}
                  <strong>{selectedOrder.tableNumber ? `Table #${selectedOrder.tableNumber}` : "the table"}</strong>!
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted mb-1 block">
                  Drinks Included:
                </label>
                <div className="space-y-1 p-2 rounded-xl border border-border bg-muted/20">
                  {selectedOrder.items.map((i) => (
                    <div key={i.id} className="text-xs font-medium text-text flex items-center justify-between">
                      <span>
                        {i.quantity}× {i.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                        Ready to Pour
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted mb-1 block">
                  Coffee Pass Notes for Waiter (Optional):
                </label>
                <Textarea
                  value={barNotes}
                  onChange={(e) => setBarNotes(e.target.value)}
                  placeholder="e.g. Glassware on tray at front counter..."
                  className="text-xs rounded-xl resize-none h-18 bg-surface border-border"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSendModalOpen(false)}
              className="rounded-xl border-border hover:bg-muted/50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendDrinks}
              disabled={notifyReadyMutation.isPending}
              className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold cursor-pointer gap-1.5"
            >
              {notifyReadyMutation.isPending ? "Dispatching..." : "Send to Coffee Pass ☕"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

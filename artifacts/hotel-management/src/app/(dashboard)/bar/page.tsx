"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import {
  Wine,
  Beer,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
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

type BarCategory = "all" | "beer" | "wine" | "cocktail" | "traditional" | "pass";

export default function BarDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BarCategory>("all");
  const [selectedOrder, setSelectedOrder] = useState<BarOrder | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [barNotes, setBarNotes] = useState("");
  const [sentOrderIds, setSentOrderIds] = useState<Record<string, boolean>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Fetch active bar orders from dedicated backend endpoint
  const { data: barOrders = [], isLoading, refetch } = useQuery<BarOrder[]>({
    queryKey: ["restaurant-bar-orders"],
    queryFn: () => apiFetch<BarOrder[]>("/restaurant/bar"),
    refetchInterval: 3000,
  });

  // Start Prep mutation for Bar
  const startPrepMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiFetch(`/restaurant/orders/${orderId}/start-prep`, {
        method: "PATCH",
        body: JSON.stringify({ stationSource: "bar" }),
      }),
    onSuccess: (_, orderId) => {
      setLocalStatuses((prev) => ({ ...prev, [orderId]: "preparing" }));
      queryClient.invalidateQueries({ queryKey: ["restaurant-bar-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Bar Prep Started 🍸",
        description: "Cocktail and beverage items marked as pouring in the bar queue.",
      });
    },
  });

  // Notify Waiter Ready mutation (Bar Pass Dispatch)
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
          stationSource: "bar",
        }),
      }),
    onSuccess: (_, vars) => {
      setSentOrderIds((prev) => ({ ...prev, [vars.id]: true }));
      setLocalStatuses((prev) => ({ ...prev, [vars.id]: "ready" }));
      queryClient.invalidateQueries({ queryKey: ["restaurant-bar-orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders"] });
      toast({
        title: "Drinks Sent to Bar Pass 🍸",
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

    if (selectedCategory === "beer") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["beer", "cider", "draft", "st. george", "dashen", "walia", "habesha", "heineken", "corona", "guinness", "bedele"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "wine") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["wine", "champagne", "rosé", "sparkling", "chardonnay", "merlot", "cabernet", "prosecco"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "cocktail") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["mojito", "cocktail", "margarita", "martini", "negroni", "gin", "vodka", "whiskey", "whisky", "rum", "brandy", "sour", "daiquiri", "spritz", "cosmo"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "traditional") {
      list = list.filter((o) =>
        o.items.some((i) =>
          ["tej", "ጠጅ", "tella", "ጠላ", "areke", "አረቄ"].some((k) =>
            i.name.toLowerCase().includes(k)
          )
        )
      );
    } else if (selectedCategory === "pass") {
      list = list.filter((o) => o.status === "ready" || o.status === "partially_ready");
    }

    return list;
  }, [barOrders, searchQuery, selectedCategory, localStatuses]);

  // Counts for Barman KPIs
  const counts = useMemo(() => {
    return {
      all: barOrders.length,
      traditional: barOrders.filter((o) =>
        o.items.some((i) => ["tej", "ጠጅ", "tella", "ጠላ", "areke", "አረቄ"].some((k) => i.name.toLowerCase().includes(k)))
      ).length,
      cocktails: barOrders.filter((o) =>
        o.items.some((i) => ["mojito", "cocktail", "margarita", "martini", "gin", "vodka", "whiskey", "rum", "spritz"].some((k) => i.name.toLowerCase().includes(k)))
      ).length,
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
            <Wine className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text">
                Bar Display System (BDS)
              </h1>
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse mr-1.5"></span>
                Barman & Cellar Station
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Craft cocktails, draft & bottled beers, cellar wines, spirits, and Ethiopian traditional brews (Tej ጠጅ, Tella ጠላ, Areke አረቄ).
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
            <span className="text-xs font-medium">Sync Bar Tickets</span>
          </Button>
        </div>
      </div>

      {/* KPI Highlights - 4 Specific Barman Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Active Bar Tickets</span>
            <p className="text-2xl font-bold text-text mt-1">{counts.all}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Wine className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Traditional Brews (ጠጅ/ጠላ)</span>
            <p className="text-2xl font-bold text-purple-500 mt-1">{counts.traditional}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Cocktails & Spirits</span>
            <p className="text-2xl font-bold text-amber-500 mt-1">{counts.cocktails}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Ready at Bar Pass</span>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{counts.readyPass}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Category Filters - Specific to Bar Station */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Bar Orders" },
            { id: "beer", label: "🍺 Beers & Ciders" },
            { id: "wine", label: "🍷 Wines & Cellar" },
            { id: "cocktail", label: "🍸 Cocktails & Spirits" },
            { id: "traditional", label: "🏺 Traditional (ጠጅ, ጠላ, አረቄ)" },
            { id: "pass", label: "🛎️ Ready at Bar Pass" },
          ].map((cat) => {
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as BarCategory)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border shrink-0",
                  isSel
                    ? "bg-cyan-600 text-white shadow-xs border-cyan-600"
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
            placeholder="Search cocktails, beers, table..."
            className="pl-8 h-9 text-xs rounded-xl bg-surface border-border"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
          <Wine className="w-12 h-12 mx-auto text-text-muted/40 mb-3" />
          <h3 className="text-sm font-semibold text-text">No Pending Bar Tickets</h3>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            When waitstaff place table or room orders with cocktails, beers, wines, or traditional brews (Tej, Tella, Areke), tickets will appear here for immediate pouring.
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
                    : "border-border hover:border-cyan-500/40"
                )}
              >
                {/* Ticket Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border/60">
                    <div>
                      <span className="text-base font-bold text-text">
                        {order.tableNumber ? `Table #${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : "Bar Walk-In"}
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
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-medium flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span>Serve Drinks First 🍸 — Pour & Dispatch Early!</span>
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
                          <span className="font-bold text-cyan-600 dark:text-cyan-400">
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
                          Start Pouring
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => openDispatchModal(order)}
                        className="h-8 text-xs font-semibold gap-1.5 flex-1 bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send to Bar Pass 🍸
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
              <Wine className="w-5 h-5 text-cyan-600" />
              Send Drinks to Bar Pass
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-text-muted">
              Notify floor waiter{" "}
              <strong className="text-text">{selectedOrder?.waiterName || "assigned to table"}</strong> that drinks
              for{" "}
              <strong className="text-text">
                {selectedOrder?.tableNumber ? `Table #${selectedOrder.tableNumber}` : `Room ${selectedOrder?.roomNumber}`}
              </strong>{" "}
              are poured and ready on the Bar Pass counter.
            </p>
            <div className="space-y-1">
              <label className="font-semibold text-text">Bar Notes for Waiter (Optional):</label>
              <Textarea
                value={barNotes}
                onChange={(e) => setBarNotes(e.target.value)}
                placeholder="e.g., Served in traditional Bereles, garnished with fresh lime..."
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
              onClick={handleSendDrinks}
              disabled={notifyReadyMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Confirm & Buzz Waiter 🍸
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

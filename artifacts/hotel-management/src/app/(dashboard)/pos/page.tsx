"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Minus, X, Loader2, Utensils, Hotel, DoorOpen, CheckCircle2, 
  AlertCircle, Coffee, Receipt, Sparkles, Search, ShoppingBag, Trash2 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
};

type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
};

type PlacedOrder = {
  id: string;
  orderNumber: string;
  orderType: string;
  diningCase?: "walk_in" | "in_house_table" | "room_service";
  settlementType?: "direct_payment" | "complimentary_breakfast" | "room_charge";
  complimentaryDiscountAmount?: number;
  tableNumber?: string;
  roomNumber?: string;
  guestName?: string;
  items: CartItem[];
  subtotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  serviceChargePercent: number;
  total: number;
  paymentStatus?: string;
  paymentMethod?: string;
};

type ResidentVerification = {
  valid: boolean;
  isOccupied: boolean;
  roomId?: string;
  roomNumber?: string;
  reservationId?: string | null;
  guestId?: string | null;
  guestName: string;
  adults?: number;
  message?: string;
  complimentaryBreakfast?: {
    isEligible: boolean;
    alreadyClaimed: boolean;
    coversClaimed: number;
    claimDate: string;
    claimTime: string | null;
    message: string;
  };
};

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Drinks", "Dessert", "Coffee"];

export default function POSPage() {
  const { toast } = useToast();

  // Left panel state
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  // Right panel state - 3 Dining Cases
  const [diningCase, setDiningCase] = useState<"walk_in" | "in_house_table" | "room_service">("walk_in");
  const [settlementType, setSettlementType] = useState<"direct_payment" | "complimentary_breakfast" | "room_charge">("direct_payment");

  const [orderType, setOrderType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [residentVerified, setResidentVerified] = useState<ResidentVerification | null>(null);
  const [verifyingResident, setVerifyingResident] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [serviceChargePercent, setServiceChargePercent] = useState(0);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["restaurant-menu"],
    queryFn: () => apiFetch<MenuItem[]>("/restaurant/menu-items"),
  });

  const placeOrderMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<PlacedOrder>("/pos/orders", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setPlacedOrder({
        ...data,
        diningCase,
        settlementType,
        complimentaryDiscountAmount: compBreakfastDiscount,
        items: cart,
        subtotal: grossSubtotal,
        discountType,
        discountValue,
        discountAmount,
        taxPercent,
        serviceChargePercent,
        total: finalTotal,
      });
      toast({ title: `Order #${data.orderNumber} placed!` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method?: string }) =>
      apiFetch(`/pos/orders/${id}`, { method: "PATCH", body: JSON.stringify({ paymentStatus: "paid", paymentMethod: method || paymentMethod }) }),
    onSuccess: () => {
      toast({ title: "Order marked as settled / paid" });
      if (placedOrder) setPlacedOrder({ ...placedOrder, paymentStatus: "paid" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const availableItems = menuItems.filter(m => m.isAvailable);

  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    cats.add("All");
    CATEGORIES.forEach(c => cats.add(c));
    menuItems.forEach(m => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats);
  }, [menuItems]);

  const filteredItems = availableItems.filter((item) => {
    if (category !== "All" && item.category.toLowerCase() !== category.toLowerCase()) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleVerifyResident(roomToVerify?: string) {
    const target = (roomToVerify ?? roomNumber).trim();
    if (!target) {
      toast({ title: "Room Number Required", description: "Please enter a room number to verify in PMS.", variant: "destructive" });
      return;
    }
    setVerifyingResident(true);
    try {
      const res = await apiFetch<ResidentVerification>(`/pos/verify-resident?roomNumber=${encodeURIComponent(target)}`);
      setResidentVerified(res);
      if (res.valid && res.isOccupied) {
        setGuestName(res.guestName);
        toast({ title: `Resident Verified: ${res.guestName}`, description: `Room ${res.roomNumber} is actively checked in.` });
        if (res.complimentaryBreakfast?.isEligible) {
          // If in-house table and has breakfast items, default to complimentary breakfast
          setSettlementType("complimentary_breakfast");
        } else if (diningCase === "room_service") {
          setSettlementType("room_charge");
        }
      } else {
        toast({ title: "Verification Failed", description: res.message || "Room not active or occupied", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Verification Error", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingResident(false);
    }
  }

  function handleSelectDiningCase(c: "walk_in" | "in_house_table" | "room_service") {
    setDiningCase(c);
    if (c === "walk_in") {
      setOrderType("dine_in");
      setSettlementType("direct_payment");
      setRoomNumber("");
      setResidentVerified(null);
    } else if (c === "in_house_table") {
      setOrderType("dine_in");
      if (residentVerified?.complimentaryBreakfast?.isEligible) {
        setSettlementType("complimentary_breakfast");
      } else {
        setSettlementType("room_charge");
      }
    } else if (c === "room_service") {
      setOrderType("room_service");
      setSettlementType("room_charge");
      setTableNumber("");
    }
  }

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, category: item.category }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  }

  function removeItem(menuItemId: string) {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }

  // Calculate pricing taking into account Complimentary Breakfast
  const grossSubtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  // Complimentary breakfast discount applies 100% off breakfast items if in_house_table and settlementType === "complimentary_breakfast"
  const compBreakfastDiscount = (diningCase === "in_house_table" && settlementType === "complimentary_breakfast")
    ? cart.reduce((sum, c) => {
        const itemCat = (c.category || menuItems.find(m => m.id === c.menuItemId)?.category || "").toLowerCase();
        return itemCat === "breakfast" ? sum + c.price * c.quantity : sum;
      }, 0)
    : 0;

  const billableSubtotal = Math.max(0, grossSubtotal - compBreakfastDiscount);

  const discountAmount = discountType === "percent"
    ? billableSubtotal * (discountValue / 100)
    : discountType === "fixed"
    ? Math.min(discountValue, billableSubtotal)
    : 0;

  const afterDiscount = billableSubtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const serviceAmount = afterDiscount * (serviceChargePercent / 100);
  const finalTotal = Math.max(0, afterDiscount + taxAmount + serviceAmount);

  function resetOrder() {
    setCart([]);
    setTableNumber("");
    setRoomNumber("");
    setGuestName("");
    setResidentVerified(null);
    setDiscountType("none");
    setDiscountValue(0);
    setTaxPercent(0);
    setServiceChargePercent(0);
    setPlacedOrder(null);
    setPaymentMethod("cash");
    setDiningCase("walk_in");
    setSettlementType("direct_payment");
  }

  function handlePlaceOrder() {
    if (diningCase === "in_house_table" || diningCase === "room_service") {
      if (!roomNumber.trim()) {
        toast({ title: "Room Number Missing", description: "Please enter and verify resident room number.", variant: "destructive" });
        return;
      }
    }
    if (diningCase === "walk_in" || diningCase === "in_house_table") {
      if (!tableNumber.trim()) {
        toast({ title: "Table Number Recommended", description: "Please enter table number for restaurant floor service." });
      }
    }

    const body: Record<string, unknown> = {
      orderType: diningCase === "room_service" ? "room_service" : orderType,
      diningCase,
      settlementType,
      guestName: diningCase === "in_house_table" ? (guestName || residentVerified?.guestName || undefined) : undefined,
      tableNumber: tableNumber || undefined,
      roomNumber: roomNumber || undefined,
      items: cart.map(c => ({
        menuItemId: c.menuItemId,
        quantity: c.quantity,
        isComplimentary: diningCase === "in_house_table" && settlementType === "complimentary_breakfast" &&
          (c.category || menuItems.find(m => m.id === c.menuItemId)?.category || "").toLowerCase() === "breakfast"
      })),
      subtotal: grossSubtotal,
      complimentaryDiscountAmount: compBreakfastDiscount,
      discountType,
      discountValue,
      discountAmount,
      taxPercent,
      serviceChargePercent,
      totalAmount: finalTotal,
    };
    placeOrderMutation.mutate(body);
  }

  const hasBreakfastItems = cart.some(c =>
    (c.category || menuItems.find(m => m.id === c.menuItemId)?.category || "").toLowerCase() === "breakfast"
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4.25rem)] gap-4 overflow-hidden">
      {/* LEFT PANEL - Menu Catalog & Search */}
      <div className="flex-1 lg:flex-[3] flex flex-col gap-3.5 overflow-hidden">
        {/* Title Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
              Restaurant & POS Terminal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Terminal
            </span>
          </div>
        </div>

        {/* Category & Search Filter Bar in ONE unified control */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-52 shrink-0">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10 text-xs rounded-xl bg-surface border-border font-medium shadow-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categoriesList.map((cat) => {
                  const count = cat === "All" 
                    ? availableItems.length 
                    : availableItems.filter(m => m.category.toLowerCase() === cat.toLowerCase()).length;
                  return (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>
                          {cat === "Breakfast" ? "🍳 Breakfast" :
                           cat === "Coffee" ? "☕ Coffee" :
                           cat === "Drinks" ? "🍹 Drinks" :
                           cat === "Dessert" ? "🍰 Dessert" :
                           cat === "Lunch" ? "🥗 Lunch" :
                           cat === "Dinner" ? "🥩 Dinner" :
                           cat}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono font-normal">({count})</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search dishes, beverages, coffee, desserts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs rounded-xl bg-surface border-border shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {menuLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-44 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-text-muted">
              <Coffee className="w-8 h-8 opacity-40" />
              <p className="text-xs font-medium">No menu items match your search or filter.</p>
              {(category !== "All" || search) && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setCategory("All"); setSearch(""); }}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
              {filteredItems.map((item) => {
                const isBreakfast = item.category.toLowerCase() === "breakfast";
                const inCart = cart.find(c => c.menuItemId === item.id);
                return (
                  <div
                    key={item.id}
                    className={`border rounded-2xl p-3.5 bg-surface dark:bg-card shadow-xs transition-all duration-150 flex flex-col justify-between group ${
                      inCart 
                        ? "border-primary/70 bg-primary/[0.03] shadow-sm" 
                        : "border-border hover:border-primary/40 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="font-semibold text-xs md:text-sm text-slate-900 dark:text-foreground line-clamp-2 leading-tight">
                          {item.name}
                        </span>
                        {isBreakfast && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                            🍳 Breakfast
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-text-muted bg-slate-100 dark:bg-muted px-2 py-0.5 rounded-full capitalize">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-3">
                      <span className="font-mono font-bold text-sm md:text-base text-[#084C42] dark:text-emerald-400">
                        ${Number(item.price).toFixed(2)}
                      </span>

                      {inCart ? (
                        <div className="flex items-center gap-1.5 bg-primary/10 rounded-xl px-1.5 py-0.5 border border-primary/20">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold text-primary min-w-4 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          className="h-7 px-2.5 text-xs font-bold bg-[#084C42] hover:bg-[#063a32] text-white rounded-xl gap-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Order Builder & Settlement */}
      <div className="flex-1 lg:flex-[2] flex flex-col border border-border overflow-hidden bg-surface dark:bg-card/70 rounded-2xl shadow-sm">
        {placedOrder ? (
          // RECEIPT VIEW
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-foreground">
                  <Receipt className="h-5 w-5 text-primary" /> Order Receipt
                </h2>
                <span className="text-xs text-text-muted font-mono">#{placedOrder.orderNumber}</span>
              </div>
              <Badge variant={placedOrder.paymentStatus === "paid" ? "success" : ("warning" as any)}>
                {placedOrder.paymentStatus === "paid" ? "Settled / Paid" : "Unpaid / Pending Folio"}
              </Badge>
            </div>

            {/* Case Details Badge */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-medium text-text">Dining Scenario:</span>
                <Badge variant="outline" className="font-semibold capitalize">
                  {placedOrder.diningCase?.replace(/_/g, " ") || "Walk In"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-text">Settlement:</span>
                <span className="font-semibold text-primary capitalize">
                  {placedOrder.settlementType?.replace(/_/g, " ") || "Direct Payment"}
                </span>
              </div>
              {placedOrder.tableNumber && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Table:</span>
                  <span className="font-semibold">Table {placedOrder.tableNumber}</span>
                </div>
              )}
              {placedOrder.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Room:</span>
                  <span className="font-semibold text-primary">Room {placedOrder.roomNumber}</span>
                </div>
              )}
              {placedOrder.guestName && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Guest:</span>
                  <span className="font-semibold">{placedOrder.guestName}</span>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="border border-border rounded-xl p-3 space-y-1.5 bg-surface">
              <div className="text-xs font-semibold uppercase text-text-muted mb-1">Ordered Items</div>
              {placedOrder.items.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                  <span>{item.name} <span className="text-text-muted text-xs">× {item.quantity}</span></span>
                  <span className="font-mono font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5 text-sm p-3 bg-muted/20 rounded-xl border border-border">
              <div className="flex justify-between text-text-muted">
                <span>Gross Subtotal</span>
                <span className="font-mono">${placedOrder.subtotal.toFixed(2)}</span>
              </div>
              {placedOrder.complimentaryDiscountAmount && placedOrder.complimentaryDiscountAmount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> 100% Complimentary Breakfast
                  </span>
                  <span className="font-mono">-${placedOrder.complimentaryDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {placedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-danger">
                  <span>Custom Discount</span>
                  <span className="font-mono">-${placedOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {placedOrder.taxPercent > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Tax ({placedOrder.taxPercent}%)</span>
                  <span className="font-mono">${((placedOrder.subtotal - placedOrder.discountAmount) * placedOrder.taxPercent / 100).toFixed(2)}</span>
                </div>
              )}
              {placedOrder.serviceChargePercent > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Service ({placedOrder.serviceChargePercent}%)</span>
                  <span className="font-mono">${((placedOrder.subtotal - placedOrder.discountAmount) * placedOrder.serviceChargePercent / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                <span>Net Total Due</span>
                <span className="text-primary font-mono font-bold">${placedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Settlement */}
            {placedOrder.paymentStatus !== "paid" && (
              <div className="space-y-3 pt-2">
                {placedOrder.settlementType === "complimentary_breakfast" && placedOrder.total === 0 ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-xs"
                    onClick={() => markPaidMutation.mutate({ id: placedOrder.id, method: "complimentary" })}
                    disabled={markPaidMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete Complimentary Breakfast Order
                  </Button>
                ) : placedOrder.settlementType === "room_charge" ? (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl shadow-xs"
                    onClick={() => markPaidMutation.mutate({ id: placedOrder.id, method: "room_folio" })}
                    disabled={markPaidMutation.isPending}
                  >
                    <Hotel className="mr-2 h-4 w-4" />
                    Confirm Post to Room {placedOrder.roomNumber} Folio
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-9 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Settlement</SelectItem>
                        <SelectItem value="telebirr">Telebirr Direct</SelectItem>
                        <SelectItem value="cbe_birr">CBE Birr</SelectItem>
                        <SelectItem value="card">Credit / Debit Card</SelectItem>
                        <SelectItem value="room_charge">Room Folio Charge</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full h-10 text-xs font-bold bg-[#084C42] hover:bg-[#063a32] text-white rounded-xl shadow-xs" 
                      onClick={() => markPaidMutation.mutate({ id: placedOrder.id })} 
                      disabled={markPaidMutation.isPending}
                    >
                      {markPaidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Settle & Mark Paid (${placedOrder.total.toFixed(2)})
                    </Button>
                  </div>
                )}
              </div>
            )}
            <Button variant="outline" className="w-full h-9 text-xs rounded-xl font-semibold" onClick={resetOrder}>Start New Order</Button>
          </div>
        ) : (
          // ORDER BUILDER
          <>
            {/* Top 3-Way Scenario Switcher */}
            <div className="p-3.5 border-b border-border bg-muted/20 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-foreground">
                  Dining Scenario
                </span>
                <span className="text-[11px] text-text-muted font-medium">Select Guest Classification</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDiningCase("walk_in")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    diningCase === "walk_in"
                      ? "border-[#084C42] bg-[#084C42]/10 text-[#084C42] dark:text-emerald-300 shadow-xs font-bold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Utensils className="h-3.5 w-3.5 shrink-0" />
                    <span>Case 1</span>
                  </div>
                  <span className="text-[11px] leading-tight truncate">Walk-In Diner</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDiningCase("in_house_table")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    diningCase === "in_house_table"
                      ? "border-[#084C42] bg-[#084C42]/10 text-[#084C42] dark:text-emerald-300 shadow-xs font-bold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Hotel className="h-3.5 w-3.5 shrink-0" />
                    <span>Case 2</span>
                  </div>
                  <span className="text-[11px] leading-tight truncate">In-House Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDiningCase("room_service")}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    diningCase === "room_service"
                      ? "border-[#084C42] bg-[#084C42]/10 text-[#084C42] dark:text-emerald-300 shadow-xs font-bold"
                      : "border-border hover:bg-muted/40 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <DoorOpen className="h-3.5 w-3.5 shrink-0" />
                    <span>Case 3</span>
                  </div>
                  <span className="text-[11px] leading-tight truncate">Room Service</span>
                </button>
              </div>

              {/* Case Context Form Controls */}
              <div className="pt-1 space-y-2">
                {diningCase === "walk_in" && (
                  <div>
                    <Label className="text-[11px] font-semibold">Table # *</Label>
                    <Input
                      placeholder="e.g. 12"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="h-8 text-xs rounded-xl mt-1"
                    />
                  </div>
                )}

                {(diningCase === "in_house_table" || diningCase === "room_service") && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className={diningCase === "in_house_table" ? "col-span-4" : "col-span-8"}>
                        <Label className="text-[11px] font-semibold">Hotel Room # *</Label>
                        <Input
                          placeholder="e.g. 204"
                          value={roomNumber}
                          onChange={(e) => {
                            setRoomNumber(e.target.value);
                            setResidentVerified(null);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleVerifyResident(); }}
                          className="h-8 text-xs font-mono uppercase rounded-xl mt-1"
                        />
                      </div>

                      {diningCase === "in_house_table" && (
                        <div className="col-span-4">
                          <Label className="text-[11px] font-semibold">Table # *</Label>
                          <Input
                            placeholder="e.g. 8"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className="h-8 text-xs rounded-xl mt-1"
                          />
                        </div>
                      )}

                      <div className={diningCase === "in_house_table" ? "col-span-4" : "col-span-4"}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyResident()}
                          disabled={verifyingResident || !roomNumber.trim()}
                          className="h-8 w-full text-xs rounded-xl font-semibold gap-1"
                        >
                          {verifyingResident ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify PMS"}
                        </Button>
                      </div>
                    </div>

                    {/* Resident Verification PMS Card */}
                    {residentVerified && residentVerified.valid && (
                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {residentVerified.guestName}
                          </span>
                          <span className="font-mono text-[11px]">Room {residentVerified.roomNumber} ({residentVerified.adults ?? 1} pax)</span>
                        </div>

                        {/* Complimentary Breakfast status */}
                        {residentVerified.complimentaryBreakfast && (
                          <div className="mt-1 pt-1 border-t border-emerald-500/20 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              {residentVerified.complimentaryBreakfast.alreadyClaimed
                                ? "⚠️ Breakfast already claimed today"
                                : "✨ Eligible for 100% Free Breakfast"}
                            </span>
                            {residentVerified.complimentaryBreakfast.isEligible && diningCase === "in_house_table" && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-600 text-white border-0 py-0.5 px-2 font-bold">
                                Free Plan Active
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {residentVerified && !residentVerified.valid && (
                      <div className="p-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{residentVerified.message || "Room not active or occupied."}</span>
                      </div>
                    )}

                    {/* Settlement Selector for In-House */}
                    <div className="pt-1">
                      <Label className="text-[11px] font-semibold">Settlement & Billing Route</Label>
                      <Select
                        value={settlementType}
                        onValueChange={(val: any) => setSettlementType(val)}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {diningCase === "in_house_table" && (
                            <SelectItem value="complimentary_breakfast">
                              🍳 Complimentary Breakfast (100% Hotel Courtesy)
                            </SelectItem>
                          )}
                          <SelectItem value="room_charge">
                            🏨 Charge to Room Folio (Pay at Checkout)
                          </SelectItem>
                          <SelectItem value="direct_payment">
                            💳 Direct Payment at Table (Cash / Telebirr / Card)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  Order Items
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {cart.reduce((s, c) => s + c.quantity, 0)} items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center text-text-muted">
                    <Coffee className="h-6 w-6 opacity-60" />
                  </div>
                  <p className="text-text-muted text-xs font-medium">Click items on the left to add to order</p>
                </div>
              ) : cart.map((item) => {
                const isBreakfast = (item.category || menuItems.find(m => m.id === item.menuItemId)?.category || "").toLowerCase() === "breakfast";
                const isFree = diningCase === "in_house_table" && settlementType === "complimentary_breakfast" && isBreakfast;

                return (
                  <div key={item.menuItemId} className="flex items-center gap-2 text-sm p-2 rounded-xl hover:bg-muted/40 border border-border/50 transition-colors">
                    <button onClick={() => removeItem(item.menuItemId)} className="text-text-muted hover:text-danger p-1 rounded-md transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-xs text-slate-900 dark:text-foreground">{item.name}</div>
                      {isFree && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Complimentary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-muted rounded-lg p-0.5 shrink-0">
                      <button onClick={() => updateQty(item.menuItemId, -1)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface text-xs transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-mono font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.menuItemId, 1)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface text-xs transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="w-16 text-right shrink-0">
                      {isFree ? (
                        <div className="leading-tight">
                          <span className="line-through text-[11px] text-text-muted font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                          <span className="block text-xs font-bold text-emerald-600 font-mono">$0.00</span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pricing & Checkout Summary */}
            <div className="p-3.5 border-t border-border space-y-2.5 bg-surface shrink-0">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Gross Subtotal</span>
                  <span className="font-mono font-medium">${grossSubtotal.toFixed(2)}</span>
                </div>

                {compBreakfastDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Breakfast Allowance
                    </span>
                    <span className="font-mono font-bold">-${compBreakfastDiscount.toFixed(2)}</span>
                  </div>
                )}

                {/* Optional Discounts, Tax, Service */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <span className="text-text-muted shrink-0 text-[11px]">Disc:</span>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="h-7 rounded-lg border border-border bg-surface px-2 text-[11px]"
                  >
                    <option value="none">None</option>
                    <option value="percent">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  {discountType !== "none" && (
                    <Input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-14 h-7 text-[11px] px-1 font-mono rounded-lg"
                    />
                  )}
                  {discountAmount > 0 && <span className="text-danger text-[11px] font-mono font-bold shrink-0">-${discountAmount.toFixed(2)}</span>}
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
                  <div className="flex items-center gap-1">
                    <span>Tax%:</span>
                    <Input type="number" min="0" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className="w-11 h-6 text-[11px] p-1 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Service%:</span>
                    <Input type="number" min="0" value={serviceChargePercent} onChange={(e) => setServiceChargePercent(Number(e.target.value))} className="w-11 h-6 text-[11px] p-1 rounded-lg" />
                  </div>
                </div>

                <div className="flex justify-between items-center font-bold text-sm pt-2 border-t border-border">
                  <span className="text-slate-800 dark:text-foreground">Total Amount</span>
                  <span className="text-lg font-black font-mono text-[#084C42] dark:text-emerald-400">
                    ${finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-10 rounded-xl font-semibold" onClick={resetOrder}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-[2] text-xs font-bold h-10 rounded-xl bg-[#084C42] hover:bg-[#063a32] text-white shadow-xs"
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || placeOrderMutation.isPending}
                >
                  {placeOrderMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Place Order ({diningCase === "walk_in" ? "Walk-In" : diningCase === "in_house_table" ? "Table" : "Room Service"})
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

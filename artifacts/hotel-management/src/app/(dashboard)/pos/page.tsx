"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Minus, X, Loader2 } from "lucide-react";
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
};

type PlacedOrder = {
  id: string;
  orderNumber: string;
  orderType: string;
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
};

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Drinks", "Dessert", "Coffee"];

export default function POSPage() {
  const { toast } = useToast();

  // Left panel state
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  // Right panel state
  const [orderType, setOrderType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
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
        items: cart,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxPercent,
        serviceChargePercent,
        total,
      });
      toast({ title: `Order #${data.orderNumber} placed!` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch(`/pos/orders/${id}`, { method: "PATCH", body: JSON.stringify({ paymentStatus: "paid", paymentMethod }) }),
    onSuccess: () => {
      toast({ title: "Order marked as paid" });
      if (placedOrder) setPlacedOrder({ ...placedOrder, paymentStatus: "paid" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const availableItems = menuItems.filter(m => m.isAvailable);
  const filteredItems = availableItems.filter((item) => {
    if (category !== "All" && item.category.toLowerCase() !== category.toLowerCase()) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  }

  function removeItem(menuItemId: string) {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const discountAmount = discountType === "percent"
    ? subtotal * (discountValue / 100)
    : discountType === "fixed"
    ? Math.min(discountValue, subtotal)
    : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const serviceAmount = afterDiscount * (serviceChargePercent / 100);
  const total = afterDiscount + taxAmount + serviceAmount;

  function resetOrder() {
    setCart([]);
    setTableNumber("");
    setRoomNumber("");
    setGuestName("");
    setDiscountType("none");
    setDiscountValue(0);
    setTaxPercent(0);
    setServiceChargePercent(0);
    setPlacedOrder(null);
    setPaymentMethod("cash");
  }

  function handlePlaceOrder() {
    const body: Record<string, unknown> = {
      orderType,
      guestName: guestName || undefined,
      tableNumber: orderType === "dine_in" ? tableNumber || undefined : undefined,
      roomNumber: orderType === "room_charge" ? roomNumber || undefined : undefined,
      items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxPercent,
      serviceChargePercent,
      totalAmount: total,
    };
    placeOrderMutation.mutate(body);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="flex-[3] flex flex-col gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold tracking-tight shrink-0">POS</h1>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted hover:bg-muted/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="shrink-0"
        />

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto">
          {menuLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-text-muted">No items found.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="text-left border border-border rounded-lg p-3 bg-surface hover:bg-muted/40 transition-colors space-y-1"
                >
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="flex items-center justify-between">
                    <Badge variant={"secondary" as any} className="text-[10px] capitalize">{item.category}</Badge>
                    <span className="text-primary font-bold text-sm">${Number(item.price).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-success">+ Add</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-[2] flex flex-col border-l border-border overflow-hidden bg-surface/50 rounded-lg">
        {placedOrder ? (
          // Receipt
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Receipt</h2>
              <Badge variant={placedOrder.paymentStatus === "paid" ? "success" : "warning" as any}>
                {placedOrder.paymentStatus === "paid" ? "Paid" : "Unpaid"}
              </Badge>
            </div>
            <div className="text-sm space-y-1 text-text-muted">
              <div><span className="font-medium text-text">Order #:</span> {placedOrder.orderNumber}</div>
              <div><span className="font-medium text-text">Type:</span> {placedOrder.orderType?.replace(/_/g, " ")}</div>
              {placedOrder.tableNumber && <div><span className="font-medium text-text">Table:</span> {placedOrder.tableNumber}</div>}
              {placedOrder.roomNumber && <div><span className="font-medium text-text">Room:</span> {placedOrder.roomNumber}</div>}
              {placedOrder.guestName && <div><span className="font-medium text-text">Guest:</span> {placedOrder.guestName}</div>}
            </div>
            <div className="border border-border rounded p-3 space-y-1">
              {placedOrder.items.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>${placedOrder.subtotal.toFixed(2)}</span></div>
              {placedOrder.discountAmount > 0 && <div className="flex justify-between text-danger"><span>Discount</span><span>-${placedOrder.discountAmount.toFixed(2)}</span></div>}
              {placedOrder.taxPercent > 0 && <div className="flex justify-between text-text-muted"><span>Tax ({placedOrder.taxPercent}%)</span><span>${((placedOrder.subtotal - placedOrder.discountAmount) * placedOrder.taxPercent / 100).toFixed(2)}</span></div>}
              {placedOrder.serviceChargePercent > 0 && <div className="flex justify-between text-text-muted"><span>Service ({placedOrder.serviceChargePercent}%)</span><span>${((placedOrder.subtotal - placedOrder.discountAmount) * placedOrder.serviceChargePercent / 100).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span>${placedOrder.total.toFixed(2)}</span></div>
            </div>
            {placedOrder.paymentStatus !== "paid" && (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="room_charge">Room Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => markPaidMutation.mutate({ id: placedOrder.id })} disabled={markPaidMutation.isPending}>
                  {markPaidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark Paid
                </Button>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={resetOrder}>New Order</Button>
          </div>
        ) : (
          // Order Builder
          <>
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">New Order</h2>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Dine-in</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                    <SelectItem value="room_charge">Room Charge</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Input placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="h-8 text-sm" />
                {orderType === "dine_in" && (
                  <Input placeholder="Table number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="h-8 text-sm" />
                )}
                {orderType === "room_charge" && (
                  <Input placeholder="Room number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="h-8 text-sm" />
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Add items from the menu</p>
              ) : cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-2 text-sm">
                  <button onClick={() => removeItem(item.menuItemId)} className="text-text-muted hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 truncate">{item.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.menuItemId, -1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menuItemId, 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="w-16 text-right shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="p-4 border-t border-border space-y-3 shrink-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted shrink-0">Discount:</span>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="flex-1 h-7 rounded border border-border bg-surface px-2 text-xs"
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
                      className="w-20 h-7 text-xs"
                    />
                  )}
                  {discountAmount > 0 && <span className="text-danger shrink-0">-${discountAmount.toFixed(2)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted shrink-0">Tax %:</span>
                  <Input type="number" min="0" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className="w-20 h-7 text-xs" />
                  {taxPercent > 0 && <span className="text-text-muted shrink-0">${((subtotal - discountAmount) * taxPercent / 100).toFixed(2)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted shrink-0">Service %:</span>
                  <Input type="number" min="0" value={serviceChargePercent} onChange={(e) => setServiceChargePercent(Number(e.target.value))} className="w-20 h-7 text-xs" />
                  {serviceChargePercent > 0 && <span className="text-text-muted shrink-0">${((subtotal - discountAmount) * serviceChargePercent / 100).toFixed(2)}</span>}
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={resetOrder}>Clear</Button>
                <Button className="flex-1" onClick={handlePlaceOrder} disabled={cart.length === 0 || placeOrderMutation.isPending}>
                  {placeOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Place Order
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

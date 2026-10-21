"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Utensils,
  Bell,
  Clock,
  Sparkles,
  Coffee,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Wifi,
  ChevronRight,
  ShieldCheck,
  Send,
  Hotel,
  ArrowRight,
  Receipt,
  Bed,
  RefreshCw,
  Car,
  Plane,
  MapPin,
  Users,
  LogOut,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GuestSession {
  room: { id: string; number: string; floor: string; type: string };
  reservation: {
    id: string;
    reservationNumber: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    status: string;
  };
  guest: {
    id: string;
    guestCode: string;
    fullName: string;
    firstName: string;
    lastName: string;
    vipStatus?: boolean;
  };
}

interface CartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export default function GuestPortalPage() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Catalog
  const [catalog, setCatalog] = useState<{
    dining: any[];
    amenities: any[];
    services: any[];
    transport: any[];
  }>({ dining: [], amenities: [], services: [], transport: [] });

  // Navigation tab
  const [activePortalTab, setActivePortalTab] = useState<"dining" | "transport" | "amenities" | "services" | "orders">("dining");

  // Cart for Dining
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderInstructions, setOrderInstructions] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState("");

  // Amenities modal
  const [selectedAmenity, setSelectedAmenity] = useState<any | null>(null);
  const [amenityNotes, setAmenityNotes] = useState("");
  const [amenitySubmitting, setAmenitySubmitting] = useState(false);

  // Transport Booking modal
  const [selectedTransport, setSelectedTransport] = useState<any | null>(null);
  const [transportTime, setTransportTime] = useState("");
  const [transportFlight, setTransportFlight] = useState("");
  const [transportPassengers, setTransportPassengers] = useState("1");
  const [transportVehicle, setTransportVehicle] = useState("Executive Sedan");
  const [transportNotes, setTransportNotes] = useState("");
  const [transportSubmitting, setTransportSubmitting] = useState(false);

  // Stay Management (Extend / Upgrade)
  const [extendStayOpen, setExtendStayOpen] = useState(false);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);

  // Pre-Checkout Clearance State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<any | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");

  // Orders & Folio
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [folioData, setFolioData] = useState<{ invoice: any; lineItems: any[] }>({ invoice: null, lineItems: [] });
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Load session from sessionStorage or localStorage if available
  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? (sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session"))
      : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.room && parsed.guest) {
          setSession(parsed);
          setCheckingAuth(false);
        } else {
          router.replace("/guest-portal/login");
        }
      } catch {
        router.replace("/guest-portal/login");
      }
    } else {
      router.replace("/guest-portal/login");
    }

    // Fetch Catalog
    fetch("/api/guest-portal/catalog")
      .then((r) => r.json())
      .then((d) => {
        if (d && (d.dining || d.transport)) {
          setCatalog({
            dining: d.dining || [],
            amenities: d.amenities || [],
            services: d.services || [],
            transport: d.transport || [],
          });
        }
      })
      .catch((err) => console.error("Failed to load catalog:", err));
  }, [router]);

  // Fetch orders, folio, and pre-checkout status when session active
  const refreshRoomData = async (sess = session) => {
    if (!sess) return;
    setLoadingOrders(true);
    try {
      const [ordersRes, folioRes, checkoutRes] = await Promise.all([
        fetch(`/api/guest-portal/my-orders?roomNumber=${sess.room.number}`).then((r) => r.json()),
        fetch(`/api/guest-portal/my-folio?guestId=${sess.guest.id}`).then((r) => r.json()),
        sess.reservation?.id
          ? fetch(`/api/guest-portal/checkout-status?reservationId=${sess.reservation.id}`).then((r) => r.json())
          : Promise.resolve(null),
      ]);
      setMyOrders(Array.isArray(ordersRes) ? ordersRes : []);
      if (folioRes && folioRes.lineItems) setFolioData(folioRes);
      if (checkoutRes && checkoutRes.id) setCheckoutStatus(checkoutRes);
    } catch (e) {
      console.error("Failed to refresh room data:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (session) {
      refreshRoomData(session);
      const timer = setInterval(() => refreshRoomData(session), 12000); // Live poll updates
      return () => clearInterval(timer);
    }
  }, [session?.room?.number]);

  const handleLogout = () => {
    setSession(null);
    setCart([]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("nexus_guest_session");
    }
    router.push("/guest-portal/login");
  };

  // Cart operations
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, category: item.category, price: item.price, quantity: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Submit Dining Order
  const submitDiningOrder = async () => {
    if (!session || cart.length === 0) return;
    setOrderSubmitting(true);
    try {
      const desc = cart.map((i) => `${i.name} (x${i.quantity})`).join(", ");
      const res = await fetch("/api/guest-portal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: session.room.number,
          guestName: session.guest.fullName,
          guestId: session.guest.id,
          reservationId: session.reservation.id,
          serviceType: cart.some((i) => i.category === "drinks") ? "drinks" : "food",
          description: desc,
          specialInstructions: orderInstructions || undefined,
          chargeAmount: cartTotal,
        }),
      });
      if (!res.ok) throw new Error("Could not send order");
      setCart([]);
      setCartOpen(false);
      setOrderInstructions("");
      setOrderSuccessMsg("Your dining order was sent to the kitchen! Track status in My Orders.");
      setTimeout(() => setOrderSuccessMsg(""), 6000);
      refreshRoomData(session);
    } catch (e: any) {
      alert("Failed to submit order: " + e.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Submit Transport / Chauffeur Booking
  const submitTransportRequest = async () => {
    if (!session || !selectedTransport) return;
    setTransportSubmitting(true);
    try {
      const parts = [
        selectedTransport.name,
        transportVehicle ? `Vehicle: ${transportVehicle}` : null,
        transportTime ? `Pickup: ${transportTime}` : null,
        transportFlight ? `Flight: ${transportFlight}` : null,
        transportPassengers ? `${transportPassengers} Passenger(s)` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await fetch("/api/guest-portal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: session.room.number,
          guestName: session.guest.fullName,
          guestId: session.guest.id,
          reservationId: session.reservation.id,
          serviceType: "transport",
          description: parts,
          specialInstructions: transportNotes || undefined,
          chargeAmount: selectedTransport.price || 0,
        }),
      });
      if (!res.ok) throw new Error("Could not book transport");
      setSelectedTransport(null);
      setTransportTime("");
      setTransportFlight("");
      setTransportNotes("");
      setOrderSuccessMsg(`Transport booking confirmed! Driver & vehicle dispatched for Room ${session.room.number}.`);
      setTimeout(() => setOrderSuccessMsg(""), 6000);
      refreshRoomData(session);
    } catch (e: any) {
      alert("Failed to book transport: " + e.message);
    } finally {
      setTransportSubmitting(false);
    }
  };

  // Submit Amenity / Housekeeping Request
  const submitAmenityRequest = async () => {
    if (!session || !selectedAmenity) return;
    setAmenitySubmitting(true);
    try {
      const res = await fetch("/api/guest-portal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: session.room.number,
          guestName: session.guest.fullName,
          guestId: session.guest.id,
          reservationId: session.reservation.id,
          serviceType: selectedAmenity.category,
          description: selectedAmenity.name,
          specialInstructions: amenityNotes || undefined,
          chargeAmount: selectedAmenity.price || 0,
        }),
      });
      if (!res.ok) throw new Error("Could not submit request");
      setSelectedAmenity(null);
      setAmenityNotes("");
      setOrderSuccessMsg(`Request for "${selectedAmenity.name}" sent to Housekeeping!`);
      setTimeout(() => setOrderSuccessMsg(""), 6000);
      refreshRoomData(session);
    } catch (e: any) {
      alert("Failed to submit request: " + e.message);
    } finally {
      setAmenitySubmitting(false);
    }
  };

  // Submit Stay Extension Request
  const submitStayExtension = async () => {
    if (!session || !newCheckOutDate) return;
    setExtendSubmitting(true);
    try {
      const res = await fetch("/api/guest-portal/stay-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: session.room.number,
          guestName: session.guest.fullName,
          guestId: session.guest.id,
          reservationId: session.reservation.id,
          actionType: "extend_stay",
          requestedCheckOut: newCheckOutDate,
          reason: extendReason || "Guest requested extension via in-room self-service portal",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit stay extension");
      setExtendStayOpen(false);
      setNewCheckOutDate("");
      setExtendReason("");
      setOrderSuccessMsg("Stay extension request sent to Front Office reception! Staff will confirm shortly.");
      setTimeout(() => setOrderSuccessMsg(""), 6000);
      refreshRoomData(session);
    } catch (e: any) {
      alert("Failed to request extension: " + e.message);
    } finally {
      setExtendSubmitting(false);
    }
  };

  // Submit Room Upgrade Request
  const submitRoomUpgrade = async () => {
    if (!session) return;
    setUpgradeSubmitting(true);
    try {
      const res = await fetch("/api/guest-portal/stay-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: session.room.number,
          guestName: session.guest.fullName,
          guestId: session.guest.id,
          reservationId: session.reservation.id,
          actionType: "room_upgrade",
          reason: upgradeReason || "Guest requested upgrade to a higher suite",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit upgrade request");
      setUpgradeOpen(false);
      setUpgradeReason("");
      setOrderSuccessMsg("Upgrade inquiry dispatched to Guest Relations Manager!");
      setTimeout(() => setOrderSuccessMsg(""), 6000);
      refreshRoomData(session);
    } catch (e: any) {
      alert("Failed to request upgrade: " + e.message);
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  // Submit Checkout Clearance Request
  const submitCheckoutRequest = async () => {
    if (!session) return;
    setCheckoutSubmitting(true);
    try {
      const res = await fetch("/api/guest-portal/request-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: session.room.number,
          reservationId: session.reservation.id,
          guestId: session.guest.id,
          notes: checkoutNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to request checkout clearance");
      const data = await res.json();
      setCheckoutStatus(data);
      setCheckoutModalOpen(false);
      setOrderSuccessMsg("🛎️ Pre-checkout clearance requested! Housekeeping has been alerted to inspect your room.");
      setTimeout(() => setOrderSuccessMsg(""), 6000);
      refreshRoomData(session);
    } catch (e: any) {
      alert("Failed to request checkout clearance: " + e.message);
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge variant="warning" className="gap-1 animate-pulse">⏳ Staff Alerted</Badge>;
      case "accepted":
      case "assigned":
        return <Badge variant="info" className="gap-1">👨‍🍳 In Preparation</Badge>;
      case "in_progress":
        return <Badge variant="default" className="gap-1">🚀 On the Way</Badge>;
      case "completed":
        return <Badge variant="success" className="gap-1">✅ Delivered</Badge>;
      case "cancelled":
        return <Badge variant="danger" className="gap-1">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // REDIRECT / LOADING SCREEN IF NO ACTIVE SESSION
  if (checkingAuth || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
            <Hotel className="h-6 w-6" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-sm font-semibold text-slate-200">Authenticating Room Access...</p>
          <p className="text-xs text-slate-400">
            Redirecting you to the Guest Portal Authentication Gateway...
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/guest-portal/login")}
            className="mt-3 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs gap-1.5"
          >
            <span>Click here if not redirected</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ACTIVE GUEST IN-ROOM SERVICES DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24">
      {/* Top Mobile/Desktop Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            {session.room.number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Room {session.room.number}</span>
              {session.guest.vipStatus && <Badge variant="warning" className="text-[10px] py-0">VIP</Badge>}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">{session.guest.fullName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cart Icon Button */}
          <Button
            variant="outline"
            size="sm"
            className="relative border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-9 px-3 gap-1.5"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="font-bold text-xs">{cart.length > 0 ? `$${cartTotal.toFixed(2)}` : "Cart"}</span>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs h-9" onClick={handleLogout}>
            Exit
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 pt-5 space-y-6">
        {/* Success Alert Banner */}
        {orderSuccessMsg && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="font-medium">{orderSuccessMsg}</span>
          </div>
        )}

        {/* Hero Guest Welcome Card */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30">
          <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-amber-400 font-semibold tracking-wider uppercase">In-Room Guest Services</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                Welcome, {session.guest.firstName} {session.guest.lastName}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  Departure: <strong className="text-slate-200">{session.reservation.checkOutDate}</strong>
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  Wi-Fi: <strong className="text-slate-200">Nexus-Guest-5G</strong> (Key: <em>NexusGuest2026</em>)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5"
                onClick={() => setExtendStayOpen(true)}
              >
                <Calendar className="h-3.5 w-3.5" />
                Extend Stay
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
                onClick={() => setUpgradeOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Upgrade Suite
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs gap-1.5 ${
                  checkoutStatus?.status === "cleared"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : checkoutStatus
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300 animate-pulse"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
                onClick={() => setCheckoutModalOpen(true)}
              >
                <LogOut className="h-3.5 w-3.5" />
                {checkoutStatus?.status === "cleared"
                  ? "Room Cleared (Checkout)"
                  : checkoutStatus
                  ? "Inspection Requested"
                  : "Ready for Checkout"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pre-Checkout Live Inspection Status Banner */}
        {checkoutStatus && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start sm:items-center justify-between gap-3 ${
              checkoutStatus.status === "cleared"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : checkoutStatus.status === "issues_reported"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-blue-500/10 border-blue-500/40 text-blue-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {checkoutStatus.status === "cleared" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : checkoutStatus.status === "issues_reported" ? (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              ) : (
                <Clock className="h-5 w-5 text-blue-400 shrink-0 animate-spin" />
              )}
              <div>
                <p className="font-semibold text-white">
                  {checkoutStatus.status === "cleared"
                    ? "Housekeeping Clearance Approved!"
                    : checkoutStatus.status === "issues_reported"
                    ? "Pre-Checkout Inspection Complete (Charges Added to Folio)"
                    : "Housekeeping Pre-Checkout Inspection in Progress"}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {checkoutStatus.status === "cleared"
                    ? `Room inspected and cleared by ${checkoutStatus.inspectedBy || "Housekeeping"}. You can stop by the Front Desk for fast key drop & checkout!`
                    : checkoutStatus.status === "issues_reported"
                    ? `Minibar or incidental items were logged ($${Number(checkoutStatus.minibarTotal || 0) + Number(checkoutStatus.damageCharges || 0)}). Please stop by Front Desk to settle.`
                    : "Housekeeping staff is verifying minibar and room status before your departure."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-current text-current hover:bg-white/10 shrink-0"
              onClick={() => setCheckoutModalOpen(true)}
            >
              View Details
            </Button>
          </div>
        )}

        {/* Guest Portal Custom Tab Switcher (5 Tabs including Transport) */}
        <div className="grid grid-cols-5 bg-slate-900 p-1 border border-slate-800 rounded-xl h-12">
          <button
            type="button"
            onClick={() => setActivePortalTab("dining")}
            className={`text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activePortalTab === "dining" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🍽️ <span className="hidden sm:inline">Dining</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab("transport")}
            className={`text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activePortalTab === "transport" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🚗 <span className="hidden sm:inline">Transport</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab("amenities")}
            className={`text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activePortalTab === "amenities" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🛎️ <span className="hidden sm:inline">Amenities</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab("services")}
            className={`text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activePortalTab === "services" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            ✨ <span className="hidden sm:inline">Services</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab("orders")}
            className={`text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 relative ${
              activePortalTab === "orders" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            📋 <span className="hidden sm:inline">Orders</span>
            {myOrders.filter((o) => ["requested", "accepted", "in_progress"].includes(o.status)).length > 0 && (
              <span className="ml-1 bg-amber-400 text-slate-950 rounded-full text-[10px] px-1.5 font-bold">
                {myOrders.filter((o) => ["requested", "accepted", "in_progress"].includes(o.status)).length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: IN-ROOM DINING */}
        {activePortalTab === "dining" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Chef's In-Room Dining Menu</h3>
                <p className="text-xs text-slate-400">Freshly prepared & delivered right to Room {session.room.number}.</p>
              </div>
              <Badge variant="outline" className="text-[11px] text-amber-400 border-amber-500/30">
                Avg. Prep Time: 25-30 Mins
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.dining.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                return (
                  <Card key={item.id} className="border-slate-800 bg-slate-900/60 hover:border-amber-500/30 transition-all">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-white">{item.name}</h4>
                          <span className="font-bold text-amber-400 text-sm whitespace-nowrap">${item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-500 capitalize">{item.category}</span>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/40 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, -1)}
                              className="h-6 w-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold text-amber-400 px-1">{inCart.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, 1)}
                              className="h-6 w-6 rounded bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-xs text-slate-950"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-slate-700 hover:border-amber-500/40 hover:text-amber-400 gap-1"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: TRANSPORT & CHAUFFEUR SERVICES */}
        {activePortalTab === "transport" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Car className="h-5 w-5 text-amber-400" />
                  Chauffeur & Airport Transport Service
                </h3>
                <p className="text-xs text-slate-400">
                  Book airport transfers, private city chauffeurs, or hotel shuttle for Room {session.room.number}.
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] text-amber-400 border-amber-500/30">
                Direct Room Billing
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(catalog.transport && catalog.transport.length > 0 ? catalog.transport : [
                {
                  id: "tr-1",
                  name: "Airport Chauffeur Transfer (Drop-off)",
                  price: 25.0,
                  desc: "Private executive sedan to Addis Ababa Bole International Airport (Terminal 1/2)",
                  vehicleType: "Executive Sedan",
                  duration: "35 mins",
                },
                {
                  id: "tr-2",
                  name: "Airport Arrival VIP Meet & Pickup",
                  price: 30.0,
                  desc: "Chauffeur with personalized name board & baggage assistance at arrivals hall",
                  vehicleType: "Executive Sedan / SUV",
                  duration: "40 mins",
                },
                {
                  id: "tr-3",
                  name: "Half-Day City Tour Chauffeur (4 Hours)",
                  price: 55.0,
                  desc: "Dedicated vehicle & driver for Entoto Park, National Museum, and local markets",
                  vehicleType: "Luxury SUV",
                  duration: "4 Hours",
                },
                {
                  id: "tr-4",
                  name: "Complimentary Downtown / UNECA Shuttle",
                  price: 0.0,
                  desc: "Scheduled hourly luxury shuttle to Africa Hall, UNECA, and Meskel Square",
                  vehicleType: "Luxury Van",
                  duration: "Hourly Scheduled",
                },
              ]).map((item: any) => (
                <Card key={item.id} className="border-slate-800 bg-slate-900/60 hover:border-amber-500/30 transition-all">
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                          <Car className="h-4 w-4 text-amber-400 shrink-0" />
                          {item.name}
                        </h4>
                        <span className="font-bold text-amber-400 text-sm whitespace-nowrap">
                          {item.price > 0 ? `$${item.price.toFixed(2)}` : "Free"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">{item.desc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {item.vehicleType || "Sedan / SUV"}
                        </span>
                        {item.duration && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {item.duration}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-7 px-3 gap-1"
                        onClick={() => {
                          setSelectedTransport(item);
                          setTransportTime("");
                          setTransportFlight("");
                          setTransportNotes("");
                        }}
                      >
                        Book Ride
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AMENITIES & HOUSEKEEPING */}
        {activePortalTab === "amenities" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Housekeeping & Room Amenities</h3>
              <p className="text-xs text-slate-400">Request extra comfort essentials delivered complimentary to your door.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.amenities.map((item) => (
                <Card key={item.id} className="border-slate-800 bg-slate-900/60 hover:border-emerald-500/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="font-semibold text-sm text-white">{item.name}</h4>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                      <span className="inline-block text-[10px] font-semibold text-emerald-400">Complimentary (Free)</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shrink-0 gap-1"
                      onClick={() => {
                        setSelectedAmenity(item);
                        setAmenityNotes("");
                      }}
                    >
                      <Send className="h-3 w-3" /> Request
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SERVICES (Laundry, Tech, Wake-up) */}
        {activePortalTab === "services" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Guest Concierge & Technical Services</h3>
              <p className="text-xs text-slate-400">On-demand support, wake-up calls, and express laundry service.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.services.map((item) => (
                <Card key={item.id} className="border-slate-800 bg-slate-900/60 hover:border-blue-500/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-white">{item.name}</h4>
                        {item.price > 0 && <span className="text-xs font-bold text-amber-400">${item.price.toFixed(2)}</span>}
                      </div>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                      <span className="inline-block text-[10px] text-slate-500 uppercase">{item.category}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 hover:border-blue-500 hover:text-blue-400 text-xs h-8 shrink-0 gap-1"
                      onClick={() => {
                        setSelectedAmenity(item);
                        setAmenityNotes("");
                      }}
                    >
                      Book
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MY ORDERS & FOLIO */}
        {activePortalTab === "orders" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Active Room Orders & Service Log</h3>
                <p className="text-xs text-slate-400">Live fulfillment progress from kitchen, transport, and front desk.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white gap-1"
                onClick={() => refreshRoomData(session)}
                disabled={loadingOrders}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {myOrders.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/40 text-center py-10">
                <CardContent className="space-y-2">
                  <ShoppingBag className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400 font-medium">No active service requests for Room {session.room.number}</p>
                  <p className="text-xs text-slate-500">Order from our dining menu, book transport, or request room amenities above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {myOrders.map((order) => (
                  <Card key={order.id} className="border-slate-800 bg-slate-900/70">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400 font-bold">{order.requestNumber}</span>
                          {renderStatusBadge(order.status)}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {order.department || order.serviceType}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-white">{order.description || "Room Service Request"}</p>
                        {order.specialInstructions && (
                          <p className="text-xs text-amber-300/80 italic">Note: "{order.specialInstructions}"</p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          Requested: {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="text-right sm:self-center">
                        {parseFloat(order.chargeAmount || "0") > 0 ? (
                          <div className="font-bold text-amber-400 text-sm">
                            ${parseFloat(order.chargeAmount).toFixed(2)}
                            <span className="text-[10px] text-slate-400 block font-normal">Charged to Room</span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-400">Complimentary</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Room Folio / Bill Summary */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-amber-400" /> In-Room Folio & Charges
              </h4>
              {folioData.invoice ? (
                <Card className="border-slate-800 bg-slate-900/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                      <span>Invoice #: <strong className="text-slate-200">{folioData.invoice.invoiceNumber}</strong></span>
                      <span>Status: <Badge variant="info" className="text-[10px]">{folioData.invoice.status}</Badge></span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {folioData.lineItems.map((li: any) => (
                        <div key={li.id} className="flex justify-between text-slate-300">
                          <span>{li.description}</span>
                          <span className="font-mono text-slate-200">${parseFloat(li.total || "0").toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                      <span className="text-white">Total Folio Balance:</span>
                      <span className="text-amber-400 font-mono">
                        ${parseFloat(folioData.invoice.totalAmount || "0").toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-xs text-slate-500 italic">No charges billed to room yet.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* TRANSPORT BOOKING MODAL */}
      <Dialog open={!!selectedTransport} onOpenChange={(open) => !open && setSelectedTransport(null)}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Car className="h-5 w-5 text-amber-400" />
              Book {selectedTransport?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Direct chauffeur dispatch for Room {session.room.number}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-300">{selectedTransport?.desc}</p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Pickup Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={transportTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransportTime(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Flight Number (Optional)</Label>
                <Input
                  placeholder="e.g. ET 302"
                  value={transportFlight}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransportFlight(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9 uppercase font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Vehicle Class</Label>
                <select
                  value={transportVehicle}
                  onChange={(e) => setTransportVehicle(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
                >
                  <option value="Executive Sedan">Executive Sedan (1-3 Guests)</option>
                  <option value="Luxury SUV">Luxury SUV (1-4 Guests)</option>
                  <option value="VIP Van">VIP Van (5-7 Guests & Luggage)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-300">Passenger Count</Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={transportPassengers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransportPassengers(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Luggage / Special Requests</Label>
              <textarea
                rows={2}
                placeholder="e.g. 3 large bags, child seat requested, meet inside lobby"
                value={transportNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTransportNotes(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold">
              <span className="text-slate-300 text-xs">Total Fare (Charged to Room):</span>
              <span className="text-base text-amber-400 font-mono">
                {selectedTransport?.price > 0 ? `$${selectedTransport.price.toFixed(2)}` : "Complimentary"}
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTransport(null)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-lg shadow-amber-500/20"
              disabled={transportSubmitting}
              onClick={submitTransportRequest}
            >
              <Car className="h-3.5 w-3.5" />
              {transportSubmitting ? "Dispatching..." : "Confirm & Dispatch Chauffeur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CART DRAWER / MODAL */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ShoppingBag className="h-5 w-5 text-amber-400" />
              Room {session.room.number} Dining Cart
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Orders are charged directly to your room folio upon completion.
            </DialogDescription>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Your cart is empty.</div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-amber-400">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, -1)}
                        className="h-6 w-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, 1)}
                        className="h-6 w-6 rounded bg-amber-500 hover:bg-amber-600 flex items-center justify-center text-xs text-slate-950"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inst" className="text-xs font-semibold text-slate-300">
                  Special Kitchen Instructions / Dietary Requests
                </Label>
                <textarea
                  id="inst"
                  rows={2}
                  placeholder="e.g. Extra spicy, dressing on the side, no cutlery needed"
                  value={orderInstructions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOrderInstructions(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-300">Total Charged to Room:</span>
                <span className="text-lg font-bold text-amber-400 font-mono">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shadow-lg shadow-amber-500/20"
              disabled={cart.length === 0 || orderSubmitting}
              onClick={submitDiningOrder}
            >
              <Send className="h-3.5 w-3.5" />
              {orderSubmitting ? "Sending to Kitchen..." : "Send Order to Kitchen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AMENITY CONFIRMATION MODAL */}
      <Dialog open={!!selectedAmenity} onOpenChange={(open) => !open && setSelectedAmenity(null)}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-400" />
              Request {selectedAmenity?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Delivered directly to Room {session.room.number}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-300">{selectedAmenity?.desc}</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Additional Details / Quantity</Label>
              <Input
                placeholder="e.g. Please bring at 8:00 PM, extra soft pillows"
                value={amenityNotes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmenityNotes(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedAmenity(null)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
              disabled={amenitySubmitting}
              onClick={submitAmenityRequest}
            >
              <Send className="h-3.5 w-3.5" />
              {amenitySubmitting ? "Submitting..." : "Confirm Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXTEND STAY MODAL */}
      <Dialog open={extendStayOpen} onOpenChange={setExtendStayOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              Request Stay Extension
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Current scheduled check-out: <strong>{session.reservation.checkOutDate}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Requested New Check-Out Date *</Label>
              <Input
                type="date"
                value={newCheckOutDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCheckOutDate(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Reason / Notes for Front Desk</Label>
              <textarea
                rows={2}
                placeholder="e.g. Flight postponed, extending business meeting"
                value={extendReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExtendReason(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExtendStayOpen(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
              disabled={!newCheckOutDate || extendSubmitting}
              onClick={submitStayExtension}
            >
              <Send className="h-3.5 w-3.5" />
              {extendSubmitting ? "Sending Request..." : "Submit Extension Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ROOM UPGRADE MODAL */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Request Room Suite Upgrade
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Inquire about upgrading Room {session.room.number} to an Executive Suite or Penthouse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Upgrade Preference / Reason</Label>
              <textarea
                rows={3}
                placeholder="e.g. Interested in Presidential Suite, high floor, or room with panoramic city view"
                value={upgradeReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpgradeReason(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setUpgradeOpen(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
              disabled={upgradeSubmitting}
              onClick={submitRoomUpgrade}
            >
              <Send className="h-3.5 w-3.5" />
              {upgradeSubmitting ? "Sending..." : "Submit Upgrade Inquiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHECKOUT CLEARANCE MODAL */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <LogOut className="h-5 w-5 text-amber-400" />
              Pre-Checkout Room Clearance
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Room {session?.room?.number} &bull; Reservation #{session?.reservation?.reservationNumber}
            </DialogDescription>
          </DialogHeader>

          {checkoutStatus ? (
            <div className="space-y-4 py-2 text-xs">
              <div
                className={`p-3 rounded-lg border space-y-1.5 ${
                  checkoutStatus.status === "cleared"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : checkoutStatus.status === "issues_reported"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-blue-500/40 bg-blue-500/10 text-blue-200"
                }`}
              >
                <div className="font-semibold flex items-center gap-2 text-sm text-white">
                  {checkoutStatus.status === "cleared" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {checkoutStatus.status === "issues_reported" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  {checkoutStatus.status !== "cleared" && checkoutStatus.status !== "issues_reported" && (
                    <Clock className="h-4 w-4 text-blue-400 animate-spin" />
                  )}
                  Inspection Status: {checkoutStatus.status.replace("_", " ").toUpperCase()}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 mt-2">
                  <div>
                    Minibar Total:{" "}
                    <strong className="text-white">${Number(checkoutStatus.minibarTotal || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    Assets:{" "}
                    <strong className="text-white">
                      {checkoutStatus.assetsIntact ? "All Intact" : "Damages reported"}
                    </strong>
                  </div>
                  <div>
                    Inspected By:{" "}
                    <strong className="text-white">{checkoutStatus.inspectedBy || "Pending Staff"}</strong>
                  </div>
                  <div>
                    Inspection #:{" "}
                    <strong className="text-white font-mono">{checkoutStatus.inspectionNumber}</strong>
                  </div>
                </div>
                {checkoutStatus.lostAndFoundFound && (
                  <p className="text-amber-400 text-[11px] font-medium pt-1 border-t border-amber-500/20">
                    📦 Lost & Found: {checkoutStatus.lostAndFoundNotes}
                  </p>
                )}
              </div>

              <p className="text-slate-400 leading-relaxed text-xs">
                {checkoutStatus.status === "cleared"
                  ? "Your room inspection is complete and approved. Front Desk has received clearance to finalize your check-out."
                  : "Our Housekeeping team is inspecting the room minibar, equipment, and looking for any forgotten belongings before your departure."}
              </p>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setCheckoutModalOpen(false)} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-slate-300 text-xs leading-relaxed">
                Before departure, our housekeeping team inspects the room to verify minibar consumption, ensure all
                amenities are accounted for, and verify no personal items were left behind. This ensures a seamless
                and fast checkout at the front desk!
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Departure Notes (Optional)</Label>
                <textarea
                  rows={2}
                  placeholder="e.g. Packed and ready in 20 minutes, luggage assistance requested"
                  value={checkoutNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCheckoutNotes(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <DialogFooter className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                  disabled={checkoutSubmitting}
                  onClick={submitCheckoutRequest}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {checkoutSubmitting ? "Requesting..." : "Request Housekeeping Clearance"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

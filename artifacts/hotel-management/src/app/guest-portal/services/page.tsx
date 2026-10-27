"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Utensils,
  BedDouble,
  Car,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Send,
  ArrowLeft,
  ArrowRight,
  Search,
  Bell,
  RefreshCw,
  ShieldCheck,
  User,
  DoorClosed,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  Check,
  History,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fallback catalog in case backend endpoint is slow or offline
const DEFAULT_CATALOG = {
  dining: [
    {
      id: "cat-1",
      name: "Traditional Doro Wat Feast",
      category: "food",
      price: 2300,
      desc: "Slow-cooked spiced chicken with boiled egg and fresh injera served warm.",
      prepTime: "25-35 mins",
      badge: "Chef's Signature",
    },
    {
      id: "cat-2",
      name: "Deluxe Angus Burger & Fries",
      category: "food",
      price: 1750,
      desc: "Grass-fed beef, aged cheddar, caramelized onions, toasted brioche bun, and sea-salt potato crisps.",
      prepTime: "20-25 mins",
      badge: "Popular",
    },
    {
      id: "cat-3",
      name: "Continental Club Sandwich",
      category: "food",
      price: 1450,
      desc: "Smoked turkey, crispy bacon, organic lettuce, heirloom tomato with seasoned hand-cut fries.",
      prepTime: "15-20 mins",
    },
    {
      id: "cat-4",
      name: "Fresh Seasonal Fruit Platter",
      category: "food",
      price: 950,
      desc: "Selection of freshly sliced tropical papaya, sweet pineapple, mango, and mint sprigs.",
      prepTime: "10-15 mins",
      badge: "Healthy Choice",
    },
    {
      id: "cat-5",
      name: "Signature Ethiopian Jebena Coffee",
      category: "drinks",
      price: 550,
      desc: "Freshly roasted single-origin organic coffee brewed in a traditional clay pot, served with complimentary popcorn.",
      prepTime: "10-15 mins",
      badge: "Local Experience",
    },
    {
      id: "cat-6",
      name: "Fresh Mango & Avocado Smoothie",
      category: "drinks",
      price: 650,
      desc: "Velvety layered natural organic fruit juice made fresh without added sugar.",
      prepTime: "10 mins",
    },
    {
      id: "cat-7",
      name: "Sparkling Mineral Water (750ml)",
      category: "drinks",
      price: 450,
      desc: "Chilled natural Ambo mineral water served with fresh lime slices.",
      prepTime: "5-10 mins",
    },
  ],
  amenities: [
    {
      id: "am-1",
      name: "Extra Feather Pillows (x2)",
      category: "housekeeping",
      price: 0.0,
      desc: "Hypoallergenic ultra-soft down feather pillows delivered in protective sanitised linen casing.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "am-2",
      name: "Extra Warm Wool Blanket",
      category: "housekeeping",
      price: 0.0,
      desc: "Freshly laundered, high-insulation warm fleece blanket for cooler evenings.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "am-3",
      name: "Fresh Bath Towels & Robe Set",
      category: "housekeeping",
      price: 0.0,
      desc: "Plush 100% Egyptian cotton bath sheet, hand towel, and luxury waffle bathrobe with slippers.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "am-4",
      name: "Baby Cot / Crib Setup",
      category: "housekeeping",
      price: 0.0,
      desc: "European safety-certified wooden baby crib with breathable mattress, fitted sheet, and blanket.",
      prepTime: "20-30 mins",
      badge: "Complimentary",
    },
    {
      id: "am-5",
      name: "Evening Turndown Service",
      category: "housekeeping",
      price: 0.0,
      desc: "Bed freshened, mood lighting adjusted, fresh bedside water, and curtains drawn.",
      prepTime: "Scheduled",
      badge: "Complimentary",
    },
    {
      id: "am-6",
      name: "Luxury Dental & Shaving Kit",
      category: "housekeeping",
      price: 0.0,
      desc: "Eco bamboo toothbrush, mint toothpaste, ergonomic razor, and organic shaving balm.",
      prepTime: "10 mins",
      badge: "Complimentary",
    },
  ],
  transport: [
    {
      id: "tr-1",
      name: "Airport Chauffeur Transfer (Drop-off)",
      category: "transport",
      price: 3000,
      desc: "Private executive sedan transfer to Addis Ababa Bole International Airport (Terminal 1/2).",
      prepTime: "Scheduled",
      vehicleType: "Executive Sedan",
      duration: "35 mins",
      badge: "Direct Airport Service",
    },
    {
      id: "tr-2",
      name: "Airport Arrival VIP Meet & Pickup",
      category: "transport",
      price: 3750,
      desc: "Personalized name-board greeting in the arrival terminal with full luggage handling to your hotel suite.",
      prepTime: "Scheduled",
      vehicleType: "Executive Sedan / SUV",
      duration: "40 mins",
      badge: "VIP Welcome",
    },
    {
      id: "tr-3",
      name: "Half-Day City Tour Chauffeur (4 Hours)",
      category: "transport",
      price: 6800,
      desc: "Private dedicated vehicle and driver for Entoto Park, National Museum, and city highlights.",
      prepTime: "On Request",
      vehicleType: "Luxury SUV",
      duration: "4 Hours",
    },
    {
      id: "tr-4",
      name: "Full-Day Business Chauffeur (8 Hours)",
      category: "transport",
      price: 11200,
      desc: "On-demand executive standby vehicle for corporate meetings, diplomatic missions, and embassy visits.",
      prepTime: "On Request",
      vehicleType: "Executive Sedan / Van",
      duration: "8 Hours",
    },
    {
      id: "tr-5",
      name: "Complimentary Downtown / UNECA Shuttle",
      category: "transport",
      price: 0.0,
      desc: "Scheduled hourly luxury shuttle bus servicing Africa Hall, UNECA headquarters, and Meskel Square.",
      prepTime: "Hourly Scheduled",
      vehicleType: "Luxury Van",
      duration: "Hourly",
      badge: "Complimentary",
    },
  ],
  services: [
    {
      id: "sv-1",
      name: "Express Laundry & Pressing",
      category: "laundry",
      price: 1500,
      desc: "Rapid same-day wash, steam press, and hanger delivery for up to 3 business or casual garments.",
      prepTime: "3-4 Hours",
    },
    {
      id: "sv-2",
      name: "AC & Climate Adjustment Assistance",
      category: "maintenance",
      price: 0.0,
      desc: "In-room engineering technician visit to inspect heating, ventilation, or air conditioning presets.",
      prepTime: "15 mins",
      badge: "Complimentary",
    },
    {
      id: "sv-3",
      name: "High-Speed Wi-Fi Tech Support",
      category: "maintenance",
      price: 0.0,
      desc: "Dedicated in-room IT assistance for secure VPN setups, video conference optimization, and device pairing.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "sv-4",
      name: "Morning Wake-up Call",
      category: "wake_up",
      price: 0.0,
      desc: "Bespoke front desk concierge wake-up phone call at your exact designated morning time.",
      prepTime: "Scheduled",
      badge: "Complimentary",
    },
  ],
  stay: [
    {
      id: "st-1",
      name: "Stay Extension Request",
      category: "stay",
      price: 2500,
      desc: "Request additional nights or extended stay checkout dates at current room rates.",
      prepTime: "Front Desk Review",
      badge: "Room Rate",
    },
    {
      id: "st-2",
      name: "Late Check-Out Request (Until 2:00 PM)",
      category: "stay",
      price: 800,
      desc: "Request extended late room access before afternoon departure. Tier 1 late departure fee applies.",
      prepTime: "Subject to Availability",
      badge: "Late Departure",
    },
    {
      id: "st-3",
      name: "Guaranteed Late Check-Out (Until 4:00 PM)",
      category: "stay",
      price: 1500,
      desc: "Guaranteed extended late room access for evening flight or relaxed departure. Tier 2 fee applies.",
      prepTime: "Front Desk Confirmation",
      badge: "Popular",
    },
    {
      id: "st-4",
      name: "Room Move / Suite Upgrade Request",
      category: "stay",
      price: 1800,
      desc: "Inquire about moving to a quieter wing, higher floor, or executive suite upgrades. Rate difference charged to folio.",
      prepTime: "Front Desk Review",
      badge: "Suite Upgrade",
    },
    {
      id: "st-5",
      name: "Luggage Pickup & Bellhop at Departure",
      category: "stay",
      price: 250,
      desc: "Concierge porter luggage collection directly from your suite at requested checkout time.",
      prepTime: "15 mins",
      badge: "Porter Service",
    },
  ],
};

interface TrayItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  desc?: string;
}

interface ServiceOrder {
  id: string;
  requestNumber: string;
  roomNumber: string;
  guestName: string;
  serviceType: string;
  department: string;
  status: string;
  priority: string;
  description: string;
  specialInstructions?: string;
  chargeAmount?: string;
  createdAt: string;
  estimatedCompletion?: string;
  assignedToName?: string;
  assignedToId?: string;
  cancelReason?: string;
}

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active view tabs
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state (Limit 5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Guest & Room identification
  const [roomNumber, setRoomNumber] = useState(searchParams.get("room") || "");
  const [guestName, setGuestName] = useState(searchParams.get("name") || "");
  const [guestId, setGuestId] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [isRecognizedGuest, setIsRecognizedGuest] = useState(false);

  // Reset pagination on category or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Catalog state
  const [catalog, setCatalog] = useState<typeof DEFAULT_CATALOG>(DEFAULT_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Tray / Cart state
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [specialNotes, setSpecialNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom request modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customType, setCustomType] = useState("housekeeping");
  const [customDetails, setCustomDetails] = useState("");

  // Order placed confirmation dialog
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // Active orders tracking state
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [trackingSubTab, setTrackingSubTab] = useState<"active" | "history">("active");

  const activeOrders = useMemo(
    () => orders.filter((o) => ["requested", "assigned", "in_progress"].includes(o.status)),
    [orders]
  );
  const historyOrders = useMemo(
    () => orders.filter((o) => ["completed", "cancelled"].includes(o.status)),
    [orders]
  );

  const handleReorder = (pastOrder: ServiceOrder) => {
    const customItem: TrayItem = {
      id: "reorder-" + Date.now(),
      name: pastOrder.description || "Repeated Hotel Request",
      category: pastOrder.serviceType || "custom",
      price: pastOrder.chargeAmount ? Number(pastOrder.chargeAmount) : 0,
      quantity: 1,
      desc: `Re-requested from Folio #${pastOrder.requestNumber}`,
    };
    setTray((prev) => [...prev, customItem]);
    setActiveTab("catalog");
  };

  // 1. Detect Guest Session from browser storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            const guest = parsed.guest || parsed;
            const derivedName =
              guest.fullName ||
              `${guest.firstName || ""} ${guest.lastName || ""}`.trim() ||
              guestName;
            if (derivedName && !guestName) setGuestName(derivedName);
            if (guest.id && !guestId) setGuestId(guest.id);

            const derivedRoom =
              parsed.roomNumber ||
              parsed.room?.number ||
              parsed.reservation?.roomNumber ||
              parsed.reservation?.room?.number ||
              guest.roomNumber;
            if (derivedRoom && !roomNumber) setRoomNumber(derivedRoom);
            if (!derivedRoom && !roomNumber) setRoomNumber("101");

            if (parsed.reservation?.id || parsed.reservationId) {
              setReservationId(parsed.reservation?.id || parsed.reservationId);
            }
            if (derivedName || derivedRoom || guest.id) {
              setIsRecognizedGuest(true);
            }
          }
        } catch {
          // ignore corrupted JSON
        }
      }
    }
  }, []);

  // 2. Fetch Catalog from backend
  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const res = await fetch("/api/guest-portal/catalog");
        if (res.ok) {
          const data = await res.json();
          if (data && (data.dining || data.amenities || data.transport || data.services || data.stay)) {
            setCatalog({
              dining: data.dining || DEFAULT_CATALOG.dining,
              amenities: data.amenities || DEFAULT_CATALOG.amenities,
              transport: data.transport || DEFAULT_CATALOG.transport,
              services: data.services || DEFAULT_CATALOG.services,
              stay: data.stay || DEFAULT_CATALOG.stay,
            });
          }
        }
      } catch {
        // use default catalog
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // 3. Fetch orders when viewing orders tab
  const fetchMyOrders = async () => {
    if (!roomNumber.trim()) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/guest-portal/my-orders?roomNumber=${encodeURIComponent(roomNumber.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "orders" && roomNumber.trim()) {
      fetchMyOrders();
    }
  }, [activeTab, roomNumber]);

  // Combine catalog items for filtering
  const allItems = useMemo(() => {
    const list: Array<any & { section: string; sectionLabel: string }> = [];
    catalog.dining.forEach((i) => list.push({ ...i, section: "dining", sectionLabel: "Dining & Drinks" }));
    catalog.amenities.forEach((i) => list.push({ ...i, section: "amenities", sectionLabel: "Housekeeping & Amenities" }));
    catalog.transport.forEach((i) => list.push({ ...i, section: "transport", sectionLabel: "Airport & Transport" }));
    catalog.services.forEach((i) => list.push({ ...i, section: "services", sectionLabel: "Concierge & Services" }));
    catalog.stay?.forEach((i) => list.push({ ...i, section: "stay", sectionLabel: "Stay & Room Requests" }));
    return list;
  }, [catalog]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.section === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allItems, selectedCategory, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Tray management
  const addToTray = (item: any) => {
    setTray((prev) => {
      const existing = prev.find((t) => t.id === item.id);
      if (existing) {
        return prev.map((t) =>
          t.id === item.id ? { ...t, quantity: t.quantity + 1 } : t
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          category: item.category || item.section,
          price: Number(item.price) || 0,
          quantity: 1,
          desc: item.desc,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setTray((prev) =>
      prev
        .map((t) => {
          if (t.id === id) {
            const newQty = t.quantity + delta;
            return newQty > 0 ? { ...t, quantity: newQty } : null;
          }
          return t;
        })
        .filter(Boolean) as TrayItem[]
    );
  };

  const removeFromTray = (id: string) => {
    setTray((prev) => prev.filter((t) => t.id !== id));
  };

  const trayTotal = useMemo(() => {
    return tray.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [tray]);

  const trayItemCount = useMemo(() => {
    return tray.reduce((acc, item) => acc + item.quantity, 0);
  }, [tray]);

  // Submit Order to backend
  const handleSubmitOrder = async () => {
    if (!roomNumber.trim()) {
      alert("Please specify your Room Number so our team knows where to deliver.");
      return;
    }
    if (!guestName.trim()) {
      alert("Please provide the Guest Name for this request.");
      return;
    }
    if (tray.length === 0) {
      alert("Please select at least one item or service to request.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build descriptive summary of items
      const itemsSummary = tray
        .map((t) => `${t.quantity}x ${t.name}${t.price > 0 ? ` (${(t.price * t.quantity).toLocaleString()} ETB)` : " (Free)"}`)
        .join(", ");

      // Primary service type
      const primaryType = tray[0].category || "food";

      const payload = {
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        guestId: guestId || undefined,
        reservationId: reservationId || undefined,
        serviceType: primaryType,
        description: itemsSummary,
        specialInstructions: specialNotes.trim() || undefined,
        priority: priority,
        chargeAmount: trayTotal,
      };

      const res = await fetch("/api/guest-portal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to dispatch request");
      }

      const created = await res.json();
      setConfirmedOrder({
        requestNumber: created.requestNumber || "RS-" + Date.now().toString(36).toUpperCase(),
        items: itemsSummary,
        total: trayTotal,
        priority,
        specialNotes,
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        eta: primaryType === "food" ? "25 - 35 mins" : "15 - 25 mins",
      });

      // Clear tray
      setTray([]);
      setSpecialNotes("");

      // Trigger orders refetch in background
      fetchMyOrders();
    } catch (err: any) {
      alert(err.message || "An error occurred while submitting your service request. Please try again or contact front desk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add custom request to tray
  const handleAddCustomRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const customItem: TrayItem = {
      id: "custom-" + Date.now(),
      name: customTitle.trim(),
      category: customType,
      price: 0.0,
      quantity: 1,
      desc: customDetails.trim() || "Bespoke custom guest request",
    };

    setTray((prev) => [...prev, customItem]);
    setCustomTitle("");
    setCustomDetails("");
    setCustomModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Luxury Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0b0c10]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand & Return */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-slate-400 hover:text-amber-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5 border border-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Hotel Home</span>
            </Link>
          </div>

          {/* Center/Right: Tab Switchers & Guest Status */}
          <div className="flex items-center gap-3">
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => setActiveTab("catalog")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === "catalog"
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Request Services</span>
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeTab === "orders"
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Active Tracking</span>
                {activeOrders.length > 0 ? (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                    {activeOrders.length}
                  </span>
                ) : historyOrders.length > 0 ? (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-white/10 text-slate-300 text-[10px] flex items-center justify-center font-bold">
                    {historyOrders.length}
                  </span>
                ) : null}
              </button>
            </div>

            {/* Room / Guest Indicator */}
            {isRecognizedGuest && roomNumber && (
              <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs text-amber-300">
                <DoorClosed className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">Room {roomNumber}</span>
                {guestName && (
                  <>
                    <span className="text-amber-500/40">•</span>
                    <span className="text-slate-300 truncate max-w-[120px]">{guestName}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#14171f] to-amber-900/20 border border-amber-500/20 p-5 sm:p-6 mb-6 shadow-xl shadow-black/40">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Guest Services & Stay Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
                In-Room Dining, Amenities & Stay Requests
              </h1>
            </div>
          </div>
        </div>

        {/* Tab 1: Catalog & Ordering */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Catalog Section (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-60">
                  <Select value={selectedCategory} onValueChange={(val) => {
                    setSelectedCategory(val);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs bg-white/5 border-white/10 text-white rounded-xl focus:ring-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <SelectValue placeholder="All" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#14171f] border-white/10 text-slate-200">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="stay">Stay & Room Requests</SelectItem>
                      <SelectItem value="dining">Dining & Refreshments</SelectItem>
                      <SelectItem value="amenities">Housekeeping & Amenities</SelectItem>
                      <SelectItem value="transport">Airport & Chauffeur</SelectItem>
                      <SelectItem value="services">Concierge & Tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Bar & Custom Request Trigger */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search dishes, towels, executive transfers, coffee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-[#14171f] border-white/10 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <Button
                  onClick={() => setCustomModalOpen(true)}
                  variant="outline"
                  className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Request</span>
                </Button>
              </div>

              {/* Items Grid */}
              {catalogLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading luxury catalog...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#14171f]/40 space-y-3">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-300">No services match your search</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Try another keyword or submit a custom guest request for anything not listed.
                  </p>
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    variant="outline"
                    className="border-white/10 text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedItems.map((item) => {
                      const isFree = Number(item.price) === 0;

                      return (
                        <Card
                          key={item.id}
                          className="bg-[#14171f] border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between group"
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400/90 font-semibold bg-amber-400/10 px-2 py-0.5 rounded">
                                {item.sectionLabel}
                              </span>
                              {item.badge && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0 ${
                                    isFree
                                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                      : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                  }`}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base font-semibold text-white group-hover:text-amber-200 transition-colors mt-2">
                              {item.name}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="p-4 pt-2">
                            {/* Metadata pill row (prepTime, vehicleType, etc.) */}
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-slate-400">
                              {item.prepTime && (
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {item.prepTime}
                                </span>
                              )}
                              {item.vehicleType && (
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                                  <Car className="w-3 h-3 text-slate-400" />
                                  {item.vehicleType}
                                </span>
                              )}
                            </div>

                            {/* Price & Add to cart button */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <div>
                                {isFree && item.category !== "stay" ? (
                                  <span className="text-sm font-semibold text-emerald-400 tracking-wide">
                                    Complimentary
                                  </span>
                                ) : isFree ? (
                                  <span className="text-sm font-semibold text-amber-400 tracking-wide">
                                    Fee Applied to Folio
                                  </span>
                                ) : (
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-amber-400">
                                      {Number(item.price).toLocaleString()} ETB
                                    </span>
                                    <span className="text-[10px] text-slate-400">/ charged to folio</span>
                                  </div>
                                )}
                              </div>

                              <Button
                                onClick={() => addToTray(item)}
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 active:scale-95 text-slate-950 font-semibold text-xs h-8 px-3.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>Request Service</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination Controls (Limit 5 items per page) */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-8 w-8 border-white/10 text-slate-300 hover:text-white disabled:opacity-30"
                          title="Previous"
                          aria-label="Previous"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                            <button
                              key={pg}
                              onClick={() => setCurrentPage(pg)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                currentPage === pg
                                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {pg}
                            </button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-8 w-8 border-white/10 text-slate-300 hover:text-white disabled:opacity-30"
                          title="Next"
                          aria-label="Next"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Service Requests Sidebar (4 cols) */}
            <div className="lg:col-span-4 sticky top-20 space-y-4">
              <Card className="bg-[#14171f] border-amber-500/20 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-white/5 to-transparent p-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>Service Requests</span>
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {tray.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-black/20 flex flex-col items-center justify-center p-4">
                      <Bell className="w-7 h-7 text-slate-600/60 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No service requested yet</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Click &quot;Request Service&quot; on any item to submit a guest request.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {tray.map((item) => (
                        <div
                          key={item.id}
                          className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {item.price === 0 && item.category !== "stay"
                                ? "Complimentary"
                                : item.price === 0
                                ? "Charged to Folio"
                                : `${item.price.toLocaleString()} ETB each`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center font-bold text-amber-400 text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromTray(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delivery Location Check */}
                  <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                    {!roomNumber.trim() && (
                      <div className="space-y-1">
                        <Input
                          placeholder="Enter Room #"
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                          className="h-7 w-full text-xs bg-black/40 border-amber-500/40 text-amber-300 font-bold"
                        />
                        <p className="text-[10px] text-rose-400">
                          * Please enter your room number above to place order.
                        </p>
                      </div>
                    )}

                    {/* Special Instructions */}
                    <div className="pt-2">
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                        Special Instructions
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Please knock softly, deliver at 7:30 PM, extra ice..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-black/30 rounded-lg p-3 space-y-1.5 border border-white/5 pt-3">
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Items Subtotal</span>
                        <span>{trayTotal.toLocaleString()} ETB</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Room Delivery Fee</span>
                        <span className="text-emerald-400 font-medium">Complimentary</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-white/10">
                        <span>Total to Folio</span>
                        <span className="text-amber-400">{trayTotal.toLocaleString()} ETB</span>
                      </div>
                    </div>

                    {/* Dispatch Action Button */}
                    <Button
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting || tray.length === 0}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs py-5 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Dispatching to Staff...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Send className="w-4 h-4" />
                          <span>Submit Service Request</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* Tab 2: Orders Tracking */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Live Tracking & Request History
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time concierge dispatch and past billing records for Room {roomNumber || "Guest Room"}.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={fetchMyOrders}
                  variant="outline"
                  size="sm"
                  className="border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs text-slate-300 h-9 px-3 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin text-amber-400" : ""}`} />
                  <span>Refresh Status</span>
                </Button>
                <Button
                  onClick={() => setActiveTab("catalog")}
                  className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold h-9 px-4 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                  size="sm"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Order More</span>
                </Button>
              </div>
            </div>

            {/* Room Identifier Box if empty */}
            {!roomNumber.trim() && (
              <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center space-y-3 max-w-lg mx-auto">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-amber-200">
                  Please enter your room number to load your live orders and history.
                </p>
                <div className="max-w-xs mx-auto flex gap-2">
                  <Input
                    placeholder="Enter Room #"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="text-xs bg-black/50 border-white/10"
                  />
                  <Button
                    onClick={fetchMyOrders}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                  >
                    Load
                  </Button>
                </div>
              </div>
            )}

            {/* Sub-tab Navigation Pill: Active Requests vs Past History */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTrackingSubTab("active")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    trackingSubTab === "active"
                      ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {activeOrders.length > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        trackingSubTab === "active" ? "bg-slate-950" : "bg-amber-400"
                      }`}
                    />
                  </span>
                  <span>Active Requests</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      trackingSubTab === "active"
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {activeOrders.length}
                  </span>
                </button>

                <button
                  onClick={() => setTrackingSubTab("history")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    trackingSubTab === "history"
                      ? "bg-amber-500 text-slate-950 shadow-sm font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Past History</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      trackingSubTab === "history"
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {historyOrders.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 px-3 flex items-center gap-2 font-medium">
                <DoorClosed className="w-3.5 h-3.5 text-amber-400" />
                <span>Room {roomNumber || "---"}</span>
                <span className="text-white/20">•</span>
                <span>{orders.length} {orders.length === 1 ? "Record" : "Records"} Total</span>
              </div>
            </div>

            {/* Content Display based on Sub-tab */}
            {ordersLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading guest requests for Room {roomNumber}...</p>
              </div>
            ) : trackingSubTab === "active" ? (
              /* ─── ACTIVE REQUESTS TAB ────────────────────────────────────────── */
              activeOrders.length === 0 ? (
                <div className="p-14 text-center border border-dashed border-white/10 rounded-2xl bg-[#14171f]/60 space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white">No active requests in progress</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    All submitted orders for Room {roomNumber} have been delivered or completed. Looking for additional services or dining?
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={() => setActiveTab("catalog")}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4"
                      size="sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Request New Service
                    </Button>
                    {historyOrders.length > 0 && (
                      <Button
                        onClick={() => setTrackingSubTab("history")}
                        variant="outline"
                        className="border-white/10 text-slate-300 hover:text-white text-xs px-4"
                        size="sm"
                      >
                        <History className="w-3.5 h-3.5 mr-1.5" />
                        View Past History ({historyOrders.length})
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {activeOrders.map((order) => {
                    const statusConfig: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
                      requested: {
                        bg: "bg-amber-500/10",
                        text: "text-amber-400",
                        border: "border-amber-500/30",
                        label: "Received • Awaiting Dispatch",
                        dot: "bg-amber-400",
                      },
                      assigned: {
                        bg: "bg-blue-500/10",
                        text: "text-blue-400",
                        border: "border-blue-500/30",
                        label: "Dispatched • Staff Assigned",
                        dot: "bg-blue-400",
                      },
                      in_progress: {
                        bg: "bg-purple-500/10",
                        text: "text-purple-400",
                        border: "border-purple-500/30",
                        label: "In Preparation",
                        dot: "bg-purple-400",
                      },
                    };

                    const currentStatus = statusConfig[order.status] || statusConfig.requested;

                    // Step Index (1 to 4)
                    const stepIndex =
                      order.status === "completed"
                        ? 4
                        : order.status === "in_progress"
                        ? 3
                        : order.status === "assigned"
                        ? 2
                        : 1;

                    const STEPS = [
                      { step: 1, label: "Received", detail: "Request Logged" },
                      { step: 2, label: "Assigned", detail: order.assignedToName ? order.assignedToName : "Staff Assigned" },
                      { step: 3, label: "Preparing", detail: "In Preparation" },
                      { step: 4, label: "Delivery", detail: "To Room " + order.roomNumber },
                    ];

                    const deptLower = (order.department || "").toLowerCase();
                    const deptIcon = deptLower.includes("restaurant") || deptLower.includes("dining") ? (
                      <Utensils className="w-3.5 h-3.5 text-amber-400" />
                    ) : deptLower.includes("housekeeping") || deptLower.includes("room") ? (
                      <BedDouble className="w-3.5 h-3.5 text-blue-400" />
                    ) : deptLower.includes("transport") ? (
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                    ) : deptLower.includes("maintenance") ? (
                      <Wrench className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    );

                    return (
                      <div
                        key={order.id}
                        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#151926]/95 to-[#0e111a]/95 backdrop-blur-md shadow-xl transition-all hover:border-amber-500/30 p-5 sm:p-6 space-y-4"
                      >
                        {/* Top decorative accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-amber-400/80 to-amber-500/40" />

                        {/* Header details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shadow-sm">
                              {order.requestNumber}
                            </span>
                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-slate-200">
                              {deptIcon}
                              <span className="capitalize font-medium">{order.department || "Concierge"}</span>
                            </div>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/15">
                              Room {order.roomNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${currentStatus.dot} opacity-75`} />
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStatus.dot}`} />
                            </span>
                            <Badge
                              variant="outline"
                              className={`${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} px-3 py-1 text-xs font-semibold shadow-sm`}
                            >
                              {currentStatus.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Order description container */}
                        <div className="bg-black/35 rounded-xl p-3.5 border border-white/5 space-y-1.5">
                          <p className="text-sm font-semibold text-white leading-relaxed">
                            {order.description}
                          </p>
                          {order.specialInstructions && (
                            <div className="flex items-start gap-2 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-2">
                              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span className="italic font-light">
                                Special Note: {order.specialInstructions}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Accountable Dispatched Staff or Pending Reassurance */}
                        {order.assignedToName ? (
                          <div className="flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20 w-fit">
                            <User className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>
                              Assigned Concierge Staff: <strong className="text-emerald-300 font-semibold">{order.assignedToName}</strong> ({order.department || "Operations"})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/15 w-fit">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            <span>Front desk is actively assigning on-duty staff to your request</span>
                          </div>
                        )}

                        {/* Connected Luxury Milestone Stepper */}
                        <div className="pt-3 pb-2 px-1">
                          <div className="relative">
                            {/* Connecting Track Line */}
                            <div className="absolute top-4 left-6 right-6 h-0.5 bg-white/10 -translate-y-1/2 z-0" />
                            {/* Active Filled Progress Line */}
                            <div
                              className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 -translate-y-1/2 z-0 transition-all duration-500"
                              style={{
                                width: `${Math.max(0, Math.min(100, ((stepIndex - 1) / 3) * 100))}%`,
                              }}
                            />

                            {/* Step nodes */}
                            <div className="relative z-10 grid grid-cols-4 gap-2">
                              {STEPS.map((s) => {
                                const isDone = stepIndex > s.step;
                                const isCurrent = stepIndex === s.step;
                                return (
                                  <div key={s.step} className="flex flex-col items-center text-center">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                        isDone
                                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                                          : isCurrent
                                          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/40"
                                          : "bg-[#181c26] border border-white/15 text-slate-400"
                                      }`}
                                    >
                                      {isDone ? (
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      ) : isCurrent ? (
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
                                        </span>
                                      ) : (
                                        <span>{s.step}</span>
                                      )}
                                    </div>

                                    <div className="mt-2 space-y-0.5">
                                      <p
                                        className={`text-xs font-semibold leading-tight ${
                                          isCurrent
                                            ? "text-amber-400"
                                            : isDone
                                            ? "text-slate-200"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {s.label}
                                      </p>
                                      <p className="text-[10px] text-slate-400 truncate max-w-[90px] hidden sm:block">
                                        {s.detail}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Timestamp & Folio Billing Footer */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10 gap-2">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Submitted:{" "}
                            <strong className="text-slate-300">
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </strong>
                          </span>

                          <div className="flex items-center gap-2">
                            {order.chargeAmount && Number(order.chargeAmount) > 0 ? (
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                                {Number(order.chargeAmount).toLocaleString()} ETB charged to room folio
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                Complimentary
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* ─── PAST HISTORY TAB ───────────────────────────────────────────── */
              historyOrders.length === 0 ? (
                <div className="p-14 text-center border border-dashed border-white/10 rounded-2xl bg-[#14171f]/60 space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center mx-auto border border-white/10">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white">No request history yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Fulfilled room requests and past in-room dining orders will be safely archived here for your records.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyOrders.map((order) => {
                    const isCancelled = order.status === "cancelled";
                    const deptLower = (order.department || "").toLowerCase();
                    const deptIcon = deptLower.includes("restaurant") || deptLower.includes("dining") ? (
                      <Utensils className="w-3.5 h-3.5 text-amber-400" />
                    ) : deptLower.includes("housekeeping") || deptLower.includes("room") ? (
                      <BedDouble className="w-3.5 h-3.5 text-blue-400" />
                    ) : deptLower.includes("transport") ? (
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                    ) : deptLower.includes("maintenance") ? (
                      <Wrench className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    );

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-white/[0.08] bg-[#12151e]/90 hover:border-white/20 p-5 space-y-3.5 shadow-md transition-all"
                      >
                        {/* Header details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                              {order.requestNumber}
                            </span>
                            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-slate-300">
                              {deptIcon}
                              <span className="capitalize">{order.department || "Concierge"}</span>
                            </div>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">
                              Room <strong className="text-slate-200">{order.roomNumber}</strong>
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at{" "}
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <Badge
                            variant="outline"
                            className={
                              isCancelled
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30 px-3 py-1 text-xs font-semibold"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs font-semibold"
                            }
                          >
                            {isCancelled ? "Item Unavailable" : "✓ Delivered & Completed"}
                          </Badge>
                        </div>

                        {/* Order description container */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-1">
                          <p className="text-sm font-medium text-slate-200">
                            {order.description}
                          </p>
                          {order.specialInstructions && (
                            <p className="text-xs text-slate-400 italic">
                              Note: {order.specialInstructions}
                            </p>
                          )}
                        </div>

                        {/* Polite Front Desk Note / Unavailability notice */}
                        {order.cancelReason && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-semibold text-amber-300">Front Desk Update:</span>
                              <p className="text-slate-200 leading-relaxed font-light">{order.cancelReason}</p>
                            </div>
                          </div>
                        )}

                        {/* Footer row with Folio and Reorder button */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                          <div>
                            {order.chargeAmount && Number(order.chargeAmount) > 0 ? (
                              <span className="text-amber-400 font-semibold">
                                {Number(order.chargeAmount).toLocaleString()} ETB billed to folio
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium">Complimentary</span>
                            )}
                          </div>

                          <Button
                            onClick={() => handleReorder(order)}
                            size="sm"
                            variant="outline"
                            className="h-8 border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10 text-slate-300 hover:text-amber-400 text-xs gap-1.5 font-medium transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Request Again</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Custom Request Dialog */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="bg-[#14171f] border-amber-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Special Custom Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Need something unique not on the standard menu? Let our 24/7 concierge know.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomRequest} className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Request Title / Item
              </label>
              <Input
                required
                placeholder="e.g. Extra coat hangers, hypoallergenic baby soap..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="bg-black/40 border-white/10 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Department
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="housekeeping">Housekeeping & Amenities</option>
                <option value="food">In-Room Dining / Special Dish</option>
                <option value="transport">Transportation & Chauffeur</option>
                <option value="maintenance">Room Maintenance / Tech Support</option>
                <option value="laundry">Laundry & Pressing</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Detailed Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Provide any specific preferences or schedule..."
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomModalOpen(false)}
                className="border-white/10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                Add to Requests
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Placed Success Modal */}
      <Dialog open={!!confirmedOrder} onOpenChange={() => setConfirmedOrder(null)}>
        <DialogContent className="bg-[#14171f] border-amber-500/40 text-white max-w-lg">
          <DialogHeader className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto text-slate-950 shadow-lg shadow-amber-500/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <DialogTitle className="text-2xl font-serif font-bold text-white">
              Request Dispatched to Concierge
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Our hospitality team has received your order and is preparing it for delivery.
            </DialogDescription>
          </DialogHeader>

          {confirmedOrder && (
            <div className="space-y-4 pt-3">
              <div className="bg-black/40 border border-amber-500/20 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-slate-400">Order Reference</span>
                  <span className="font-mono font-bold text-amber-400">
                    {confirmedOrder.requestNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination</span>
                  <span className="font-semibold text-slate-200">
                    Room {confirmedOrder.roomNumber} ({confirmedOrder.guestName})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Delivery</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {confirmedOrder.eta}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-slate-400 block mb-1">Ordered Items:</span>
                  <p className="text-slate-200 font-medium">{confirmedOrder.items}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={() => {
                    setConfirmedOrder(null);
                    setActiveTab("orders");
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-5 rounded-xl"
                >
                  <Clock className="w-4 h-4 mr-1.5" />
                  Track Live Progress
                </Button>
                <Button
                  onClick={() => setConfirmedOrder(null)}
                  variant="outline"
                  className="border-white/10 text-xs py-5 rounded-xl hover:bg-white/5"
                >
                  Order More Services
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GuestServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-slate-300">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading guest services experience...</p>
          </div>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}

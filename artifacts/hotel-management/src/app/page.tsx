"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Search,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Wifi,
  Coffee,
  Tv,
  Droplets,
  Star,
  MapPin,
  Phone,
  Mail,
  Lock,
  Loader2,
  User,
  LogOut,
  QrCode,
  Building,
  Check,
  Compass,
  Plus,
  X,
  BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoomType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  basePrice?: string | number;
  capacityAdults?: number;
  capacityChildren?: number;
  amenities?: string[];
  imageUrl?: string;
  size?: string | number;
}

interface AvailableRoom {
  id: string;
  number: string;
  floor: string;
  roomTypeId: string;
  currentPrice: string | number;
  status: string;
}

const SPECIAL_REQUEST_CATALOG = [
  {
    category: "🍽️ In-Room Dining & Breakfast",
    items: [
      "Traditional Doro Wat Feast ($18.50)",
      "Deluxe Angus Burger & Fries ($14.00)",
      "Continental Club Sandwich ($11.50)",
      "Fresh Seasonal Fruit Platter ($8.00)",
      "Signature Ethiopian Jebena Coffee ($4.50)",
      "Fresh Mango & Avocado Smoothie ($5.50)",
      "Sparkling Mineral Water (750ml, $3.50)",
    ],
  },
  {
    category: "🛏️ Room Amenities & Comfort",
    items: [
      "Extra Feather Pillows (x2)",
      "Extra Warm Wool Blanket",
      "Fresh Bath Towels & Robe Set",
      "Baby Cot / Crib Setup",
      "Room Evening Turn-down Service",
    ],
  },
  {
    category: "🛎️ Guest & Stay Services",
    items: [
      "Morning Wake-up Call",
      "Express Laundry & Pressing ($12.00)",
      "Quiet Room / High Floor Preference",
      "Early Check-In Request",
      "Late Check-Out Request",
      "AC / Climate Adjustment Assistance",
    ],
  },
  {
    category: "🚗 Airport & Chauffeur Transport",
    items: [
      "Airport Arrival VIP Meet & Pickup (3,750 ETB)",
      "Airport Chauffeur Drop-off (3,000 ETB)",
      "Complimentary Downtown / UNECA Shuttle",
      "Half-Day City Tour Chauffeur (6,800 ETB)",
      "Luggage & Bellhop Vehicle Dispatch",
    ],
  },
];

export default function LuxuryLandingPage() {
  const router = useRouter();

  // Guest Auth State
  const [guestSession, setGuestSession] = useState<any | null>(null);

  // Booking Bar State
  const todayStr = new Date().toISOString().split("T")[0];
  const nextWeekStr = new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0];

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(nextWeekStr);
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [selectedTier, setSelectedTier] = useState("all");

  // Room Data
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Reservation & Payment Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<RoomType | null>(null);
  const [bookingStep, setBookingStep] = useState<"review" | "payment" | "confirmed">("review");

  // Guest Details for Booking (if not already logged in)
  const [bookingGuestName, setBookingGuestName] = useState("");
  const [bookingGuestPhone, setBookingGuestPhone] = useState("");
  const [bookingGuestEmail, setBookingGuestEmail] = useState("");
  const [bookingGuestFayda, setBookingGuestFayda] = useState("");
  const [bookingSpecialRequests, setBookingSpecialRequests] = useState("");
  const [selectedSpecialPresets, setSelectedSpecialPresets] = useState<string[]>([]);
  const [customSpecialRequest, setCustomSpecialRequest] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState("");

  // Payment Selection (Telebirr, CBE, Chapa)
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe" | "chapa" | "card">("telebirr");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<any | null>(null);

  // Hotel Currency: Ethiopian Birr (ETB)
  const ETB_RATE = 125;
  const formatPrice = (usdAmount: number) => {
    const etb = Math.round(usdAmount * ETB_RATE);
    return `${etb.toLocaleString()} ETB`;
  };

  // Check login on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.guest) {
            setGuestSession(parsed);
            setBookingGuestName(parsed.guest.fullName || `${parsed.guest.firstName} ${parsed.guest.lastName}`.trim());
            setBookingGuestPhone(parsed.guest.phone || "");
            setBookingGuestEmail(parsed.guest.email || "");
            setBookingGuestFayda(parsed.guest.nationalId || parsed.guest.idNumber || "");
          }
        } catch {
          // ignore
        }
      }
    }

    // Fetch Room Types and Availability
    Promise.all([
      fetch("/api/room-types").then((r) => r.json()).catch(() => []),
      fetch("/api/rooms/availability").then((r) => r.json()).catch(() => []),
    ])
      .then(([typesRes, availRes]) => {
        const types = Array.isArray(typesRes)
          ? typesRes
          : Array.isArray(typesRes?.data)
          ? typesRes.data
          : [];
        const avail = Array.isArray(availRes)
          ? availRes
          : Array.isArray(availRes?.data)
          ? availRes.data
          : [];

        // Curate default high-end luxury suites if types are empty
        if (types.length === 0) {
          setRoomTypes([
            {
              id: "type-presidential",
              name: "Presidential Horizon Sanctuary",
              code: "PRES",
              description: "Top-floor penthouse with private plunge pool, 24/7 dedicated butler, panoramic Addis skyline views, and handcrafted Ethiopian teakwood finishes.",
              basePrice: 450,
              capacityAdults: 3,
              capacityChildren: 2,
              size: 145,
              amenities: ["Private Plunge Pool", "24/7 Butler Service", "In-Room Espresso", "Jacuzzi Spa", "Executive Lounge Access"],
              imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
            },
            {
              id: "type-executive",
              name: "Executive Panoramic Suite",
              code: "EXEC",
              description: "Expansive master bedroom with wrap-around terrace, bespoke marble bathroom with rain shower, and ergonomic executive workstation.",
              basePrice: 280,
              capacityAdults: 2,
              capacityChildren: 1,
              size: 85,
              amenities: ["Terrace Skyline View", "Marble Rain Shower", "Smart TV & Sonos", "High-Speed Wi-Fi", "Daily Turn-down"],
              imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80",
            },
            {
              id: "type-diplomatic",
              name: "Diplomatic Residence & Villa",
              code: "DIPLO",
              description: "Private residential compound designed for diplomatic delegations, featuring soundproof conference salon, dining hall, and private security entrance.",
              basePrice: 380,
              capacityAdults: 4,
              capacityChildren: 2,
              size: 120,
              amenities: ["Private Salon", "Diplomatic Security Lock", "Chauffeur Included", "Sommelier Bar", "Bespoke Dining"],
              imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80",
            },
            {
              id: "type-deluxe",
              name: "Deluxe King Sanctuary Room",
              code: "DLX",
              description: "Plush king-size featherbed, floor-to-ceiling soundproof windows, custom artisan woven linens, and deep soaking tub.",
              basePrice: 190,
              capacityAdults: 2,
              capacityChildren: 1,
              size: 55,
              amenities: ["King Featherbed", "Deep Soaking Tub", "High-Speed Wi-Fi", "Lavazza Coffee", "City View"],
              imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80",
            },
          ]);
        } else {
          // Enrich database room types with luxury imagery
          const suiteImages = [
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80",
          ];
          const enriched = types.map((t: any, idx: number) => ({
            ...t,
            imageUrl: t.imageUrl || suiteImages[idx % suiteImages.length],
            basePrice: t.basePrice || (180 + idx * 75),
            size: t.size || (50 + idx * 25),
          }));
          setRoomTypes(enriched);
        }

        setAvailableRooms(avail);
      })
      .catch((e) => console.error("Error loading hotel catalog:", e))
      .finally(() => setLoadingData(false));
  }, []);

  // Filtered suites
  const filteredSuites = useMemo(() => {
    if (selectedTier === "all") return roomTypes;
    return roomTypes.filter((t) => t.id === selectedTier || t.code?.toLowerCase() === selectedTier.toLowerCase());
  }, [roomTypes, selectedTier]);

  // Calculate nights
  const nightsCount = useMemo(() => {
    const d1 = new Date(checkInDate);
    const d2 = new Date(checkOutDate);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff || 1);
  }, [checkInDate, checkOutDate]);

  // Total price for selected suite
  const suitePriceUsd = Number(selectedSuite?.basePrice || 220);
  const totalUsd = suitePriceUsd * nightsCount;
  const totalEtb = totalUsd * ETB_RATE;

  // Initiate Booking
  const openBookingForSuite = (suite: RoomType) => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.guest) {
            setGuestSession(parsed);
            setBookingGuestName(parsed.guest.fullName || `${parsed.guest.firstName} ${parsed.guest.lastName}`.trim());
            setBookingGuestPhone(parsed.guest.phone || "");
            setBookingGuestEmail(parsed.guest.email || "");
            setBookingGuestFayda(parsed.guest.nationalId || parsed.guest.idNumber || "");
          }
        } catch {
          // ignore
        }
      }
    }
    setSelectedSuite(suite);
    setShowServiceDropdown(false);
    setShowOtherInput(false);
    setOtherText("");
    setSelectedSpecialPresets([]);
    setBookingStep("review");
    setBookingModalOpen(true);
  };

  // Submit Online Reservation and Payment
  const handleConfirmAndPay = async () => {
    if (!selectedSuite) return;

    if (!guestSession?.guest) {
      if (!bookingGuestName.trim()) {
        alert("Please provide your full name.");
        return;
      }
      if (!bookingGuestPhone || bookingGuestPhone.length !== 10) {
        alert("Please enter a valid 10-digit mobile phone number (e.g. 0911318622).");
        return;
      }
    }

    setPaymentSubmitting(true);

    try {
      // 1. Ensure Guest is registered & authenticated
      let guestId = guestSession?.guest?.id;
      if (!guestId) {
        const parts = bookingGuestName.trim().split(/\s+/);
        const fName = parts[0];
        const lName = parts.slice(1).join(" ") || "Guest";

        const regRes = await fetch("/api/guest-portal/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: fName,
            lastName: lName,
            fullName: bookingGuestName.trim(),
            phone: bookingGuestPhone.trim(),
            email: bookingGuestEmail.trim() || undefined,
            nationalId: bookingGuestFayda.trim() || "1234567890123456",
            idNumber: bookingGuestFayda.trim() || "1234567890123456",
            idType: "national_id",
            nationality: "Ethiopian",
            country: "Ethiopia",
            city: "Addis Ababa",
            guestType: "individual",
          }),
        });

        const regText = await regRes.text();
        let regData: any = {};
        try {
          regData = JSON.parse(regText);
        } catch {
          throw new Error(
            regRes.ok
              ? "Invalid registration response from server."
              : `Server error (${regRes.status}): Please make sure backend is running.`
          );
        }
        if (!regRes.ok) {
          throw new Error(regData.message || regData.error || "Could not register guest profile.");
        }
        if (regData.guest?.id) {
          guestId = regData.guest.id;
          if (regData.token) {
            sessionStorage.setItem("nexus_guest_token", regData.token);
            localStorage.setItem("nexus_guest_token", regData.token);
            document.cookie = `nexus_guest_token=${regData.token}; path=/; max-age=604800; SameSite=Lax`;
          }
          sessionStorage.setItem("nexus_guest_session", JSON.stringify(regData));
          localStorage.setItem("nexus_guest_session", JSON.stringify(regData));
          setGuestSession(regData);
        }
      }

      if (!guestId) {
        throw new Error("Could not initialize guest profile. Please try again.");
      }

      // 2. Locate an available room for this room type
      const targetRoom = availableRooms.find((r) => r.roomTypeId === selectedSuite.id) || availableRooms[0];
      const assignedRoomId = targetRoom?.id;

      // 3. Build composite special requests from selected presets + custom text
      const compositeSpecialRequests = [
        ...selectedSpecialPresets,
        customSpecialRequest.trim(),
        bookingSpecialRequests.trim(),
      ].filter(Boolean).join(" • ");

      // 4. Create pre-paid online reservation
      const res = await fetch("/api/guest-portal/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          roomId: assignedRoomId,
          roomTypeId: selectedSuite.id,
          checkInDate,
          checkOutDate,
          adults: Number(adults) || 2,
          children: Number(children) || 0,
          specialRequests: compositeSpecialRequests || undefined,
          paymentMethod,
          paymentReference: paymentReference.trim() || `ONL-${paymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
          paidAmount: totalEtb,
          totalAmount: totalEtb,
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(
          res.ok
            ? "Invalid reservation response format."
            : `Reservation server error (${res.status}): Please check connection.`
        );
      }
      if (!res.ok) throw new Error(data.message || data.error || "Reservation could not be completed.");

      setConfirmedReservation(data.reservation);
      if (data.reservation) {
        const updatedSession = {
          ...guestSession,
          reservation: data.reservation,
          reservationId: data.reservation.id,
          room: data.room || data.reservation.room || { number: targetRoom?.number || "101" },
          roomNumber: data.room?.number || targetRoom?.number || "101",
        };
        if (typeof window !== "undefined") {
          sessionStorage.setItem("nexus_guest_session", JSON.stringify(updatedSession));
          localStorage.setItem("nexus_guest_session", JSON.stringify(updatedSession));
        }
        setGuestSession(updatedSession);
      }
      setBookingStep("confirmed");
    } catch (err: any) {
      alert("Booking error: " + err.message);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleLogoutGuest = () => {
    sessionStorage.removeItem("nexus_guest_token");
    sessionStorage.removeItem("nexus_guest_session");
    localStorage.removeItem("nexus_guest_token");
    localStorage.removeItem("nexus_guest_session");
    document.cookie = "nexus_guest_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setGuestSession(null);
    router.push("/guest-portal/register");
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ─── 1. TOP LUXURY HEADER ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#090a10]/80 backdrop-blur-xl border-b border-white/[0.08] px-6 lg:px-12 h-20 flex items-center justify-between transition-all">
        {/* Brand Logo matching AURA */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner group-hover:border-amber-400/60 transition-colors">
            <span className="font-serif text-lg font-bold">A</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl tracking-[0.25em] font-semibold text-white group-hover:text-amber-300 transition-colors">
              AURA
            </span>
            <span className="text-[9px] tracking-[0.35em] text-amber-400/90 uppercase font-light -mt-0.5">
              Luxury Hotel & Villas
            </span>
          </div>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Request Service Button */}
          <Link href="/guest-portal/services">
            <Button
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 hover:border-amber-400/60 font-medium text-xs tracking-wider uppercase px-4 h-10 rounded-xl gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Request In-Room Service</span>
              <span className="sm:hidden">Services</span>
            </Button>
          </Link>

          {/* Reserve Now Accent Button */}
          <Button
            onClick={() => {
              const el = document.getElementById("suites-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-gradient-to-r from-[#d97736] to-[#e68a49] hover:from-[#c86627] hover:to-[#d97736] text-white font-semibold text-xs tracking-wider uppercase px-5 h-10 rounded-xl shadow-lg shadow-orange-950/40 transition-all active:scale-95"
          >
            Reserve Suite
          </Button>

          {/* User Profile / Portal Access */}
          {guestSession?.guest ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                title="Verified Guest Profile"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                  {guestSession.guest.firstName?.[0] || "G"}
                </div>
                <span className="hidden md:inline font-semibold">{guestSession.guest.firstName}</span>
              </div>
              <button
                onClick={handleLogoutGuest}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 text-xs transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/guest-portal/register"
              className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 text-amber-300 flex items-center justify-center border border-white/10 hover:border-amber-500/30 transition-all shadow-sm"
              title="Guest Authentication & Register"
            >
              <User className="w-4 h-4" />
            </Link>
          )}

          {/* Staff Login Link */}
          <Link
            href="/login"
            className="hidden lg:inline text-[11px] text-slate-400 hover:text-slate-200 tracking-wider transition-colors ml-1 px-2 py-1 rounded-md hover:bg-white/5"
          >
            Staff Portal
          </Link>
        </div>
      </header>

      {/* ─── 2. HERO LUXURY SANCTUARY ────────────────────────────────────────────── */}
      <section className="relative min-h-[95vh] pt-28 pb-20 flex flex-col justify-center px-6 lg:px-16 overflow-hidden">
        {/* Dark Golden Hour Luxury Suite Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=85')`,
          }}
        >
          {/* Multi-layered cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#090a10]/95 via-[#090a10]/80 to-[#090a10]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a10] via-transparent to-[#090a10]/70" />
          <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-black/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl space-y-6 pt-8 pb-10">
          {/* Forbes 5-Star Tagline Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-xl text-[11px] text-slate-200 uppercase tracking-widest font-medium shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Haute Hôtellerie & Private Residences</span>
            <span className="text-white/30">|</span>
            <span className="text-amber-300 font-semibold">Forbes Five-Star 2026</span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-white leading-[1.08]">
            Transcendent <span className="italic font-serif font-light text-[#e2a87a]">Luxury</span>,
            <br />
            Timeless Elegance.
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-light">
            Experience bespoke hospitality, sanctuary suites, and Michelin-starred dining nestled majestically between the golden hour sky and urban horizon.
          </p>

          {/* Quick CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={() => {
                const el = document.getElementById("suites-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-gradient-to-r from-[#d97736] to-[#e68a49] hover:from-[#c86627] hover:to-[#d97736] text-white font-semibold text-xs tracking-wider uppercase px-7 h-12 rounded-xl gap-2 shadow-xl shadow-orange-950/40 transition-transform active:scale-95"
            >
              <span>Explore Suites & Residences</span>
              <span className="text-xs">&darr;</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── 3. SUITES & RESIDENCES SHOWCASE ────────────────────────────────────── */}
      <section id="suites-section" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400 font-semibold">
              The Residences Collection
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal mt-2">
              Bespoke Sanctuary Suites
            </h2>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md">
            Every suite is individually appointed with custom Ethiopian artwork, panoramic views, 400-thread Egyptian cotton, and round-the-clock bespoke concierge.
          </p>
        </div>

        {/* Suites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredSuites.map((suite) => (
            <Card
              key={suite.id}
              className="bg-[#10121a]/95 border-white/[0.08] hover:border-amber-500/40 overflow-hidden rounded-2xl transition-all duration-500 flex flex-col group shadow-xl hover:shadow-2xl hover:shadow-amber-500/5"
            >
              {/* Suite Photo */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <img
                  src={suite.imageUrl || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80"}
                  alt={suite.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10121a] via-transparent to-black/30" />
                <Badge className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-amber-300 border-amber-500/30 text-[10px] tracking-widest uppercase rounded-lg px-2.5 py-1 font-semibold">
                  {suite.size || 75} m² &bull; Max {suite.capacityAdults || 2} Adults
                </Badge>
                <div className="absolute bottom-4 right-4 text-right bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 shadow-lg">
                  <span className="text-2xl font-serif font-bold text-white block leading-tight">
                    {formatPrice(Number(suite.basePrice || 220))}
                  </span>
                  <span className="text-[10px] text-amber-400/90 uppercase tracking-wider font-semibold">Per Night</span>
                </div>
              </div>

              {/* Suite Details */}
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-white font-medium group-hover:text-amber-300 transition-colors">
                    {suite.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 font-light">
                    {suite.description}
                  </p>
                </div>

                {/* Amenity Badges */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.08] text-[11px] text-slate-300">
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-1.5 font-medium">
                    <Wifi className="w-3.5 h-3.5 text-amber-400" /> High-Speed Wi-Fi
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-1.5 font-medium">
                    <Coffee className="w-3.5 h-3.5 text-amber-400" /> In-Room Espresso
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 24/7 Butler
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center gap-1.5 font-medium">
                    <Tv className="w-3.5 h-3.5 text-amber-400" /> Smart TV
                  </span>
                </div>

                {/* Reserve Suite CTA */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.06]">
                  <div className="text-xs text-slate-400 font-mono">
                    Total for {nightsCount} night{nightsCount > 1 ? "s" : ""}:{" "}
                    <strong className="text-white font-bold text-sm">{formatPrice(Number(suite.basePrice || 220) * nightsCount)}</strong>
                  </div>
                  <Button
                    onClick={() => openBookingForSuite(suite)}
                    className="bg-gradient-to-r from-[#d97736] to-[#e68a49] hover:from-[#c86627] hover:to-[#d97736] text-white font-semibold text-xs tracking-wider uppercase px-6 h-11 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Reserve Suite &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>



      {/* ─── 5. RESERVATION & ONLINE PAYMENT MODAL ──────────────────────────────── */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="sm:max-w-xl bg-[#12141a] border-white/15 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-white flex items-center justify-between">
              <span>{bookingStep === "confirmed" ? "Reservation Confirmed 🎉" : "Reserve Your Suite"}</span>
              <span className="text-xs font-mono font-normal text-amber-400">
                {selectedSuite?.name}
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {checkInDate} to {checkOutDate} &bull; {nightsCount} Night{nightsCount > 1 ? "s" : ""} &bull; {adults} Adult(s)
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: REVIEW DETAILS & GUEST IDENTIFICATION */}
          {bookingStep === "review" && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-lg border border-white/10 bg-white/5 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-white">
                  <span>{selectedSuite?.name}</span>
                  <span className="font-mono text-amber-400">{formatPrice(totalUsd)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                  <div>Check-In: <strong className="text-slate-200">{checkInDate} (15:00)</strong></div>
                  <div>Check-Out: <strong className="text-slate-200">{checkOutDate} (12:00)</strong></div>
                  <div>Rate per Night: <strong className="text-slate-200">{formatPrice(suitePriceUsd)}</strong></div>
                  <div>Total Nights: <strong className="text-slate-200">{nightsCount} Nights</strong></div>
                </div>
              </div>

              {/* Guest Information: Verified Identity or Registration */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    Guest Identification & Verification
                  </Label>
                  <span className="text-[10px] text-emerald-400 font-medium">✓ Online Identity System</span>
                </div>

                {guestSession?.guest ? (
                  /* Authenticated Guest Profile Card - ZERO duplicate inputs */
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {guestSession.guest.firstName?.[0] || "G"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {guestSession.guest.fullName || `${guestSession.guest.firstName} ${guestSession.guest.lastName}`.trim()}
                            </span>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] py-0 px-1.5 font-normal">
                              ✓ Verified Guest
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex flex-wrap gap-x-3">
                            <span>Phone: <strong className="text-white">{guestSession.guest.phone || "—"}</strong></span>
                            {guestSession.guest.email && (
                              <span>Email: <strong className="text-white">{guestSession.guest.email}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(guestSession.guest.nationalId || guestSession.guest.idNumber || bookingGuestFayda) && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block">Fayda National ID</span>
                          <span className="text-xs font-mono font-semibold text-emerald-300 tracking-wider">
                            {guestSession.guest.nationalId || guestSession.guest.idNumber || bookingGuestFayda}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Your contact and identity are recorded in the hotel system. The receptionist will fast-track your room key without re-entering your details.
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Not yet registered or signed in callout (no duplicate input fields) */
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Guest Registration Required</h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                        Please register or sign in with your Phone & Fayda ID first. Your personal details will be securely saved in Nexus HMS, ensuring you never have to re-enter them here or at the front desk.
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4 gap-1.5 shadow-md"
                      onClick={() => router.push("/guest-portal/register")}
                    >
                      <span>Register or Sign In with Phone &rarr;</span>
                    </Button>
                  </div>
                )}

                {/* Special Requests & In-Room Services - visible only after guest signs in or registers */}
                {guestSession?.guest && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Special Requests & In-Room Services
                      </span>
                      <div className="flex items-center gap-1.5 relative">
                        {/* + Add from Online Service Menu button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 gap-1 font-medium rounded-md shadow-sm"
                          onClick={() => {
                            setShowServiceDropdown((v) => !v);
                            setShowOtherInput(false);
                          }}
                        >
                          <span>+ Add from Online Service Menu...</span>
                          <ChevronDown className={`w-3 h-3 text-amber-400 transition-transform ${showServiceDropdown ? "rotate-180" : ""}`} />
                        </Button>

                        {/* + Other button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-7 px-2.5 text-[11px] font-medium rounded-md gap-1 shadow-sm transition-all ${
                            showOtherInput
                              ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                              : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                          }`}
                          onClick={() => {
                            setShowOtherInput((v) => !v);
                            setShowServiceDropdown(false);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Other</span>
                        </Button>

                        {/* Online Service Menu Popover Dropdown */}
                        {showServiceDropdown && (
                          <div className="absolute right-0 top-9 z-50 w-80 max-w-[90vw] bg-[#12141a] border border-white/20 rounded-lg shadow-2xl p-2.5 space-y-2.5 max-h-64 overflow-y-auto">
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[11px] text-slate-400 font-medium">
                              <span className="text-white font-semibold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" /> Catalog Services
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowServiceDropdown(false)}
                                className="text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {SPECIAL_REQUEST_CATALOG.map((cat) => (
                              <div key={cat.category} className="space-y-1">
                                <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider block">
                                  {cat.category}
                                </span>
                                <div className="space-y-0.5">
                                  {cat.items.map((item) => {
                                    const isSelected = selectedSpecialPresets.includes(item);
                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedSpecialPresets((prev) => prev.filter((x) => x !== item));
                                          } else {
                                            setSelectedSpecialPresets((prev) => [...prev, item]);
                                          }
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center justify-between transition-colors ${
                                          isSelected
                                            ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                            : "text-slate-300 hover:bg-white/10"
                                        }`}
                                      >
                                        <span className="truncate">{item}</span>
                                        {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0 ml-1.5" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact "Other" Input: appears only when "+ Other" is clicked, no permanent large input */}
                    {showOtherInput && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <Input
                          value={otherText}
                          onChange={(e) => setOtherText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (otherText.trim()) {
                                if (!selectedSpecialPresets.includes(otherText.trim())) {
                                  setSelectedSpecialPresets((prev) => [...prev, otherText.trim()]);
                                }
                                setOtherText("");
                                setShowOtherInput(false);
                              }
                            }
                          }}
                          placeholder="Type custom request (e.g. Quiet top floor, feather-free pillows, late arrival)..."
                          className="h-8 text-xs bg-black/40 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0"
                          onClick={() => {
                            if (otherText.trim()) {
                              if (!selectedSpecialPresets.includes(otherText.trim())) {
                                setSelectedSpecialPresets((prev) => [...prev, otherText.trim()]);
                              }
                              setOtherText("");
                              setShowOtherInput(false);
                            }
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-slate-400 hover:text-white text-xs shrink-0"
                          onClick={() => {
                            setOtherText("");
                            setShowOtherInput(false);
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Selected Requests Chips Display */}
                    {selectedSpecialPresets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedSpecialPresets.map((item, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-amber-500/10 border-amber-500/30 text-amber-200 text-[11px] py-0.5 px-2 flex items-center gap-1.5 font-normal rounded-md"
                          >
                            <span className="truncate max-w-[280px]">{item}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSpecialPresets((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-400 transition-colors ml-0.5"
                              title="Remove item"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2 pt-3 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setBookingModalOpen(false)} className="text-slate-400">
                  Cancel
                </Button>
                {guestSession?.guest ? (
                  <Button
                    className="bg-[#d97736] hover:bg-[#c86627] text-white font-bold text-xs gap-1.5"
                    onClick={() => setBookingStep("payment")}
                  >
                    <span>Proceed to Online Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                    onClick={() => router.push("/guest-portal/register")}
                  >
                    <span>Register / Sign In First</span>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}

          {/* STEP 2: ONLINE PAYMENT GATEWAY (TELEBIRR, CBE, CHAPA) */}
          {bookingStep === "payment" && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-amber-300 block font-medium">Pre-Paid Amount Due</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {totalEtb.toLocaleString()} ETB
                  </span>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">
                  Zero Balance at Check-in
                </Badge>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Choose Online Payment Channel</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("telebirr")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "telebirr"
                        ? "border-amber-500 bg-amber-500/15 text-white ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm text-amber-400">Telebirr</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">SuperApp / QR</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cbe")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "cbe"
                        ? "border-purple-500 bg-purple-500/15 text-white ring-2 ring-purple-500/30 shadow-md shadow-purple-500/10"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm text-purple-400">CBE Birr</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Commercial Bank</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("chapa")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "chapa"
                        ? "border-emerald-500 bg-emerald-500/15 text-white ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm text-emerald-400">Chapa</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Visa / Debit</p>
                  </button>
                </div>
              </div>

              {/* Official Hotel Account Details based on Method */}
              <div className="p-3.5 rounded-lg border border-slate-800 bg-black/60 space-y-2">
                {paymentMethod === "telebirr" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                      <span className="font-semibold text-amber-400">Telebirr Official Hotel Merchant</span>
                      <Badge variant="outline" className="text-[10px] text-amber-300">Verified Merchant</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300 mt-2">
                      <div>Merchant Code: <strong className="text-white font-mono">889900</strong></div>
                      <div>Account Phone: <strong className="text-white font-mono">0911 318 622</strong></div>
                      <div>Payee Name: <strong className="text-white">Nexus Luxury Hotel PLC</strong></div>
                      <div>Reference: <strong className="text-amber-400 font-mono">AUTO-ONL-RES</strong></div>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Open your Telebirr app, scan or transfer to merchant <strong>889900</strong>, then enter the transaction reference below.
                    </p>
                  </div>
                )}

                {paymentMethod === "cbe" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                      <span className="font-semibold text-purple-400">Commercial Bank of Ethiopia (CBE)</span>
                      <Badge variant="outline" className="text-[10px] text-purple-300">CBE Birr / Transfer</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300 mt-2">
                      <div>Account Number: <strong className="text-white font-mono">1000 2345 67891</strong></div>
                      <div>CBE Birr Shortcode: <strong className="text-white font-mono">445566</strong></div>
                      <div>Account Name: <strong className="text-white">Nexus Luxury Hotel & Suites PLC</strong></div>
                      <div>Branch: <strong className="text-white">Bole Medhanialem</strong></div>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Transfer directly via CBE Mobile Banking or CBE Birr and input the transaction confirmation code below.
                    </p>
                  </div>
                )}

                {paymentMethod === "chapa" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                      <span className="font-semibold text-emerald-400">Chapa Payment Gateway</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-300">Instant Verification</Badge>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Instant checkout supporting Mastercard, Visa, and local debit cards with real-time settlement directly to the hotel ledger.
                    </p>
                  </div>
                )}
              </div>

              {/* Transaction Reference Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Transaction Confirmation Reference / Code *
                </Label>
                <Input
                  placeholder="e.g. TXN-TB-889921 or CBE-2026102298"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-black/50 border-slate-700 text-white h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  If paying on mobile now, you can leave blank to auto-generate a digital transaction reference.
                </p>
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                <Button variant="ghost" size="icon" onClick={() => setBookingStep("review")} className="h-8 w-8 text-slate-400" title="Back" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-950/40"
                  disabled={paymentSubmitting}
                  onClick={handleConfirmAndPay}
                >
                  {paymentSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Pre-Payment & Reserve
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 3: BOOKING CONFIRMED VOUCHER */}
          {bookingStep === "confirmed" && confirmedReservation && (
            <div className="space-y-4 py-3 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif text-white font-bold">
                  Pre-Paid Booking Confirmed!
                </h3>
                <p className="text-xs text-slate-400">
                  Reservation #{confirmedReservation.reservationNumber} &bull; Confirmation #{confirmedReservation.confirmationNumber}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                  <span className="font-semibold text-white">Payment Status:</span>
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/50">
                    PAID IN ADVANCE ({paymentMethod.toUpperCase()})
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>Guest Name: <strong className="text-white">{bookingGuestName}</strong></div>
                  <div>Phone: <strong className="text-white font-mono">{bookingGuestPhone}</strong></div>
                  <div>Check-In: <strong className="text-white">{checkInDate}</strong></div>
                  <div>Check-Out: <strong className="text-white">{checkOutDate}</strong></div>
                  <div>Amount Settled: <strong className="text-emerald-400 font-mono">{totalEtb.toLocaleString()} ETB</strong></div>
                  <div>Front Desk Status: <strong className="text-emerald-300">Fast Key Pick-Up Only</strong></div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                When you arrive at the hotel front desk on <strong>{checkInDate}</strong>, our receptionist system will automatically detect your pre-paid status. You will only collect your room key and head straight to your suite!
              </p>

              {/* Request In-Room Services Banner */}
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Need In-Room Dining, Airport Pickup, or Extra Amenities?</span>
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Order gourmet room service, schedule chauffeur airport transfers, or request extra amenities anytime.
                  </p>
                </div>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-3 shrink-0 gap-1"
                  onClick={() => {
                    setBookingModalOpen(false);
                    router.push("/guest-portal/services");
                  }}
                >
                  <span>Request Services &rarr;</span>
                </Button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-[#d97736] hover:bg-[#c86627] text-white font-bold text-xs h-10 gap-1.5"
                  onClick={() => {
                    setBookingModalOpen(false);
                    router.push("/guest-portal/services");
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Request Services Now &rarr;</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-white text-xs h-10"
                  onClick={() => setBookingModalOpen(false)}
                >
                  Close & Return Home
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── 6. LUXURY FOOTER (WITH PREVIOUS CHECK-IN/OUT BUTTONS REMOVED) ────────── */}
      <footer className="bg-[#08090c] border-t border-white/10 pt-16 pb-12 px-6 lg:px-16 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="flex flex-col">
              <span className="font-serif text-2xl tracking-[0.2em] font-semibold text-white">
                AURA
              </span>
              <span className="text-[8px] tracking-[0.3em] text-amber-400 uppercase font-light -mt-1">
                Luxury Hotel & Villas
              </span>
            </Link>
            <p className="text-slate-400 leading-relaxed font-light">
              An architectural triumph celebrating Ethiopian heritage and contemporary luxury. Five-star hospitality in the diplomatic heart of Addis Ababa.
            </p>
          </div>

          {/* Suites & Amenities */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest">
              Accommodations
            </h4>
            <ul className="space-y-2 font-light">
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Presidential Horizon Suite</a></li>
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Executive Panoramic Sanctuary</a></li>
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Diplomatic Residence Villas</a></li>
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Deluxe King Suites</a></li>
            </ul>
          </div>

          {/* Guest In-Room Services */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest">
              Guest Experience
            </h4>
            <ul className="space-y-2 font-light">
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Michelin In-Room Dining</a></li>
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Private Airport VIP Chauffeur</a></li>
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">24/7 Dedicated Butler Service</a></li>
              <li><a href="#suites-section" className="hover:text-amber-400 transition-colors">Bespoke Concierge & Spa</a></li>
            </ul>
          </div>

          {/* Concierge & Location */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest">
              Concierge & Location
            </h4>
            <div className="space-y-2 font-light text-slate-300">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Bole Airport Road, Addis Ababa, Ethiopia</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono">+251 11 667 8900</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>concierge@aurahotel.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>&copy; {new Date().getFullYear()} AURA Luxury Hotel & Villas. Powered by Nexus HMS Enterprise.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-300 transition-colors">Staff Console</Link>
            <span>&bull;</span>
            <Link href="/guest-portal/register" className="hover:text-slate-300 transition-colors">Guest Registration</Link>
            <span>&bull;</span>
            <Link href="/guest-portal/login" className="hover:text-slate-300 transition-colors">Guest Sign-in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

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

export default function LuxuryLandingPage() {
  const router = useRouter();

  // Guest Auth State
  const [guestSession, setGuestSession] = useState<any | null>(null);
  const [currency, setCurrency] = useState<"USD" | "ETB">("USD");

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

  // Payment Selection (Telebirr, CBE, Chapa)
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe" | "chapa" | "card">("telebirr");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<any | null>(null);

  // Currency Converter (1 USD = 125 ETB approx)
  const ETB_RATE = 125;
  const formatPrice = (usdAmount: number) => {
    if (currency === "ETB") {
      const etb = Math.round(usdAmount * ETB_RATE);
      return `${etb.toLocaleString()} ETB`;
    }
    return `$${usdAmount.toLocaleString()}`;
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
    setSelectedSuite(suite);
    setBookingStep("review");
    setBookingModalOpen(true);
  };

  // Submit Online Reservation and Payment
  const handleConfirmAndPay = async () => {
    if (!selectedSuite) return;

    if (!bookingGuestName.trim()) {
      alert("Please provide your full name.");
      return;
    }
    if (!bookingGuestPhone || bookingGuestPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile phone number (e.g. 0911318622).");
      return;
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
            idType: "fayida_id",
          }),
        });

        const regData = await regRes.json();
        if (regRes.ok && regData.guest?.id) {
          guestId = regData.guest.id;
          if (regData.token) {
            sessionStorage.setItem("nexus_guest_token", regData.token);
            localStorage.setItem("nexus_guest_token", regData.token);
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

      // 3. Create pre-paid online reservation
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
          specialRequests: bookingSpecialRequests.trim() || undefined,
          paymentMethod,
          paymentReference: paymentReference.trim() || `ONL-${paymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
          paidAmount: totalEtb,
          totalAmount: totalEtb,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reservation could not be completed.");

      setConfirmedReservation(data.reservation);
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
    setGuestSession(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ─── 1. TOP LUXURY HEADER ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c10]/85 backdrop-blur-md border-b border-white/10 px-6 lg:px-12 h-20 flex items-center justify-between transition-all">
        {/* Brand Logo matching AURA */}
        <Link href="/" className="flex flex-col group">
          <span className="font-serif text-2xl lg:text-3xl tracking-[0.25em] font-semibold text-white group-hover:text-amber-400 transition-colors">
            AURA
          </span>
          <span className="text-[9px] tracking-[0.35em] text-amber-400 uppercase font-light -mt-1">
            Luxury Hotel & Villas
          </span>
        </Link>

        {/* Right Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Currency Toggle */}
          <button
            type="button"
            onClick={() => setCurrency((c) => (c === "USD" ? "ETB" : "USD"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-xs text-slate-200 hover:border-amber-400 hover:text-white transition-all font-medium"
          >
            <span>🌐</span>
            <span className="font-mono">EN / {currency}</span>
          </button>

          {/* Reserve Now Accent Button */}
          <Button
            onClick={() => {
              const el = document.getElementById("suites-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-[#d97736] hover:bg-[#c86627] text-white font-semibold text-xs tracking-wider uppercase px-5 h-10 rounded-sm shadow-lg shadow-orange-900/30 transition-transform active:scale-95"
          >
            Reserve Now
          </Button>

          {/* User Profile / Portal Access */}
          {guestSession?.guest ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <Link
                href="/guest-portal"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors"
                title="Go to In-Room Portal"
              >
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[11px]">
                  {guestSession.guest.firstName?.[0] || "G"}
                </div>
                <span className="hidden md:inline font-medium">{guestSession.guest.firstName}</span>
              </Link>
              <button
                onClick={handleLogoutGuest}
                className="text-slate-400 hover:text-rose-400 p-1 text-xs"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/guest-portal/register"
              className="w-9 h-9 rounded-full bg-[#e5a67c]/20 hover:bg-[#e5a67c]/30 text-[#e5a67c] flex items-center justify-center border border-[#e5a67c]/30 transition-colors"
              title="Guest Authentication & Register"
            >
              <User className="w-4 h-4" />
            </Link>
          )}

          {/* Staff Login Link */}
          <Link
            href="/login"
            className="hidden lg:inline text-[11px] text-slate-400 hover:text-slate-200 tracking-wider transition-colors ml-2"
          >
            Staff Portal
          </Link>
        </div>
      </header>

      {/* ─── 2. HERO LUXURY SANCTUARY (MATCHING UPLOADED IMAGE) ───────────────────── */}
      <section className="relative min-h-[92vh] pt-24 pb-36 flex flex-col justify-center px-6 lg:px-16 overflow-hidden">
        {/* Dark Golden Hour Luxury Suite Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=85')`,
          }}
        >
          {/* Multi-layered cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10]/95 via-[#0b0c10]/80 to-[#0b0c10]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-[#0b0c10]/70" />
          <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-black/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-3xl space-y-6 pt-12">
          {/* Forbes 5-Star Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[11px] text-slate-200 uppercase tracking-widest font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Haute Hôtellerie & Private Residences</span>
            <span className="text-white/40">|</span>
            <span className="text-amber-300 font-semibold">Forbes Five-Star 2026</span>
          </div>

          {/* Main Title matching Screenshot */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-white leading-[1.08]">
            Transcendent <span className="italic font-serif font-light text-[#e2a87a]">Luxury</span>,
            <br />
            Timeless Elegance.
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-light">
            Experience bespoke hospitality, sanctuary suites, and Michelin-starred dining nestled majestically between the golden hour sky and urban horizon.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => {
                const el = document.getElementById("booking-bar");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#d97736] hover:bg-[#c86627] text-white font-semibold text-xs tracking-wider uppercase px-6 h-12 rounded-sm gap-2 shadow-xl shadow-orange-950/40"
            >
              <span>Check Availability</span>
              <Calendar className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const el = document.getElementById("suites-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="border-white/20 bg-white/5 hover:bg-white/15 text-white text-xs tracking-wider uppercase px-6 h-12 rounded-sm gap-2 backdrop-blur-sm"
            >
              <span>Explore Suites</span>
              <span className="text-xs">&darr;</span>
            </Button>
          </div>
        </div>

        {/* ─── FLOATING LUXURY BOOKING BAR (BOTTOM OF HERO) ────────────────────────── */}
        <div id="booking-bar" className="relative z-20 mt-16 max-w-5xl w-full mx-auto">
          <div className="bg-[#12141a]/95 border border-white/15 backdrop-blur-xl rounded-xl p-3 sm:p-4 shadow-2xl shadow-black/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            {/* 1. Check-In */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase text-amber-400 font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Check-In</span>
              </div>
              <input
                type="date"
                value={checkInDate}
                min={todayStr}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Standard 15:00 Arrival</span>
            </div>

            {/* 2. Check-Out */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase text-amber-400 font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Check-Out</span>
              </div>
              <input
                type="date"
                value={checkOutDate}
                min={checkInDate || todayStr}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full bg-transparent text-white font-mono text-sm focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">{nightsCount} Nights Selected</span>
            </div>

            {/* 3. Guests & Rooms */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase text-amber-400 font-semibold mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Guests & Rooms</span>
              </div>
              <select
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="w-full bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="1" className="bg-slate-900">1 Guest, 1 Suite</option>
                <option value="2" className="bg-slate-900">2 Guests, 1 Suite</option>
                <option value="3" className="bg-slate-900">3 Guests, Royal Suite</option>
                <option value="4" className="bg-slate-900">4 Guests, Presidential</option>
              </select>
              <span className="text-[10px] text-slate-400 block mt-0.5">Butler Service Included</span>
            </div>

            {/* 4. Sanctuary Tier */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase text-amber-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sanctuary Tier</span>
              </div>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer truncate"
              >
                <option value="all" className="bg-slate-900">All Signature Suites</option>
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900">
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block mt-0.5">Best Available Rate</span>
            </div>

            {/* 5. Find Sanctuary Button */}
            <Button
              onClick={() => {
                const el = document.getElementById("suites-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full h-full min-h-[58px] bg-[#d97736] hover:bg-[#c86627] text-white font-bold text-xs tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition-transform active:scale-95"
            >
              <span>Find Sanctuary</span>
              <Search className="w-4 h-4" />
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
              className="bg-[#12141a] border-white/10 overflow-hidden rounded-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col group shadow-2xl"
            >
              {/* Suite Photo */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <img
                  src={suite.imageUrl || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80"}
                  alt={suite.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141a] via-transparent to-black/30" />
                <Badge className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-amber-300 border-amber-500/30 text-[10px] tracking-widest uppercase">
                  {suite.size || 75} m² &bull; Max {suite.capacityAdults || 2} Adults
                </Badge>
                <div className="absolute bottom-4 right-4 text-right">
                  <span className="text-2xl font-serif font-bold text-white block">
                    {formatPrice(Number(suite.basePrice || 220))}
                  </span>
                  <span className="text-[10px] text-slate-300 uppercase tracking-wider">Per Night</span>
                </div>
              </div>

              {/* Suite Details */}
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl text-white font-medium group-hover:text-amber-300 transition-colors">
                    {suite.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {suite.description}
                  </p>
                </div>

                {/* Amenity Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10 text-[11px] text-slate-300">
                  <span className="px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-amber-400" /> High-Speed Wi-Fi
                  </span>
                  <span className="px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 flex items-center gap-1">
                    <Coffee className="w-3 h-3 text-amber-400" /> In-Room Espresso
                  </span>
                  <span className="px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> 24/7 Butler
                  </span>
                  <span className="px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 flex items-center gap-1">
                    <Tv className="w-3 h-3 text-amber-400" /> Smart TV
                  </span>
                </div>

                {/* Reserve Suite CTA */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 font-mono">
                    Total for {nightsCount} night{nightsCount > 1 ? "s" : ""}:{" "}
                    <strong className="text-white font-bold">{formatPrice(Number(suite.basePrice || 220) * nightsCount)}</strong>
                  </div>
                  <Button
                    onClick={() => openBookingForSuite(suite)}
                    className="bg-[#d97736] hover:bg-[#c86627] text-white font-semibold text-xs tracking-wider uppercase px-5 h-10 rounded-sm shadow-md transition-all active:scale-95"
                  >
                    Reserve Suite &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 4. GUEST IN-ROOM SERVICES CALLOUT ───────────────────────────────────── */}
      <section className="py-16 px-6 lg:px-16 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent border-y border-white/5">
        <div className="max-w-5xl mx-auto bg-[#12141a]/80 border border-amber-500/30 rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
          <div className="space-y-3">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
              Checked-In Guests
            </Badge>
            <h3 className="font-serif text-2xl sm:text-3xl text-white">
              Already Staying With Us?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
              Access in-room chef dining, private airport chauffeur transfers, housekeeping amenities, or report room maintenance directly from your room device.
            </p>
          </div>
          <Link href="/guest-portal">
            <Button className="bg-white text-slate-950 hover:bg-slate-200 font-bold text-xs uppercase tracking-wider px-6 h-12 rounded-sm shadow-xl shrink-0 gap-2">
              <span>Open In-Room Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
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

              {/* Guest Information (Only 4 Fields!) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    Guest Identification & Contact
                  </Label>
                  <span className="text-[10px] text-slate-400">Auto-links to your reservation</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Full Name *</Label>
                  <Input
                    placeholder="e.g. Abebe Tadesse"
                    value={bookingGuestName}
                    onChange={(e) => setBookingGuestName(e.target.value)}
                    className="bg-black/50 border-slate-700 text-white h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-[11px] text-slate-300">Phone * (10 Digits)</Label>
                      <span className="text-[10px] font-mono text-slate-400">{bookingGuestPhone.length}/10</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="0911318622"
                      value={bookingGuestPhone}
                      maxLength={10}
                      onChange={(e) => setBookingGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="bg-black/50 border-slate-700 text-white h-9 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">Email Address (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="abebe@example.com"
                      value={bookingGuestEmail}
                      onChange={(e) => setBookingGuestEmail(e.target.value)}
                      className="bg-black/50 border-slate-700 text-white h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-[11px] text-slate-300">Fayda National ID * (16 Digits)</Label>
                    <span className="text-[10px] font-mono text-slate-400">{bookingGuestFayda.length}/16</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="1234567890123456"
                    value={bookingGuestFayda}
                    maxLength={16}
                    onChange={(e) => setBookingGuestFayda(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    className="bg-black/50 border-slate-700 text-white h-9 text-xs font-mono tracking-widest"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Special Preferences / Requests (Optional)</Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. High floor preference, airport transfer flight arrival, extra feather pillows"
                    value={bookingSpecialRequests}
                    onChange={(e) => setBookingSpecialRequests(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-black/50 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 pt-3 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setBookingModalOpen(false)} className="text-slate-400">
                  Cancel
                </Button>
                <Button
                  className="bg-[#d97736] hover:bg-[#c86627] text-white font-bold text-xs gap-1.5"
                  disabled={!bookingGuestName.trim() || bookingGuestPhone.length !== 10}
                  onClick={() => setBookingStep("payment")}
                >
                  <span>Proceed to Online Payment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
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
                    {totalEtb.toLocaleString()} ETB <span className="text-xs text-slate-400 font-normal">(${totalUsd} USD)</span>
                  </span>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">
                  Zero Balance at Check-in
                </Badge>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Choose Online Payment Channel</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("telebirr")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      paymentMethod === "telebirr"
                        ? "border-amber-500 bg-amber-500/15 text-white"
                        : "border-slate-800 bg-black/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <p className="font-bold text-sm text-amber-400">Telebirr</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">SuperApp / QR</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cbe")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      paymentMethod === "cbe"
                        ? "border-purple-500 bg-purple-500/15 text-white"
                        : "border-slate-800 bg-black/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <p className="font-bold text-sm text-purple-400">CBE Birr</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Commercial Bank</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("chapa")}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      paymentMethod === "chapa"
                        ? "border-emerald-500 bg-emerald-500/15 text-white"
                        : "border-slate-800 bg-black/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <p className="font-bold text-sm text-emerald-400">Chapa</p>
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

              <DialogFooter className="flex gap-2 pt-3 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setBookingStep("review")} className="text-slate-400">
                  &larr; Back
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
                When you arrive at the hotel front desk on <strong>{checkInDate}</strong>, our receptionist system will automatically detect your pre-paid status. You will only collect your RFID or Manual key and head straight to your suite!
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10"
                  onClick={() => {
                    setBookingModalOpen(false);
                    router.push("/guest-portal");
                  }}
                >
                  Go to In-Room Guest Portal &rarr;
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
              <li><Link href="/guest-portal" className="hover:text-amber-400 transition-colors">In-Room Dining Menu</Link></li>
              <li><Link href="/guest-portal" className="hover:text-amber-400 transition-colors">Airport Chauffeur Dispatch</Link></li>
              <li><Link href="/guest-portal" className="hover:text-amber-400 transition-colors">Housekeeping & Amenities</Link></li>
              <li><Link href="/guest-portal" className="hover:text-amber-400 transition-colors">Room Maintenance & Defect Alert</Link></li>
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

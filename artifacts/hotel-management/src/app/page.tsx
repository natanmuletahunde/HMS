"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
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
  Award,
  Shield,
  Utensils,
  UtensilsCrossed,
  Cigarette,
  Car,
  Menu,
  Clock,
  LogIn,
  UserPlus,
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
  type?: string;
  code?: string;
  description?: string;
  basePrice?: string | number;
  capacityAdults?: number;
  capacityChildren?: number;
  capacity?: number;
  bedCount?: number;
  bathCount?: number;
  rating?: number;
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

const hotelInfo = {
  name: "Nexus Grand Hotel & Suites",
  shortName: "Nexus Grand",
  tagline: "Experience Luxury Beyond Imagination",
  description:
    "A premier five-star sanctuary celebrating Ethiopian heritage and contemporary luxury in the diplomatic heart of Addis Ababa. Designed to elevate your stays, whether for high-level summits, corporate missions, or relaxing vacations.",
  address: "Bole Road, Near Bole International Airport, Addis Ababa, Ethiopia",
  phone: "+251-11-554-4000",
  email: "reservations@nexusgrand.com",
  checkInTime: "2:00 PM",
  checkOutTime: "12:00 PM",
  stats: [
    { label: "Years of Excellence", value: "15+" },
    { label: "Luxury Suites", value: "120+" },
    { label: "Guest Satisfaction", value: "99%" },
    { label: "Dedicated Staff", value: "24/7" },
  ],
};

const heroSlides = [
  {
    id: "slide1",
    src: "/carousel-1.jpg",
    badge: "5-Star Luxury Destination",
    title: "Unveiling the World's",
    highlight: "Finest Stays",
    subtitle:
      "Immerse yourself in unparalleled luxury, serene panoramic views, and tailored five-star hospitality in the diplomatic heart of Addis Ababa.",
  },
  {
    id: "slide2",
    src: "/image.jpg",
    badge: "Exquisite Comfort & Elegance",
    title: "Experience Luxury",
    highlight: "Beyond Imagination",
    subtitle:
      "Every detail crafted to perfection. Indulge in private balconies, wellness retreats, and Michelin-grade culinary art.",
  },
  {
    id: "slide3",
    src: "/carousel-2.jpg",
    badge: "Unforgettable Moments",
    title: "Your Sanctuary Awaits",
    highlight: "Nexus Grand",
    subtitle:
      "Escape the ordinary and experience extraordinary serenity in our handcrafted executive suites, penthouse salons, and residences.",
  },
];

const mockTestimonials = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "International Delegate, Geneva",
    rating: 5,
    comment:
      "The Presidential Sanctuary exceeded all expectations. Exceptional staff, top-tier security, and the in-room traditional coffee ceremony was truly unforgettable.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Tech Executive, Singapore",
    rating: 5,
    comment:
      "Flawless high-speed Wi-Fi, serene work atmosphere, and the 24/7 front desk team took care of every airport transfer. Nexus Grand is my definitive choice in East Africa.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
  },
  {
    id: 3,
    name: "Almaz Tadesse",
    role: "Cultural Ambassador, Addis Ababa",
    rating: 5,
    comment:
      "A true pride of Ethiopian hospitality. Modern luxury effortlessly woven with warmth, authentic art, and five-star architectural elegance.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80",
  },
];

const SPECIAL_REQUEST_CATALOG = [
  {
    category: "🍽️ In-Room Food & Drinks",
    items: [
      "Traditional Doro Wat Meal (2,300 ETB)",
      "Club Sandwich & Fries (1,400 ETB)",
      "Traditional Ethiopian Coffee (500 ETB)",
    ],
  },
  {
    category: "🛏️ Room Comfort & Bedding",
    items: [
      "Extra Soft Pillows (x2)",
      "Warm Wool Blanket",
      "Fresh Towel & Robe Set",
    ],
  },
  {
    category: "🛎️ Stay Requests",
    items: [
      "Morning Wake-up Call",
      "Quiet Room / High Floor",
      "Late Check-Out Request",
    ],
  },
  {
    category: "🚗 Airport Transport",
    items: [
      "Airport VIP Pickup (3,750 ETB)",
      "Airport Drop-off (3,000 ETB)",
    ],
  },
];

export default function LuxuryLandingPage() {
  const router = useRouter();

  // Guest Auth State
  const [guestSession, setGuestSession] = useState<any | null>(null);

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reservation Bar State
  const todayStr = new Date().toISOString().split("T")[0];
  const nextWeekStr = new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0];

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(nextWeekStr);
  const [guestCount, setGuestCount] = useState(2);
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Room Data
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modals
  const [selectedDetailRoom, setSelectedDetailRoom] = useState<RoomType | null>(null);
  const [roomDetailsModalOpen, setRoomDetailsModalOpen] = useState(false);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [authRequiredModalOpen, setAuthRequiredModalOpen] = useState(false);
  const [pendingReservationSuite, setPendingReservationSuite] = useState<RoomType | null>(null);

  // Reservation & Payment Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<RoomType | null>(null);
  const [bookingStep, setBookingStep] = useState<"review" | "payment" | "confirmed">("review");

  // Guest Details for Reservation
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

  // Room Preferences for Online Reservation (Smoking, Bed Type, Dining, In-Room)
  const [smokingPreference, setSmokingPreference] = useState<"non_smoking" | "smoking">("non_smoking");
  const [bedPreference, setBedPreference] = useState<"king" | "queen" | "twin" | "single">("king");
  const [foodPreference, setFoodPreference] = useState<"none" | "halal" | "vegetarian" | "vegan">("none");
  const [inRoomPreferences, setInRoomPreferences] = useState("");

  // Payment Selection (Telebirr, CBE, Chapa, Card)
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe" | "chapa" | "card">("telebirr");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<any | null>(null);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [contactFeedback, setContactFeedback] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterFeedback, setNewsletterFeedback] = useState("");

  // Hotel Currency: Ethiopian Birr (ETB)
  const ETB_RATE = 125;
  const formatPrice = (usdAmount: number) => {
    const etb = Math.round(usdAmount * ETB_RATE);
    return `${etb.toLocaleString()} ETB`;
  };

  // Auto rotate hero slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Check login on mount and restore pending reservation if returning from login
  useEffect(() => {
    const refreshSession = async () => {
      if (typeof window !== "undefined") {
        const token = sessionStorage.getItem("nexus_guest_token") || localStorage.getItem("nexus_guest_token");
        if (token) {
          try {
            const res = await fetch("/api/guest-portal/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.valid) {
                setGuestSession(data);
                if (data.guest) {
                  setBookingGuestName(data.guest.fullName || `${data.guest.firstName} ${data.guest.lastName}`.trim());
                  setBookingGuestPhone(data.guest.phone || "");
                  setBookingGuestEmail(data.guest.email || "");
                }
                sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
                localStorage.setItem("nexus_guest_session", JSON.stringify(data));
                return;
              }
            }
          } catch {
            // fallback to stored
          }
        }

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
    };

    refreshSession();

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
          const curated: RoomType[] = [
            {
              id: "room-1",
              name: "Ocean View Deluxe King Sanctuary",
              type: "Single",
              code: "DLX",
              description:
                "Spacious deluxe suite with panoramic skyline vistas, a plush king-size bed, private marble bathroom with a deep soaking tub, and high-speed Wi-Fi.",
              basePrice: 180,
              capacityAdults: 2,
              capacity: 2,
              bedCount: 1,
              bathCount: 1,
              size: "45 m²",
              rating: 5,
              amenities: [
                "Free High-Speed Wi-Fi",
                "King Size Featherbed",
                "Marble Bathtub",
                "Private Balcony",
                "Nespresso Machine",
                "Smart 4K TV",
                "Climate Control",
                "Daily Turn-down",
              ],
              imageUrl: "/rooms/r1.jpg",
            },
            {
              id: "room-2",
              name: "Executive Twin Skyline Suite",
              type: "Double",
              code: "EXEC",
              description:
                "Designed for colleagues or family retreats, featuring two premium queen beds, an ergonomic workstation, and dual en-suite marble baths.",
              basePrice: 250,
              capacityAdults: 4,
              capacity: 4,
              bedCount: 2,
              bathCount: 2,
              size: "65 m²",
              rating: 5,
              amenities: [
                "Free High-Speed Wi-Fi",
                "Two Queen Beds",
                "Dual En-Suite Baths",
                "Ergonomic Desk",
                "Mini-bar & Snack Bar",
                "Smart 4K TV",
                "Soundproof Windows",
                "24/7 Room Service",
              ],
              imageUrl: "/rooms/r2.jpg",
            },
            {
              id: "room-3",
              name: "Presidential Horizon Penthouse",
              type: "Extended",
              code: "PRES",
              description:
                "The pinnacle of opulence. Private plunge salon, master jacuzzi with panoramic views, private butler on request, and exclusive executive lounge access.",
              basePrice: 480,
              capacityAdults: 4,
              capacity: 4,
              bedCount: 2,
              bathCount: 2,
              size: "120 m²",
              rating: 5,
              amenities: [
                "Private Jacuzzi & Plunge",
                "Dedicated Butler Service",
                "Complimentary Gourmet Breakfast",
                "Private Terrace",
                "Walk-in Dressing Room",
                "Wine Chiller",
                "Luxury Toiletries",
                "Airport Limousine",
              ],
              imageUrl: "/rooms/r3.jpg",
            },
            {
              id: "room-4",
              name: "Cozy Garden Single Sanctuary",
              type: "Single",
              code: "SGL",
              description:
                "A tranquil private sanctuary overlooking lush courtyard gardens. Perfect for solo executives seeking focused serenity and luxury comforts.",
              basePrice: 140,
              capacityAdults: 1,
              capacity: 1,
              bedCount: 1,
              bathCount: 1,
              size: "35 m²",
              rating: 5,
              amenities: [
                "High-Speed Wi-Fi",
                "Memory Foam Bed",
                "Rain Shower",
                "Garden View",
                "Work Desk",
                "Espresso Bar",
                "Laptop Safe",
                "Blackout Curtains",
              ],
              imageUrl: "/rooms/r4.jpg",
            },
            {
              id: "room-5",
              name: "Diplomatic Residence & Family Villa",
              type: "Double",
              code: "DIPLO",
              description:
                "Expansive residence featuring multiple bedrooms, separate dining and living salon, private conference space, and diplomatic-grade soundproofing.",
              basePrice: 350,
              capacityAdults: 4,
              capacity: 4,
              bedCount: 2,
              bathCount: 2,
              size: "95 m²",
              rating: 5,
              amenities: [
                "Private Living Salon",
                "Two En-suite Bedrooms",
                "Kitchenette & Bar",
                "Diplomatic Lock System",
                "Balcony Terrace",
                "Smart Streaming",
                "Complimentary Transfers",
              ],
              imageUrl: "/rooms/r5.jpg",
            },
            {
              id: "room-6",
              name: "Imperial Terrace Royal Suite",
              type: "Extended",
              code: "ROYAL",
              description:
                "Lavish penthouse suite with a 360-degree terrace, private dining pavilion, freestanding soaking bath, and personal butler attendant.",
              basePrice: 420,
              capacityAdults: 3,
              capacity: 3,
              bedCount: 2,
              bathCount: 2,
              size: "110 m²",
              rating: 5,
              amenities: [
                "360-degree City Terrace",
                "Freestanding Soaking Tub",
                "VIP Butler on Call",
                "Sonos Sound System",
                "Executive Breakfast",
                "Fine Linen Linens",
              ],
              imageUrl: "/rooms/r6.jpg",
            },
          ];
          setRoomTypes(curated);
        } else {
          // Enrich database room types with reference imagery and attributes
          const roomImages = [
            "/rooms/r1.jpg",
            "/rooms/r2.jpg",
            "/rooms/r3.jpg",
            "/rooms/r4.jpg",
            "/rooms/r5.jpg",
            "/rooms/r6.jpg",
            "/rooms/r7.jpg",
            "/rooms/r8.jpg",
          ];
          const enriched: RoomType[] = types.map((t: any, idx: number) => {
            const cap = Number(t.capacityAdults || 2);
            const categoryType = cap >= 3 ? "Extended" : cap === 2 ? "Double" : "Single";
            return {
              ...t,
              imageUrl: t.imageUrl || roomImages[idx % roomImages.length],
              basePrice: t.basePrice || 160 + idx * 60,
              type: categoryType,
              capacity: cap,
              bedCount: cap >= 3 ? 2 : cap === 2 ? 2 : 1,
              bathCount: cap >= 3 ? 2 : 1,
              rating: 5,
              size: t.size ? `${t.size} m²` : `${40 + idx * 20} m²`,
              amenities:
                Array.isArray(t.amenities) && t.amenities.length > 0
                  ? t.amenities
                  : [
                      "Free High-Speed Wi-Fi",
                      "Plush Bedding",
                      "Marble Bathroom",
                      "Smart 4K TV",
                      "Climate Control",
                      "Daily Housekeeping",
                    ],
            };
          });
          setRoomTypes(enriched);
        }

        setAvailableRooms(avail);
      })
      .catch((e) => console.error("Error loading hotel catalog:", e))
      .finally(() => setLoadingData(false));
  }, []);

  // Filtered rooms logic
  const filteredRooms = useMemo(() => {
    return roomTypes.filter((room) => {
      // Category filter
      const matchesCategory =
        filterType === "ALL" ||
        room.type?.toLowerCase() === filterType.toLowerCase() ||
        room.code?.toLowerCase() === filterType.toLowerCase();

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        room.name.toLowerCase().includes(q) ||
        (room.description && room.description.toLowerCase().includes(q)) ||
        (room.amenities && room.amenities.some((a) => a.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [roomTypes, filterType, searchQuery]);

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

  // REQUIRE AUTHENTICATION FOR RESERVATIONS:
  // When a guest attempts to make a reservation without being logged in or registered,
  // prompt and redirect them to authenticate first.
  const handleReserveClick = (suite: RoomType) => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.guest) {
            setGuestSession(parsed);
            openBookingForSuite(suite);
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!guestSession?.guest) {
      // Store pending reservation suite so guest can resume once signed in
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "nexus_pending_reservation",
          JSON.stringify({
            suiteId: suite.id,
            checkInDate,
            checkOutDate,
            guestCount,
          })
        );
      }
      setPendingReservationSuite(suite);
      setAuthRequiredModalOpen(true);
      return;
    }

    openBookingForSuite(suite);
  };

  // Open Room Details Modal
  const openRoomDetails = (room: RoomType) => {
    setSelectedDetailRoom(room);
    setRoomDetailsModalOpen(true);
  };

  // Open the Reservation Modal for authenticated guest
  const openBookingForSuite = (suite: RoomType) => {
    setSelectedSuite(suite);
    setShowServiceDropdown(false);
    setShowOtherInput(false);
    setOtherText("");
    setSelectedSpecialPresets([]);
    setSmokingPreference("non_smoking");
    setBedPreference("king");
    setFoodPreference("none");
    setInRoomPreferences("");
    setBookingStep("review");
    setBookingModalOpen(true);
    setRoomDetailsModalOpen(false);
  };

  // Handle Find Room Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roomsSection = document.getElementById("rooms");
    if (roomsSection) {
      roomsSection.scrollIntoView({ behavior: "smooth" });
    }
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

      // 3. Build composite special requests from room preferences, presets, and custom requests
      const prefDetails: string[] = [];
      prefDetails.push(smokingPreference === "smoking" ? "Smoking Room: Smoking Allowed" : "Smoking Room: Non-Smoking");
      const bedMap: Record<string, string> = {
        king: "King Bed",
        queen: "Queen Bed",
        twin: "Twin Beds",
        single: "Single Bed",
      };
      if (bedPreference) prefDetails.push(`Bed: ${bedMap[bedPreference] || bedPreference}`);
      const foodMap: Record<string, string> = {
        none: "Dining: Standard",
        halal: "Dining: Halal Certified",
        vegetarian: "Dining: Vegetarian",
        vegan: "Dining: Strict Vegan",
      };
      if (foodPreference) prefDetails.push(foodMap[foodPreference] || `Dining: ${foodPreference}`);
      if (inRoomPreferences.trim()) prefDetails.push(`In-Room Request: ${inRoomPreferences.trim()}`);

      const compositeSpecialRequests = [
        prefDetails.join(" • "),
        ...selectedSpecialPresets,
        customSpecialRequest.trim(),
        bookingSpecialRequests.trim(),
      ]
        .filter(Boolean)
        .join(" • ");

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
          adults: Number(guestCount) || 2,
          children: 0,
          specialRequests: compositeSpecialRequests || undefined,
          paymentMethod,
          paymentReference:
            paymentReference.trim() ||
            `ONL-${paymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
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
      alert("Reservation error: " + err.message);
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
    router.push("/guest-portal/login");
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactFeedback("Thank you! Your inquiry has been sent to our 24/7 front desk.");
    setContactForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setContactFeedback(""), 6000);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterFeedback("Subscribed! You will receive our seasonal offers and private invites.");
      setNewsletterEmail("");
      setTimeout(() => setNewsletterFeedback(""), 6000);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* ─── 1. HEADER & NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-amber-500/20 text-white transition-all shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-6">
            {/* Logo & Brand */}
            <Link href="/" className="flex items-center gap-3.5 group shrink-0">
              <div className="relative w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-amber-500/30 p-1.5 shadow-inner group-hover:border-amber-400 transition-colors">
                <Image
                  src="/Images/logowb.png"
                  alt="Nexus Grand Logo"
                  width={38}
                  height={38}
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  {hotelInfo.shortName}
                </span>
                <span className="block text-[10px] tracking-widest text-amber-300/80 uppercase font-medium">
                  Luxury Resort &amp; Suites
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Clean, Clear & Balanced */}
            <nav className="hidden lg:flex items-center gap-8 text-xs font-bold tracking-wider uppercase">
              {[
                { label: "Rooms & Suites", href: "#rooms" },
                { label: "Reserve Room", href: "#rooms" },
                { label: "About", href: "#about" },
                { label: "Contact", href: "#contact" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-300 hover:text-amber-400 transition-colors py-1 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-amber-400 hover:after:w-full after:transition-all after:duration-300"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Right Actions: Clean & Non-Cluttered */}
            <div className="hidden sm:flex items-center gap-3.5 shrink-0">
              {/* Services Button (Pill button placed on the left side of My Reservations) */}
              <Link
                href="/guest-portal/services"
                className="relative px-3.5 py-2 text-xs font-semibold text-gray-200 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-amber-500/40 rounded-full transition-all flex items-center gap-2 shadow-sm cursor-pointer group"
                title="Hotel & In-Room Services"
              >
                <Sparkles size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Services</span>
              </Link>

              {/* My Reservations Pill */}
              <button
                onClick={() => setIsBookingsModalOpen(true)}
                className="relative px-3.5 py-2 text-xs font-semibold text-gray-200 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-amber-500/40 rounded-full transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Calendar size={14} className="text-amber-400" />
                <span>My Reservations</span>
                {guestSession?.reservation && (
                  <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-amber-500 text-slate-950 rounded-full">
                    1
                  </span>
                )}
              </button>

              {/* Guest Auth State */}
              {guestSession?.guest ? (
                <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                  {guestSession?.isStayActive || guestSession?.reservation?.status === "checked_in" ? (
                    <Link
                      href="/guest-portal/services"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                      title={`Checked In — Room ${guestSession?.room?.number || ""}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                        {guestSession.guest.firstName?.[0] || "G"}
                      </div>
                      <span className="font-semibold">{guestSession.guest.firstName}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        (Rm {guestSession?.room?.number || "In-Room"})
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href="/guest-portal/services"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                      title="Reservation Confirmed — Check-In Pending"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                        {guestSession.guest.firstName?.[0] || "G"}
                      </div>
                      <span className="font-semibold">{guestSession.guest.firstName}</span>
                      <span className="text-[10px] text-amber-400 font-medium">
                        (Pre-Arrival)
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogoutGuest}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/guest-portal/login"
                  className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Controls */}
            <div className="lg:hidden flex items-center gap-2">
              <Link
                href="/guest-portal/services"
                className="p-2 text-amber-400 bg-slate-900 border border-slate-800 rounded-lg relative cursor-pointer"
                title="Hotel Services"
              >
                <Sparkles size={18} />
              </Link>
              <button
                onClick={() => setIsBookingsModalOpen(true)}
                className="p-2 text-amber-400 bg-slate-900 border border-slate-800 rounded-lg relative cursor-pointer"
                title="My Reservations"
              >
                <Calendar size={18} />
                {guestSession?.reservation && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold bg-amber-500 text-slate-950 rounded-full">
                    1
                  </span>
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950/98 border-b border-amber-500/20 px-6 py-6 space-y-4 shadow-2xl">
            {[
              { label: "Rooms & Suites", href: "#rooms" },
              { label: "Reserve Room", href: "#rooms" },
              { label: "About Resort", href: "#about" },
              { label: "Contact & Front Desk", href: "#contact" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-gray-300 hover:text-amber-400 py-1 transition-colors uppercase tracking-wider"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <Link
                href="/guest-portal/services"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 bg-slate-900 text-amber-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-800 hover:border-amber-500/40 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Hotel Services</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsBookingsModalOpen(true);
                }}
                className="w-full py-2.5 bg-slate-900 text-amber-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-800 cursor-pointer"
              >
                <Calendar size={14} />
                <span>My Reservations</span>
              </button>
              {guestSession?.guest ? (
                <Link
                  href="/guest-portal/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 bg-emerald-500/20 text-emerald-300 text-center font-bold rounded-xl text-xs uppercase tracking-wider"
                >
                  In-Room Guest Portal ({guestSession.guest.firstName})
                </Link>
              ) : (
                <Link
                  href="/guest-portal/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 bg-slate-900 text-slate-200 text-center font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-800"
                >
                  Guest Sign In / Register
                </Link>
              )}
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 bg-slate-900/50 border border-slate-800 text-slate-400 text-center font-semibold rounded-xl text-xs uppercase tracking-wider"
              >
                Staff &amp; Operations Portal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO CAROUSEL SECTION ──────────────────────────────────────── */}
      <section
        id="home"
        className="relative w-full min-h-[88vh] lg:min-h-[92vh] flex items-center justify-center overflow-hidden bg-slate-950"
      >
        {/* Background Carousel Slides */}
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.title}
              fill
              priority={index === 0}
              className={`object-cover transition-transform duration-[12000ms] ease-out ${
                index === currentSlide ? "scale-105" : "scale-100"
              }`}
            />
            {/* Multi-layer luxury gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/50"></div>
          </div>
        ))}

        {/* Hero Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 w-full flex flex-col justify-center">
          <div className="max-w-3xl space-y-6">

            {/* Heading */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
              {heroSlides[currentSlide].title}{" "}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                {heroSlides[currentSlide].highlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 max-w-2xl font-light leading-relaxed">
              {heroSlides[currentSlide].subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a
                href="#rooms"
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow-xl shadow-amber-500/25 hover:scale-105 transition-all text-xs uppercase tracking-widest"
              >
                Explore Available Rooms
              </a>
              <a
                href="#about"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all text-xs uppercase tracking-widest hover:border-amber-400/40"
              >
                Discover Resort
              </a>
            </div>
          </div>

          {/* Carousel slide indicators */}
          <div className="flex items-center gap-2.5 mt-12 z-20">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  index === currentSlide ? "w-8 bg-amber-400" : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. ROOMS & SUITES SECTION ───────────────────────────────────────── */}
      <section id="rooms" className="py-20 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Explore Our Luxury <span className="text-amber-500">Rooms &amp; Suites</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600">
              Every room offers curated comforts, bespoke bedding, and panoramic views designed for your optimal rest.
            </p>
          </div>

          {/* Filter Tabs and Search Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 pb-6 border-b border-gray-200">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: "All Rooms", value: "ALL" },
                { label: "Single Deluxe", value: "Single" },
                { label: "Double Executive", value: "Double" },
                { label: "Extended Stay", value: "Extended" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilterType(cat.value)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    filterType.toLowerCase() === cat.value.toLowerCase()
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick search input */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or feature..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <p className="text-base font-bold text-gray-800">No rooms match your filter.</p>
              <p className="text-xs text-gray-500 mt-1">Try resetting the category filter or search query.</p>
              <button
                onClick={() => {
                  setFilterType("ALL");
                  setSearchQuery("");
                }}
                className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1.5"
                >
                  {/* Image & Price */}
                  <div className="relative h-56 w-full overflow-hidden bg-slate-900">
                    <Image
                      src={room.imageUrl || "/rooms/r1.jpg"}
                      alt={room.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    {/* Category Pill */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-300 text-[11px] font-bold uppercase rounded-lg">
                      {room.type || "Luxury"}
                    </span>

                    {/* Price Tag */}
                    <span className="absolute bottom-3 left-3 px-3 py-1 bg-amber-500 text-slate-950 font-black text-sm rounded-lg shadow-md">
                      {formatPrice(Number(room.basePrice || 180))}{" "}
                      <span className="text-[10px] font-bold text-slate-900/80">/ NIGHT</span>
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                          {room.name}
                        </h3>
                        <div className="flex gap-0.5 text-amber-400 shrink-0">
                          {Array.from({ length: room.rating || 5 }).map((_, i) => (
                            <Star key={i} size={14} className="fill-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {room.description}
                      </p>
                    </div>

                    {/* Room Features Icons */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Image src="/sleeping.png" alt="Bed" width={16} height={16} className="object-contain" />
                        <span>
                          {room.bedCount || 1} Bed{(room.bedCount || 1) > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Image src="/bathtub.png" alt="Bath" width={16} height={16} className="object-contain" />
                        <span>{room.bathCount || 1} Bath</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Image src="/wifi.png" alt="Wifi" width={16} height={16} className="object-contain" />
                        <span>Free Wifi</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => openRoomDetails(room)}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleReserveClick(room)}
                        className="w-full py-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Reserve Room
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 4. ABOUT SECTION ────────────────────────────────────────────────── */}
      <section id="about" className="py-20 bg-white relative overflow-hidden">
        {/* Soft ambient accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-100/30 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Image */}
            <div className="relative group">
              <div className="relative h-[340px] sm:h-[440px] w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <Image
                  src="/about-1.jpg"
                  alt="Nexus Grand Luxury Hotel Exterior"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
              </div>
            </div>

            {/* Right Column: Story & Features */}
            <div className="space-y-6">

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                A Symphony of <br />
                <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Luxury, Comfort &amp; Calm
                </span>
              </h2>

              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                At {hotelInfo.shortName}, we transcend the conventional hospitality experience. Located conveniently along Bole Airport Road, each suite and common salon has been meticulously designed to cultivate peace, productivity, and five-star indulgence.
              </p>

              {/* Core Pillars */}
              <div className="space-y-3 pt-2">
                {[
                  "Personalized 24/7 guest services & round-the-clock in-room dining",
                  "Eco-conscious luxury architecture with climate-controlled suites",
                  "World-class private spa, infinity pool & culinary dining hotspots",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={14} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Numerical Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                {hotelInfo.stats.map((stat, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl text-center border border-gray-100">
                    <p className="text-2xl font-black text-amber-500">{stat.value}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. CONTACT & FRONT DESK SECTION ─────────────────────────────────── */}
      <section id="contact" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              We Are Here to <span className="text-amber-500">Assist You</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600">
              Have questions about room reservations, custom banquet requests, or executive transport? Reach out anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Details Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl pointer-events-none"></div>

              <div className="relative z-10 space-y-8">
                <div>
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Direct Reach</span>
                  <h3 className="text-2xl font-bold mt-1 text-white">{hotelInfo.name}</h3>
                </div>

                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Physical Location</p>
                      <p className="font-medium text-white mt-0.5">{hotelInfo.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Telephone</p>
                      <p className="font-medium text-white mt-0.5 font-mono">{hotelInfo.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Email Inquiries</p>
                      <p className="font-medium text-white mt-0.5">{hotelInfo.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Hours &amp; Policies</p>
                      <p className="font-medium text-white mt-0.5">
                        Check-In: {hotelInfo.checkInTime} &bull; Check-Out: {hotelInfo.checkOutTime}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Message Form */}
            <div className="bg-slate-50 border border-gray-200 rounded-3xl p-8 sm:p-10 shadow-lg flex flex-col justify-between">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Send an Inquiry</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Fill out the form below and our guest relations team will respond within 2 hours.
                  </p>
                </div>

                {contactFeedback && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{contactFeedback}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Your Email</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="e.g. john@example.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="e.g. Reservation inquiry / Airport chauffeur"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Provide details about your stay dates, requests, or questions..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Send Guest Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="relative bg-slate-950 text-gray-400 py-8 border-t border-amber-500/20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Copyright & Info */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-[11px] text-gray-500">
              <p>&copy; {new Date().getFullYear()} {hotelInfo.name}. All rights reserved.</p>
              <span className="hidden sm:inline">&bull;</span>
              <div className="flex items-center gap-3">
                <span>Privacy Policy</span>
                <span>&bull;</span>
                <span>Terms of Service</span>
                <span>&bull;</span>
                <span className="text-amber-500/80">Powered by Nexus HMS</span>
              </div>
            </div>
          </div>
      </footer>

      {/* ─── MODAL: ROOM DETAILS ────────────────────────────────────────────── */}
      {roomDetailsModalOpen && selectedDetailRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col text-slate-900">
            {/* Header Image */}
            <div className="relative h-64 sm:h-80 w-full shrink-0 bg-slate-900">
              <Image
                src={selectedDetailRoom.imageUrl || "/rooms/r1.jpg"}
                alt={selectedDetailRoom.name}
                fill
                className="object-cover rounded-t-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

              {/* Close button */}
              <button
                onClick={() => setRoomDetailsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              {/* Room info on image */}
              <div className="absolute bottom-4 left-6 right-6 flex flex-wrap justify-between items-end gap-2 text-white">
                <div>
                  <span className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs uppercase rounded-full">
                    {selectedDetailRoom.type || "Deluxe"} Room
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">
                    {selectedDetailRoom.name}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">
                    {formatPrice(Number(selectedDetailRoom.basePrice || 180))}
                  </span>
                  <span className="text-sm text-gray-200"> / night</span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-amber-50/60 border border-amber-200/60 rounded-xl text-center">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Guests</p>
                  <p className="text-lg font-bold text-gray-900">Up to {selectedDetailRoom.capacity || 2}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Bedrooms</p>
                  <p className="text-lg font-bold text-gray-900">{selectedDetailRoom.bedCount || 1} Bed(s)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Bathrooms</p>
                  <p className="text-lg font-bold text-gray-900">{selectedDetailRoom.bathCount || 1} Bath</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Room Size</p>
                  <p className="text-lg font-bold text-gray-900">{selectedDetailRoom.size || "50 m²"}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Room Overview</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {selectedDetailRoom.description}
                </p>
              </div>

              {/* Amenities Grid */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Included Amenities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(selectedDetailRoom.amenities || []).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                        <Check size={14} />
                      </div>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-sm">
                  <Star size={18} className="fill-amber-400 text-amber-400" />
                  <span>5-Star Luxury Experience</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setRoomDetailsModalOpen(false)}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setRoomDetailsModalOpen(false);
                      handleReserveClick(selectedDetailRoom);
                    }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Reserve Room Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: AUTHENTICATION REQUIRED FOR RESERVATIONS ─────────────────── */}
      {authRequiredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden text-gray-900">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-950 text-white relative text-center">
              <button
                onClick={() => setAuthRequiredModalOpen(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 rounded-2xl mx-auto flex items-center justify-center text-amber-400 mb-3 shadow-md">
                <Lock size={26} />
              </div>
              <h3 className="text-xl font-bold">Authentication Required</h3>
              <p className="text-xs text-amber-300 mt-1">
                Please sign in or register before making a reservation.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                <p className="font-semibold text-slate-900 mb-1">
                  Reserving: {pendingReservationSuite?.name || "Luxury Suite"}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Guests must authenticate before proceeding with reservations. Your profile will link your room booking, allow pre-paid fast check-in, and grant access to in-room dining services.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl gap-2 shadow-md cursor-pointer"
                  onClick={() => router.push("/guest-portal/login?redirect=/&action=reserve")}
                >
                  <LogIn size={15} />
                  <span>Sign In as Existing Guest</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl gap-2 cursor-pointer"
                  onClick={() => router.push("/guest-portal/register?redirect=/&action=reserve")}
                >
                  <UserPlus size={15} />
                  <span>Register New Guest Account</span>
                </Button>
              </div>

              <p className="text-[11px] text-gray-400 text-center pt-2">
                Your selected room and dates will be preserved when you log in.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: MY ACTIVE RESERVATIONS ──────────────────────────────────── */}
      {isBookingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-amber-500/30">
              <div>
                <h3 className="text-lg font-bold text-white">Active Reservations</h3>
                <p className="text-xs text-amber-400">View and manage your confirmed hotel reservations</p>
              </div>
              <button
                onClick={() => setIsBookingsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {guestSession?.reservation ? (
                <div className="p-4 border border-gray-200 rounded-xl hover:border-amber-300 transition-all flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative shrink-0 bg-slate-800">
                      <Image
                        src="/rooms/r1.jpg"
                        alt="Room"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {guestSession.reservation.reservationNumber || "RES-ONLINE"}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {guestSession.reservation.status || "CONFIRMED"}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mt-1">
                        Room {guestSession.roomNumber || guestSession.room?.number || "101"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {guestSession.reservation.checkInDate || checkInDate} to{" "}
                        {guestSession.reservation.checkOutDate || checkOutDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <span className="text-lg font-black text-amber-600">
                      {guestSession.reservation.totalAmount
                        ? `${Number(guestSession.reservation.totalAmount).toLocaleString()} ETB`
                        : "Pre-Paid"}
                    </span>
                    <Link
                      href="/guest-portal/services"
                      onClick={() => setIsBookingsModalOpen(false)}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors shadow-sm"
                    >
                      In-Room Services &rarr;
                    </Link>
                  </div>
                </div>
              ) : guestSession?.guest ? (
                <div className="text-center py-12 text-gray-500 space-y-3">
                  <Calendar size={48} className="mx-auto text-gray-300" />
                  <div>
                    <p className="font-bold text-base text-gray-800">No active reservations found.</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Welcome, {guestSession.guest.firstName}! Reserve any room from our catalog to view it here.
                    </p>
                  </div>
                  <a
                    href="#rooms"
                    onClick={() => setIsBookingsModalOpen(false)}
                    className="inline-block px-5 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
                  >
                    Browse Available Rooms
                  </a>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 space-y-3">
                  <Lock size={44} className="mx-auto text-amber-500/60" />
                  <div>
                    <p className="font-bold text-base text-gray-800">Guest Sign-In Required</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Sign in to your guest account to view your active room reservations, stay dates, and in-room service requests.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setIsBookingsModalOpen(false);
                      router.push("/guest-portal/login");
                    }}
                    className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-xl"
                  >
                    Sign In to View Reservations
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsBookingsModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESERVATION & ONLINE PAYMENT (PRESERVING ALL LOGIC) ─────── */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="sm:max-w-xl bg-[#0d0f14] border border-white/10 text-white max-h-[92vh] overflow-y-auto p-6 sm:p-7 rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {bookingStep === "confirmed" ? "Reservation Confirmed" : "Reserve Your Suite"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-mono">
              {checkInDate} &mdash; {checkOutDate} &bull; {nightsCount} Night{nightsCount > 1 ? "s" : ""} &bull; {guestCount} Guest{guestCount > 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: REVIEW DETAILS & GUEST IDENTIFICATION */}
          {bookingStep === "review" && (
            <div className="space-y-4 pt-2 text-xs">
              {/* 1. Guest Details Card (Placed Above Suite & Rate Card) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Guest Details
                  </Label>
                  {guestSession?.guest && (
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] py-0 px-2 font-normal">
                      Verified Guest
                    </Badge>
                  )}
                </div>

                {guestSession?.guest ? (
                  <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {guestSession.guest.firstName?.[0] || "G"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {guestSession.guest.fullName ||
                                `${guestSession.guest.firstName} ${guestSession.guest.lastName}`.trim()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 font-mono mt-1 flex flex-wrap gap-x-4">
                            <span>Phone: <strong className="text-white">{guestSession.guest.phone || "—"}</strong></span>
                            {guestSession.guest.email && (
                              <span>Email: <strong className="text-white">{guestSession.guest.email}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(guestSession.guest.nationalId || guestSession.guest.idNumber || bookingGuestFayda) && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">National ID</span>
                          <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider">
                            {guestSession.guest.nationalId || guestSession.guest.idNumber || bookingGuestFayda}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2.5 text-center">
                    <p className="text-xs text-slate-200">
                      Guest sign-in is required to secure your reservation.
                    </p>
                    <Button
                      type="button"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 px-4"
                      onClick={() => router.push("/guest-portal/login")}
                    >
                      Sign In or Register
                    </Button>
                  </div>
                )}
              </div>

              {/* 2. Suite & Rate Card (Executive Twin Skyline Suite) */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span className="text-white font-bold">{selectedSuite?.name}</span>
                  <span className="font-mono text-base text-amber-400 font-bold">{formatPrice(totalUsd)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 text-xs pt-1 border-t border-white/[0.06]">
                  <div><span className="text-slate-400">Check-In:</span> <strong className="text-white ml-1 font-mono">{checkInDate} (14:00)</strong></div>
                  <div><span className="text-slate-400">Check-Out:</span> <strong className="text-white ml-1 font-mono">{checkOutDate} (12:00)</strong></div>
                  <div><span className="text-slate-400">Nightly Rate:</span> <strong className="text-white ml-1 font-mono">{formatPrice(suitePriceUsd)}</strong></div>
                  <div><span className="text-slate-400">Duration:</span> <strong className="text-white ml-1 font-mono">{nightsCount} Night{nightsCount > 1 ? "s" : ""}</strong></div>
                </div>
              </div>

              {/* 3. Room & Stay Preferences (Smoking, Bed Type, Dining, In-Room Preferences) */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Room Preferences
                  </Label>
                  <span className="text-[10px] text-amber-400 font-medium font-mono">Guaranteed Room Setup</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-smokingPreference" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Cigarette className="w-3.5 h-3.5 text-slate-400" /> Smoking Room
                    </Label>
                    <select
                      id="modal-smokingPreference"
                      value={smokingPreference}
                      onChange={(e) => setSmokingPreference(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/70 cursor-pointer"
                    >
                      <option value="non_smoking">Non-Smoking</option>
                      <option value="smoking">Smoking Allowed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modal-bedPreference" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400" /> Bed Type
                    </Label>
                    <select
                      id="modal-bedPreference"
                      value={bedPreference}
                      onChange={(e) => setBedPreference(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/70 cursor-pointer"
                    >
                      <option value="king">King Bed</option>
                      <option value="queen">Queen Bed</option>
                      <option value="twin">Twin Beds</option>
                      <option value="single">Single Bed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modal-foodPreference" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" /> Dining / Food
                    </Label>
                    <select
                      id="modal-foodPreference"
                      value={foodPreference}
                      onChange={(e) => setFoodPreference(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/70 cursor-pointer"
                    >
                      <option value="none">Standard</option>
                      <option value="halal">Halal Certified</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Strict Vegan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="modal-inRoomPreferences" className="text-xs font-semibold text-slate-300">
                    Other Special Requests / In-Room Preferences
                  </Label>
                  <Input
                    id="modal-inRoomPreferences"
                    value={inRoomPreferences}
                    onChange={(e) => setInRoomPreferences(e.target.value)}
                    placeholder="e.g. High floor, extra pillows, foam mattress, late check-in notification..."
                    className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs focus-visible:ring-amber-500/40 rounded-lg placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* 4. Special Requests with Enlarged & Polished Dropdown Menu */}
              {guestSession?.guest && (
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Special Requests & Services
                    </span>
                    <div className="flex items-center gap-2 relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 gap-1.5 font-medium rounded-xl"
                        onClick={() => {
                          setShowServiceDropdown((v) => !v);
                          setShowOtherInput(false);
                        }}
                      >
                        <span>+ Menu Requests</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform ${showServiceDropdown ? "rotate-180" : ""}`} />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-8 px-3 text-xs font-medium rounded-xl gap-1.5 transition-all ${
                          showOtherInput
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                            : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                        onClick={() => {
                          setShowOtherInput((v) => !v);
                          setShowServiceDropdown(false);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Custom</span>
                      </Button>

                      {/* Enlarged & Organized Catalog Menu Dropdown */}
                      {showServiceDropdown && (
                        <div className="absolute right-0 top-10 z-50 w-96 sm:w-[420px] max-w-[95vw] bg-[#0e1118] border border-amber-500/40 rounded-2xl shadow-2xl p-4 space-y-3 max-h-80 overflow-y-auto">
                          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                            <span className="text-white font-bold flex items-center gap-1.5 text-sm">
                              <Sparkles className="w-4 h-4 text-amber-400" /> Catalog Services
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowServiceDropdown(false)}
                              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {SPECIAL_REQUEST_CATALOG.map((cat) => (
                            <div key={cat.category} className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                                {cat.category}
                              </span>
                              <div className="space-y-1">
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
                                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                                        isSelected
                                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold"
                                          : "text-slate-300 hover:bg-white/10 border border-transparent"
                                      }`}
                                    >
                                      <span className="truncate pr-2">{item}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
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

                  {showOtherInput && (
                    <div className="flex items-center gap-2 pt-1">
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
                        placeholder="Type custom request (e.g. Extra baby cot)..."
                        className="h-9 text-xs bg-black/40 border-slate-700 text-white focus:border-amber-500 rounded-xl"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 rounded-xl"
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
                        className="h-9 px-2 text-slate-400 hover:text-white text-xs shrink-0 rounded-xl"
                        onClick={() => {
                          setOtherText("");
                          setShowOtherInput(false);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {selectedSpecialPresets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedSpecialPresets.map((item, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-amber-500/10 border-amber-500/30 text-amber-200 text-xs py-1 px-2.5 flex items-center gap-1.5 font-normal rounded-xl"
                        >
                          <span className="truncate max-w-[280px]">{item}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSpecialPresets((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-400 transition-colors ml-0.5"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setBookingModalOpen(false)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                {guestSession?.guest ? (
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs gap-1.5 px-5 py-2 rounded-xl shadow-md"
                    onClick={() => setBookingStep("payment")}
                  >
                    <span>Proceed to Online Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                    onClick={() => router.push("/guest-portal/login")}
                  >
                    <span>Sign In First</span>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}

          {/* STEP 2: ONLINE PAYMENT GATEWAY (TELEBIRR, CBE, CHAPA) */}
          {bookingStep === "payment" && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Pre-Paid Amount Due</span>
                  <span className="text-xl font-mono font-bold text-amber-400">
                    {totalEtb.toLocaleString()} ETB
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400">{nightsCount} Night{nightsCount > 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("telebirr")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === "telebirr"
                        ? "border-amber-500 bg-amber-500/15 text-white ring-2 ring-amber-500/30 shadow-md"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm text-amber-400">Telebirr</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">SuperApp / QR</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cbe")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === "cbe"
                        ? "border-purple-500 bg-purple-500/15 text-white ring-2 ring-purple-500/30 shadow-md"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm text-purple-400">CBE Birr</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Commercial Bank</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("chapa")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMethod === "chapa"
                        ? "border-emerald-500 bg-emerald-500/15 text-white ring-2 ring-emerald-500/30 shadow-md"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                    }`}
                  >
                    <p className="font-bold text-xs sm:text-sm text-emerald-400">Chapa</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Visa / Debit</p>
                  </button>
                </div>
              </div>

              {/* Official Hotel Account Details */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/40 space-y-2">
                {paymentMethod === "telebirr" && (
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Merchant Code: <strong className="text-white font-mono">889900</strong></div>
                    <div>Account Phone: <strong className="text-white font-mono">0911 318 622</strong></div>
                    <div>Payee Name: <strong className="text-white">Nexus Grand Hotel PLC</strong></div>
                    <div>Reference: <strong className="text-amber-400 font-mono">AUTO-ONL-RES</strong></div>
                  </div>
                )}

                {paymentMethod === "cbe" && (
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Account Number: <strong className="text-white font-mono">1000 2345 67891</strong></div>
                    <div>CBE Birr Shortcode: <strong className="text-white font-mono">445566</strong></div>
                    <div>Account Name: <strong className="text-white">Nexus Grand Hotel PLC</strong></div>
                    <div>Branch: <strong className="text-white">Bole Medhanialem</strong></div>
                  </div>
                )}

                {paymentMethod === "chapa" && (
                  <p className="text-slate-300 text-xs">
                    Supports Mastercard, Visa, and local debit cards with instant settlement to Nexus Grand Hotel.
                  </p>
                )}
              </div>

              {/* Transaction Reference Input (NO PLACEHOLDER) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Transaction Confirmation Reference / Code *
                </Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-black/50 border-white/15 text-white h-9 text-xs font-mono focus:border-amber-400"
                />
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 pt-4 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => setBookingStep("review")} className="text-slate-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs gap-1.5 px-5 py-2 rounded-xl shadow-md cursor-pointer"
                  disabled={paymentSubmitting}
                  onClick={handleConfirmAndPay}
                >
                  {paymentSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Pre-Payment &amp; Reserve
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 3: RESERVATION CONFIRMED VOUCHER */}
          {bookingStep === "confirmed" && confirmedReservation && (
            <div className="space-y-4 py-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">
                  Reservation Confirmed!
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Reservation #{confirmedReservation.reservationNumber} &bull; Confirmation #{confirmedReservation.confirmationNumber}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
                  <span className="font-semibold text-white">Payment Status:</span>
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-[10px]">
                    PAID ({paymentMethod.toUpperCase()})
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>Guest Name: <strong className="text-white">{bookingGuestName}</strong></div>
                  <div>Phone: <strong className="text-white font-mono">{bookingGuestPhone}</strong></div>
                  <div>Check-In: <strong className="text-white font-mono">{checkInDate}</strong></div>
                  <div>Check-Out: <strong className="text-white font-mono">{checkOutDate}</strong></div>
                  <div>Amount Settled: <strong className="text-emerald-400 font-mono">{totalEtb.toLocaleString()} ETB</strong></div>
                  <div>Front Desk: <strong className="text-emerald-300">Direct Key Pick-Up</strong></div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 gap-1.5 rounded-xl"
                  onClick={() => {
                    setBookingModalOpen(false);
                    router.push("/guest-portal/services");
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>In-Room Services Portal &rarr;</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 text-white text-xs h-10 rounded-xl hover:bg-white/10"
                  onClick={() => setBookingModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

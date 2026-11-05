"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { SpecialRequestsMultiSelect } from "@/components/special-requests-multi-select";
import {
  Calendar,
  User,
  BedDouble,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Users,
  Heart,
  FileText,
  DoorOpen,
  Tag,
  Percent,
  DollarSign,
  Gift,
  AlertCircle,
  Check,
} from "lucide-react";
import type { GuestRecord, AccompanyingGuest } from "./guest-registration-modal";

export type PromotionalPackage = {
  id: string;
  code: string;
  name: string;
  description?: string;
  scope?: "global" | "branch";
  pricingType: "fixed_package" | "discount_percent";
  packagePrice?: number;
  discountPercent?: number;
  inclusions: string[];
  minNights: number;
  isEnabled: boolean;
};

export type DiscountRule = {
  id: string;
  code: string;
  name: string;
  discountType: "percentage" | "fixed_amount";
  value: number;
  applicableTo: "rooms" | "restaurant" | "all";
  minNightsRequired?: number;
  isEnabled: boolean;
};

export interface RoomType {
  id: string;
  name: string;
  code?: string;
  basePrice?: string;
}

export interface AvailableRoom {
  id: string;
  number: string;
  roomTypeName?: string;
  roomTypeId?: string;
  currentPrice?: number;
  floor?: string;
}

export interface CreatedReservation {
  id: string;
  reservationNumber?: string;
  guestId?: string;
  roomId?: string;
  roomTypeId?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount?: string;
  reservationType?: string;
  specialRequests?: string;
  notes?: string;
  bookingSource?: string;
  paidAmount?: number | string;
  depositAmount?: number | string;
  // Multi-guest & lodging compliance pass-through
  accompanyingGuests?: AccompanyingGuest[];
  hasRelationshipDoc?: boolean;
  relationshipStatus?: string;
  relationshipDocName?: string;
  relationshipDocUrl?: string;
  relationshipDocNumber?: string;
  accommodationMode?: "twin_beds" | "separate_rooms";
  roomCount?: number;
  secondaryRoomTypeId?: string;
  secondaryRoomTypeName?: string;
}

interface ReservationBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: GuestRecord | null;
  roomTypes: RoomType[];
  availableRooms: AvailableRoom[];
  onSuccessReserveOnly?: (res: CreatedReservation) => void;
  onProceedToCheckIn?: (res: CreatedReservation, guest: GuestRecord) => void;
  onBack?: () => void;
}

export function ReservationBookingModal({
  open,
  onOpenChange,
  guest,
  roomTypes,
  availableRooms,
  onSuccessReserveOnly,
  onProceedToCheckIn,
  onBack,
}: ReservationBookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [resRoomTypeId, setResRoomTypeId] = useState("");
  const [resCheckIn, setResCheckIn] = useState(new Date().toISOString().split("T")[0]);
  const [resCheckOut, setResCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [resAdults, setResAdults] = useState("1");
  const [resChildren, setResChildren] = useState("0");
  const [resType, setResType] = useState("walk_in");
  const [resSpecialRequests, setResSpecialRequests] = useState("");
  const [accommodationMode, setAccommodationMode] = useState<"twin_beds" | "separate_rooms">("twin_beds");
  const [secondaryRoomTypeId, setSecondaryRoomTypeId] = useState("");

  // Helper to determine bed configuration label for a room type
  const getRoomTypeAnnotation = (name: string) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("twin")) {
      return { badge: "Twin Beds (2 Separate Beds)", isTwin: true, isKing: false };
    }
    if (lower.includes("king")) {
      return { badge: "1 King Bed (Couples / Single)", isTwin: false, isKing: true };
    }
    if (lower.includes("standard")) {
      return { badge: "Twin Bed Available", isTwin: true, isKing: false };
    }
    return { badge: "Standard Setup", isTwin: false, isKing: false };
  };

  // Set default room type when available
  useEffect(() => {
    if (roomTypes.length > 0 && !resRoomTypeId) {
      setResRoomTypeId(roomTypes[0].id);
      setSecondaryRoomTypeId(roomTypes[0].id);
    }
  }, [roomTypes, resRoomTypeId]);

  // Reset form and auto-sync occupancy when modal opens or guest changes
  useEffect(() => {
    if (open) {
      setResCheckIn(new Date().toISOString().split("T")[0]);
      setResCheckOut(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
      
      // Auto-calculate occupancy from accompanying guests if present
      const acc = guest?.accompanyingGuests || [];
      if (acc.length > 0) {
        const extraAdults = acc.filter((g) => g.ageCategory !== "child" && g.ageCategory !== "infant").length;
        const extraChildren = acc.filter((g) => g.ageCategory === "child" || g.ageCategory === "infant").length;
        setResAdults(String(1 + extraAdults));
        setResChildren(String(extraChildren));
      } else {
        setResAdults("1");
        setResChildren("0");
      }

      setAccommodationMode("twin_beds");
      setSecondaryRoomTypeId("");
      setResType("walk_in");
      setResSpecialRequests("");
    }
  }, [open, guest]);

  
  // Financial & Rate Plan Engine States
  const [ratePlan, setRatePlan] = useState<string>("standard");
  const [discountCode, setDiscountCode] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent?: number; amount?: number; label: string } | null>(null);
  const [securityDeposit, setSecurityDeposit] = useState<number>(1000);

  // Fetch active hotel packages & discount rules from configuration
  const { data: rawHotel } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel"),
  });
  const hotelObj = Array.isArray(rawHotel) ? rawHotel[0] : (rawHotel?.data?.[0] ?? rawHotel);

  const activePackages: PromotionalPackage[] = React.useMemo(() => {
    const list = hotelObj?.settings?.promotionalPackages;
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((p: any) => p.isEnabled);
    }
    return [
      {
        id: "pkg_weekend_retreat",
        code: "WKND-GETAWAY",
        name: "Luxury Weekend Retreat & Spa",
        description: "2 nights in deluxe room with daily breakfast and couple spa voucher.",
        scope: "global",
        pricingType: "fixed_package",
        packagePrice: 16500,
        inclusions: [
          "Daily Gourmet Buffet Breakfast",
          "60-Min Swedish Spa Voucher",
          "Complimentary Airport Chauffeur",
          "Late Check-Out until 14:00",
        ],
        minNights: 2,
        isEnabled: true,
      },
      {
        id: "pkg_honeymoon",
        code: "HONEYMOON-DELUXE",
        name: "Presidential Honeymoon Package",
        description: "All-inclusive romantic stay with champagne, candlelit dinner, and breakfast in bed.",
        scope: "global",
        pricingType: "fixed_package",
        packagePrice: 28000,
        inclusions: [
          "Chilled Champagne & Exotic Fruit Basket",
          "Chef's 3-Course Candlelit Dinner",
          "In-Bed Gourmet Breakfast",
          "Unlimited Hydrotherapy & Spa Access",
          "Guaranteed Late Check-Out until 16:00",
        ],
        minNights: 2,
        isEnabled: true,
      },
    ];
  }, [hotelObj]);

  const activeDiscounts: DiscountRule[] = React.useMemo(() => {
    const list = hotelObj?.settings?.discounts;
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((d: any) => d.isEnabled);
    }
    return [
      { id: "d1", code: "SUMMER20", name: "Summer Special 20% Off", discountType: "percentage", value: 20, applicableTo: "rooms", isEnabled: true },
      { id: "d2", code: "CORP-ETHIOAIR", name: "Ethiopian Airlines Corporate (15% OFF)", discountType: "percentage", value: 15, applicableTo: "all", isEnabled: true },
      { id: "d3", code: "BOLE-TRANSIT", name: "Bole Airport Transit Direct Voucher (500 ETB)", discountType: "fixed_amount", value: 500, applicableTo: "rooms", isEnabled: true },
    ];
  }, [hotelObj]);

  const selectedPackage = React.useMemo(() => {
    if (ratePlan === "standard") return null;
    return activePackages.find((p) => p.id === ratePlan || p.code === ratePlan) || null;
  }, [ratePlan, activePackages]);

  // Determine Base Price per night based on selected Room Types
  const primaryRoomType = roomTypes.find((t) => t.id === resRoomTypeId);
  const secondaryRoomType = roomTypes.find((t) => t.id === (secondaryRoomTypeId || resRoomTypeId));

  const baseRatePerNight = React.useMemo(() => {
    let rate = Number(primaryRoomType?.basePrice) || 2500;
    if (accommodationMode === "separate_rooms" && Number(resAdults) >= 2) {
      rate += Number(secondaryRoomType?.basePrice) || 2500;
    }
    return rate;
  }, [primaryRoomType, secondaryRoomType, accommodationMode, resAdults]);

  // Weekend & Seasonal Multiplier Calculation (e.g. Friday/Saturday nights have 1.15x multiplier)
  const rateMultiplier = React.useMemo(() => {
    if (!resCheckIn) return 1.0;
    const day = new Date(resCheckIn).getDay();
    // 5 = Friday, 6 = Saturday
    if (day === 5 || day === 6) return 1.15;
    return 1.0;
  }, [resCheckIn]);

  // Calculate nights
  const nights = React.useMemo(() => {
    if (!resCheckIn || !resCheckOut) return 1;
    const diff = new Date(resCheckOut).getTime() - new Date(resCheckIn).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [resCheckIn, resCheckOut]);

  // Rate Plan Package Price Override if applicable
  const packagePriceOverride = React.useMemo(() => {
    if (!selectedPackage) return null;
    if (selectedPackage.pricingType === "fixed_package" && selectedPackage.packagePrice) {
      return selectedPackage.packagePrice;
    }
    if (selectedPackage.pricingType === "discount_percent" && selectedPackage.discountPercent) {
      const standardCost = baseRatePerNight * rateMultiplier * nights;
      return Math.round(standardCost * (1 - selectedPackage.discountPercent / 100));
    }
    return null;
  }, [selectedPackage, baseRatePerNight, rateMultiplier, nights]);

  // Discount code application handler
  const handleApplyDiscountCode = () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setAppliedDiscount(null);
      return;
    }
    const matched = activeDiscounts.find((d) => d.code.toUpperCase() === code);
    if (matched) {
      if (matched.applicableTo === "restaurant") {
        toast({ title: "Dining Discount Only", description: `${matched.name} applies strictly to F&B and dining orders.`, variant: "destructive" });
        return;
      }
      if (matched.minNightsRequired && nights < matched.minNightsRequired) {
        toast({ title: "Minimum Stay Required", description: `This promo requires a minimum stay of ${matched.minNightsRequired} nights.`, variant: "destructive" });
        return;
      }
      if (matched.discountType === "percentage") {
        setAppliedDiscount({ code: matched.code, percent: matched.value, label: `${matched.name} (${matched.value}% OFF)` });
      } else {
        setAppliedDiscount({ code: matched.code, amount: matched.value, label: `${matched.name} (${matched.value} ETB OFF)` });
      }
      toast({ title: "Discount Applied", description: `${matched.name} applied to room folio.` });
    } else if (code === "SUMMER20") {
      setAppliedDiscount({ code: "SUMMER20", percent: 20, label: "Summer Special (20% OFF)" });
      toast({ title: "Discount Applied", description: "20% deducted from room rate." });
    } else if (code === "CORP-ETHIOAIR" || code === "ETHIOAIR") {
      setAppliedDiscount({ code: "CORP-ETHIOAIR", percent: 15, label: "Ethiopian Airlines Corporate (15% OFF)" });
      toast({ title: "Corporate Tariff Applied", description: "15% corporate rate discount applied." });
    } else if (code === "BOLE500" || code === "TRANSIT") {
      setAppliedDiscount({ code: "BOLE500", amount: 500, label: "Transit Voucher (500 ETB OFF)" });
      toast({ title: "Voucher Applied", description: "500 ETB deducted." });
    } else {
      toast({ title: "Invalid Promo Code", description: "Code not found or expired. Check active campaigns.", variant: "destructive" });
    }
  };

  // Calculation Breakdown
  const grossRoomCharge = React.useMemo(() => {
    if (packagePriceOverride !== null) return packagePriceOverride;
    return Math.round(baseRatePerNight * rateMultiplier * nights);
  }, [baseRatePerNight, rateMultiplier, nights, packagePriceOverride]);

  const discountAmount = React.useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.percent) {
      return Math.round((grossRoomCharge * appliedDiscount.percent) / 100);
    }
    if (appliedDiscount.amount) {
      return Math.min(appliedDiscount.amount, grossRoomCharge);
    }
    return 0;
  }, [appliedDiscount, grossRoomCharge]);

  const netRoomCharge = Math.max(0, grossRoomCharge - discountAmount);
  // Ethiopian Tax standard: 15% VAT + 2% Tourism/Municipal levy = 17% on Net Room Charge
  const taxAmount = Math.round(netRoomCharge * 0.17);
  // Final Folio: (Gross Rate * Multiplier - Discount) + Taxes + Incidentals/Deposit
  const finalFolioTotal = netRoomCharge + taxAmount + securityDeposit;

  // Count available rooms for the selected type
  const roomsForType = React.useMemo(() => {
    if (!resRoomTypeId) return availableRooms;
    return availableRooms.filter((r) => r.roomTypeId === resRoomTypeId);
  }, [availableRooms, resRoomTypeId]);

  const createResMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<CreatedReservation>("/reservations", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["guests-page-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
    },
    onError: (err: Error) => {
      toast({ title: "Reservation Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveReservation = (andProceedToCheckIn: boolean) => {
    if (!guest?.id) {
      toast({ title: "Error", description: "No guest selected", variant: "destructive" });
      return;
    }
    if (!resCheckIn || !resCheckOut) {
      toast({
        title: "Dates Required",
        description: "Please enter check-in and check-out dates",
        variant: "destructive",
      });
      return;
    }

    const accompanying = guest.accompanyingGuests || [];
    let composedNotes = "";
    if (accompanying.length > 0) {
      const rosterStr = accompanying
        .map((g) => `${g.fullName} (${g.relationship}, ${g.gender}, ${g.ageCategory}${g.idNumber ? `, ID: ${g.idNumber}` : ""})`)
        .join("; ");
      composedNotes += `[Accompanying Guests]: ${rosterStr}. `;
    }
    if (guest.hasRelationshipDoc) {
      composedNotes += `[Relationship]: ${guest.relationshipStatus?.toUpperCase()}${guest.relationshipDocNumber ? ` (#${guest.relationshipDocNumber})` : ""} - Document Attached: ${guest.relationshipDocName || "Verified"}. `;
    }

    // Append Lodging Policy & Accommodation Arrangement Notes
    if (Number(resAdults) >= 2) {
      if (accommodationMode === "separate_rooms") {
        const secTypeName = roomTypes.find((t) => t.id === (secondaryRoomTypeId || resRoomTypeId))?.name || "Standard Room";
        composedNotes += `[Lodging Policy - 2 Separate Rooms]: 1 Room for Primary Guest (${guest.firstName} ${guest.lastName}), 1 Room for Accompanying Guest (${accompanying[0]?.fullName || "Guest 2"}). Secondary Category: ${secTypeName}. `;
      } else {
        composedNotes += `[Lodging Policy - Twin Beds]: 2 Separate Beds in 1 Room (Twin Bed setup compliant). `;
      }
    }

    let finalSpecialRequests = resSpecialRequests || "";
    if (selectedPackage && selectedPackage.inclusions && selectedPackage.inclusions.length > 0) {
      const inclusionsTag = `Package [${selectedPackage.name}]: ${selectedPackage.inclusions.join(", ")}`;
      finalSpecialRequests = finalSpecialRequests ? `${finalSpecialRequests} | ${inclusionsTag}` : inclusionsTag;
    }
    if (Number(resAdults) >= 2) {
      const modeTag = accommodationMode === "separate_rooms" ? "2 Separate Rooms (1 per guest)" : "Twin Bed Configuration (2 Separate Beds)";
      if (!finalSpecialRequests.includes(modeTag)) {
        finalSpecialRequests = finalSpecialRequests ? `${finalSpecialRequests}, ${modeTag}` : modeTag;
      }
    }

    const payload: Record<string, unknown> = {
      guestId: guest.id,
      checkInDate: resCheckIn,
      checkOutDate: resCheckOut,
      adults: Number(resAdults) || 1,
      children: Number(resChildren) || 0,
      reservationType: resType || "walk_in",
      bookingSource: "direct",
      totalAmount: finalFolioTotal,
      paidAmount: 0,
      discountAmount: discountAmount,
      taxAmount: taxAmount,
      depositRequired: securityDeposit,
      ratePlan: ratePlan,
      packageId: selectedPackage?.id,
      packageName: selectedPackage?.name,
      packageInclusions: selectedPackage?.inclusions,
      discountCode: appliedDiscount?.code,
    };
    if (resRoomTypeId) payload.roomTypeId = resRoomTypeId;
    if (finalSpecialRequests) payload.specialRequests = finalSpecialRequests;
    if (composedNotes) payload.notes = composedNotes;

    createResMutation.mutate(payload, {
      onSuccess: (newRes) => {
        toast({
          title: "Reservation Created Successfully",
          description: `Booking #${newRes.reservationNumber || "Confirmed"} saved for ${guest.firstName} ${guest.lastName}.`,
        });
        const enrichedRes: CreatedReservation = {
          ...newRes,
          notes: (newRes.notes || "") + (composedNotes ? (newRes.notes ? " " : "") + composedNotes : ""),
          specialRequests: finalSpecialRequests,
          accompanyingGuests: accompanying,
          hasRelationshipDoc: guest.hasRelationshipDoc,
          relationshipStatus: guest.relationshipStatus,
          relationshipDocName: guest.relationshipDocName,
          relationshipDocUrl: guest.relationshipDocUrl,
          relationshipDocNumber: guest.relationshipDocNumber,
          accommodationMode,
          roomCount: accommodationMode === "separate_rooms" ? 2 : 1,
          secondaryRoomTypeId: accommodationMode === "separate_rooms" ? (secondaryRoomTypeId || resRoomTypeId) : undefined,
          secondaryRoomTypeName: accommodationMode === "separate_rooms"
            ? (roomTypes.find((t) => t.id === (secondaryRoomTypeId || resRoomTypeId))?.name || "Standard Room")
            : undefined,
        };
        onOpenChange(false);
        if (andProceedToCheckIn && onProceedToCheckIn) {
          onProceedToCheckIn(enrichedRes, guest);
        } else if (onSuccessReserveOnly) {
          onSuccessReserveOnly(enrichedRes);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 flex flex-col max-h-[90vh] overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-[#0D1527]">
        <DialogHeader className="px-6 py-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Room Reservation Booking
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Define stay dates, select room category, verify lodging policy, and confirm booking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Guest Identity Context Banner */}
          {guest && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {guest.firstName} {guest.middleName ? `${guest.middleName} ` : ""}{guest.lastName}
                      </span>
                      {guest.vipStatus && (
                        <Badge variant="warning" className="text-[10px] py-0 px-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          ⭐ VIP
                        </Badge>
                      )}
                      {guest.hasRelationshipDoc && (
                        <Badge className="text-[10px] py-0 px-1.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 gap-1 font-semibold">
                          <Heart className="w-2.5 h-2.5 fill-rose-500/30" />
                          <span>{guest.relationshipStatus?.toUpperCase()}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[guest.guestCode, guest.phone, guest.nationality || "Ethiopian"].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Accompanying Guests Sub-banner */}
              {guest.accompanyingGuests && guest.accompanyingGuests.length > 0 && (
                <div className="pt-2 border-t border-primary/15 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Accompanying ({guest.accompanyingGuests.length}):</span>
                  </span>
                  {guest.accompanyingGuests.map((acc) => (
                    <Badge
                      key={acc.id}
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-2 font-medium"
                    >
                      {acc.fullName} ({acc.relationship})
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* SECTION: ACCOMMODATION & BED ARRANGEMENT COMPLIANCE (FOR 2+ ADULTS) */}
            {Number(resAdults) >= 2 && (
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Lodging Policy & Bed Arrangement (Multiple Adults)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10">
                    Hospitality Compliance
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Twin Beds in 1 Room */}
                  <div
                    onClick={() => setAccommodationMode("twin_beds")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      accommodationMode === "twin_beds"
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500 shadow-xs"
                        : "border-border bg-white dark:bg-[#0B132B] hover:border-emerald-500/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          accommodationMode === "twin_beds" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          🛏️🛏️
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Twin Bed Room</p>
                          <p className="text-[10px] text-muted-foreground">2 Separate Beds in 1 Room</p>
                        </div>
                      </div>
                      {accommodationMode === "twin_beds" && (
                        <Badge className="text-[9px] bg-emerald-500 text-white hover:bg-emerald-600 px-1.5 py-0">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground border-t border-border/50 pt-1.5 flex items-center justify-between">
                      <span>Room Count: <strong>1 Room</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Compliant & Economical</span>
                    </div>
                  </div>

                  {/* Option 2: 2 Separate Rooms */}
                  <div
                    onClick={() => setAccommodationMode("separate_rooms")}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      accommodationMode === "separate_rooms"
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                        : "border-border bg-white dark:bg-[#0B132B] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          accommodationMode === "separate_rooms" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          🚪🚪
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Separate Rooms</p>
                          <p className="text-[10px] text-muted-foreground">2 Independent Rooms (1 per guest)</p>
                        </div>
                      </div>
                      {accommodationMode === "separate_rooms" && (
                        <Badge className="text-[9px] bg-primary text-white hover:bg-primary/90 px-1.5 py-0">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground border-t border-border/50 pt-1.5 flex items-center justify-between">
                      <span>Room Count: <strong>2 Rooms</strong></span>
                      <span className="text-primary font-semibold">✓ Maximum Privacy</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 1: ROOM CATEGORY & INVENTORY */}
            <div className="space-y-3">
              <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {accommodationMode === "separate_rooms"
                      ? "Room Category (Primary & Secondary Units)"
                      : "Room Category"}
                  </span>
                </span>
                {accommodationMode === "separate_rooms" && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">
                    2 Rooms Requested
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="resRoomTypeId" className="text-xs font-semibold">
                    {accommodationMode === "separate_rooms" ? "Primary Room Category *" : "Room Category *"}
                  </Label>
                  <select
                    id="resRoomTypeId"
                    value={resRoomTypeId}
                    onChange={(e) => {
                      setResRoomTypeId(e.target.value);
                      if (!secondaryRoomTypeId) setSecondaryRoomTypeId(e.target.value);
                    }}
                    className="h-10 w-full rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">-- Select Room Type --</option>
                    {roomTypes.map((t) => {
                      const cleanName = t.name?.replace(/\s*\(.*?\)/g, "").trim() || t.name;
                      return (
                        <option key={t.id} value={t.id}>
                          {cleanName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Available Units
                  </Label>
                  <div className="h-10 px-3 flex items-center justify-between rounded-md border border-border bg-muted/30 text-sm">
                    <span className="font-medium text-foreground">
                      {roomsForType.length} {roomsForType.length === 1 ? "room" : "rooms"} available
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning if user picked a single King Bed room for Twin Bed mode */}
              {Number(resAdults) >= 2 &&
                accommodationMode === "twin_beds" &&
                !guest?.hasRelationshipDoc &&
                (roomTypes.find((t) => t.id === resRoomTypeId)?.name || "").toLowerCase().includes("king") && (
                  <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2 animate-in fade-in-50">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Bed Setup Advisory:</strong> &quot;{roomTypes.find((t) => t.id === resRoomTypeId)?.name}&quot; features a single King bed. For twin bed compliance, <strong>Standard Room</strong> (Twin configuration) or a <strong>Twin Suite</strong> is recommended so each guest has an individual bed.
                    </span>
                  </div>
                )}

              {/* Secondary Room Selector when 2 Separate Rooms is chosen */}
              {Number(resAdults) >= 2 && accommodationMode === "separate_rooms" && (
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secondaryRoomTypeId" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-primary" />
                      <span>Secondary Room (for Accompanying Guest: {guest?.accompanyingGuests?.[0]?.fullName || "Guest 2"})</span>
                    </Label>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      Unit 2 Allocation
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      id="secondaryRoomTypeId"
                      value={secondaryRoomTypeId || resRoomTypeId}
                      onChange={(e) => setSecondaryRoomTypeId(e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                    >
                      {roomTypes.map((t) => {
                        const cleanName = t.name?.replace(/\s*\(.*?\)/g, "").trim() || t.name;
                        return (
                          <option key={t.id} value={t.id}>
                            {cleanName}
                          </option>
                        );
                      })}
                    </select>
                    <div className="h-9 px-3 flex items-center justify-between rounded-md border border-border/80 bg-white/70 dark:bg-[#0E172E]/70 text-xs">
                      <span className="text-muted-foreground">Independent Keycard & Folio:</span>
                      <span className="font-semibold text-foreground">Auto-assigned</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: STAY DETAILS */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Stay Details</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary font-mono border-primary/30">
                  {nights} {nights === 1 ? "Night" : "Nights"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="resCheckIn" className="text-xs font-semibold">
                    Check-in Date *
                  </Label>
                  <Input
                    id="resCheckIn"
                    type="date"
                    value={resCheckIn}
                    onChange={(e) => setResCheckIn(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="resCheckOut" className="text-xs font-semibold">
                    Check-out Date *
                  </Label>
                  <Input
                    id="resCheckOut"
                    type="date"
                    value={resCheckOut}
                    onChange={(e) => setResCheckOut(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="resAdults" className="text-xs font-semibold">
                    Adults
                  </Label>
                  <Input
                    id="resAdults"
                    type="number"
                    min="1"
                    max="10"
                    value={resAdults}
                    onChange={(e) => setResAdults(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="resChildren" className="text-xs font-semibold">
                    Children
                  </Label>
                  <Input
                    id="resChildren"
                    type="number"
                    min="0"
                    max="10"
                    value={resChildren}
                    onChange={(e) => setResChildren(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Active Compliance Status Indicator */}
              {Number(resAdults) >= 2 && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      <strong>Compliance Active:</strong> {accommodationMode === "separate_rooms" ? "2 Separate Rooms allocated" : "Twin Bed setup (2 Separate Beds) allocated"} for {resAdults} adults.
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10">
                    {accommodationMode === "separate_rooms" ? "2 Separate Rooms" : "1 Room • Twin Beds"}
                  </Badge>
                </div>
              )}
            </div>


            {/* SECTION 4: RATE PLAN, DISCOUNTS & FINAL FOLIO BREAKDOWN */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rate Plan, Discounts & Live Folio Calculation</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-mono">
                  MoR Tax Compliant
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Rate Plan / Package Selector & Promo Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ratePlan" className="text-xs font-semibold flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-blue-700" />
                      <span>Rate Plan / Promotional Package</span>
                    </Label>
                    <select
                      id="ratePlan"
                      value={ratePlan}
                      onChange={(e) => setRatePlan(e.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 py-2 text-xs text-foreground cursor-pointer"
                    >
                      <option value="standard">Standard Flexible Rate (Dynamic Daily)</option>
                      {activePackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.pricingType === "fixed_package" ? `${pkg.packagePrice?.toLocaleString()} ETB Fixed` : `${pkg.discountPercent}% Off`})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Promo / Discount Coupon Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="discountCode" className="text-xs font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-700" />
                      <span>Promotional Coupon / Corporate Code</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="discountCode"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="e.g. SUMMER20, ETHIOAIR"
                        className="h-10 text-xs font-mono uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyDiscountCode}
                        className="h-10 px-3 text-xs font-semibold shrink-0 cursor-pointer"
                      >
                        Apply
                      </Button>
                    </div>
                    {appliedDiscount && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-600 font-medium px-1">
                        <span>✓ {appliedDiscount.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedDiscount(null);
                            setDiscountCode("");
                          }}
                          className="text-[10px] text-muted-foreground hover:text-red-500 underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Package Inclusions Showcase */}
                {selectedPackage && selectedPackage.inclusions && selectedPackage.inclusions.length > 0 && (
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Included Package Amenities ({selectedPackage.name}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPackage.inclusions.map((inc, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-500/20"
                        >
                          <Check className="w-3 h-3 text-blue-600" />
                          <span>{inc}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Live Formula Breakdown Card */}
              <div className="rounded-xl border border-border bg-muted/30 dark:bg-[#0A1020] p-4 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground font-sans text-xs">
                    Room Rate ({baseRatePerNight.toLocaleString()} ETB/night × {nights} {nights === 1 ? "night" : "nights"}{rateMultiplier > 1.0 ? ` @ ${rateMultiplier}x weekend` : ""}):
                  </span>
                  <span className="font-semibold text-foreground">
                    ETB {grossRoomCharge.toLocaleString()}.00
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 font-semibold">
                    <span className="font-sans text-xs">
                      Promotional Discount ({appliedDiscount?.code}):
                    </span>
                    <span>- ETB {discountAmount.toLocaleString()}.00</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-sans text-xs">
                    Net Room Subtotal:
                  </span>
                  <span>ETB {netRoomCharge.toLocaleString()}.00</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-sans text-xs">
                    Taxes (15% VAT + 2% Tourism Levy on Net Subtotal):
                  </span>
                  <span>+ ETB {taxAmount.toLocaleString()}.00</span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-sans text-xs">
                    Incidentals & Security Deposit (Refundable at Check-out):
                  </span>
                  <span>+ ETB {securityDeposit.toLocaleString()}.00</span>
                </div>

                {/* Final Folio Formula Total */}
                <div className="pt-2.5 border-t-2 border-border flex items-center justify-between text-sm font-bold text-foreground">
                  <div className="font-sans">
                    <span>Estimated Final Folio</span>
                    <p className="text-[10px] text-muted-foreground font-normal">
                      Formula: (Base Rate × Multiplier − Discount) + Taxes + Incidentals
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base text-primary font-bold">
                      ETB {finalFolioTotal.toLocaleString()}.00
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: OTHER / SPECIAL REQUESTS CATALOG DROPDOWN */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Special Requests</span>
              </div>

              <div className="space-y-1.5">
                <SpecialRequestsMultiSelect
                  id="resSpecialRequests"
                  value={resSpecialRequests}
                  onChange={setResSpecialRequests}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            {onBack ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={onBack}
                title="Back to Guest Registration"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs sm:text-sm font-medium px-4"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm font-semibold border-primary/30 text-primary hover:bg-primary/10"
              disabled={createResMutation.isPending}
              onClick={() => handleSaveReservation(false)}
            >
              {createResMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reserve Only
            </Button>

            <Button
              type="button"
              className="h-10 px-5 flex items-center gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-600/20 text-xs sm:text-sm"
              disabled={createResMutation.isPending}
              onClick={() => handleSaveReservation(true)}
              title="Proceed to Check-In"
              aria-label="Proceed to Check-In"
            >
              {createResMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Save & Check-In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

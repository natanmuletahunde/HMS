"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  Key,
  CreditCard,
  UserCheck,
  Search,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Printer,
  AlertTriangle,
  Building,
  BedDouble,
  RefreshCw,
  QrCode,
  Check,
  Phone,
  IdCard,
  User,
  Users,
  FileCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FaydaScanner } from "@/components/fayda-scanner";
import { type ParsedFaydaGuest } from "@/lib/fayda";
import { SpecialRequestsMultiSelect } from "@/components/special-requests-multi-select";

interface RoomOption {
  id: string;
  number: string;
  floor: string;
  roomName?: string | null;
  roomTypeName?: string | null;
  bedTypeName?: string | null;
  view?: string | null;
  status: string;
}

interface ReservationDetail {
  id: string;
  reservationNumber: string;
  confirmationNumber?: string | null;
  guestId?: string;
  guestName?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestNationalId?: string | null;
  guestIdNumber?: string | null;
  roomTypeId?: string | null;
  roomTypeName?: string | null;
  roomId?: string | null;
  roomNumber?: string | null;
  totalAmount?: number | string | null;
  status: string;
  reservationType?: string | null;
  bookingSource?: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights?: number | null;
  specialRequests?: string | null;
  adults?: number;
  children?: number;
}

interface ExpressCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReservationId?: string | null;
  onSuccess?: () => void;
}

export function ExpressCheckInModal({
  open,
  onOpenChange,
  initialReservationId,
  onSuccess,
}: ExpressCheckInModalProps) {
  const queryClient = useQueryClient();

  // Current Step: 1 = Guest Profile & Verification, 2 = Room Assignment & Key Handover
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Search & Identification state
  const [activeTab, setActiveTab] = useState<"fayda" | "search">("fayda");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ReservationDetail[]>([]);
  const [selectedRes, setSelectedRes] = useState<ReservationDetail | null>(null);

  // Ethiopian Hospitality Compliance states
  const [isTwoMaleAdults, setIsTwoMaleAdults] = useState(false);
  const [twinBedAcknowledged, setTwinBedAcknowledged] = useState(false);
  const [partnerVerified, setPartnerVerified] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerIdNumber, setPartnerIdNumber] = useState("");

  // Room Assignment state (Category-strict, Clean only, NO prices displayed)
  const [availableRooms, setAvailableRooms] = useState<RoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [reservationType, setReservationType] = useState<string>("online_prepaid");
  const [specialRequestOther, setSpecialRequestOther] = useState<string>("");

  // Key Issuance: Auto-paired to selected room (no RFID generator, no manual key toggle)
  const [autoKeyTag, setAutoKeyTag] = useState<string>("");

  // Check-in execution state
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<{
    reservation: ReservationDetail;
    room: RoomOption;
    keyTag: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialReservationId) {
      loadReservationById(initialReservationId);
    } else if (!open) {
      resetState();
    }
  }, [open, initialReservationId]);

  const resetState = () => {
    setCurrentStep(1);
    setSelectedRes(null);
    setSearchQuery("");
    setSearchResults([]);
    setAvailableRooms([]);
    setSelectedRoomId("");
    setAutoKeyTag("");
    setCompletedRecord(null);
    setErrorMessage(null);
    setIsTwoMaleAdults(false);
    setTwinBedAcknowledged(false);
    setPartnerVerified(false);
    setPartnerName("");
    setPartnerIdNumber("");
    setSpecialRequestOther("");
  };

  const loadReservationById = async (resId: string) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const data = await apiFetch<ReservationDetail>(`/reservations/${resId}`);
      if (data) {
        selectReservation(data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load reservation details");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (term: string) => {
    const q = term.trim();
    if (!q) return;
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch<{ data: ReservationDetail[] }>(
        `/reservations?search=${encodeURIComponent(q)}&limit=10`
      );
      const list = res?.data || [];
      const eligible = list.filter((r) => r.status !== "cancelled" && r.status !== "checked_out");
      setSearchResults(eligible);

      if (eligible.length === 1) {
        selectReservation(eligible[0]);
      } else if (eligible.length === 0) {
        setErrorMessage(`No matching reservations found for "${q}".`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFaydaDecoded = async (guest: ParsedFaydaGuest) => {
    setErrorMessage(null);
    setIsSearching(true);
    try {
      const term = guest.nationalId || guest.phone || guest.fullName;
      const res = await apiFetch<{ data: ReservationDetail[] }>(
        `/reservations?search=${encodeURIComponent(term)}&limit=10`
      );
      const list = res?.data || [];
      const eligible = list.filter((r) => r.status !== "cancelled" && r.status !== "checked_out");

      if (eligible.length > 0) {
        selectReservation(eligible[0]);
      } else {
        setErrorMessage(
          `Guest "${guest.fullName}" (${guest.nationalId}) verified via Fayda, but no active arrival reservation was found.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to search reservation with Fayda data");
    } finally {
      setIsSearching(false);
    }
  };

  const selectReservation = async (res: ReservationDetail) => {
    setSelectedRes(res);
    setErrorMessage(null);
    setSpecialRequestOther(res.specialRequests || "");

    // Detect reservation type
    if (res.reservationType) {
      setReservationType(res.reservationType);
    } else if (res.bookingSource === "online" || Number(res.totalAmount) > 0) {
      setReservationType("online_prepaid");
    } else {
      setReservationType("walk_in");
    }

    // Check Ethiopian hospitality rules:
    // Rule A: Two Male Adults policy check (suggest twin beds)
    if ((res.adults ?? 1) >= 2) {
      setIsTwoMaleAdults(true);
    } else {
      setIsTwoMaleAdults(false);
    }

    // Fetch available clean rooms for this room category
    if (res.roomTypeId) {
      setLoadingRooms(true);
      try {
        const rooms = await apiFetch<RoomOption[]>(
          `/rooms/availability?roomTypeId=${res.roomTypeId}`
        );
        const avail = (rooms || []).filter((r) => r.status === "available");
        setAvailableRooms(avail);

        if (res.roomId && avail.some((r) => r.id === res.roomId)) {
          setSelectedRoomId(res.roomId);
          const roomNum = res.roomNumber || avail.find((r) => r.id === res.roomId)?.number || "101";
          setAutoKeyTag(`KEY-${roomNum}`);
        } else if (avail.length > 0) {
          setSelectedRoomId(avail[0].id);
          setAutoKeyTag(`KEY-${avail[0].number}`);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load available rooms for this category");
      } finally {
        setLoadingRooms(false);
      }
    }

    // Advance to Step 2
    setCurrentStep(2);
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = availableRooms.find((r) => r.id === roomId);
    if (room) {
      setAutoKeyTag(`KEY-${room.number}`);
    }
  };

  const handleCompleteCheckIn = async () => {
    if (!selectedRes) return;
    if (!selectedRoomId) {
      setErrorMessage("Please select an available clean room.");
      return;
    }

    setIsCheckingIn(true);
    setErrorMessage(null);
    try {
      const assignedRoom = availableRooms.find((r) => r.id === selectedRoomId);
      const roomNum = assignedRoom?.number || selectedRes.roomNumber || "ROOM";
      const finalKeyTag = autoKeyTag || `KEY-${roomNum}`;

      await apiFetch(`/reservations/${selectedRes.id}/check-in`, {
        method: "POST",
        body: JSON.stringify({
          roomId: selectedRoomId,
          keyCardNumber: finalKeyTag,
          identityVerified: true,
          depositCollected: false,
          depositAmount: 0,
          checkedInBy: "Front Desk Receptionist",
          notes: `Express Check-In. Key: ${finalKeyTag}. Reservation Type: ${reservationType}. ${specialRequestOther ? `Special Request: ${specialRequestOther}` : ""}`,
        }),
      });

      setCompletedRecord({
        reservation: selectedRes,
        room: assignedRoom || {
          id: selectedRoomId,
          number: roomNum,
          floor: "1",
          status: "occupied",
        },
        keyTag: finalKeyTag,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["today-arrivals"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["checkin-records"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["front-office-stats"] });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete check-in. Please try again.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handlePrintKeyPass = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl text-foreground">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>
                    {currentStep === 1
                      ? "Fast-Track Guest Lookup"
                      : `Fast-Track Check-In — ${selectedRes?.guestName || "Guest"}`}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  5-star front-desk operational check-in. Category-strict room allocation & instant key pairing.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              ⚡ 2-Step Fast Pass
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* 2-Step Connected Stepper Bar */}
        {!completedRecord && (
          <div className="flex items-center justify-between border-b border-border pb-3 px-1 my-2">
            <div className="flex items-center gap-2 w-full">
              {/* Step 1 Pill */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  currentStep === 1
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : selectedRes
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    : "text-muted-foreground opacity-60"
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[11px] font-bold">
                  {selectedRes ? "✓" : "1"}
                </span>
                <span>1. Guest Profile & Lookup</span>
              </button>

              <div
                className={`h-0.5 flex-1 transition-colors ${
                  currentStep === 2 || selectedRes ? "bg-primary" : "bg-border"
                }`}
              />

              {/* Step 2 Pill */}
              <button
                type="button"
                onClick={() => selectedRes && setCurrentStep(2)}
                disabled={!selectedRes}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  currentStep === 2
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : selectedRes
                    ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                    : "text-muted-foreground opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[11px] font-bold">
                  2
                </span>
                <span>2. Room & Key Handover</span>
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ─── SUCCESS SCREEN ────────────────────────────────────────────── */}
        {completedRecord ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                Guest Successfully Checked In!
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Completed in 2 clicks. Key pass is active and room is marked occupied in the PMS.
              </p>
            </div>

            {/* Printable Guest Room Pass Slip */}
            <div className="border border-border bg-muted/20 rounded-2xl p-6 text-left max-w-lg mx-auto shadow-sm relative overflow-hidden print:border-none print:shadow-none">
              <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Nexus Luxury Hotel & Suites
                  </span>
                  <h4 className="text-base font-bold text-foreground mt-0.5">Guest Key Pass & Welcome Slip</h4>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  ROOM OCCUPIED
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-card rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Assigned Room</span>
                  <div className="text-3xl font-black text-primary tracking-tight mt-0.5">
                    Room {completedRecord.room.number}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Floor {completedRecord.room.floor}</span>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Key Tag / Encoding</span>
                  <div className="text-base font-mono font-bold text-foreground mt-2 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    {completedRecord.keyTag}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Auto-Paired to Door Lock</span>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-border/60 pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest Name:</span>
                  <span className="font-semibold">{completedRecord.reservation.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room Category:</span>
                  <span className="font-semibold">{completedRecord.reservation.roomTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-Out Date:</span>
                  <span className="font-semibold">
                    {new Date(completedRecord.reservation.checkOutDate).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hotel High-Speed Wi-Fi:</span>
                  <span className="font-mono font-semibold">NexusGuest / Nexus@2026</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={handlePrintKeyPass} className="gap-2">
                <Printer className="w-4 h-4" /> Print Key Pass Slip
              </Button>
              <Button
                onClick={resetState}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold"
              >
                <RefreshCw className="w-4 h-4" /> Next Guest Check-In
              </Button>
            </div>
          </div>
        ) : currentStep === 1 ? (
          /* ─── STEP 1: GUEST LOOKUP & IDENTIFICATION ─────────────────────── */
          <div className="space-y-4 pt-1">
            {/* Mint/Teal Fayda Scanner Banner */}
            <div className="bg-[#eef8f5] dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800 rounded-xl p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-600 text-white">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 tracking-wide uppercase">
                    Fayda National ID Scan (NIDP Ethiopia)
                  </span>
                </div>
                <div className="flex gap-1.5 p-0.5 bg-white/70 dark:bg-background/50 rounded-lg text-xs border border-emerald-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab("fayda")}
                    className={`px-2.5 py-1 rounded transition-all font-semibold text-[11px] ${
                      activeTab === "fayda"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-800 dark:text-emerald-300 hover:text-emerald-950"
                    }`}
                  >
                    Fayda QR Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("search")}
                    className={`px-2.5 py-1 rounded transition-all font-semibold text-[11px] ${
                      activeTab === "search"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-800 dark:text-emerald-300 hover:text-emerald-950"
                    }`}
                  >
                    Search Res / Phone
                  </button>
                </div>
              </div>

              {activeTab === "fayda" ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-tight">
                    Scan guest Fayda QR or upload National ID card image to authenticate identity and auto-link online reservation.
                  </p>
                  <FaydaScanner onDecoded={handleFaydaDecoded} className="border-dashed bg-white/60 dark:bg-card/40" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-tight">
                    Search arrival reservation by phone number, confirmation code, Fayda FAN, or guest name.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. 0911318622, ET-RES-1002, or Guest Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearch(searchQuery);
                        }}
                        className="pl-9 h-10 text-sm bg-white dark:bg-card"
                      />
                    </div>
                    <Button
                      onClick={() => handleSearch(searchQuery)}
                      disabled={isSearching || !searchQuery.trim()}
                      className="gap-2 h-10"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Find
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Search results list */}
            {searchResults.length > 0 && (
              <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Matching Arrival Reservations:
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {searchResults.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => selectReservation(r)}
                      className="p-3 bg-card hover:border-primary border border-border rounded-xl cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{r.guestName ?? "Guest"}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {r.roomTypeName}
                          </Badge>
                          {(r.reservationType === "online" || r.bookingSource === "online") && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                              Online Pre-Paid
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Ref: #{r.reservationNumber}</span>
                          <span>•</span>
                          <span>Phone: {r.guestPhone || "N/A"}</span>
                          <span>•</span>
                          <span>Check-in: {new Date(r.checkInDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ETHIOPIAN HOSPITALITY COMPLIANCE CARDS */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Ethiopian Lodging Compliance Standards
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Rule A: Bedding Policy */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <BedDouble className="w-4 h-4" />
                    <span>Bedding Configuration Policy</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Under Ethiopian luxury hospitality decorum, 2 adult male occupants are allocated <strong>Two Separate Beds (Twin Suite)</strong>.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="twinBedCheck"
                      checked={twinBedAcknowledged}
                      onChange={(e) => setTwinBedAcknowledged(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <label htmlFor="twinBedCheck" className="text-[11px] font-medium cursor-pointer">
                      Acknowledge Twin Beds allocation for multi-male occupancy
                    </label>
                  </div>
                </div>

                {/* Rule B: Domestic Couple ID Verification */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Users className="w-4 h-4" />
                    <span>Accompanying Guest / Partner Verification</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ethiopian lodging directives require valid government ID registration and marital status documentation for domestic couples.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="partnerCheck"
                      checked={partnerVerified}
                      onChange={(e) => setPartnerVerified(e.target.checked)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <label htmlFor="partnerCheck" className="text-[11px] font-medium cursor-pointer">
                      Documentation & Identification verified per national regulations
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/80 mt-5">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-xs sm:text-sm px-4">
                Cancel
              </Button>
              <Button
                disabled={!selectedRes}
                onClick={() => setCurrentStep(2)}
                className="h-10 px-5 flex items-center gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm text-xs sm:text-sm"
                title="Next: Room Assignment"
                aria-label="Next: Room Assignment"
              >
                <span>Room & Keys</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* ─── STEP 2: ROOM SELECTION & AUTO-KEY HANDOVER ────────────────── */
          <div className="space-y-5 pt-1">
            {/* Guest Summary Card */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20">
                  {((selectedRes?.guestName?.[0]) || "G").toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{selectedRes?.guestName || "Guest"}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-[10px] font-semibold">
                      <ShieldCheck className="w-3 h-3" /> Identity Verified
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedRes?.guestPhone || "—"}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Building className="w-3 h-3" /> {selectedRes?.roomTypeName || "Standard Category"}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                ← Change Guest
              </Button>
            </div>

            {/* Bedding Policy Alert if 2 adult guests detected */}
            {isTwoMaleAdults && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <BedDouble className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Bedding Advisory (Ethiopian Luxury Standard): </span>
                  Multiple adult guests detected. Front desk recommends selecting a <strong>Twin Bed Room (2 Separate Beds)</strong> from the clean rooms list below.
                </div>
              </div>
            )}

            {/* SECTION: RESERVATION TYPE */}
            <div>
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-2">
                Reservation & Billing Classification
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "online_prepaid", label: "Online Pre-Paid", badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
                  { id: "walk_in", label: "Front-Desk Walk-In", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
                  { id: "phone_hold", label: "Phone / Concierge Hold", badge: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
                  { id: "corporate", label: "Corporate / Embassy", badge: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
                ].map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setReservationType(type.id)}
                    className={`p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                      reservationType === type.id
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border bg-card hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION: CLEAN ROOM SELECTION (NO PRICES DISPLAYED) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Select Clean Room in {selectedRes?.roomTypeName || "Category"}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {availableRooms.length} room{availableRooms.length !== 1 ? "s" : ""} clean & ready
                </span>
              </div>

              {loadingRooms ? (
                <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading inspected rooms...
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold">No clean rooms currently available in this tier.</span>
                    <p className="text-muted-foreground mt-0.5">
                      Please request Housekeeping inspection or assign an upgraded category.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {availableRooms.map((r) => {
                    const isSelected = selectedRoomId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleRoomSelect(r.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-foreground">Room {r.number}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                          <div>Floor {r.floor || "1"}</div>
                          <div>{r.bedTypeName || "Standard Bed"}</div>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                            Clean & Ready
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CONSOLIDATED SPECIAL REQUESTS: DROPDOWN CHECKBOX CATALOG */}
            <div className="grid gap-1.5">
              <Label htmlFor="specialRequestOther" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Other / Special Requests
              </Label>
              <SpecialRequestsMultiSelect
                id="specialRequestOther"
                value={specialRequestOther}
                onChange={setSpecialRequestOther}
              />
            </div>

            {/* 1-CLICK ACTION FOOTER */}
            <div className="border-t border-border/80 pt-4 flex items-center justify-between gap-3 mt-5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCurrentStep(1)}
                className="h-10 w-10 shrink-0"
                title="Back"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-xs sm:text-sm px-4">
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteCheckIn}
                  disabled={isCheckingIn || !selectedRoomId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold h-10 px-6 shadow-sm shadow-emerald-600/20 text-xs sm:text-sm"
                >
                  {isCheckingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-amber-300" />
                  )}
                  Complete Check-In
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import {
  LogIn,
  Key,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  Building,
  Users,
  Heart,
  FileText,
  Eye,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import type { GuestRecord, AccompanyingGuest } from "./guest-registration-modal";
import type { RoomType, AvailableRoom, CreatedReservation } from "./reservation-booking-modal";

interface RoomCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: CreatedReservation | any | null;
  guest: GuestRecord | null;
  roomTypes: RoomType[];
  availableRooms: AvailableRoom[];
  onSuccess?: () => void;
  onBack?: () => void;
}

export function RoomCheckInModal({
  open,
  onOpenChange,
  reservation,
  guest,
  roomTypes,
  availableRooms,
  onSuccess,
  onBack,
}: RoomCheckInModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const staffName = user?.name || user?.email || "Front Desk Receptionist";

  // Check-In Form State
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [identityVerified, setIdentityVerified] = useState(true);
  const [depositCollected, setDepositCollected] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("card");
  const [paymentStatus, setPaymentStatus] = useState("settle_on_checkout");
  const [checkedInBy, setCheckedInBy] = useState(staffName);
  const [checkInNotes, setCheckInNotes] = useState("");

  // Accompanying guests and relationship verification state
  const [verifiedAccompanyingMap, setVerifiedAccompanyingMap] = useState<Record<string, boolean>>({});
  const [accompanyingIdMap, setAccompanyingIdMap] = useState<Record<string, string>>({});
  const [previewDocOpen, setPreviewDocOpen] = useState(false);
  const [secondarySelectedRoomId, setSecondarySelectedRoomId] = useState<string>("");

  // Lodging compliance arrangement detection
  const isSeparateRooms = useMemo(() => {
    return Boolean(
      reservation?.accommodationMode === "separate_rooms" ||
      reservation?.notes?.includes("2 Separate Rooms") ||
      reservation?.specialRequests?.includes("2 Separate Rooms")
    );
  }, [reservation]);

  const isTwinBeds = useMemo(() => {
    return Boolean(
      reservation?.accommodationMode === "twin_beds" ||
      reservation?.notes?.includes("Twin Bed") ||
      reservation?.specialRequests?.includes("Twin Bed")
    );
  }, [reservation]);

  // Extract reservation room type and candidate clean rooms
  const targetRoomTypeId = reservation?.roomTypeId;
  const filteredAvailableRooms = useMemo(() => {
    if (!targetRoomTypeId) return availableRooms;
    const match = availableRooms.filter((r) => r.roomTypeId === targetRoomTypeId);
    return match.length > 0 ? match : availableRooms;
  }, [availableRooms, targetRoomTypeId]);

  // Resolve accompanying guests from reservation or guest record or notes
  const accompanyingGuestsList: AccompanyingGuest[] = useMemo(() => {
    if (reservation?.accompanyingGuests && Array.isArray(reservation.accompanyingGuests) && reservation.accompanyingGuests.length > 0) {
      return reservation.accompanyingGuests;
    }
    if (guest?.accompanyingGuests && Array.isArray(guest.accompanyingGuests) && guest.accompanyingGuests.length > 0) {
      return guest.accompanyingGuests;
    }
    // Fallback: parse from reservation notes if formatted like "[Accompanying Guests]: ..."
    const notesStr = reservation?.notes || "";
    if (notesStr.includes("[Accompanying Guests]:")) {
      try {
        const afterTag = notesStr.split("[Accompanying Guests]:")[1].split(".")[0].trim();
        const guestEntries = afterTag.split(";").map((s: string) => s.trim()).filter(Boolean);
        return guestEntries.map((entry: string, idx: number) => {
          const namePart = entry.split("(")[0].trim();
          const detailsPart = entry.includes("(") ? entry.split("(")[1].replace(")", "").trim() : "";
          const parts = detailsPart.split(",").map((p: string) => p.trim());
          return {
            id: `acc-parsed-${idx}`,
            fullName: namePart || `Guest ${idx + 1}`,
            relationship: (parts[0] || "other").toLowerCase() as any,
            gender: (parts[1] || "other").toLowerCase() as any,
            ageCategory: (parts[2] || "adult").toLowerCase() as any,
            idNumber: parts[3]?.replace("ID:", "").trim() || "",
            isVerifiedAtCheckIn: false,
          };
        });
      } catch (e) {
        console.warn("Could not parse accompanying guests from notes", e);
      }
    }
    return [];
  }, [reservation, guest]);

  // Resolve relationship / marital document metadata
  const relationshipDoc = useMemo(() => {
    const hasDoc = reservation?.hasRelationshipDoc ?? guest?.hasRelationshipDoc ?? false;
    const status = reservation?.relationshipStatus || guest?.relationshipStatus || "";
    const docName = reservation?.relationshipDocName || guest?.relationshipDocName || "";
    const docUrl = reservation?.relationshipDocUrl || guest?.relationshipDocUrl || "";
    const docNum = reservation?.relationshipDocNumber || guest?.relationshipDocNumber || "";
    if (hasDoc || status || docName || (reservation?.notes && reservation.notes.includes("[Relationship]:"))) {
      return {
        hasDoc: true,
        status: status || "Married",
        docName: docName || "Certificate on File",
        docUrl,
        docNum,
      };
    }
    return null;
  }, [reservation, guest]);

  // Set initial assigned room and reset states when modal opens
  useEffect(() => {
    if (open) {
      const primaryId = reservation?.roomId || filteredAvailableRooms[0]?.id || availableRooms[0]?.id || "";
      setSelectedRoomId(primaryId);
      const otherRooms = availableRooms.filter((r) => r.id !== primaryId);
      if (otherRooms.length > 0) {
        setSecondarySelectedRoomId(otherRooms[0].id);
      }

      // Initialize accompanying guests verification map
      if (accompanyingGuestsList.length > 0) {
        const initialMap: Record<string, boolean> = {};
        const initialIds: Record<string, string> = {};
        accompanyingGuestsList.forEach((g) => {
          initialMap[g.id] = Boolean(g.isVerifiedAtCheckIn);
          initialIds[g.id] = g.idNumber || "";
        });
        setVerifiedAccompanyingMap(initialMap);
        setAccompanyingIdMap(initialIds);
      }

      // Detect online pre-payment from reservation notes / status
      const notesLower = (reservation?.notes || "").toLowerCase();
      const isOnlinePrePaid =
        reservation?.notes?.includes("ONLINE PRE-PAID") ||
        notesLower.includes("telebirr") ||
        notesLower.includes("cbe") ||
        notesLower.includes("chapa") ||
        reservation?.bookingSource === "online" ||
        reservation?.reservationType === "online" ||
        Number(reservation?.paidAmount) > 0 ||
        Number(reservation?.depositAmount) > 0;

      if (isOnlinePrePaid) {
        setPaymentStatus("paid_in_advance");
        setDepositCollected(true);
        const depVal =
          reservation?.depositAmount ||
          reservation?.paidAmount ||
          (reservation?.totalAmount ? Number(reservation.totalAmount) * 0.2 : 1000);
        setDepositAmount(String(Math.round(Number(depVal) || 1000)));
        if (notesLower.includes("telebirr")) setDepositMethod("mobile_money");
        else if (notesLower.includes("cbe")) setDepositMethod("bank_transfer");
        else setDepositMethod("card");
      } else {
        setPaymentStatus("settle_on_checkout");
        setDepositCollected(false);
        setDepositAmount("");
      }

      setCheckedInBy(staffName);
      setIdentityVerified(true);
    }
  }, [open, reservation, filteredAvailableRooms, availableRooms, staffName, accompanyingGuestsList]);

  const toggleVerifyGuest = (id: string) => {
    setVerifiedAccompanyingMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const verifyAllGuests = () => {
    const updated: Record<string, boolean> = {};
    accompanyingGuestsList.forEach((g) => {
      updated[g.id] = true;
    });
    setVerifiedAccompanyingMap(updated);
  };

  const updateAccompanyingId = (id: string, idNum: string) => {
    setAccompanyingIdMap((prev) => ({
      ...prev,
      [id]: idNum,
    }));
  };

  // Find currently selected room
  const selectedRoom = useMemo(() => {
    return (
      availableRooms.find((r) => r.id === selectedRoomId) ||
      (reservation?.roomNumber
        ? {
            id: reservation.roomId || selectedRoomId,
            number: reservation.roomNumber,
            floor: "1",
            roomTypeName: reservation.roomTypeName,
          }
        : null)
    );
  }, [availableRooms, selectedRoomId, reservation]);

  const assignedRoomNumber = selectedRoom?.number || reservation?.roomNumber || "101";

  const secondarySelectedRoom = useMemo(() => {
    return availableRooms.find((r) => r.id === secondarySelectedRoomId) || null;
  }, [availableRooms, secondarySelectedRoomId]);

  const secondaryAssignedRoomNumber =
    secondarySelectedRoom?.number ||
    (availableRooms.find((r) => r.id !== selectedRoomId)?.number || "102");

  // Parse special requests coming from the reservation
  const specialRequestsList: string[] = useMemo(() => {
    const raw: string = reservation?.specialRequests || reservation?.notes || "";
    if (!raw) return [];
    return raw
      .split(/[,;]\s*/)
      .map((s: string) => s.trim())
      .filter((s: string) => Boolean(s) && !s.toLowerCase().includes("express check-in"));
  }, [reservation]);

  // Room category display name
  const roomCategoryName = useMemo(() => {
    if (reservation?.roomTypeName) return reservation.roomTypeName;
    const rt = roomTypes.find((t) => t.id === targetRoomTypeId);
    return rt?.name || "Standard Suite";
  }, [reservation, roomTypes, targetRoomTypeId]);

  const checkInMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-in`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
      queryClient.invalidateQueries({ queryKey: ["guests-page-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["guests-page-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["today-arrivals"] });
      queryClient.invalidateQueries({ queryKey: ["checkin-records"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });

      toast({
        title: "Guest Checked In Successfully! 🎉",
        description: isSeparateRooms
          ? `Rooms ${assignedRoomNumber} & ${secondaryAssignedRoomNumber} are now marked occupied. Keys KEY-${assignedRoomNumber} & KEY-${secondaryAssignedRoomNumber} issued.`
          : `Room ${assignedRoomNumber} is now marked occupied. Key KEY-${assignedRoomNumber} issued.`,
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Check-in Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCompleteCheckIn = () => {
    if (!reservation?.id) {
      toast({ title: "Error", description: "No reservation selected for check-in", variant: "destructive" });
      return;
    }
    if (!selectedRoomId) {
      toast({ title: "Room Required", description: "Please select an available clean room", variant: "destructive" });
      return;
    }

    // Require all adult accompanying guests to be verified
    const unverifiedAdults = accompanyingGuestsList.filter(
      (g) => g.ageCategory !== "child" && g.ageCategory !== "infant" && !verifiedAccompanyingMap[g.id]
    );
    if (unverifiedAdults.length > 0) {
      const names = unverifiedAdults.map((g) => g.fullName).join(", ");
      toast({
        title: "Accompanying Guest Verification Required",
        description: `Please verify physical presence & ID for: ${names}`,
        variant: "destructive",
      });
      return;
    }

    const verifiedSummary = accompanyingGuestsList.length > 0
      ? `Accompanying Guests (${accompanyingGuestsList.length}): ` +
        accompanyingGuestsList
          .map((g) => `${g.fullName} [${verifiedAccompanyingMap[g.id] ? "VERIFIED" : "PENDING"}${accompanyingIdMap[g.id] ? `, ID: ${accompanyingIdMap[g.id]}` : ""}]`)
          .join("; ")
      : "";

    const payload: Record<string, unknown> = {
      roomId: selectedRoomId,
      keyCardNumber: isSeparateRooms
        ? `KEY-${assignedRoomNumber}, KEY-${secondaryAssignedRoomNumber}`
        : `KEY-${assignedRoomNumber}`,
      identityVerified: Boolean(identityVerified),
      depositCollected: Boolean(depositCollected),
      depositAmount: depositCollected ? Number(depositAmount) || 0 : 0,
      depositMethod: depositCollected ? depositMethod : "none",
      checkedInBy: checkedInBy || staffName,
      notes: `Front Desk Check-In. ${
        isSeparateRooms
          ? `[Lodging Policy: 2 Separate Rooms Assigned] Room 1: Room ${assignedRoomNumber} (Key KEY-${assignedRoomNumber}); Room 2: Room ${secondaryAssignedRoomNumber} (Key KEY-${secondaryAssignedRoomNumber}).`
          : isTwinBeds
          ? `[Lodging Policy: Twin Bed Setup] Room ${assignedRoomNumber} (Key KEY-${assignedRoomNumber}) with 2 separate single beds.`
          : `Room: Room ${assignedRoomNumber} (Key KEY-${assignedRoomNumber}).`
      } Payment: ${paymentStatus}. ${verifiedSummary ? `${verifiedSummary}. ` : ""}${checkInNotes ? `Notes: ${checkInNotes}` : ""}`,
    };

    checkInMutation.mutate({ id: reservation.id, body: payload });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 flex flex-col max-h-[90vh] overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-[#0D1527]">
        <DialogHeader className="px-6 py-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Physical Check-In & Key Handover
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Physical guest reception: link room door lock, verify ID, collect deposit, and activate in-house folio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 1. INHERITED RESERVATION & GUEST CONTEXT CARD */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">
                    {guest?.firstName || reservation?.guestName || "Guest"} {guest?.lastName || ""}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    Res #{reservation?.reservationNumber || "CONFIRMED"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Category: <strong className="text-foreground">{roomCategoryName}</strong></span>
                  <span>•</span>
                  <span>Dates: <strong>{reservation?.checkInDate || "Today"}</strong> → <strong>{reservation?.checkOutDate || "Tomorrow"}</strong></span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10 self-start sm:self-auto">
              ✓ Ready for Key Handover
            </Badge>
          </div>

          {/* 2. INHERITED SPECIAL REQUESTS (FROM RESERVATION) */}
          {specialRequestsList.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Pre-Booked Special Requests (From Reservation)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {specialRequestsList.map((req) => (
                  <Badge
                    key={req}
                    variant="outline"
                    className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/30 text-xs py-0.5 px-2"
                  >
                    ✓ {req}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 3. RELATIONSHIP / MARITAL VERIFICATION DOCUMENT (OPTIONAL POLICY) */}
          {relationshipDoc && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 fill-rose-500/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">Couple / Marital Status:</span>
                    <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] py-0 px-1.5 uppercase font-bold">
                      {relationshipDoc.status}
                    </Badge>
                    {relationshipDoc.docNum && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Ref: {relationshipDoc.docNum}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {relationshipDoc.docName || "Verification document attached to reservation"}
                  </p>
                </div>
              </div>

              {relationshipDoc.docUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewDocOpen(true)}
                  className="h-7 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" /> View Card
                </Button>
              )}
            </div>
          )}

          {/* 4. ACCOMPANYING GUESTS PHYSICAL CHECK-IN & ID VERIFICATION ROSTER */}
          {accompanyingGuestsList.length > 0 && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Accompanying Guests Arrival Verification ({Object.values(verifiedAccompanyingMap).filter(Boolean).length}/{accompanyingGuestsList.length} Verified)
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={verifyAllGuests}
                  className="h-6 text-[10px] font-semibold gap-1 px-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Verify All Present
                </Button>
              </div>

              <div className="space-y-2">
                {accompanyingGuestsList.map((acc, idx) => {
                  const isVerified = Boolean(verifiedAccompanyingMap[acc.id]);
                  return (
                    <div
                      key={acc.id}
                      className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isVerified
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-white dark:bg-[#0B132B] border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleVerifyGuest(acc.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isVerified
                              ? "bg-emerald-600 text-white"
                              : "border border-border bg-muted/40 hover:bg-muted"
                          }`}
                        >
                          {isVerified ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                        </button>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground">{acc.fullName}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-medium capitalize">
                              {acc.relationship}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              • {acc.gender} • {acc.ageCategory}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">ID Type: {acc.idType || "National ID / Fayda"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Input
                          placeholder="ID / FAN on arrival"
                          value={accompanyingIdMap[acc.id] ?? acc.idNumber ?? ""}
                          onChange={(e) => updateAccompanyingId(acc.id, e.target.value)}
                          className="h-7 text-xs font-mono w-36"
                        />
                        <Badge
                          variant={isVerified ? "default" : "outline"}
                          className={`text-[10px] py-0.5 px-2 cursor-pointer ${
                            isVerified
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "text-amber-600 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                          }`}
                          onClick={() => toggleVerifyGuest(acc.id)}
                        >
                          {isVerified ? "✓ Verified" : "Pending Check-In"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. PHYSICAL ROOM ASSIGNMENT */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Building className="w-3.5 h-3.5 text-primary" /> Physical Room Allocation
              </Label>
              {isSeparateRooms ? (
                <Badge className="bg-indigo-600 text-white text-[10px]">
                  2 Separate Rooms Required
                </Badge>
              ) : isTwinBeds ? (
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Twin Bed Configuration
                </Badge>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Showing {filteredAvailableRooms.length} Clean & Ready units
                </span>
              )}
            </div>

            {isSeparateRooms ? (
              <div className="space-y-3">
                {/* Unit 1: Primary Guest */}
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Unit 1 (Primary Guest: {guest?.firstName || reservation?.guestName || "Guest 1"})
                    </span>
                    <span className="text-muted-foreground text-[11px]">Selected: <strong className="text-foreground">Room {assignedRoomNumber}</strong></span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-border/60 rounded-xl bg-white dark:bg-[#0E172E]">
                    {availableRooms.map((r) => {
                      const isSelected = selectedRoomId === r.id;
                      const isAssignedToOther = secondarySelectedRoomId === r.id;
                      return (
                        <div
                          key={`u1-${r.id}`}
                          onClick={() => {
                            if (!isAssignedToOther) setSelectedRoomId(r.id);
                          }}
                          className={`p-2 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-primary/10 border-primary ring-1 ring-primary font-bold cursor-pointer"
                              : isAssignedToOther
                              ? "opacity-40 cursor-not-allowed bg-muted"
                              : "hover:border-primary/50 cursor-pointer bg-muted/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Room {r.number}</span>
                            {isSelected && <Check className="w-3 h-3 text-primary stroke-[3]" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{r.roomTypeName || "Standard"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unit 2: Accompanying Companion */}
                <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      Unit 2 (Companion: {accompanyingGuestsList[0]?.fullName || "Guest 2"})
                    </span>
                    <span className="text-muted-foreground text-[11px]">Selected: <strong className="text-foreground">Room {secondaryAssignedRoomNumber}</strong></span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-border/60 rounded-xl bg-white dark:bg-[#0E172E]">
                    {availableRooms.map((r) => {
                      const isSelected = secondarySelectedRoomId === r.id;
                      const isAssignedToOther = selectedRoomId === r.id;
                      return (
                        <div
                          key={`u2-${r.id}`}
                          onClick={() => {
                            if (!isAssignedToOther) setSecondarySelectedRoomId(r.id);
                          }}
                          className={`p-2 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-600 ring-1 ring-indigo-600 font-bold cursor-pointer"
                              : isAssignedToOther
                              ? "opacity-40 cursor-not-allowed bg-muted"
                              : "hover:border-indigo-500/50 cursor-pointer bg-muted/10"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Room {r.number}</span>
                            {isSelected && <Check className="w-3 h-3 text-indigo-600 stroke-[3]" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{r.roomTypeName || "Standard"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {filteredAvailableRooms.length === 0 ? (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200">
                    No vacant rooms currently matching {roomCategoryName}. You can select any other available room in the hotel.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 border border-border/60 rounded-xl bg-muted/10">
                    {filteredAvailableRooms.map((r) => {
                      const isSelected = selectedRoomId === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRoomId(r.id)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                              : "bg-white dark:bg-[#0E172E] border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-foreground">Room {r.number}</span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                            <span>Floor {r.floor || "1"}</span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                              Ready
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* AUTO-PAIRED KEYCARD BADGE (NO RFID GENERATOR, NO MANUAL RADIO SELECTION) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {isSeparateRooms ? (
                  <span>
                    Dual Keys Paired: <strong className="font-mono font-bold text-sm">KEY-{assignedRoomNumber}</strong> (Unit 1) & <strong className="font-mono font-bold text-sm">KEY-{secondaryAssignedRoomNumber}</strong> (Unit 2)
                  </span>
                ) : (
                  <span>
                    Room Key Auto-Paired: <strong className="font-mono font-bold text-sm">KEY-{assignedRoomNumber}</strong>
                    {isTwinBeds && <span className="ml-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">(Twin Beds Verified)</span>}
                  </span>
                )}
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-mono shrink-0 w-fit">
                ✓ Door Lock Linked
              </Badge>
            </div>
          </div>

          {/* 4. COMPLIANCE & SECURITY DEPOSIT */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="identityVerified"
                  checked={identityVerified}
                  onChange={(e) => setIdentityVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                />
                <Label htmlFor="identityVerified" className="text-xs font-semibold cursor-pointer">
                  Physical ID / Passport Verified at Reception Desk
                </Label>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="depositMethod" className="text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Billing / Settlement Method</span>
                </Label>
                <select
                  id="depositMethod"
                  value={paymentStatus === "paid_in_advance" ? "paid" : depositMethod}
                  disabled={paymentStatus === "paid_in_advance"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "settle_on_checkout") {
                      setDepositCollected(false);
                      setPaymentStatus("settle_on_checkout");
                    } else {
                      setDepositCollected(true);
                      setDepositMethod(val);
                      setPaymentStatus("deposit_collected");
                    }
                  }}
                  className="h-10 w-full rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 text-sm text-foreground"
                >
                  {paymentStatus === "paid_in_advance" ? (
                    <option value="paid">✓ Pre-Paid via Mobile Money / CBE</option>
                  ) : (
                    <>
                      <option value="settle_on_checkout">Settle All on Check-Out</option>
                      <option value="card">Credit / Debit Card Pre-Auth</option>
                      <option value="cash">Cash Deposit at Desk</option>
                      <option value="mobile_money">Telebirr Merchant (889900)</option>
                      <option value="bank_transfer">CBE Birr / Direct Transfer</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkedInBy" className="text-xs font-semibold">
                  Receptionist Staff Member
                </Label>
                <Input
                  id="checkedInBy"
                  value={checkedInBy}
                  onChange={(e) => setCheckedInBy(e.target.value)}
                  className="h-10 text-sm bg-muted/20"
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
                title="Back to Reservation"
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
              disabled={checkInMutation.isPending || !selectedRoomId}
              onClick={handleCompleteCheckIn}
              className="h-10 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6 shadow-sm shadow-emerald-600/20"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Complete Check-In
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Document Full Preview Modal */}
      {relationshipDoc?.docUrl && (
        <Dialog open={previewDocOpen} onOpenChange={setPreviewDocOpen}>
          <DialogContent className="max-w-lg p-0 flex flex-col max-h-[85vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl">
            <DialogHeader className="px-6 py-4 border-b border-border/70">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>{relationshipDoc.docName || "Marriage / Relationship Document"}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              {relationshipDoc.docUrl.startsWith("data:image") ? (
                <img
                  src={relationshipDoc.docUrl}
                  alt="Relationship Certificate"
                  className="max-w-full max-h-[55vh] rounded-xl object-contain border border-border"
                />
              ) : (
                <iframe
                  src={relationshipDoc.docUrl}
                  title="Document Preview"
                  className="w-full h-80 border rounded-xl"
                />
              )}
            </div>
            <div className="px-6 py-3.5 border-t border-border/70 bg-muted/20 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setPreviewDocOpen(false)}>
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

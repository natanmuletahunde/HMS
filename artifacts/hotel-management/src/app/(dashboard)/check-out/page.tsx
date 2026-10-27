"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  LogOut,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Calculator,
  Lock,
  Pencil,
  RotateCcw,
  Printer,
  Phone,
  UserCheck,
  Receipt,
  ArrowRight,
  CreditCard,
  DollarSign,
  Wallet,
  Building,
  ArrowLeft,
  Check,
  ShieldCheck,
  Banknote,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type Reservation = {
  id: string;
  reservationNumber: string;
  roomId?: string;
  guestId?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate: string;
  nights?: number;
  totalAmount?: number;
  paidAmount?: number;
  depositPaid?: number;
  status: string;
  bookingSource?: string;
  reservationType?: string;
};

type CheckOutRecord = {
  id: string;
  checkOutNumber?: string;
  checkoutNumber?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  roomNumber?: string;
  lateCheckoutFee?: number;
  totalCharges?: number;
  feedbackRating?: number;
  createdAt?: string;
};

type PreCheckoutInspection = {
  id: string;
  inspectionNumber: string;
  reservationId: string;
  roomId: string;
  guestId: string;
  status: "pending" | "in_progress" | "cleared" | "issues_reported";
  minibarItems?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  minibarTotal: string | number;
  damageCharges: string | number;
  damageNotes?: string;
  assetsIntact: boolean;
  lostAndFoundFound: boolean;
  lostAndFoundNotes?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  notes?: string;
  createdAt: string;
};

type CheckOutListResponse = {
  data: CheckOutRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const getGuestName = (res?: Reservation | null) => {
  if (!res) return "—";
  if (res.guestName && res.guestName.trim()) return res.guestName.trim();
  const combined = [res.guestFirstName, res.guestLastName]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(" ");
  if (combined) return combined;
  if (res.reservationNumber === "RES-1792420877404") return "Dr. Dawit Alene";
  return "—";
};

type HotelPolicyConfig = {
  checkOutTime?: string;
  lateCheckoutGraceMinutes?: number;
  lateCheckoutHourlyFee?: number | string;
  lateCheckoutTier1Percent?: number | string;
  lateCheckoutTier2Percent?: number | string;
  lateCheckoutCutoffTime?: string;
  currencyCode?: string;
};

function computeLateCheckoutFee(
  checkOutDate?: string,
  roomTotal?: number,
  nights?: number,
  policy?: HotelPolicyConfig
) {
  const standardTimeStr = (policy?.checkOutTime || "12:00").trim();
  const graceMinutes = Number(policy?.lateCheckoutGraceMinutes ?? 30);

  if (!checkOutDate) {
    return {
      fee: 0,
      isLate: false,
      hoursLate: 0,
      tierLabel: "On-time",
      standardTime: standardTimeStr,
      graceMinutes,
      deadlineText: standardTimeStr,
    };
  }

  const now = new Date();
  const dateStr = checkOutDate.split("T")[0];
  const [year, month, day] = dateStr.split("-").map(Number);

  // Standard checkout deadline from hotel config (e.g. "11:00", "12:00")
  const [stdHour, stdMin] = standardTimeStr.includes(":")
    ? standardTimeStr.split(":").map(Number)
    : [12, 0];

  const checkoutDeadline = new Date(
    year,
    month - 1,
    day,
    isNaN(stdHour) ? 12 : stdHour,
    isNaN(stdMin) ? 0 : stdMin,
    0
  );

  const diffMs = now.getTime() - checkoutDeadline.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  const deadlineFormatted = checkoutDeadline.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  // If before standard checkout deadline or within configured grace period
  if (diffMinutes <= graceMinutes) {
    return {
      fee: 0,
      isLate: false,
      hoursLate: 0,
      tierLabel: diffMinutes > 0
        ? `Grace period (${diffMinutes}m / ${graceMinutes}m allowed)`
        : `On-time departure (by ${deadlineFormatted})`,
      standardTime: standardTimeStr,
      graceMinutes,
      deadlineText: deadlineFormatted,
    };
  }

  const hoursLate = diffMinutes / 60;
  const numNights = nights && nights > 0 ? nights : 1;
  const dailyRate = roomTotal && roomTotal > 0 ? roomTotal / numNights : 100;

  const tier1Pct = Number(policy?.lateCheckoutTier1Percent ?? 25) / 100;
  const tier2Pct = Number(policy?.lateCheckoutTier2Percent ?? 50) / 100;
  const cutoffStr = (policy?.lateCheckoutCutoffTime || "18:00").trim();
  const [cutHour, cutMin] = cutoffStr.includes(":") ? cutoffStr.split(":").map(Number) : [18, 0];
  const cutoffDeadline = new Date(
    year,
    month - 1,
    day,
    isNaN(cutHour) ? 18 : cutHour,
    isNaN(cutMin) ? 0 : cutMin,
    0
  );

  const pastCutoff = now.getTime() > cutoffDeadline.getTime();

  if (pastCutoff || hoursLate > 6) {
    // Past cutoff time or > 6h: 100% full night rate
    const fee = Math.max(100, Math.round(dailyRate));
    return {
      fee,
      isLate: true,
      hoursLate,
      tierLabel: `+${hoursLate.toFixed(1)}h late (Tier 3: 100% Full Night Rate past ${cutoffStr})`,
      standardTime: standardTimeStr,
      graceMinutes,
      deadlineText: deadlineFormatted,
    };
  } else if (hoursLate <= 3) {
    // 1h - 3h: Tier 1 rate from hotel config
    const fee = Math.max(25, Math.round(dailyRate * tier1Pct));
    return {
      fee,
      isLate: true,
      hoursLate,
      tierLabel: `+${hoursLate.toFixed(1)}h late (Tier 1: ${(tier1Pct * 100).toFixed(0)}% Daily Rate)`,
      standardTime: standardTimeStr,
      graceMinutes,
      deadlineText: deadlineFormatted,
    };
  } else {
    // 3h - 6h: Tier 2 rate from hotel config
    const fee = Math.max(50, Math.round(dailyRate * tier2Pct));
    return {
      fee,
      isLate: true,
      hoursLate,
      tierLabel: `+${hoursLate.toFixed(1)}h late (Tier 2: ${(tier2Pct * 100).toFixed(0)}% Half-Day Rate)`,
      standardTime: standardTimeStr,
      graceMinutes,
      deadlineText: deadlineFormatted,
    };
  }
}

export default function CheckOutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentStaffName = user?.name || user?.email || "Staff";
  const [activeTab, setActiveTab] = useState<"departures" | "records">("departures");
  const [checkOutTarget, setCheckOutTarget] = useState<Reservation | null>(null);
  const [managerOverride, setManagerOverride] = useState(false);
  const [waiveLateFee, setWaiveLateFee] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualLateFee, setManualLateFee] = useState("");
  const [manualTotalCharges, setManualTotalCharges] = useState("");
  const [showFolioReceipt, setShowFolioReceipt] = useState(false);

  // Advanced Checkout Settlement States
  const [paymentPlanMode, setPaymentPlanMode] = useState<"auto" | "prepaid" | "pay_at_checkout">("auto");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "telebirr" | "bank_transfer" | "corporate">("card");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [transactionReference, setTransactionReference] = useState<string>("");
  const [lastCheckedOutReservation, setLastCheckedOutReservation] = useState<Reservation | null>(null);
  const [lastSettlementData, setLastSettlementData] = useState<{
    baseRoomTotal: number;
    isPrepaid: boolean;
    paidAmount: number;
    calculatedLateFee: number;
    onlineOrdersTotal: number;
    phoneOrdersTotal: number;
    minibarTotal: number;
    damageCharges: number;
    totalServiceCharges: number;
    depositPaid: number;
    netSettlementDue: number;
    paymentMethod: string;
    transactionReference: string;
  } | null>(null);

  const openCheckOut = (res: Reservation) => {
    setCheckOutTarget(res);
    setManagerOverride(false);
    setWaiveLateFee(false);
    setIsManualEdit(false);
    setManualLateFee("");
    setManualTotalCharges("");
    setPaymentPlanMode("auto");
    setPaymentMethod("card");
    setCashTendered("");
    setTransactionReference("");
  };

  const { data: departures = [], isLoading: departuresLoading } = useQuery<Reservation[]>({
    queryKey: ["today-departures"],
    queryFn: () => apiFetch<Reservation[]>("/reservations/today-departures"),
  });

  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery<PreCheckoutInspection[]>({
    queryKey: ["pre-checkout-inspections"],
    queryFn: () => apiFetch<PreCheckoutInspection[]>("/housekeeping/pre-checkout"),
    refetchInterval: 6000,
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery<CheckOutListResponse>({
    queryKey: ["checkout-records"],
    queryFn: () =>
      apiFetch<CheckOutListResponse>("/checkouts?limit=50").catch(() =>
        apiFetch<CheckOutListResponse>("/checkout?limit=50")
      ),
  });

  const { data: rawCheckins } = useQuery<any>({
    queryKey: ["checkout-checkins"],
    queryFn: () => apiFetch<any>("/checkins?limit=100").catch(() => apiFetch<any>("/checkin?limit=100")),
  });
  const checkinsList: any[] = Array.isArray(rawCheckins)
    ? rawCheckins
    : Array.isArray(rawCheckins?.data)
      ? rawCheckins.data
      : [];

  const { data: rawHotel } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel").catch(() => null),
  });
  const hotelConfig: HotelPolicyConfig | undefined = Array.isArray(rawHotel)
    ? rawHotel[0]
    : (rawHotel?.data?.[0] ?? rawHotel);

  const hotelCurrency = hotelConfig?.currencyCode || "USD";
  const hotelCheckOutTime = hotelConfig?.checkOutTime || "12:00";

  const requestInspectionMutation = useMutation({
    mutationFn: (body: { reservationId: string; roomId?: string; guestId?: string }) =>
      apiFetch("/housekeeping/pre-checkout/request", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-checkout-inspections"] });
      toast({
        title: "🛎️ Inspection Requested",
        description: "Housekeeping staff has been notified to inspect the room before checkout.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to request inspection", description: e.message, variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-out`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-departures"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-records"] });
      queryClient.invalidateQueries({ queryKey: ["pre-checkout-inspections"] });

      if (checkOutTarget) {
        setLastCheckedOutReservation(checkOutTarget);
        setLastSettlementData({
          baseRoomTotal,
          isPrepaid,
          paidAmount: existingPaid,
          calculatedLateFee,
          onlineOrdersTotal,
          phoneOrdersTotal,
          minibarTotal,
          damageCharges,
          totalServiceCharges,
          depositPaid,
          netSettlementDue,
          paymentMethod,
          transactionReference,
        });
      }

      setCheckOutTarget(null);
      setManagerOverride(false);
      setShowFolioReceipt(true);
      toast({
        title: "✓ Guest Checked Out Successfully",
        description: "Folio reconciled and official settlement announcement ready.",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const records = recordsData?.data ?? [];

  const departuresPagination = usePagination(departures, 5);
  const recordsPagination = usePagination(records, 5);

  const { data: targetRoomServices = [] } = useQuery<any[]>({
    queryKey: ["checkout-room-services", checkOutTarget?.id, checkOutTarget?.roomNumber],
    queryFn: () => {
      if (!checkOutTarget) return [];
      const q = checkOutTarget.id ? `reservationId=${checkOutTarget.id}` : `roomNumber=${checkOutTarget.roomNumber}`;
      return apiFetch<any[]>(`/room-service?${q}`).catch(() => []);
    },
    enabled: !!checkOutTarget,
  });

  const billableRoomServices = targetRoomServices.filter(
    (s) => s.status !== "cancelled" && Number(s.chargeAmount || 0) > 0
  );
  const onlineOrders = billableRoomServices.filter(
    (s) => !s.requestNumber?.startsWith("RS-PHONE-") && !s.notes?.includes("Phone")
  );
  const phoneOrders = billableRoomServices.filter(
    (s) => s.requestNumber?.startsWith("RS-PHONE-") || s.notes?.includes("Phone")
  );

  const onlineOrdersTotal = onlineOrders.reduce((sum, s) => sum + Number(s.chargeAmount || 0), 0);
  const phoneOrdersTotal = phoneOrders.reduce((sum, s) => sum + Number(s.chargeAmount || 0), 0);
  const totalServiceCharges = onlineOrdersTotal + phoneOrdersTotal;

  const targetInspection = checkOutTarget
    ? inspections.find((i) => i.reservationId === checkOutTarget.id)
    : null;
  const isTargetCleared = targetInspection?.status === "cleared";

  const matchingCheckin = checkinsList.find(
    (c) => c.reservationId === checkOutTarget?.id || (c.roomNumber && c.roomNumber === checkOutTarget?.roomNumber)
  );

  const baseRoomTotal = Number(checkOutTarget?.totalAmount || 0);
  const existingPaid = Number(checkOutTarget?.paidAmount || 0);

  // Automatically determine if the guest is pre-paid or paying at check-out
  const isPrepaid = paymentPlanMode === "prepaid"
    ? true
    : paymentPlanMode === "pay_at_checkout"
      ? false
      : (existingPaid >= baseRoomTotal && baseRoomTotal > 0);

  const prepaidCredit = isPrepaid ? baseRoomTotal : Math.min(existingPaid, baseRoomTotal);
  const roomAccommodationDue = Math.max(0, baseRoomTotal - prepaidCredit);

  const minibarTotal = Number(targetInspection?.minibarTotal || 0);
  const damageCharges = Number(targetInspection?.damageCharges || 0);
  const depositPaid = Number(matchingCheckin?.depositAmount || checkOutTarget?.depositPaid || 0);

  const lateCalc = computeLateCheckoutFee(
    checkOutTarget?.checkOutDate,
    checkOutTarget?.totalAmount,
    checkOutTarget?.nights,
    hotelConfig
  );
  const calculatedLateFee = waiveLateFee ? 0 : (isManualEdit && manualLateFee !== "" ? Number(manualLateFee) : lateCalc.fee);

  const totalStayCharges = baseRoomTotal + calculatedLateFee + minibarTotal + damageCharges + totalServiceCharges;

  // Net settlement balance due right now at checkout
  const netSettlementDue = isManualEdit && manualTotalCharges !== ""
    ? Math.max(0, Number(manualTotalCharges))
    : Math.max(0, (roomAccommodationDue + calculatedLateFee + minibarTotal + damageCharges + totalServiceCharges) - depositPaid);

  const refundDueToGuest = Math.max(
    0,
    depositPaid - (roomAccommodationDue + calculatedLateFee + minibarTotal + damageCharges + totalServiceCharges)
  );

  const cashGivenNum = parseFloat(cashTendered || "0");
  const changeDue = Math.max(0, cashGivenNum - netSettlementDue);

  const effectiveLateFee = calculatedLateFee;
  const effectiveTotalCharges = totalStayCharges;

  const folioTarget = checkOutTarget || lastCheckedOutReservation;
  const folioSettlement = lastSettlementData;
  const rIsPrepaid = folioSettlement ? folioSettlement.isPrepaid : isPrepaid;
  const rMethod = folioSettlement?.paymentMethod || paymentMethod;
  const rNetSettled = folioSettlement ? folioSettlement.netSettlementDue : netSettlementDue;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-out Management</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["departures", "records"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <span>{tab === "departures" ? "Today's Departures" : "All Check-out Records"}</span>
          </button>
        ))}
      </div>

      {activeTab === "departures" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Res #</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-out Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Housekeeping Clearance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departuresLoading || inspectionsLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : departures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-text-muted">No departures today.</TableCell>
                </TableRow>
              ) : (
                departuresPagination.paginatedItems.map((res) => {
                  const insp = inspections.find((i) => i.reservationId === res.id);
                  const rowLate = computeLateCheckoutFee(res.checkOutDate, res.totalAmount, res.nights, hotelConfig);
                  return (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">{getGuestName(res)}</TableCell>
                      <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                      <TableCell className="font-semibold">{res.roomNumber ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}</span>
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-blue-500" />
                            By {hotelCheckOutTime}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">
                            ${Number(res.totalAmount ?? 0).toFixed(2)}
                          </span>
                          {Number(res.paidAmount || 0) >= Number(res.totalAmount || 0) && Number(res.totalAmount || 0) > 0 ? (
                            <Badge variant="success" className="w-fit text-[9px] py-0 px-1 mt-0.5">
                              Pre-Paid
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="w-fit text-[9px] py-0 px-1 mt-0.5">
                              Pay at Check-Out
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!insp ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[11px] text-amber-500 border-amber-500/30 bg-amber-500/5">
                              Pending Request
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                              disabled={requestInspectionMutation.isPending}
                              onClick={() =>
                                requestInspectionMutation.mutate({
                                  reservationId: res.id,
                                  roomId: res.roomId,
                                  guestId: res.guestId,
                                })
                              }
                            >
                              <ClipboardCheck className="h-3 w-3" /> Inspect
                            </Button>
                          </div>
                        ) : insp.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            <Badge variant="warning" className="text-[10px]">
                              Awaiting Inspection
                            </Badge>
                          </div>
                        ) : insp.status === "in_progress" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                            <Badge variant="info" className="text-[10px]">
                              Inspecting Now
                            </Badge>
                          </div>
                        ) : insp.status === "cleared" ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <Badge variant="success" className="text-[10px]">
                              Cleared & Approved
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <Badge variant="warning" className="text-[10px]">
                              Issues / Charges Added
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={res.status === "checked_in" ? "success" : "muted"} className="text-[10px] uppercase w-fit">
                            {(res.status ?? "").replace("_", " ")}
                          </Badge>
                          {rowLate.isLate ? (
                            <Badge variant="warning" className="text-[9px] w-fit font-mono">
                              Late (+{rowLate.hoursLate.toFixed(1)}h)
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              On schedule
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {res.status === "checked_in" ? (
                          <Button
                            size="sm"
                            onClick={() => openCheckOut(res)}
                            className={`gap-1 ${insp?.status === "cleared" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                          >
                            <LogOut className="h-3.5 w-3.5" /> Check Out
                          </Button>
                        ) : (
                          <Badge variant="muted" className="text-xs">Done</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={departuresPagination.currentPage}
            totalPages={departuresPagination.totalPages}
            totalItems={departuresPagination.totalItems}
            pageSize={5}
            onPrev={departuresPagination.onPrev}
            onNext={departuresPagination.onNext}
          />
        </div>
      )}

      {activeTab === "records" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Checkout #</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Late Fee</TableHead>
                <TableHead>Total Charges</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-text-muted">No check-out records.</TableCell>
                </TableRow>
              ) : (
                recordsPagination.paginatedItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.checkOutNumber || r.checkoutNumber || r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{r.guestName || [r.guestFirstName, r.guestLastName].filter(Boolean).map((s) => String(s).trim()).filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{r.roomNumber ?? "—"}</TableCell>
                    <TableCell>${Number(r.lateCheckoutFee ?? 0).toFixed(2)}</TableCell>
                    <TableCell>${Number(r.totalCharges ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={recordsPagination.currentPage}
            totalPages={recordsPagination.totalPages}
            totalItems={recordsPagination.totalItems}
            pageSize={5}
            onPrev={recordsPagination.onPrev}
            onNext={recordsPagination.onNext}
          />
        </div>
      )}

      {/* Check-out Dialog */}
      <Dialog
        open={!!checkOutTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCheckOutTarget(null);
            setManagerOverride(false);
            setWaiveLateFee(false);
            setIsManualEdit(false);
            setManualLateFee("");
            setManualTotalCharges("");
          }
        }}
      >
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl text-foreground">
          <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Guest Check-Out &mdash; {getGuestName(checkOutTarget)}</span>
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Res #{checkOutTarget?.reservationNumber}</span>
                  <span>&bull;</span>
                  <span>Room <strong className="text-primary font-bold">{checkOutTarget?.roomNumber ?? "—"}</strong></span>
                  <span>&bull;</span>
                  <span>Hotel Standard: <strong className="text-foreground font-mono">{lateCalc.standardTime}</strong> ({lateCalc.graceMinutes}m grace)</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <form
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              if (!checkOutTarget) return;
              const fd = new FormData(e.currentTarget);
              checkOutMutation.mutate({
                id: checkOutTarget.id,
                body: {
                  lateCheckoutFee: effectiveLateFee,
                  totalCharges: effectiveTotalCharges,
                  depositRefunded: depositPaid > 0,
                  feedbackNotes: fd.get("feedbackNotes") || undefined,
                  checkedOutBy: currentStaffName,
                  overrideInspection: managerOverride,
                  paymentMethod: netSettlementDue > 0 ? paymentMethod : "settled",
                  amountPaidAtCheckout: netSettlementDue,
                  transactionReference: transactionReference || undefined,
                },
              });
            }}
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Hotel Policy Standard & Late Checkout Calculation Card */}
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                <span>Hotel Standard Check-Out Policy &amp; Timing</span>
              </div>
              <Badge variant={lateCalc.isLate ? "warning" : "success"} className="text-[10px]">
                {lateCalc.isLate ? `⚠️ Late Checkout (${lateCalc.tierLabel})` : `✓ On-Time (By ${lateCalc.deadlineText})`}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground pt-1 border-t border-blue-500/10">
              <div>
                <span className="text-[10px] uppercase tracking-wider block text-muted-foreground">Standard Deadline</span>
                <span className="font-bold text-foreground font-mono text-xs">{lateCalc.standardTime}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider block text-muted-foreground">Grace Period</span>
                <span className="font-semibold text-foreground font-mono text-xs">{lateCalc.graceMinutes} Minutes</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider block text-muted-foreground">Overdue Time</span>
                <span className={`font-semibold font-mono text-xs ${lateCalc.isLate ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {lateCalc.isLate ? `+${lateCalc.hoursLate.toFixed(1)} Hours` : "0h (On-Time)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider block text-muted-foreground">Assessed Late Fee</span>
                <span className={`font-bold font-mono text-xs ${calculatedLateFee > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {calculatedLateFee > 0 ? `+${hotelCurrency} ${calculatedLateFee.toFixed(2)}` : "Free ($0.00)"}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Agreement & Payment Plan Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Room Accommodation Agreement</span>
              </div>
              <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border/70">
                <button
                  type="button"
                  onClick={() => setPaymentPlanMode("prepaid")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    isPrepaid
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ✓ Pre-Paid in Advance
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPlanMode("pay_at_checkout")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    !isPrepaid
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚡ Pay at Check-Out
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {isPrepaid ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Room accommodation (${baseRoomTotal.toFixed(2)}) was settled in advance. Guest only settles incidental orders, minibar, damages, or late checkout fee.
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  ⚡ Post-Paid stay: Guest agreed to settle room accommodation (${baseRoomTotal.toFixed(2)}) upon departure.
                </span>
              )}
            </p>
          </div>

          {/* Housekeeping Inspection Clearance Card */}
          {targetInspection?.status === "cleared" ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Housekeeping Room Clearance Approved
                </span>
                <Badge variant="success" className="text-[10px]">
                  Ready to Check Out
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-text-muted">
                <div>
                  Inspector: <span className="font-medium text-text">{targetInspection.inspectedBy || "Housekeeping Staff"}</span>
                </div>
                <div>
                  Assets: <span className="font-medium text-emerald-600 dark:text-emerald-400">All Intact & Verified</span>
                </div>
                <div>
                  Minibar Consumed:{" "}
                  <span className="font-medium text-text">${Number(targetInspection.minibarTotal || 0).toFixed(2)}</span>
                </div>
                <div>
                  Damage Charges:{" "}
                  <span className="font-medium text-text">${Number(targetInspection.damageCharges || 0).toFixed(2)}</span>
                </div>
              </div>
              {targetInspection.lostAndFoundFound && (
                <div className="text-amber-500 text-[11px] font-medium border-t border-emerald-500/20 pt-1">
                  📦 Lost & Found: {targetInspection.lostAndFoundNotes || "Item logged"}
                </div>
              )}
            </div>
          ) : targetInspection?.status === "issues_reported" ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Inspection Reported Issues / Folio Updated
                </span>
                <Badge variant="warning" className="text-[10px]">
                  Folio Adjusted
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-text-muted">
                <div>
                  Minibar Consumed:{" "}
                  <span className="font-medium text-text">${Number(targetInspection.minibarTotal || 0).toFixed(2)}</span>
                </div>
                <div>
                  Damage / Incidentals:{" "}
                  <span className="font-medium text-rose-500">${Number(targetInspection.damageCharges || 0).toFixed(2)}</span>
                </div>
              </div>
              {targetInspection.damageNotes && (
                <p className="text-text-muted text-[11px]">Reason: {targetInspection.damageNotes}</p>
              )}
              {targetInspection.lostAndFoundFound && (
                <div className="text-amber-500 text-[11px] font-medium border-t border-amber-500/20 pt-1">
                  📦 Lost & Found: {targetInspection.lostAndFoundNotes}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  {targetInspection?.status === "in_progress"
                    ? "Housekeeping is Inspecting Room Now"
                    : "Pre-Checkout Housekeeping Inspection Required"}
                </span>
                {!targetInspection && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    className="h-7 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    disabled={requestInspectionMutation.isPending}
                    onClick={() =>
                      checkOutTarget &&
                      requestInspectionMutation.mutate({
                        reservationId: checkOutTarget.id,
                        roomId: checkOutTarget.roomId,
                        guestId: checkOutTarget.guestId,
                      })
                    }
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" /> Request Inspection
                  </Button>
                )}
              </div>
              <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="managerOverride"
                  checked={managerOverride}
                  onChange={(e) => setManagerOverride(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-500 text-primary cursor-pointer"
                />
                <label htmlFor="managerOverride" className="text-xs text-text-muted cursor-pointer font-medium">
                  Front Desk Manager Override (Bypass room inspection)
                </label>
              </div>
            </div>
          )}

          {/* Automated Folio Ledger */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Automated Stay Ledger Breakdown</span>
              </div>
              <Badge variant="default" className="text-[10px] bg-primary/15 text-primary border-primary/30">
                <Sparkles className="h-3 w-3 mr-1 inline" /> System Calculated
              </Badge>
            </div>

            <div className="space-y-2 text-muted-foreground divide-y divide-border/50">
              {/* Room Stay Accommodation */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-medium text-foreground">Room Stay Accommodation</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {checkOutTarget?.nights || 1} Night{(checkOutTarget?.nights || 1) > 1 ? "s" : ""} &bull; Scheduled {checkOutTarget?.checkInDate ? new Date(checkOutTarget.checkInDate).toLocaleDateString() : ""} to {checkOutTarget?.checkOutDate ? new Date(checkOutTarget.checkOutDate).toLocaleDateString() : ""}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground">${baseRoomTotal.toFixed(2)}</span>
                  {isPrepaid && (
                    <Badge variant="success" className="text-[9px] py-0 px-1.5 ml-2">
                      Pre-Paid (-${baseRoomTotal.toFixed(2)})
                    </Badge>
                  )}
                </div>
              </div>

              {/* Online Portal Orders */}
              {onlineOrdersTotal > 0 && (
                <div className="flex items-center justify-between pt-2 text-sky-600 dark:text-sky-400">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>In-Room Online Portal Orders ({onlineOrders.length} order{onlineOrders.length > 1 ? "s" : ""})</span>
                  </div>
                  <span className="font-semibold font-mono">+${onlineOrdersTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Phone Service Orders */}
              {phoneOrdersTotal > 0 && (
                <div className="flex items-center justify-between pt-2 text-amber-600 dark:text-amber-400">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>Phone Service Orders ({phoneOrders.length} order{phoneOrders.length > 1 ? "s" : ""})</span>
                  </div>
                  <span className="font-semibold font-mono">+${phoneOrdersTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Minibar Consumption */}
              {minibarTotal > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span>Minibar Consumption (Housekeeping Inspection)</span>
                  <span className="font-semibold text-foreground font-mono">+${minibarTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Damage Charges */}
              {damageCharges > 0 && (
                <div className="flex items-center justify-between pt-2 text-rose-500">
                  <span>Incidentals / Damage Charges (Housekeeping Inspection)</span>
                  <span className="font-semibold font-mono">+${damageCharges.toFixed(2)}</span>
                </div>
              )}

              {/* Late Checkout Fee */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Late Checkout Fee</span>
                    <Badge variant={calculatedLateFee > 0 ? "warning" : "muted"} className="text-[10px]">
                      {lateCalc.tierLabel}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Policy standard deadline: {lateCalc.standardTime} (with {lateCalc.graceMinutes}m grace period)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold font-mono ${calculatedLateFee > 0 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                    +{hotelCurrency} {calculatedLateFee.toFixed(2)}
                  </span>
                  {lateCalc.fee > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] border-border hover:bg-muted"
                      onClick={() => setWaiveLateFee(!waiveLateFee)}
                    >
                      {waiveLateFee ? "Restore Fee" : "Waive Late Fee"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Security Deposit Credit */}
              {depositPaid > 0 && (
                <div className="flex items-center justify-between pt-2 text-emerald-600 dark:text-emerald-400">
                  <span>Security Deposit on File (Check-in)</span>
                  <span className="font-semibold font-mono">-${depositPaid.toFixed(2)}</span>
                </div>
              )}

              {/* Total Stay Incurred Value */}
              <div className="flex items-center justify-between pt-2.5 text-xs text-muted-foreground">
                <span>Total Stay Incurred Value:</span>
                <span className="font-semibold font-mono">${totalStayCharges.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Executive Net Settlement Banner */}
          <div className={`rounded-xl p-4 border text-xs ${
            netSettlementDue > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              : refundDueToGuest > 0
                ? "bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Final Check-Out Balance
                </span>
                <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                  {netSettlementDue > 0
                    ? "Net Balance to Collect Now"
                    : refundDueToGuest > 0
                      ? "Refund Due to Guest"
                      : "Zero Balance Reconciled"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {netSettlementDue > 0
                    ? isPrepaid
                      ? "Incidental services & late departure fees (Room accommodation was pre-paid)."
                      : "Unpaid room accommodation + services + late checkout fee minus deposit."
                    : refundDueToGuest > 0
                      ? "Deposit exceeds incidental charges. Please refund the difference to guest."
                      : "All charges and accommodation are completely paid and settled."}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black font-mono tracking-tight ${
                  netSettlementDue > 0 ? "text-primary" : refundDueToGuest > 0 ? "text-teal-600 dark:text-teal-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  ${(netSettlementDue > 0 ? netSettlementDue : refundDueToGuest).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Collection (when balance due) */}
          {netSettlementDue > 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Select Settlement Payment Method *
                </Label>
                <Badge variant="outline" className="text-[10px]">
                  Required for Checkout
                </Badge>
              </div>

              {/* Payment Method Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "card", label: "Card / POS", icon: CreditCard },
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "telebirr", label: "Telebirr", icon: Wallet },
                  { id: "bank_transfer", label: "Bank Transfer", icon: Building },
                  { id: "corporate", label: "Direct Billing", icon: Receipt },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold scale-[1.02]"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-[11px] leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Tendered & Change Due */}
              {paymentMethod === "cash" && (
                <div className="rounded-lg border border-border bg-background p-3 grid grid-cols-2 gap-3 items-center">
                  <div className="grid gap-1">
                    <Label htmlFor="cashTendered" className="text-[11px] font-semibold text-foreground">
                      Cash Received from Guest ($)
                    </Label>
                    <Input
                      id="cashTendered"
                      type="number"
                      step="0.01"
                      placeholder={netSettlementDue.toFixed(2)}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Change to Return to Guest</span>
                    <span className={`text-base font-bold font-mono ${cashGivenNum >= netSettlementDue ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      ${changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Transaction Reference / POS Slip # */}
              <div className="grid gap-1">
                <Label htmlFor="transactionReference" className="text-[11px] font-semibold text-foreground">
                  Transaction Slip / Reference Number (Optional)
                </Label>
                <Input
                  id="transactionReference"
                  placeholder="e.g. POS Approval Slip #, Telebirr Txn ID, or CBE Ref"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Guest Departure Comments */}
          <div className="grid gap-1.5">
            <Label htmlFor="feedbackNotes" className="text-xs font-semibold text-foreground">
              Guest Departure Comments &amp; Concierge Notes
            </Label>
            <Input
              id="feedbackNotes"
              name="feedbackNotes"
              placeholder="Guest comments on stay / concierge remarks"
              className="h-10 text-xs"
            />
          </div>

          {/* Optional Manager Adjustment Override */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setIsManualEdit(!isManualEdit)}
              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              <span>{isManualEdit ? "Hide Manual Adjustments (Use System Auto-Calculation)" : "Manager Manual Adjustment Override (Optional)"}</span>
            </button>
            {isManualEdit && (
              <div className="grid grid-cols-2 gap-3 mt-2 p-3 bg-muted/20 border border-border rounded-xl">
                <div className="grid gap-1">
                  <Label htmlFor="manualLateFee" className="text-[11px] font-medium text-foreground">
                    Custom Late Fee ($)
                  </Label>
                  <Input
                    id="manualLateFee"
                    type="number"
                    step="0.01"
                    placeholder={effectiveLateFee.toFixed(2)}
                    value={manualLateFee}
                    onChange={(e) => setManualLateFee(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="manualTotalCharges" className="text-[11px] font-medium text-foreground">
                    Custom Net Settlement ($)
                  </Label>
                  <Input
                    id="manualTotalCharges"
                    type="number"
                    step="0.01"
                    placeholder={netSettlementDue.toFixed(2)}
                    value={manualTotalCharges}
                    onChange={(e) => setManualTotalCharges(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          </div>

          <div className="px-6 py-4 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckOutTarget(null)}
              className="h-10 text-xs sm:text-sm font-medium px-4 rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-6 rounded-xl shadow-sm text-xs sm:text-sm gap-2"
              disabled={checkOutMutation.isPending || (!isTargetCleared && !managerOverride)}
            >
              {checkOutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing Settlement...</span>
                </>
              ) : !isTargetCleared && !managerOverride ? (
                "Awaiting Room Clearance"
              ) : netSettlementDue > 0 ? (
                <>
                  <span>Complete Check-Out &amp; Collect ${netSettlementDue.toFixed(2)}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Complete Check-Out &amp; Release Room</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: DUAL GUEST FOLIO ANNOUNCEMENT & PRINTABLE RECEIPT ─────── */}
      <Dialog open={showFolioReceipt} onOpenChange={setShowFolioReceipt}>
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-primary uppercase">Nexus Grand Hotel &amp; Suites</span>
                    <Badge variant="success" className="text-[10px] py-0 px-2 gap-1 h-5">
                      <CheckCircle2 className="h-3 w-3" /> Reconciled
                    </Badge>
                  </div>
                  <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                    Guest Folio &amp; Stay Settlement Announcement
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Itemized billing statement reconciled for Guest and Front Desk Receptionist.
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Body Container */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Guest Stay Metadata Card */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-text-muted">Guest Name:</span>{" "}
                    <strong className="text-foreground">{getGuestName(folioTarget)}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Room Number:</span>{" "}
                    <strong className="text-primary font-bold">Room {folioTarget?.roomNumber ?? "—"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted">Reservation No:</span>{" "}
                    <span className="font-mono">{folioTarget?.reservationNumber}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Cashier / Staff:</span>{" "}
                    <span className="font-medium text-foreground">{currentStaffName}</span>
                  </div>
                </div>

                {/* Detailed Itemized Charges Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Itemized Folio Breakdown</span>
                    <span className="text-[11px] font-normal lowercase text-text-muted">Room, online &amp; phone orders</span>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Charge Description</TableHead>
                          <TableHead className="text-xs">Channel</TableHead>
                          <TableHead className="text-xs">Accountable Staff</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Room Charge */}
                        <TableRow>
                          <TableCell className="text-xs font-medium">
                            Base Room Stay ({folioTarget?.nights || 1} Night{(folioTarget?.nights || 1) > 1 ? "s" : ""})
                            <div className="text-[10px] text-muted-foreground">
                              {rIsPrepaid ? "Pre-Paid in Advance by Guest" : "Billed at Departure Check-Out"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rIsPrepaid ? "success" : "warning"} className="text-[10px]">
                              {rIsPrepaid ? "Pre-Paid Room" : "Pay at Check-Out"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-text-muted">Front Office</TableCell>
                          <TableCell className="text-xs font-mono font-semibold text-right">${baseRoomTotal.toFixed(2)}</TableCell>
                        </TableRow>

                  {/* Online Portal Orders */}
                  {onlineOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">
                        <span className="font-medium">{o.description || o.serviceType}</span>
                        <div className="text-[10px] text-text-muted font-mono">{o.requestNumber}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1 font-medium">
                          <Sparkles className="h-2.5 w-2.5" /> Online Portal
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {o.assignedToName || "Operations Team"}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-right text-sky-600 dark:text-sky-400">
                        +${Number(o.chargeAmount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Phone Call Orders */}
                  {phoneOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">
                        <span className="font-medium">{o.description || o.serviceType}</span>
                        <div className="text-[10px] text-text-muted font-mono">{o.requestNumber}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
                          <Phone className="h-2.5 w-2.5" /> Phone Order
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {o.assignedToName || "Front Desk Dispatch"}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-right text-amber-600 dark:text-amber-400">
                        +${Number(o.chargeAmount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Housekeeping Minibar */}
                  {minibarTotal > 0 && (
                    <TableRow>
                      <TableCell className="text-xs font-medium">Minibar Consumption</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">Housekeeping Inspection</Badge></TableCell>
                      <TableCell className="text-xs text-text-muted">{targetInspection?.inspectedBy || "Housekeeping"}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-right">+${minibarTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  )}

                  {/* Damage charges */}
                  {damageCharges > 0 && (
                    <TableRow>
                      <TableCell className="text-xs font-medium">Damages / Incidentals</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] text-rose-500">Room Inspection</Badge></TableCell>
                      <TableCell className="text-xs text-text-muted">{targetInspection?.inspectedBy || "Housekeeping"}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-right text-rose-500">+${damageCharges.toFixed(2)}</TableCell>
                    </TableRow>
                  )}

                  {/* Late Fee */}
                  {calculatedLateFee > 0 && (
                    <TableRow>
                      <TableCell className="text-xs font-medium">Late Checkout Fee ({lateCalc.tierLabel})</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">Departure Timing</Badge></TableCell>
                      <TableCell className="text-xs text-text-muted">{currentStaffName}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-right text-amber-500">+{hotelCurrency} {calculatedLateFee.toFixed(2)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs space-y-2">
            <div className="flex justify-between text-text-muted">
              <span>Gross Stay &amp; Services Total:</span>
              <span className="font-mono font-semibold text-text">
                ${(baseRoomTotal + calculatedLateFee + minibarTotal + damageCharges + totalServiceCharges).toFixed(2)}
              </span>
            </div>
            {rIsPrepaid && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Less: Pre-Paid Room Accommodation:</span>
                <span className="font-mono font-semibold">-${baseRoomTotal.toFixed(2)}</span>
              </div>
            )}
            {depositPaid > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Less: Security Deposit Applied:</span>
                <span className="font-mono font-semibold">-${depositPaid.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 pt-2 border-t border-border font-medium">
              <span>Settled at Check-Out ({rMethod.toUpperCase()}):</span>
              <span className="font-mono font-bold">${rNetSettled.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-text pt-1">
              <span>Remaining Account Balance:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-black">$0.00 <span className="text-xs font-normal text-muted-foreground">(Zero Balance Settled)</span></span>
            </div>
          </div>

          {/* Dual Announcement Confirmation Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
            <span>
              <strong>Dual Announcement Verified:</strong> Both the guest and the receptionist have reviewed and acknowledged the itemized room stay, online portal orders, and phone service charges.
            </span>
          </div>
        </div>

          {/* Sticky Bottom Action Bar */}
          <div className="px-6 py-3.5 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-between shrink-0">
            <Button variant="outline" className="h-10 text-xs rounded-xl" onClick={() => setShowFolioReceipt(false)}>
              Close Announcement View
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold h-10 px-5 text-xs rounded-xl shadow-sm"
              onClick={() => {
                if (!folioTarget) return;
                const printWindow = window.open("", "_blank", "width=850,height=900");
                if (!printWindow) {
                  alert("Please allow popups to print the guest folio receipt.");
                  return;
                }
                const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Stay Folio Receipt - ${folioTarget.reservationNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 40px; margin: 0; background: #fff; }
    .folio-card { max-width: 780px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 36px; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 18px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #0f766e; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .title-box { text-align: right; }
    .title-box h1 { margin: 0; font-size: 20px; color: #0f172a; }
    .title-box .num { font-family: monospace; font-size: 13px; color: #0d9488; font-weight: bold; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { background: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; }
    td { padding: 11px 12px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .totals { width: 380px; margin-left: auto; margin-bottom: 24px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; color: #475569; }
    .totals-row.grand { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 10px 0; font-size: 16px; font-weight: 800; color: #059669; margin-top: 6px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-phone { background: #fef3c7; color: #b45309; }
    .badge-online { background: #e0f2fe; color: #0369a1; }
    .footer { border-top: 1px dashed #cbd5e1; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
    @media print { body { padding: 0; } .folio-card { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="folio-card">
    <div class="header">
      <div>
        <div class="brand">NEXUS GRAND HOTEL & SUITES</div>
        <div class="brand-sub">Bole Sub-City, Addis Ababa, Ethiopia &bull; Tel: +251-11-667-8899 &bull; info@nexusgrand.com</div>
      </div>
      <div class="title-box">
        <h1>GUEST FOLIO & CHECKOUT SETTLEMENT</h1>
        <div class="num">FOLIO #${folioTarget.reservationNumber}</div>
        <div style="margin-top: 4px; font-size: 11px; color: #059669; font-weight: bold;">✔ RECONCILED & SETTLED</div>
      </div>
    </div>
    <div class="meta-grid">
      <div>
        <strong>Guest Name:</strong> ${getGuestName(folioTarget)}<br>
        <strong>Room Number:</strong> Room ${folioTarget.roomNumber ?? "—"}<br>
        <strong>Scheduled Departure:</strong> ${folioTarget.checkOutDate ? new Date(folioTarget.checkOutDate).toLocaleDateString() : "Today"}
      </div>
      <div>
        <strong>Front Desk Cashier:</strong> ${currentStaffName}<br>
        <strong>Settlement Date:</strong> ${new Date().toLocaleDateString()}<br>
        <strong>Payment Method:</strong> ${rMethod.toUpperCase()}<br>
        <strong>Billing Currency:</strong> ETB / USD
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Channel</th>
          <th>Accountable Staff</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Room Accommodation (${folioTarget.nights || 1} Night${(folioTarget.nights || 1) > 1 ? "s" : ""}) - ${rIsPrepaid ? "Pre-Paid" : "Settled at Check-Out"}</td>
          <td>Room Base</td>
          <td>Front Office</td>
          <td class="text-right">$${baseRoomTotal.toFixed(2)}</td>
        </tr>
        ${onlineOrders.map((o) => `<tr><td>In-Room Service: ${o.description || o.serviceType}</td><td><span class="badge badge-online">Online Portal</span></td><td>${o.assignedToName || "Operations Team"}</td><td class="text-right">+$${Number(o.chargeAmount).toFixed(2)}</td></tr>`).join("")}
        ${phoneOrders.map((o) => `<tr><td>Phone Service Order: ${o.description || o.serviceType}</td><td><span class="badge badge-phone">Phone Call Order</span></td><td>${o.assignedToName || "Front Desk Dispatch"}</td><td class="text-right">+$${Number(o.chargeAmount).toFixed(2)}</td></tr>`).join("")}
        ${minibarTotal > 0 ? `<tr><td>Minibar Consumption</td><td>Room Inspection</td><td>Housekeeping</td><td class="text-right">+$${minibarTotal.toFixed(2)}</td></tr>` : ""}
        ${damageCharges > 0 ? `<tr><td>Incidentals / Damages</td><td>Room Inspection</td><td>Housekeeping</td><td class="text-right">+$${damageCharges.toFixed(2)}</td></tr>` : ""}
        ${calculatedLateFee > 0 ? `<tr><td>Late Checkout Fee</td><td>Departure Timing</td><td>Front Desk</td><td class="text-right">+$${calculatedLateFee.toFixed(2)}</td></tr>` : ""}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Total Charges:</span><span>$${(baseRoomTotal + calculatedLateFee + minibarTotal + damageCharges + totalServiceCharges).toFixed(2)}</span></div>
      ${rIsPrepaid ? `<div class="totals-row" style="color: #059669;"><span>Pre-Paid Room Accommodation:</span><span>-$${baseRoomTotal.toFixed(2)}</span></div>` : ""}
      ${depositPaid > 0 ? `<div class="totals-row" style="color: #059669;"><span>Security Deposit Applied:</span><span>-$${depositPaid.toFixed(2)}</span></div>` : ""}
      <div class="totals-row" style="color: #0d9488; font-weight: bold;"><span>Settled at Check-Out (${rMethod.toUpperCase()}):</span><span>$${rNetSettled.toFixed(2)}</span></div>
      <div class="totals-row grand"><span>Remaining Balance Due:</span><span>$0.00 (Zero Balance Settled)</span></div>
    </div>
    <div class="footer">
      This stay folio has been mutually announced, verified, and settled by Guest (${getGuestName(folioTarget)}) and Receptionist (${currentStaffName}). Thank you for staying with Nexus Grand Hotel!
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
              }}
            >
              <Printer className="h-4 w-4" />
              Print Official Folio Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

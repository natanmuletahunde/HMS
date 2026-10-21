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
} from "lucide-react";
import { apiFetch } from "@/lib/api";
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
  checkOutDate: string;
  nights?: number;
  totalAmount?: number;
  status: string;
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

function computeLateCheckoutFee(checkOutDate?: string, roomTotal?: number, nights?: number) {
  if (!checkOutDate) {
    return { fee: 0, isLate: false, hoursLate: 0, tierLabel: "On-time" };
  }

  const now = new Date();
  const dateStr = checkOutDate.split("T")[0];
  const [year, month, day] = dateStr.split("-").map(Number);
  // Standard checkout deadline is 12:00 PM local time on the scheduled departure day
  const checkoutDeadline = new Date(year, month - 1, day, 12, 0, 0);

  const diffMs = now.getTime() - checkoutDeadline.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // If before 12:00 PM or within 30 min grace period
  if (diffMinutes <= 30) {
    return {
      fee: 0,
      isLate: false,
      hoursLate: 0,
      tierLabel: diffMinutes > 0 ? "Grace period (under 30 mins late)" : "On-time departure",
    };
  }

  const hoursLate = diffMinutes / 60;
  const numNights = nights && nights > 0 ? nights : 1;
  const dailyRate = roomTotal && roomTotal > 0 ? roomTotal / numNights : 100;

  if (hoursLate <= 3) {
    // 1h - 3h late: standard late fee (25% of daily rate, min $25)
    const fee = Math.max(25, Math.round(dailyRate * 0.25));
    return { fee, isLate: true, hoursLate, tierLabel: `+${hoursLate.toFixed(1)}h late (Tier 1: 25% daily rate)` };
  } else if (hoursLate <= 6) {
    // 3h - 6h late: half-day rate (50% of daily rate, min $50)
    const fee = Math.max(50, Math.round(dailyRate * 0.5));
    return { fee, isLate: true, hoursLate, tierLabel: `+${hoursLate.toFixed(1)}h late (Tier 2: Half-day rate)` };
  } else {
    // Over 6h late: full night rate
    const fee = Math.max(100, Math.round(dailyRate));
    return { fee, isLate: true, hoursLate, tierLabel: `+${hoursLate.toFixed(1)}h late (Tier 3: Full night rate)` };
  }
}

export default function CheckOutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"departures" | "records">("departures");
  const [checkOutTarget, setCheckOutTarget] = useState<Reservation | null>(null);
  const [managerOverride, setManagerOverride] = useState(false);
  const [waiveLateFee, setWaiveLateFee] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualLateFee, setManualLateFee] = useState("");
  const [manualTotalCharges, setManualTotalCharges] = useState("");

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
      setCheckOutTarget(null);
      setManagerOverride(false);
      toast({ title: "Guest checked out successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const records = recordsData?.data ?? [];

  const departuresPagination = usePagination(departures, 5);
  const recordsPagination = usePagination(records, 5);

  const targetInspection = checkOutTarget
    ? inspections.find((i) => i.reservationId === checkOutTarget.id)
    : null;
  const isTargetCleared = targetInspection?.status === "cleared";

  const matchingCheckin = checkinsList.find(
    (c) => c.reservationId === checkOutTarget?.id || (c.roomNumber && c.roomNumber === checkOutTarget?.roomNumber)
  );

  const lateCalc = computeLateCheckoutFee(checkOutTarget?.checkOutDate, checkOutTarget?.totalAmount, checkOutTarget?.nights);
  const calculatedLateFee = waiveLateFee ? 0 : lateCalc.fee;

  const baseRoomTotal = Number(checkOutTarget?.totalAmount || 0);
  const minibarTotal = Number(targetInspection?.minibarTotal || 0);
  const damageCharges = Number(targetInspection?.damageCharges || 0);
  const depositPaid = Number(matchingCheckin?.depositAmount || 0);

  const autoTotalCharges = Math.max(0, baseRoomTotal + calculatedLateFee + minibarTotal + damageCharges);

  const effectiveLateFee = isManualEdit && manualLateFee !== "" ? Number(manualLateFee) : calculatedLateFee;
  const effectiveTotalCharges = isManualEdit && manualTotalCharges !== ""
    ? Number(manualTotalCharges)
    : (isManualEdit && manualLateFee !== ""
        ? Math.max(0, baseRoomTotal + Number(manualLateFee) + minibarTotal + damageCharges)
        : autoTotalCharges);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-out Management</h1>
          <p className="text-xs text-text-muted mt-1">
            Housekeeping inspects minibar, assets, and forgotten items prior to front-desk checkout.
          </p>
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
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === tab ? "bg-primary/10 text-primary" : "bg-muted text-text-muted"
              }`}
            >
              {tab === "departures" ? departures.length : records.length}
            </span>
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
                  return (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">{getGuestName(res)}</TableCell>
                      <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                      <TableCell className="font-semibold">{res.roomNumber ?? "—"}</TableCell>
                      <TableCell>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        ${Number(res.totalAmount ?? 0).toFixed(2)}
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
                        <Badge variant={res.status === "checked_in" ? "success" : "muted"} className="text-[10px] uppercase">
                          {(res.status ?? "").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {res.status === "checked_in" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setCheckOutTarget(res);
                              setManagerOverride(false);
                              setWaiveLateFee(false);
                              setIsManualEdit(false);
                              setManualLateFee("");
                              setManualTotalCharges("");
                            }}
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
                <TableHead>Rating</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-text-muted">No check-out records.</TableCell>
                </TableRow>
              ) : (
                recordsPagination.paginatedItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.checkOutNumber || r.checkoutNumber || r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{r.guestName || [r.guestFirstName, r.guestLastName].filter(Boolean).map((s) => String(s).trim()).filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{r.roomNumber ?? "—"}</TableCell>
                    <TableCell>${Number(r.lateCheckoutFee ?? 0).toFixed(2)}</TableCell>
                    <TableCell>${Number(r.totalCharges ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{r.feedbackRating ? `${r.feedbackRating}/5 ⭐` : "—"}</TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Check Out — {getGuestName(checkOutTarget)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted -mt-2">
            Reservation #{checkOutTarget?.reservationNumber} &bull; Room:{" "}
            <span className="font-semibold text-text">{checkOutTarget?.roomNumber ?? "—"}</span>
          </p>

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
              <p className="text-text-muted leading-relaxed">
                Before guest check-out, Housekeeping must inspect the room for minibar consumption, equipment integrity,
                and forgotten belongings.
              </p>
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

          {/* Automated Folio Breakdown & Charges Calculator */}
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Calculator className="h-4 w-4" />
                <span>Automated Folio & Charges Breakdown</span>
              </div>
              <Badge variant="default" className="text-[10px] bg-primary/15 text-primary border-primary/30">
                <Sparkles className="h-3 w-3 mr-1 inline" /> Auto-Calculated
              </Badge>
            </div>

            <div className="space-y-1.5 text-text-muted divide-y divide-border/40 pt-1">
              <div className="flex items-center justify-between pb-1">
                <span>Base Room Charges ({checkOutTarget?.nights || 1} night{(checkOutTarget?.nights || 1) > 1 ? "s" : ""})</span>
                <span className="font-semibold text-text">${baseRoomTotal.toFixed(2)}</span>
              </div>
              {minibarTotal > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span>Minibar Consumption (Housekeeping)</span>
                  <span className="font-semibold text-text">+${minibarTotal.toFixed(2)}</span>
                </div>
              )}
              {damageCharges > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span>Damages / Incidentals (Housekeeping)</span>
                  <span className="font-semibold text-rose-500">+${damageCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span>Late Checkout Fee</span>
                  <span className="text-[10px] text-text-muted">
                    {lateCalc.tierLabel} (Standard checkout: 12:00 PM)
                  </span>
                </div>
                <div className="text-right">
                  {waiveLateFee ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold line-through text-[11px] mr-1">
                      ${lateCalc.fee.toFixed(2)}
                    </span>
                  ) : null}
                  <span className={`font-semibold ${calculatedLateFee > 0 ? "text-amber-500" : "text-text"}`}>
                    +${calculatedLateFee.toFixed(2)}
                  </span>
                </div>
              </div>
              {depositPaid > 0 && (
                <div className="flex items-center justify-between py-1 text-emerald-600 dark:text-emerald-400">
                  <span>Security Deposit on File (Check-in)</span>
                  <span className="font-semibold">${depositPaid.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 font-bold text-sm text-text">
                <span>Net Total Charges:</span>
                <span className="text-primary text-base">${effectiveTotalCharges.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer text-text">
                <input
                  type="checkbox"
                  checked={waiveLateFee}
                  onChange={(e) => setWaiveLateFee(e.target.checked)}
                  disabled={!lateCalc.isLate}
                  className="h-3.5 w-3.5 rounded border-border text-primary cursor-pointer disabled:opacity-50"
                />
                <span className={lateCalc.isLate ? "font-medium" : "text-text-muted"}>
                  Waive Late Fee (VIP / Flight delay / Courtesy)
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  if (isManualEdit) {
                    setIsManualEdit(false);
                    setManualLateFee("");
                    setManualTotalCharges("");
                  } else {
                    setIsManualEdit(true);
                    setManualLateFee(String(calculatedLateFee));
                    setManualTotalCharges(String(autoTotalCharges));
                  }
                }}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                {isManualEdit ? (
                  <>
                    <RotateCcw className="h-3 w-3" /> Revert to Auto
                  </>
                ) : (
                  <>
                    <Pencil className="h-3 w-3" /> Override / Edit Manually
                  </>
                )}
              </button>
            </div>
          </div>

          <form
            className="space-y-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!checkOutTarget) return;
              const fd = new FormData(e.currentTarget);
              checkOutMutation.mutate({
                id: checkOutTarget.id,
                body: {
                  lateCheckoutFee: effectiveLateFee,
                  totalCharges: effectiveTotalCharges,
                  depositRefunded: fd.get("depositRefunded") === "on",
                  feedbackRating: fd.get("feedbackRating") ? Number(fd.get("feedbackRating")) : undefined,
                  feedbackNotes: fd.get("feedbackNotes") || undefined,
                  checkedOutBy: fd.get("checkedOutBy") || undefined,
                  notes: fd.get("notes") || undefined,
                  overrideInspection: managerOverride,
                },
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lateCheckoutFee">Late Checkout Fee</Label>
                  {!isManualEdit ? (
                    <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Auto-calc
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-medium">Manual edit</span>
                  )}
                </div>
                <Input
                  id="lateCheckoutFee"
                  name="lateCheckoutFee"
                  type="number"
                  step="0.01"
                  readOnly={!isManualEdit}
                  className={!isManualEdit ? "bg-muted/50 cursor-not-allowed font-semibold text-text" : "font-semibold"}
                  value={isManualEdit ? manualLateFee : effectiveLateFee.toFixed(2)}
                  onChange={(e) => setManualLateFee(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="totalCharges">Total Charges</Label>
                  {!isManualEdit ? (
                    <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Auto-calc
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-medium">Manual edit</span>
                  )}
                </div>
                <Input
                  id="totalCharges"
                  name="totalCharges"
                  type="number"
                  step="0.01"
                  readOnly={!isManualEdit}
                  className={!isManualEdit ? "bg-muted/50 cursor-not-allowed font-semibold text-primary" : "font-semibold"}
                  value={isManualEdit ? manualTotalCharges : effectiveTotalCharges.toFixed(2)}
                  onChange={(e) => setManualTotalCharges(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border/50 text-xs">
              <input
                type="checkbox"
                id="depositRefunded"
                name="depositRefunded"
                defaultChecked={depositPaid > 0}
                className="h-4 w-4 rounded border-border text-primary cursor-pointer"
              />
              <label htmlFor="depositRefunded" className="text-xs text-text cursor-pointer">
                Deposit Refunded to Guest{" "}
                {depositPaid > 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    (${depositPaid.toFixed(2)} on file)
                  </span>
                ) : null}
              </label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feedbackRating">Guest Rating (1–5)</Label>
              <select name="feedbackRating" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">No Rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} Star{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feedbackNotes">Feedback Notes</Label>
              <textarea name="feedbackNotes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="checkedOutBy">Checked Out By</Label>
              <Input id="checkedOutBy" name="checkedOutBy" placeholder="Staff name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={checkOutMutation.isPending || (!isTargetCleared && !managerOverride)}
            >
              {checkOutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing Checkout...
                </>
              ) : !isTargetCleared && !managerOverride ? (
                "Awaiting Housekeeping Room Clearance"
              ) : (
                "Complete Check-out"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Eye,
  CheckCircle,
  XCircle,
  LogOut,
  Loader2,
  Globe,
  UserPlus,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Reservation = {
  id: string;
  reservationNumber: string;
  confirmationNumber?: string;
  guestName?: string;
  guestId?: string;
  roomNumber?: string;
  roomId?: string;
  roomTypeName?: string;
  roomTypeId?: string;
  checkInDate: string;
  checkOutDate: string;
  nights?: number;
  totalAmount?: number;
  status: string;
  reservationType?: string;
  bookingSource?: string;
};

type ReservationListResponse = {
  data: Reservation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const STATUS_TABS = ["all", "pending", "confirmed", "checked_in", "checked_out", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  confirmed: "info",
  checked_in: "success",
  checked_out: "muted",
  cancelled: "danger",
  no_show: "danger",
};

function ReservationsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [resType, setResType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelRes, setCancelRes] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState("Guest requested cancellation via phone");
  const [waiveFee, setWaiveFee] = useState(true);
  const [checkOutRes, setCheckOutRes] = useState<Reservation | null>(null);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(statusTab !== "all" ? { status: statusTab } : {}),
    ...(search ? { search } : {}),
    ...(resType !== "all" ? { reservationType: resType } : {}),
    ...(dateFrom ? { checkIn: dateFrom } : {}),
    ...(dateTo ? { checkOut: dateTo } : {}),
  });

  const { data: listData, isLoading } = useQuery<ReservationListResponse>({
    queryKey: ["reservations", statusTab, search, resType, dateFrom, dateTo, page],
    queryFn: () => apiFetch<ReservationListResponse>(`/reservations?${queryParams}`),
  });

  const reservations = listData?.data ?? [];
  const meta = listData?.meta;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
  }

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/reservations/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      setConfirmId(null);
      toast({ title: "Reservation confirmed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch(`/reservations/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason || "Guest requested cancellation via phone" }),
      }),
    onSuccess: () => {
      invalidate();
      setCancelRes(null);
      setCancelReason("Guest requested cancellation via phone");
      toast({ title: "Reservation cancelled & room released" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-out`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      setCheckOutRes(null);
      toast({ title: "Guest checked out successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0 rounded-lg hover:bg-muted"
            title="Go Back"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reservation Records</h1>
            <p className="text-sm text-text-muted">View and manage all guest booking records across the property.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/reservations/calendar")}>Calendar View</Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusTab(s); setPage(1); }}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              statusTab === s ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search guest or res#..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-[220px]"
        />
        <Select value={resType} onValueChange={(v) => { setResType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="group">Group</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-[150px]" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-[150px]" placeholder="To" />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Res #</TableHead>
              <TableHead>Confirm #</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Nights</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(11)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-text-muted">No reservations found.</TableCell>
              </TableRow>
            ) : (
              reservations.map((res) => (
                <TableRow key={res.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                  <TableCell className="font-mono text-xs text-text-muted">{res.confirmationNumber ?? "—"}</TableCell>
                  <TableCell className="font-medium">{res.guestName ?? "—"}</TableCell>
                  <TableCell>
                    {res.roomNumber ? (
                      <span className="font-semibold">Room {res.roomNumber}</span>
                    ) : (
                      <span className="text-text-muted text-xs italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(res.reservationType === "online" || res.bookingSource === "online" || res.bookingSource === "ota") ? (
                      <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30 gap-1 text-[11px] font-semibold py-0.5">
                        <Globe className="w-3 h-3 text-sky-400" /> Online
                      </Badge>
                    ) : (res.reservationType === "walk_in" || res.bookingSource === "walk_in") ? (
                      <Badge variant="outline" className="text-text-muted gap-1 text-[11px] py-0.5">
                        <UserPlus className="w-3 h-3" /> Walk-In
                      </Badge>
                    ) : (
                      <span className="text-xs capitalize">{(res.reservationType ?? res.bookingSource ?? "standard").replace("_", " ")}</span>
                    )}
                  </TableCell>
                  <TableCell>{res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{res.nights ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">ETB {Number(res.totalAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={(STATUS_BADGE[res.status] ?? "muted") as any} className="text-[10px] uppercase">
                      {(res.status ?? "").replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Details" onClick={() => router.push(`/reservations/${res.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {res.status === "pending" && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-info" title="Confirm" onClick={() => setConfirmId(res.id)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {res.status === "checked_in" && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-warning" title="Check-out" onClick={() => setCheckOutRes(res)}>
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {res.status !== "cancelled" && res.status !== "checked_out" && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger" title="Cancel" onClick={() => setCancelRes(res)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={page}
        totalPages={meta?.totalPages || 1}
        totalItems={meta?.total}
        pageSize={5}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(meta?.totalPages || 1, p + 1))}
      />

      {/* Confirm Dialog */}
      <Dialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-white dark:bg-[#0E172E] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Confirm Reservation</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mt-1">
            Are you sure you want to confirm this reservation? A confirmation notification will be sent to the guest.
          </p>
          <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-border">
            <Button variant="outline" className="h-10 text-sm" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button className="h-10 text-sm font-semibold" disabled={confirmMutation.isPending} onClick={() => confirmId && confirmMutation.mutate(confirmId)}>
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reservation &rarr;
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog (Front Desk / Phone Cancellation) */}
      <Dialog open={!!cancelRes} onOpenChange={(o) => !o && setCancelRes(null)}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-white dark:bg-[#0E172E] p-6 shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
              <Phone className="h-5 w-5 text-amber-500" />
              <span>Cancel Reservation — #{cancelRes?.reservationNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Room Release Notification Banner */}
          <div className="bg-[#eef8f5] dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Immediate Inventory Release:</strong> Cancelling this reservation will instantly return{" "}
              {cancelRes?.roomNumber ? `Room ${cancelRes.roomNumber}` : "allocated inventory"} back to Available status for walk-ins and online booking.
            </span>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
              <div>
                <span className="text-muted-foreground">Guest: </span>
                <strong className="text-foreground">{cancelRes?.guestName ?? "Guest"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Room: </span>
                <strong className="text-primary font-bold">{cancelRes?.roomNumber ? `Room ${cancelRes.roomNumber}` : "Unassigned"}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Cancellation Reason *
              </Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Guest requested cancellation via phone">Guest requested cancellation via phone</SelectItem>
                  <SelectItem value="Flight delayed / travel itinerary change">Flight delayed / travel itinerary change</SelectItem>
                  <SelectItem value="Guest illness / medical emergency">Guest illness / medical emergency</SelectItem>
                  <SelectItem value="Duplicate booking / date modification">Duplicate booking / date modification</SelectItem>
                  <SelectItem value="No-show / non-arrival">No-show / non-arrival</SelectItem>
                  <SelectItem value="Other front-desk cancellation">Other front-desk cancellation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="waiveFee"
                checked={waiveFee}
                onChange={(e) => setWaiveFee(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="waiveFee" className="text-xs font-medium cursor-pointer">
                Waive cancellation penalties per front desk authorization
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" className="h-10 text-sm" onClick={() => setCancelRes(null)}>
                Keep Reservation
              </Button>
              <Button
                variant="destructive"
                className="h-10 text-sm font-semibold"
                disabled={cancelMutation.isPending}
                onClick={() => {
                  if (!cancelRes) return;
                  cancelMutation.mutate({ id: cancelRes.id, reason: cancelReason });
                }}
              >
                {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Cancellation & Release Room &rarr;
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={!!checkOutRes} onOpenChange={(o) => !o && setCheckOutRes(null)}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-white dark:bg-[#0E172E] p-6 shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Check Out & Settle Folio — {checkOutRes?.guestName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-1 pb-2 border-b border-border">
            <span>Room {checkOutRes?.roomNumber ?? "—"}</span>
            <span>&bull;</span>
            <span>Res #{checkOutRes?.reservationNumber}</span>
          </div>

          <form className="space-y-4 pt-2" onSubmit={(e) => {
            e.preventDefault();
            if (!checkOutRes) return;
            const fd = new FormData(e.currentTarget);
            checkOutMutation.mutate({
              id: checkOutRes.id,
              body: {
                lateCheckoutFee: fd.get("lateCheckoutFee") ? Number(fd.get("lateCheckoutFee")) : undefined,
                depositRefunded: fd.get("depositRefunded") === "on",
                feedbackNotes: fd.get("feedbackNotes") || undefined,
                notes: fd.get("notes") || undefined,
              },
            });
          }}>
            <div className="space-y-1.5">
              <Label htmlFor="lateCheckoutFee" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Late Checkout Fee (ETB)
              </Label>
              <Input id="lateCheckoutFee" name="lateCheckoutFee" type="number" step="0.01" defaultValue="0" className="h-10 text-sm font-mono" />
            </div>

            <div className="flex items-center gap-2 py-1">
              <input type="checkbox" id="depositRefunded" name="depositRefunded" className="h-4 w-4 rounded border-border" defaultChecked />
              <label htmlFor="depositRefunded" className="text-xs font-medium cursor-pointer">Security deposit refunded in full</label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feedbackNotes" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Guest Feedback / Departure Comments
              </Label>
              <Input id="feedbackNotes" name="feedbackNotes" placeholder="Guest comments on stay experience" className="h-10 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Front Desk Internal Notes
              </Label>
              <textarea name="notes" rows={2} placeholder="Internal staff notes regarding checkout..." className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs" />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" className="h-10 text-sm" onClick={() => setCheckOutRes(null)}>
                Cancel
              </Button>
              <Button type="submit" className="h-10 text-sm font-semibold" disabled={checkOutMutation.isPending}>
                {checkOutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Check-Out & Finalize Folio &rarr;
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">Loading reservations...</div>}>
      <ReservationsContent />
    </Suspense>
  );
}

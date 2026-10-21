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
  const [cancelId, setCancelId] = useState<string | null>(null);
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
    mutationFn: (id: string) => apiFetch(`/reservations/${id}`, { method: "DELETE", body: JSON.stringify({ reason: "Cancelled by staff" }) }),
    onSuccess: () => {
      invalidate();
      setCancelId(null);
      toast({ title: "Reservation cancelled" });
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservation Records</h1>
          <p className="text-sm text-text-muted">View and manage all guest booking records across the property.</p>
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
                  <TableCell>${Number(res.totalAmount ?? 0).toFixed(2)}</TableCell>
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
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger" title="Cancel" onClick={() => setCancelId(res.id)}>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Reservation</DialogTitle></DialogHeader>
          <p className="text-text-muted">Are you sure you want to confirm this reservation?</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button className="flex-1" disabled={confirmMutation.isPending} onClick={() => confirmId && confirmMutation.mutate(confirmId)}>
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Reservation</DialogTitle></DialogHeader>
          <p className="text-text-muted">Are you sure you want to cancel this reservation?</p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCancelId(null)}>Keep it</Button>
            <Button variant="destructive" className="flex-1" disabled={cancelMutation.isPending} onClick={() => cancelId && cancelMutation.mutate(cancelId)}>
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Reservation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-out Dialog */}
      <Dialog open={!!checkOutRes} onOpenChange={(o) => !o && setCheckOutRes(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check Out — {checkOutRes?.guestName}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!checkOutRes) return;
            const fd = new FormData(e.currentTarget);
            checkOutMutation.mutate({
              id: checkOutRes.id,
              body: {
                lateCheckoutFee: fd.get("lateCheckoutFee") ? Number(fd.get("lateCheckoutFee")) : undefined,
                depositRefunded: fd.get("depositRefunded") === "on",
                feedbackRating: fd.get("feedbackRating") ? Number(fd.get("feedbackRating")) : undefined,
                feedbackNotes: fd.get("feedbackNotes") || undefined,
                notes: fd.get("notes") || undefined,
              },
            });
          }}>
            <div className="grid gap-1.5">
              <Label htmlFor="lateCheckoutFee">Late Checkout Fee ($)</Label>
              <Input id="lateCheckoutFee" name="lateCheckoutFee" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="depositRefunded" name="depositRefunded" className="h-4 w-4" defaultChecked />
              <label htmlFor="depositRefunded" className="text-sm">Deposit Refunded</label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feedbackRating">Guest Rating (1-5)</Label>
              <Input id="feedbackRating" name="feedbackRating" type="number" min={1} max={5} defaultValue="5" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feedbackNotes">Guest Feedback</Label>
              <Input id="feedbackNotes" name="feedbackNotes" placeholder="Guest comments on stay" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full" disabled={checkOutMutation.isPending}>
              {checkOutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Check-out
            </Button>
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

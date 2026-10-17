"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Eye, CheckCircle, LogIn, LogOut, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Reservation = {
  id: string;
  reservationNumber: string;
  confirmationNumber?: string;
  guestId: string;
  guestName?: string;
  roomNumber?: string;
  roomTypeName?: string;
  checkInDate: string;
  checkOutDate: string;
  nights?: number;
  adults?: number;
  children?: number;
  reservationType?: string;
  bookingSource?: string;
  totalAmount?: number;
  paidAmount?: number;
  status: string;
  specialRequests?: string;
};

type RoomType = { id: string; name: string; basePrice: number };

type ReservationListResponse = {
  data: Reservation[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const STATUS_TABS = ["all", "pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"] as const;
const STATUS_LABELS: Record<string, string> = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  checked_out: "Checked-out",
  cancelled: "Cancelled",
  no_show: "No-show",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  confirmed: "info",
  checked_in: "success",
  checked_out: "muted",
  cancelled: "danger",
  no_show: "danger",
};

export default function ReservationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [resType, setResType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [checkInRes, setCheckInRes] = useState<Reservation | null>(null);
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

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<RoomType[]>("/room-types"),
  });

  const reservations = listData?.data ?? [];
  const meta = listData?.meta;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
  }

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/reservations/${id}/confirm`, { method: "POST" }),
    onSuccess: () => { invalidate(); setConfirmId(null); toast({ title: "Reservation confirmed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/reservations/${id}`, { method: "DELETE", body: JSON.stringify({ reason: "Cancelled by staff" }) }),
    onSuccess: () => { invalidate(); setCancelId(null); toast({ title: "Reservation cancelled" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-in`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setCheckInRes(null); toast({ title: "Guest checked in successfully" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-out`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setCheckOutRes(null); toast({ title: "Guest checked out successfully" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const newResMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/reservations", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsNewOpen(false); toast({ title: "Reservation created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/reservations/calendar")}>Calendar View</Button>
          <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Reservation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const body: Record<string, unknown> = {};
                fd.forEach((v, k) => { if (v !== "") body[k] = v; });
                if (body.adults) body.adults = Number(body.adults);
                if (body.children) body.children = Number(body.children);
                newResMutation.mutate(body);
              }}>
                <div className="grid gap-1.5">
                  <Label htmlFor="guestId">Guest ID *</Label>
                  <Input id="guestId" name="guestId" required placeholder="Enter guest ID" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="checkInDate">Check-in Date *</Label>
                    <Input id="checkInDate" name="checkInDate" type="date" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="checkOutDate">Check-out Date *</Label>
                    <Input id="checkOutDate" name="checkOutDate" type="date" required />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="roomTypeId">Room Type</Label>
                  <select name="roomTypeId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                    <option value="">Any Room Type</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="adults">Adults</Label>
                    <Input id="adults" name="adults" type="number" min="1" defaultValue="1" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="children">Children</Label>
                    <Input id="children" name="children" type="number" min="0" defaultValue="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="reservationType">Reservation Type</Label>
                    <select name="reservationType" defaultValue="standard" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                      <option value="standard">Standard</option>
                      <option value="walk_in">Walk-in</option>
                      <option value="group">Group</option>
                      <option value="corporate">Corporate</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bookingSource">Booking Source</Label>
                    <select name="bookingSource" defaultValue="direct" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                      <option value="direct">Direct</option>
                      <option value="online">Online</option>
                      <option value="agent">Agent</option>
                      <option value="walk_in">Walk-in</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="specialRequests">Special Requests</Label>
                  <textarea name="specialRequests" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
                </div>
                <Button type="submit" className="w-full" disabled={newResMutation.isPending}>
                  {newResMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Reservation
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
              <TableHead className="w-[120px]">Actions</TableHead>
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
                  <TableCell>{res.roomNumber ?? "—"}</TableCell>
                  <TableCell className="text-xs capitalize">{(res.reservationType ?? "").replace("_", " ") || "—"}</TableCell>
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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View" onClick={() => router.push(`/reservations/${res.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {res.status === "pending" && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-info" title="Confirm" onClick={() => setConfirmId(res.id)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(res.status === "confirmed" || res.status === "pending") && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-success" title="Check-in" onClick={() => setCheckInRes(res)}>
                          <LogIn className="h-3.5 w-3.5" />
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
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (meta.totalPages ?? 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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

      {/* Check-in Dialog */}
      <Dialog open={!!checkInRes} onOpenChange={(o) => !o && setCheckInRes(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check In — {checkInRes?.guestName}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!checkInRes) return;
            const fd = new FormData(e.currentTarget);
            checkInMutation.mutate({
              id: checkInRes.id,
              body: {
                keyCardNumber: fd.get("keyCardNumber") || undefined,
                depositCollected: fd.get("depositCollected") === "on",
                depositAmount: fd.get("depositAmount") ? Number(fd.get("depositAmount")) : undefined,
                identityVerified: fd.get("identityVerified") === "on",
                checkedInBy: fd.get("checkedInBy") || undefined,
                notes: fd.get("notes") || undefined,
              },
            });
          }}>
            <div className="grid gap-1.5">
              <Label htmlFor="keyCardNumber">Key Card Number</Label>
              <Input id="keyCardNumber" name="keyCardNumber" placeholder="e.g. K001" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="identityVerified" name="identityVerified" className="h-4 w-4" defaultChecked />
              <label htmlFor="identityVerified" className="text-sm">Identity Verified</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="depositCollected" name="depositCollected" className="h-4 w-4" />
              <label htmlFor="depositCollected" className="text-sm">Deposit Collected</label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="depositAmount">Deposit Amount</Label>
              <Input id="depositAmount" name="depositAmount" type="number" step="0.01" placeholder="0.00" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="checkedInBy">Checked In By</Label>
              <Input id="checkedInBy" name="checkedInBy" placeholder="Staff name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full" disabled={checkInMutation.isPending}>
              {checkInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Check-in
            </Button>
          </form>
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
                lateCheckoutFee: fd.get("lateCheckoutFee") ? Number(fd.get("lateCheckoutFee")) : 0,
                totalCharges: fd.get("totalCharges") ? Number(fd.get("totalCharges")) : undefined,
                depositRefunded: fd.get("depositRefunded") === "on",
                feedbackRating: fd.get("feedbackRating") ? Number(fd.get("feedbackRating")) : undefined,
                feedbackNotes: fd.get("feedbackNotes") || undefined,
                checkedOutBy: fd.get("checkedOutBy") || undefined,
                notes: fd.get("notes") || undefined,
              },
            });
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="lateCheckoutFee">Late Checkout Fee</Label>
                <Input id="lateCheckoutFee" name="lateCheckoutFee" type="number" step="0.01" defaultValue="0" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="totalCharges">Total Charges</Label>
                <Input id="totalCharges" name="totalCharges" type="number" step="0.01" defaultValue={checkOutRes?.totalAmount ?? ""} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="depositRefunded" name="depositRefunded" className="h-4 w-4" />
              <label htmlFor="depositRefunded" className="text-sm">Deposit Refunded</label>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="feedbackRating">Guest Rating (1–5)</Label>
              <select name="feedbackRating" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">No Rating</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n>1?"s":""}</option>)}
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

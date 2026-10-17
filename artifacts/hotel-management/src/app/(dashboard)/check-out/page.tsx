"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Reservation = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  roomNumber?: string;
  checkOutDate: string;
  nights?: number;
  totalAmount?: number;
  status: string;
};

type CheckOutRecord = {
  id: string;
  checkOutNumber?: string;
  guestName?: string;
  roomNumber?: string;
  lateCheckoutFee?: number;
  totalCharges?: number;
  feedbackRating?: number;
  createdAt?: string;
};

type CheckOutListResponse = {
  data: CheckOutRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export default function CheckOutPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"departures" | "records">("departures");
  const [checkOutTarget, setCheckOutTarget] = useState<Reservation | null>(null);

  const { data: departures = [], isLoading: departuresLoading } = useQuery<Reservation[]>({
    queryKey: ["today-departures"],
    queryFn: () => apiFetch<Reservation[]>("/reservations/today-departures"),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery<CheckOutListResponse>({
    queryKey: ["checkout-records"],
    queryFn: () => apiFetch<CheckOutListResponse>("/checkout?limit=50"),
    enabled: activeTab === "records",
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-out`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-departures"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-records"] });
      setCheckOutTarget(null);
      toast({ title: "Guest checked out successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const records = recordsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Check-out Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["departures", "records"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab === "departures" ? "Today's Departures" : "All Check-out Records"}
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
                <TableHead>Nights</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departuresLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : departures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-text-muted">No departures today.</TableCell>
                </TableRow>
              ) : departures.map((res) => (
                <TableRow key={res.id}>
                  <TableCell className="font-medium">{res.guestName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                  <TableCell>{res.roomNumber ?? "—"}</TableCell>
                  <TableCell>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{res.nights ?? "—"}</TableCell>
                  <TableCell>${Number(res.totalAmount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={res.status === "checked_in" ? "success" : "muted"} className="text-[10px] uppercase">
                      {(res.status ?? "").replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {res.status === "checked_in" ? (
                      <Button size="sm" onClick={() => setCheckOutTarget(res)} className="gap-1">
                        <LogOut className="h-3.5 w-3.5" /> Check Out
                      </Button>
                    ) : (
                      <Badge variant="muted" className="text-xs">Done</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              ) : records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.checkOutNumber ?? r.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{r.guestName ?? "—"}</TableCell>
                  <TableCell>{r.roomNumber ?? "—"}</TableCell>
                  <TableCell>${Number(r.lateCheckoutFee ?? 0).toFixed(2)}</TableCell>
                  <TableCell>${Number(r.totalCharges ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{r.feedbackRating ? `${r.feedbackRating}/5 ⭐` : "—"}</TableCell>
                  <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Check-out Dialog */}
      <Dialog open={!!checkOutTarget} onOpenChange={(o) => !o && setCheckOutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out — {checkOutTarget?.guestName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted mb-2">
            Reservation #{checkOutTarget?.reservationNumber} &bull; Room: {checkOutTarget?.roomNumber ?? "—"}
          </p>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!checkOutTarget) return;
            const fd = new FormData(e.currentTarget);
            checkOutMutation.mutate({
              id: checkOutTarget.id,
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
                <Input id="totalCharges" name="totalCharges" type="number" step="0.01" defaultValue={String(checkOutTarget?.totalAmount ?? "")} />
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
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? "s" : ""}</option>)}
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

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogIn } from "lucide-react";
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
import { DigitalSignaturePad } from "@/components/digital-signature-pad";

type Reservation = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  roomTypeName?: string;
  roomNumber?: string;
  checkInDate: string;
  adults?: number;
  status: string;
};

type CheckInRecord = {
  id: string;
  checkInNumber?: string;
  guestName?: string;
  roomNumber?: string;
  identityVerified?: boolean;
  depositAmount?: number;
  keyCardNumber?: string;
  digitalSignature?: string | null;
  createdAt?: string;
};

type CheckInListResponse = {
  data: CheckInRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  confirmed: "info",
  checked_in: "success",
  checked_out: "muted",
  cancelled: "danger",
};

export default function CheckInPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"arrivals" | "records">("arrivals");
  const [checkInTarget, setCheckInTarget] = useState<Reservation | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const { data: arrivals = [], isLoading: arrivalsLoading } = useQuery<Reservation[]>({
    queryKey: ["today-arrivals"],
    queryFn: () => apiFetch<Reservation[]>("/reservations/today-arrivals"),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery<CheckInListResponse>({
    queryKey: ["checkin-records"],
    queryFn: () => apiFetch<CheckInListResponse>("/checkin?limit=50"),
    enabled: activeTab === "records",
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-in`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-arrivals"] });
      queryClient.invalidateQueries({ queryKey: ["checkin-records"] });
      setCheckInTarget(null);
      setSignatureData(null);
      toast({ title: "Guest checked in successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const records = recordsData?.data ?? [];

  const arrivalsPagination = usePagination(arrivals, 5);
  const recordsPagination = usePagination(records, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Check-in Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["arrivals", "records"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab === "arrivals" ? "Today's Arrivals" : "All Check-in Records"}
          </button>
        ))}
      </div>

      {activeTab === "arrivals" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Res #</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Check-in Date</TableHead>
                <TableHead>Adults</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrivalsLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : arrivals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-text-muted">No arrivals today.</TableCell>
                </TableRow>
              ) : (
                arrivalsPagination.paginatedItems.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.guestName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                    <TableCell>{res.roomTypeName ?? "—"}</TableCell>
                    <TableCell>{res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{res.adults ?? 1}</TableCell>
                    <TableCell>
                      <Badge variant={(STATUS_BADGE[res.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {res.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(res.status === "confirmed" || res.status === "pending") && (
                        <Button size="sm" onClick={() => setCheckInTarget(res)} className="gap-1">
                          <LogIn className="h-3.5 w-3.5" /> Check In
                        </Button>
                      )}
                      {res.status === "checked_in" && (
                        <Badge variant="success" className="text-xs">Checked In</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={arrivalsPagination.currentPage}
            totalPages={arrivalsPagination.totalPages}
            totalItems={arrivalsPagination.totalItems}
            pageSize={5}
            onPrev={arrivalsPagination.onPrev}
            onNext={arrivalsPagination.onNext}
          />
        </div>
      )}

      {activeTab === "records" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check-in #</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Identity Verified</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Key Card</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-text-muted">No check-in records.</TableCell>
                </TableRow>
              ) : (
                recordsPagination.paginatedItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.checkInNumber ?? r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{r.guestName ?? "—"}</TableCell>
                    <TableCell>{r.roomNumber ?? "—"}</TableCell>
                    <TableCell>
                      {r.identityVerified
                        ? <Badge variant="success">Verified</Badge>
                        : <Badge variant="muted">Not Verified</Badge>}
                    </TableCell>
                    <TableCell>${Number(r.depositAmount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{r.keyCardNumber ?? "—"}</TableCell>
                    <TableCell>
                      {r.digitalSignature ? (
                        <img
                          src={r.digitalSignature}
                          alt="Signature"
                          className="h-7 max-w-[80px] object-contain rounded border border-border/50 bg-white p-0.5"
                        />
                      ) : (
                        <span className="text-xs text-text-muted italic">None</span>
                      )}
                    </TableCell>
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

      {/* Check-in Dialog */}
      <Dialog open={!!checkInTarget} onOpenChange={(o) => { if (!o) { setCheckInTarget(null); setSignatureData(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check In — {checkInTarget?.guestName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted mb-2">
            Reservation #{checkInTarget?.reservationNumber} &bull; Room: {checkInTarget?.roomNumber ?? "TBD"}
          </p>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!checkInTarget) return;
            const fd = new FormData(e.currentTarget);
            checkInMutation.mutate({
              id: checkInTarget.id,
              body: {
                keyCardNumber: fd.get("keyCardNumber") || undefined,
                depositCollected: fd.get("depositCollected") === "on",
                depositAmount: fd.get("depositAmount") ? Number(fd.get("depositAmount")) : undefined,
                identityVerified: fd.get("identityVerified") === "on",
                registrationCardGenerated: fd.get("registrationCardGenerated") === "on",
                digitalSignature: signatureData || undefined,
                checkedInBy: fd.get("checkedInBy") || undefined,
                notes: fd.get("notes") || undefined,
              },
            });
          }}>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="keyCardNumber">Key Card Number / RFID UID</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const room = checkInTarget?.roomNumber ?? "GEN";
                    const generatedUid = `RFID-${room}-${Date.now().toString(36).toUpperCase()}`;
                    const input = document.getElementById("keyCardNumber") as HTMLInputElement;
                    if (input) input.value = generatedUid;
                    toast({ title: "RFID Keycard Encoded", description: `Assigned: ${generatedUid}` });
                  }}
                >
                  ⚡ Encode RFID Keycard
                </Button>
              </div>
              <Input id="keyCardNumber" name="keyCardNumber" placeholder="e.g. RFID-101-L7X89Q" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="identityVerified" name="identityVerified" className="h-4 w-4" defaultChecked />
                <label htmlFor="identityVerified" className="text-sm">Identity Verified (Fayida / National ID / Passport)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="depositCollected" name="depositCollected" className="h-4 w-4" />
                <label htmlFor="depositCollected" className="text-sm">Deposit Collected</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="registrationCardGenerated" name="registrationCardGenerated" className="h-4 w-4" />
                <label htmlFor="registrationCardGenerated" className="text-sm">Registration Card Generated</label>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="depositAmount">Deposit Amount</Label>
              <Input id="depositAmount" name="depositAmount" type="number" step="0.01" placeholder="0.00" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="checkedInBy">Checked In By</Label>
              <Input id="checkedInBy" name="checkedInBy" placeholder="Staff name" />
            </div>

            {/* Digital Signature Component */}
            <div className="grid gap-1.5">
              <Label>Guest Digital Signature</Label>
              <DigitalSignaturePad onSave={(sig) => setSignatureData(sig)} />
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
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BedDouble, CheckCircle2, ShieldCheck, Key } from "lucide-react";
import { apiFetch } from "@/lib/api";
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
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";

type CheckInRecord = {
  id: string;
  checkInNumber?: string;
  checkinNumber?: string;
  reservationId?: string;
  reservationNumber?: string;
  guestId?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  roomNumber?: string;
  identityVerified?: boolean;
  depositCollected?: boolean;
  depositAmount?: number;
  keyCardNumber?: string;
  digitalSignature?: string | null;
  checkedInBy?: string;
  notes?: string;
  createdAt?: string;
};

type CheckInListResponse = {
  data: CheckInRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export default function CheckInPage() {
  const [search, setSearch] = useState("");
  const [selectedSignature, setSelectedSignature] = useState<{ guestName?: string; signatureUrl: string } | null>(null);

  const { data: recordsData, isLoading: recordsLoading } = useQuery<CheckInListResponse>({
    queryKey: ["checkin-records"],
    queryFn: () => apiFetch<CheckInListResponse>("/checkins?limit=100"),
  });

  const rawRecords = recordsData?.data ?? [];

  // Filter records by search term
  const filteredRecords = rawRecords.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const guest = (r.guestName || `${r.guestFirstName ?? ''} ${r.guestLastName ?? ''}`).toLowerCase();
    const chkNum = (r.checkInNumber || r.checkinNumber || "").toLowerCase();
    const room = (r.roomNumber || "").toLowerCase();
    const key = (r.keyCardNumber || "").toLowerCase();
    return guest.includes(s) || chkNum.includes(s) || room.includes(s) || key.includes(s);
  });

  const recordsPagination = usePagination(filteredRecords, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check-in Records</h1>
          <p className="text-sm text-text-muted">
            Audit history of completed guest check-in transactions, keycard encodings, and digital signatures.
          </p>
        </div>
        <div className="w-full sm:w-[260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search check-in, guest, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Check-in Records Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Check-in #</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Identity Verified</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Key Card / RFID</TableHead>
              <TableHead>Digital Signature</TableHead>
              <TableHead>Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordsLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-text-muted">
                  <BedDouble className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No check-in records found.</p>
                  <p className="text-xs text-text-muted">
                    {search ? "No records matched your search query." : "Completed check-ins will appear here."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              recordsPagination.paginatedItems.map((r) => {
                const guestDisplayName =
                  r.guestName ||
                  ([r.guestFirstName, r.guestLastName].filter(Boolean).join(" ") || "Guest");
                const checkInNum = r.checkInNumber || r.checkinNumber || r.id.slice(0, 8);

                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold">{checkInNum}</TableCell>
                    <TableCell className="font-medium">{guestDisplayName}</TableCell>
                    <TableCell>
                      {r.roomNumber ? (
                        <span className="font-semibold">Room {r.roomNumber}</span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.identityVerified ? (
                        <Badge variant="success" className="text-[11px] gap-1">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="text-[11px]">Not Verified</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${Number(r.depositAmount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {r.keyCardNumber ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted/40 px-2 py-0.5 rounded border border-border/50">
                          <Key className="h-3 w-3 text-text-muted" />
                          {r.keyCardNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted italic">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.digitalSignature ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSignature({ guestName: guestDisplayName, signatureUrl: r.digitalSignature! })}
                          className="hover:opacity-80 transition-opacity"
                          title="Click to view full signature"
                        >
                          <img
                            src={r.digitalSignature}
                            alt="Signature"
                            className="h-7 max-w-[80px] object-contain rounded border border-border/50 bg-white p-0.5"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-text-muted italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
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

      {/* Signature Viewer Dialog */}
      <Dialog open={!!selectedSignature} onOpenChange={(o) => !o && setSelectedSignature(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Digital Signature — {selectedSignature?.guestName}</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-white rounded-lg border border-border flex items-center justify-center">
            {selectedSignature?.signatureUrl && (
              <img
                src={selectedSignature.signatureUrl}
                alt="Digital Signature"
                className="max-h-48 object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

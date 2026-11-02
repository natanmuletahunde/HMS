"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Reservation = {
  id: string;
  reservationNumber: string;
  confirmationNumber?: string;
  guestId?: string;
  guestName?: string;
  guestCode?: string;
  vipStatus?: boolean;
  roomId?: string;
  roomNumber?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  adults?: number;
  children?: number;
  reservationType?: string;
  bookingSource?: string;
  ratePlan?: string;
  totalAmount?: number;
  paidAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  serviceCharge?: number;
  depositRequired?: number;
  depositPaid?: number;
  status?: string;
  specialRequests?: string;
  remarks?: string;
  notes?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  createdAt?: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  confirmed: "info",
  checked_in: "success",
  checked_out: "muted",
  cancelled: "danger",
  no_show: "danger",
};

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <span className="text-xs text-text-muted">{label}</span>
      <p className="text-sm font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: res, isLoading } = useQuery<Reservation>({
    queryKey: ["reservation", id],
    queryFn: () => apiFetch<Reservation>(`/reservations/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (!res) {
    return (
      <div className="text-center py-20 text-text-muted">
        <p>Reservation not found.</p>
        <Button variant="outline" size="icon" className="mt-4" onClick={() => router.back()} title="Back" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const base = Number(res.totalAmount ?? 0) - Number(res.taxAmount ?? 0) - Number(res.serviceCharge ?? 0) + Number(res.discountAmount ?? 0);
  const balance = Number(res.totalAmount ?? 0) - Number(res.paidAmount ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 h-9 w-9 rounded-full shrink-0" title="Back" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">#{res.reservationNumber}</h1>
            <Badge variant={(STATUS_BADGE[res.status ?? ""] ?? "muted") as any} className="uppercase">
              {(res.status ?? "").replace("_", " ")}
            </Badge>
            {res.vipStatus && <Badge variant="warning">VIP</Badge>}
          </div>
          <p className="text-sm text-text-muted mt-1">
            Confirmation: {res.confirmationNumber ?? "—"} &bull; Created: {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guest Info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Guest Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Guest Name" value={res.guestName} />
            <InfoRow label="Guest Code" value={res.guestCode} />
            <InfoRow label="Adults" value={res.adults} />
            <InfoRow label="Children" value={res.children} />
          </CardContent>
        </Card>

        {/* Room & Rate */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Room & Rate Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Room Number" value={res.roomNumber} />
            <InfoRow label="Room Type" value={res.roomTypeName} />
            <InfoRow label="Rate Plan" value={res.ratePlan} />
            <InfoRow label="Booking Source" value={(res.bookingSource ?? "").replace("_", " ")} />
            <InfoRow label="Reservation Type" value={(res.reservationType ?? "").replace("_", " ")} />
          </CardContent>
        </Card>

        {/* Stay Details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Stay Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Check-in Date" value={res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : undefined} />
            <InfoRow label="Check-out Date" value={res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : undefined} />
            <InfoRow label="Nights" value={res.nights} />
            <InfoRow label="Actual Check-in" value={res.actualCheckIn ? new Date(res.actualCheckIn).toLocaleString() : undefined} />
            <InfoRow label="Actual Check-out" value={res.actualCheckOut ? new Date(res.actualCheckOut).toLocaleString() : undefined} />
            {res.cancelledAt && <InfoRow label="Cancelled At" value={new Date(res.cancelledAt).toLocaleDateString()} />}
            {res.cancellationReason && <div className="col-span-2"><InfoRow label="Cancellation Reason" value={res.cancellationReason} /></div>}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Base Amount</span>
              <span>${Number(base).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-success">
              <span>Discount (−)</span>
              <span>−${Number(res.discountAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Tax (+)</span>
              <span>+${Number(res.taxAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Service Charge (+)</span>
              <span>+${Number(res.serviceCharge ?? 0).toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>${Number(res.totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-success">
              <span>Paid</span>
              <span>${Number(res.paidAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${balance > 0 ? "text-danger" : "text-success"}`}>
              <span>Balance</span>
              <span>${balance.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 space-y-1">
              <div className="flex justify-between text-sm text-text-muted">
                <span>Deposit Required</span>
                <span>${Number(res.depositRequired ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-muted">
                <span>Deposit Paid</span>
                <span>${Number(res.depositPaid ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      {(res.specialRequests || res.remarks || res.notes) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Special Requests, Remarks & Notes</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-xs text-text-muted">Special Requests</span>
              <p className="text-sm mt-1">{res.specialRequests || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Remarks</span>
              <p className="text-sm mt-1">{res.remarks || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Notes</span>
              <p className="text-sm mt-1">{res.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

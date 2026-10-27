"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Star, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";

type Guest = {
  id: string;
  guestCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  passportNumber?: string;
  nationalId?: string;
  visaNumber?: string;
  phone?: string;
  alternativePhone?: string;
  email?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vipStatus?: boolean;
  guestType?: string;
  smokingPreference?: string;
  bedPreference?: string;
  floorPreference?: string;
  foodPreference?: string;
  specialRequests?: string;
  remarks?: string;
  notes?: string;
  totalStays?: number;
};

type GuestHistory = {
  reservations: any[];
  checkins: any[];
  checkouts: any[];
  stayChanges: any[];
};

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function guestTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    individual: "Individual",
    corporate: "Corporate",
    travel_agency: "Travel Agency",
    government: "Government",
  };
  return labels[type ?? ""] ?? type ?? "—";
}

const TABS = ["Reservations", "Check-ins", "Check-outs", "Stay Changes"] as const;
type Tab = typeof TABS[number];

export default function GuestProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("Reservations");

  const { data: guest, isLoading } = useQuery<Guest>({
    queryKey: ["guest", id],
    queryFn: () => apiFetch<Guest>(`/guests/${id}`),
  });

  const { data: history, isLoading: historyLoading } = useQuery<GuestHistory>({
    queryKey: ["guest-history", id],
    queryFn: () => apiFetch<GuestHistory>(`/guests/${id}/history`),
  });

  const activeItems = useMemo(() => {
    if (activeTab === "Reservations") return history?.reservations ?? [];
    if (activeTab === "Check-ins") return history?.checkins ?? [];
    if (activeTab === "Check-outs") return history?.checkouts ?? [];
    return history?.stayChanges ?? [];
  }, [activeTab, history]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(activeItems, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-20 text-text-muted">
        <p>Guest not found.</p>
        <Button variant="outline" size="icon" className="mt-4" onClick={() => router.back()} title="Back" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const fullName = [guest.firstName, guest.middleName, guest.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 h-9 w-9 rounded-full shrink-0" title="Back" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
            {guest.vipStatus && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="muted" className="font-mono text-xs">{guest.guestCode}</Badge>
            {guest.vipStatus && <Badge variant="warning">VIP</Badge>}
            <Badge variant="default">{guestTypeLabel(guest.guestType)}</Badge>
            <Badge variant="muted">{guest.totalStays ?? 0} Stays</Badge>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Gender" value={guest.gender} />
            <InfoRow label="Date of Birth" value={guest.dateOfBirth ? new Date(guest.dateOfBirth).toLocaleDateString() : undefined} />
            <InfoRow label="Nationality" value={guest.nationality} />
            <InfoRow label="ID Type" value={guest.idType} />
            <InfoRow label="ID Number" value={guest.idNumber} />
            <InfoRow label="Passport Number" value={guest.passportNumber} />
            <InfoRow label="National ID / Fayida ID" value={guest.nationalId} />
            <InfoRow label="Visa Number" value={guest.visaNumber} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Phone" value={guest.phone} />
            <InfoRow label="Alt. Phone" value={guest.alternativePhone} />
            <InfoRow label="Email" value={guest.email} />
            <InfoRow label="Country" value={guest.country} />
            <InfoRow label="Region" value={guest.region} />
            <InfoRow label="City" value={guest.city} />
            <div className="col-span-2">
              <InfoRow label="Address" value={guest.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Emergency Contact & Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Emergency Contact" value={guest.emergencyContactName} />
            <InfoRow label="Emergency Phone" value={guest.emergencyContactPhone} />
            <InfoRow label="Smoking" value={guest.smokingPreference} />
            <InfoRow label="Bed Type" value={guest.bedPreference} />
            <InfoRow label="Floor" value={guest.floorPreference} />
            <InfoRow label="Food" value={guest.foodPreference} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Special Requests & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-text-muted">Special Requests</span>
              <p className="text-sm mt-1">{guest.specialRequests || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Remarks</span>
              <p className="text-sm mt-1">{guest.remarks || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">Notes</span>
              <p className="text-sm mt-1">{guest.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <div>
        <div className="flex border-b border-border gap-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-border bg-surface">
          {historyLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : activeTab === "Reservations" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Res #</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Nights</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-text-muted h-16">No reservations</TableCell></TableRow>
                ) : paginatedItems.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.reservationNumber}</TableCell>
                    <TableCell>{r.roomNumber ?? "—"}</TableCell>
                    <TableCell>{r.checkInDate ? new Date(r.checkInDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{r.checkOutDate ? new Date(r.checkOutDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{r.nights ?? "—"}</TableCell>
                    <TableCell>${Number(r.totalAmount ?? 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="muted">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeTab === "Check-ins" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check-in #</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Key Card</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Identity Verified</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-text-muted h-16">No check-ins</TableCell></TableRow>
                ) : paginatedItems.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.checkInNumber ?? c.id}</TableCell>
                    <TableCell>{c.roomNumber ?? "—"}</TableCell>
                    <TableCell>{c.keyCardNumber ?? "—"}</TableCell>
                    <TableCell>${Number(c.depositAmount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{c.identityVerified ? <Badge variant="success">Yes</Badge> : <Badge variant="muted">No</Badge>}</TableCell>
                    <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeTab === "Check-outs" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check-out #</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Total Charges</TableHead>
                  <TableHead>Late Fee</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-text-muted h-16">No check-outs</TableCell></TableRow>
                ) : paginatedItems.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.checkOutNumber ?? c.id}</TableCell>
                    <TableCell>{c.roomNumber ?? "—"}</TableCell>
                    <TableCell>${Number(c.totalCharges ?? 0).toFixed(2)}</TableCell>
                    <TableCell>${Number(c.lateCheckoutFee ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{c.feedbackRating ? `${c.feedbackRating}/5` : "—"}</TableCell>
                    <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>From Room</TableHead>
                  <TableHead>To Room</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-text-muted h-16">No stay changes</TableCell></TableRow>
                ) : paginatedItems.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="muted">{c.actionType}</Badge></TableCell>
                    <TableCell>{c.fromRoomNumber ?? "—"}</TableCell>
                    <TableCell>{c.toRoomNumber ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.reason ?? "—"}</TableCell>
                    <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!historyLoading && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={5}
              onPrev={onPrev}
              onNext={onNext}
            />
          )}
        </div>
      </div>
    </div>
  );
}

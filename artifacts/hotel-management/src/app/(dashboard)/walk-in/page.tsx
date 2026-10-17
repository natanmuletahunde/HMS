"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle, Search, User } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Guest = {
  id: string;
  guestCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  nationality?: string;
};

type RoomType = { id: string; name: string; basePrice: number };
type Room = { id: string; number: string; status: string; currentPrice?: number; roomTypeName?: string };

const STEPS = ["Guest", "Room & Dates", "Confirm"] as const;
type Step = 0 | 1 | 2;

export default function WalkInPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(0);
  const [guestMode, setGuestMode] = useState<"existing" | "new">("existing");
  const [guestSearch, setGuestSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [newGuestData, setNewGuestData] = useState<Partial<Guest & { idType: string; idNumber: string }>>({});

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [confirmation, setConfirmation] = useState<{ reservationNumber: string; checkInNumber?: string } | null>(null);

  const { data: guestResultsRaw, isLoading: guestSearchLoading } = useQuery({
    queryKey: ["guests-search", guestSearch],
    queryFn: () => apiFetch<{ data: Guest[] }>(`/guests?search=${encodeURIComponent(guestSearch)}&limit=5`),
    enabled: guestSearch.length >= 2,
  });
  const guestResults: Guest[] = guestResultsRaw?.data ?? [];

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<RoomType[]>("/room-types"),
  });

  const searchParams = new URLSearchParams({ checkIn, checkOut, ...(selectedRoomTypeId ? { roomTypeId: selectedRoomTypeId } : {}) });
  const { data: availableRooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["availability", checkIn, checkOut, selectedRoomTypeId],
    queryFn: () => apiFetch<Room[]>(`/reservations/availability?${searchParams}`),
    enabled: step === 1 && !!checkIn && !!checkOut,
  });

  const createGuestMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<Guest>("/guests", { method: "POST", body: JSON.stringify(body) }),
  });

  const createResMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<{ id: string; reservationNumber: string }>("/reservations", { method: "POST", body: JSON.stringify(body) }),
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<any>(`/reservations/${id}/check-in`, { method: "POST", body: JSON.stringify(body) }),
  });

  const nights = Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

  async function handleComplete() {
    try {
      let guestId: string;

      if (guestMode === "existing" && selectedGuest) {
        guestId = selectedGuest.id;
      } else {
        const g = await createGuestMutation.mutateAsync({
          firstName: newGuestData.firstName ?? "",
          lastName: newGuestData.lastName ?? "",
          phone: newGuestData.phone ?? undefined,
          email: newGuestData.email ?? undefined,
          nationality: newGuestData.nationality ?? undefined,
          idType: newGuestData.idType ?? undefined,
          idNumber: newGuestData.idNumber ?? undefined,
        });
        guestId = g.id;
      }

      const res = await createResMutation.mutateAsync({
        guestId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        roomId: selectedRoom?.id ?? undefined,
        reservationType: "walk_in",
        bookingSource: "walk_in",
        status: "pending",
        adults: 1,
      });

      const ci = await checkInMutation.mutateAsync({
        id: res.id,
        body: { identityVerified: true },
      });

      setConfirmation({
        reservationNumber: res.reservationNumber,
        checkInNumber: ci?.checkInNumber,
      });
      toast({ title: "Walk-in completed successfully!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const isProcessing = createGuestMutation.isPending || createResMutation.isPending || checkInMutation.isPending;

  // Success screen
  if (confirmation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-xl font-bold">Walk-in Complete!</h2>
            <p className="text-text-muted">Guest has been checked in successfully.</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-muted">Reservation #</span>
                <span className="font-mono font-semibold">{confirmation.reservationNumber}</span>
              </div>
              {confirmation.checkInNumber && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Check-in #</span>
                  <span className="font-mono font-semibold">{confirmation.checkInNumber}</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={() => { setConfirmation(null); setStep(0); setSelectedGuest(null); setSelectedRoom(null); setGuestSearch(""); }}>
              New Walk-in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Walk-in Registration</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${
              i < step ? "bg-success text-bg" : i === step ? "bg-primary text-bg" : "bg-muted text-text-muted"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${i === step ? "text-primary" : "text-text-muted"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? "bg-success" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Guest */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Step 1: Guest Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant={guestMode === "existing" ? "default" : "outline"}
                onClick={() => { setGuestMode("existing"); setSelectedGuest(null); }}
              >
                <User className="mr-2 h-4 w-4" /> Existing Guest
              </Button>
              <Button
                variant={guestMode === "new" ? "default" : "outline"}
                onClick={() => { setGuestMode("new"); setSelectedGuest(null); }}
              >
                <Search className="mr-2 h-4 w-4" /> New Guest
              </Button>
            </div>

            {guestMode === "existing" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={guestSearch}
                    onChange={e => setGuestSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {guestSearchLoading && <Skeleton className="h-12 w-full" />}
                {guestResults.length > 0 && (
                  <div className="border border-border rounded-md divide-y divide-border">
                    {guestResults.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGuest(g)}
                        className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedGuest?.id === g.id ? "bg-primary/10" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{g.firstName} {g.lastName}</p>
                            <p className="text-xs text-text-muted">{g.phone ?? ""} {g.email ?? ""}</p>
                          </div>
                          <Badge variant="muted" className="font-mono text-xs">{g.guestCode}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedGuest && (
                  <div className="p-3 rounded-md bg-primary/10 border border-primary/30">
                    <p className="font-medium text-sm text-primary">Selected: {selectedGuest.firstName} {selectedGuest.lastName}</p>
                    <p className="text-xs text-text-muted">{selectedGuest.email ?? selectedGuest.phone ?? "—"}</p>
                  </div>
                )}
              </div>
            )}

            {guestMode === "new" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>First Name *</Label>
                  <Input value={newGuestData.firstName ?? ""} onChange={e => setNewGuestData(d => ({ ...d, firstName: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Last Name *</Label>
                  <Input value={newGuestData.lastName ?? ""} onChange={e => setNewGuestData(d => ({ ...d, lastName: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Phone</Label>
                  <Input value={newGuestData.phone ?? ""} onChange={e => setNewGuestData(d => ({ ...d, phone: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={newGuestData.email ?? ""} onChange={e => setNewGuestData(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Nationality</Label>
                  <Input value={newGuestData.nationality ?? ""} onChange={e => setNewGuestData(d => ({ ...d, nationality: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>ID Type</Label>
                  <select
                    value={newGuestData.idType ?? ""}
                    onChange={e => setNewGuestData(d => ({ ...d, idType: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="driver_license">Driver License</option>
                  </select>
                </div>
                <div className="grid gap-1.5 col-span-2">
                  <Label>ID Number</Label>
                  <Input value={newGuestData.idNumber ?? ""} onChange={e => setNewGuestData(d => ({ ...d, idNumber: e.target.value }))} />
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={(guestMode === "existing" && !selectedGuest) || (guestMode === "new" && (!newGuestData.firstName || !newGuestData.lastName))}
              onClick={() => setStep(1)}
            >
              Continue to Room & Dates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Room & Dates */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Step 2: Room & Dates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Check-in Date</Label>
                <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={today} />
              </div>
              <div className="grid gap-1.5">
                <Label>Check-out Date</Label>
                <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Room Type (Optional)</Label>
              <select
                value={selectedRoomTypeId}
                onChange={e => { setSelectedRoomTypeId(e.target.value); setSelectedRoom(null); }}
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Any Type</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name} — ${rt.basePrice}/night</option>)}
              </select>
            </div>

            {/* Available Rooms */}
            <div>
              <p className="text-sm font-medium mb-2">Available Rooms</p>
              {roomsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : availableRooms.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">No rooms available for selected dates.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableRooms.map(room => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`p-3 border rounded-md cursor-pointer hover:border-primary/50 transition-colors ${
                        selectedRoom?.id === room.id ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Room {room.number}</p>
                          <p className="text-xs text-text-muted">{room.roomTypeName ?? "Standard"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${Number(room.currentPrice ?? 0).toFixed(2)}/night</p>
                          {nights > 0 && <p className="text-xs text-text-muted">Total: ${(Number(room.currentPrice ?? 0) * nights).toFixed(2)}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Back</Button>
              <Button className="flex-1" disabled={!selectedRoom} onClick={() => setStep(2)}>
                Continue to Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Step 3: Confirm Walk-in</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Guest</h3>
              <div className="p-3 rounded-md bg-muted/30 text-sm">
                {guestMode === "existing" && selectedGuest ? (
                  <>
                    <p className="font-medium">{selectedGuest.firstName} {selectedGuest.lastName}</p>
                    <p className="text-text-muted">{selectedGuest.email ?? selectedGuest.phone ?? "—"}</p>
                    <Badge variant="muted" className="mt-1 font-mono text-xs">{selectedGuest.guestCode}</Badge>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{newGuestData.firstName} {newGuestData.lastName}</p>
                    <p className="text-text-muted">{newGuestData.email ?? newGuestData.phone ?? "New Guest"}</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Room & Dates</h3>
              <div className="p-3 rounded-md bg-muted/30 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Room</span>
                  <span className="font-medium">Room {selectedRoom?.number} — {selectedRoom?.roomTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Check-in</span>
                  <span>{new Date(checkIn).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Check-out</span>
                  <span>{new Date(checkOut).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Nights</span>
                  <span>{nights}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1 font-semibold">
                  <span>Estimated Total</span>
                  <span>${(Number(selectedRoom?.currentPrice ?? 0) * nights).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleComplete} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Walk-in
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

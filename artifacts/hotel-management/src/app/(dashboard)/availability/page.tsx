"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, BedDouble, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type RoomType = { id: string; name: string; basePrice: number };

type Room = {
  id: string;
  number: string;
  status: string;
  currentPrice?: number;
  roomTypeName?: string;
  roomTypeId?: string;
  floor?: number;
  maxAdults?: number;
  maxChildren?: number;
};

function calcNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export default function AvailabilityPage() {
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [roomTypeId, setRoomTypeId] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [searched, setSearched] = useState(false);

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<RoomType[]>("/room-types"),
  });

  const searchParams = new URLSearchParams({
    checkIn,
    checkOut,
    ...(roomTypeId ? { roomTypeId } : {}),
  });

  const { data: rooms = [], isLoading, refetch } = useQuery<Room[]>({
    queryKey: ["availability", checkIn, checkOut, roomTypeId],
    queryFn: () => apiFetch<Room[]>(`/reservations/availability?${searchParams}`),
    enabled: false,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearched(true);
    refetch();
  }

  const nights = calcNights(checkIn, checkOut);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Room Availability</h1>

      {/* Search Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Search Available Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-4 items-end" onSubmit={handleSearch}>
            <div className="grid gap-1.5">
              <Label htmlFor="checkIn">Check-in Date</Label>
              <Input id="checkIn" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={today} className="w-[160px]" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="checkOut">Check-out Date</Label>
              <Input id="checkOut" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} className="w-[160px]" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="roomTypeId">Room Type</Label>
              <select
                id="roomTypeId"
                value={roomTypeId}
                onChange={e => setRoomTypeId(e.target.value)}
                className="flex h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm w-[160px]"
              >
                <option value="">Any Type</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adults">Adults</Label>
              <Input id="adults" type="number" min="1" value={adults} onChange={e => setAdults(Number(e.target.value))} className="w-[80px]" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="children">Children</Label>
              <Input id="children" type="number" min="0" value={children} onChange={e => setChildren(Number(e.target.value))} className="w-[80px]" />
            </div>
            <Button type="submit" className="gap-2">
              <Search className="h-4 w-4" /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {isLoading ? "Searching..." : `${rooms.length} room${rooms.length !== 1 ? "s" : ""} available`}
              {nights > 0 && ` for ${nights} night${nights !== 1 ? "s" : ""}`}
              {checkIn && checkOut && ` (${new Date(checkIn).toLocaleDateString()} → ${new Date(checkOut).toLocaleDateString()})`}
            </p>
            {nights > 0 && !isLoading && rooms.length > 0 && (
              <p className="text-sm font-medium text-primary">
                Estimated totals from ${(Math.min(...rooms.map(r => r.currentPrice ?? 0)) * nights).toFixed(0)}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : rooms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 gap-3">
                <BedDouble className="h-10 w-10 text-text-muted" />
                <p className="text-text-muted">No rooms available for the selected dates and criteria.</p>
                <p className="text-xs text-text-muted">Try different dates or room type.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const estimatedTotal = Number(room.currentPrice ?? 0) * nights;
                return (
                  <Card key={room.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Room {room.number}</CardTitle>
                        <Badge variant="success" className="text-xs">Available</Badge>
                      </div>
                      <p className="text-sm text-text-muted">{room.roomTypeName ?? "Standard"}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        {room.floor && (
                          <span className="text-text-muted">Floor {room.floor}</span>
                        )}
                        <div className="flex items-center gap-1 text-text-muted">
                          <Users className="h-3.5 w-3.5" />
                          <span>{room.maxAdults ?? "—"} adults{room.maxChildren ? `, ${room.maxChildren} child` : ""}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold">${Number(room.currentPrice ?? 0).toFixed(2)}</span>
                          <span className="text-xs text-text-muted">/night</span>
                        </div>
                        {nights > 0 && (
                          <span className="text-sm text-text-muted">
                            Total: <span className="font-semibold text-text">${estimatedTotal.toFixed(2)}</span>
                          </span>
                        )}
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => router.push(`/reservations?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`)}
                      >
                        Reserve Now
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {!searched && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 gap-3">
            <BedDouble className="h-10 w-10 text-text-muted" />
            <p className="text-text-muted">Enter dates and click Search to view available rooms.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

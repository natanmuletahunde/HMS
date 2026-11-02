"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  CalendarCheck, LogOut, Users, UserPlus, Star, AlertTriangle, Clock, Percent,
  LogIn, Globe
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";

type FrontOfficeStats = {
  todayArrivals: number;
  todayDepartures: number;
  inHouseGuests: number;
  walkIns: number;
  vipGuests: number;
  noShows: number;
  expectedCheckouts: number;
  occupancyRate: number;
  occupiedRooms: number;
  availableRooms: number;
  totalRooms: number;
};

type Reservation = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  roomTypeName?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  status: string;
  reservationType?: string;
  bookingSource?: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  confirmed: "info",
  checked_in: "success",
  checked_out: "muted",
  cancelled: "danger",
};

export default function FrontOfficePage() {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const { data: stats, isLoading: statsLoading } = useQuery<FrontOfficeStats>({
    queryKey: ["front-office"],
    queryFn: () => apiFetch<FrontOfficeStats>("/front-office"),
  });

  const { data: arrivals = [], isLoading: arrivalsLoading } = useQuery<Reservation[]>({
    queryKey: ["today-arrivals"],
    queryFn: () => apiFetch<Reservation[]>("/reservations/today-arrivals"),
  });

  const { data: departures = [], isLoading: departuresLoading } = useQuery<Reservation[]>({
    queryKey: ["today-departures"],
    queryFn: () => apiFetch<Reservation[]>("/reservations/today-departures"),
  });

  const arrivalsPagination = usePagination(arrivals, 5);
  const departuresPagination = usePagination(departures, 5);

  const kpiRow1 = [
    { label: "Today's Arrivals", value: stats?.todayArrivals, icon: CalendarCheck, color: "text-info" },
    { label: "Today's Departures", value: stats?.todayDepartures, icon: LogOut, color: "text-warning" },
    { label: "In-House Guests", value: stats?.inHouseGuests, icon: Users, color: "text-success" },
    { label: "Walk-ins Today", value: stats?.walkIns, icon: UserPlus, color: "text-primary" },
  ];

  const kpiRow2 = [
    { label: "VIP Guests", value: stats?.vipGuests, icon: Star, color: "text-yellow-400" },
    { label: "No-Shows", value: stats?.noShows, icon: AlertTriangle, color: "text-danger" },
    { label: "Expected Checkouts", value: stats?.expectedCheckouts, icon: Clock, color: "text-text-muted" },
    { label: "Occupancy Rate", value: stats?.occupancyRate != null ? `${Number(stats.occupancyRate).toFixed(1)}%` : undefined, icon: Percent, color: "text-primary" },
  ];

  const occupancyPct = stats?.occupancyRate ?? 0;
  const occupiedRooms = stats?.occupiedRooms ?? 0;
  const totalRooms = stats?.totalRooms ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Front Office</h1>
          <p className="text-sm text-text-muted mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/guests")} className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Guest Stepper
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/check-in")} className="gap-1.5">
            <LogIn className="h-4 w-4" /> Records
          </Button>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiRow1.map((kpi) => (
          <Card key={kpi.label} className="bg-surface/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading
                ? <Skeleton className="h-8 w-16" />
                : <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiRow2.map((kpi) => (
          <Card key={kpi.label} className="bg-surface/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading
                ? <Skeleton className="h-8 w-16" />
                : <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Occupancy Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Room Occupancy</span>
            <span className="text-text-muted">{occupiedRooms} of {totalRooms} rooms occupied</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(occupancyPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>0%</span>
            <span className="font-semibold text-primary">{Number(occupancyPct).toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </CardContent>
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Arrivals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Today&apos;s Arrivals</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/check-in")} className="text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrivalsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(4)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : arrivals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-16 text-center text-text-muted text-sm">No arrivals today</TableCell></TableRow>
                ) : arrivalsPagination.paginatedItems.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{res.guestName ?? "—"}</span>
                        {(res.reservationType === "online" || res.bookingSource === "online" || res.bookingSource === "ota") && (
                          <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30 gap-1 text-[9px] px-1.5 py-0 font-semibold">
                            <Globe className="w-2.5 h-2.5" /> Online
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{res.roomTypeName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(STATUS_BADGE[res.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {(res.status ?? "").replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {res.status === "confirmed" || res.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2.5 text-xs gap-1 text-primary hover:bg-primary/10 font-medium"
                          onClick={() => router.push(`/reservations/${res.id}`)}
                        >
                          <LogIn className="h-3 w-3" />
                          <span>Check In</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => router.push("/check-in")}
                        >
                          <LogIn className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Today&apos;s Departures</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/check-out")} className="text-xs">View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departuresLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(4)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : departures.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-16 text-center text-text-muted text-sm">No departures today</TableCell></TableRow>
                ) : departuresPagination.paginatedItems.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium text-sm">{res.guestName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{res.roomNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(STATUS_BADGE[res.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {(res.status ?? "").replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => router.push("/check-out")}>
                        <LogOut className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={departuresPagination.currentPage}
              totalPages={departuresPagination.totalPages}
              totalItems={departuresPagination.totalItems}
              pageSize={5}
              onPrev={departuresPagination.onPrev}
              onNext={departuresPagination.onNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

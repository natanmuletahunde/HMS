"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Reservation = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-info text-bg",
  pending: "bg-warning text-bg",
  checked_in: "bg-success text-bg",
  checked_out: "bg-muted text-text-muted",
  cancelled: "bg-danger text-text",
  no_show: "bg-danger text-text",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ReservationsCalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = getDaysInMonth(year, month);
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ["reservations-calendar", year, month],
    queryFn: () => apiFetch<Reservation[]>(`/reservations/calendar?startDate=${startDate}&endDate=${endDate}`),
  });

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Group reservations by day they overlap
  const resByDay = useMemo(() => {
    const map: Record<number, Reservation[]> = {};
    reservations.forEach((res) => {
      const start = new Date(res.checkInDate);
      const end = new Date(res.checkOutDate);
      for (let d = 1; d <= lastDay; d++) {
        const day = new Date(year, month, d);
        if (day >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
            day <= new Date(end.getFullYear(), end.getMonth(), end.getDate())) {
          if (!map[d]) map[d] = [];
          map[d].push(res);
        }
      }
    });
    return map;
  }, [reservations, year, month, lastDay]);

  const firstDow = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDow + lastDay) / 7) * 7;

  const selectedReservations = selectedDay ? (resByDay[selectedDay] ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Reservation Calendar</h1>
        </div>
        <Button variant="outline" onClick={() => router.push("/reservations")}>List View</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-lg">{MONTH_NAMES[month]} {year}</CardTitle>
            <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-text-muted py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {[...Array(totalCells)].map((_, i) => {
                const day = i - firstDow + 1;
                const isValid = day >= 1 && day <= lastDay;
                const isToday = isValid && day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const isSelected = day === selectedDay;
                const dayRes = isValid ? (resByDay[day] ?? []) : [];

                // Count by status
                const counts: Record<string, number> = {};
                dayRes.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });

                return (
                  <div
                    key={i}
                    onClick={() => isValid && setSelectedDay(day === selectedDay ? null : day)}
                    className={`min-h-[80px] bg-surface p-1.5 ${isValid ? "cursor-pointer hover:bg-muted/50" : ""} ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""} ${isToday ? "ring-1 ring-inset ring-primary" : ""}`}
                  >
                    {isValid && (
                      <>
                        <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-bg" : "text-text"}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {Object.entries(counts).map(([status, count]) => (
                            <div key={status} className={`text-[10px] rounded px-1 py-0.5 ${STATUS_COLOR[status] ?? "bg-muted text-text-muted"}`}>
                              {count} {status.replace("_", " ")}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(STATUS_COLOR).map(([status, cls]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cls.split(" ")[0]}`} />
                <span className="text-xs text-text-muted capitalize">{status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Panel */}
      {selectedDay && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {MONTH_NAMES[month]} {selectedDay}, {year} — {selectedReservations.length} reservation{selectedReservations.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReservations.length === 0 ? (
              <p className="text-text-muted text-sm">No reservations on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedReservations.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => router.push(`/reservations/${res.id}`)}
                    className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-sm">{res.guestName ?? "—"}</p>
                      <p className="text-xs text-text-muted">
                        #{res.reservationNumber} &bull; Room {res.roomNumber ?? "—"} &bull;
                        {new Date(res.checkInDate).toLocaleDateString()} → {new Date(res.checkOutDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="muted" className={`text-[10px] uppercase ${STATUS_COLOR[res.status] ?? ""}`}>
                      {(res.status ?? "").replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

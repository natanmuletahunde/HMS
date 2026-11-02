"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
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

type StatusStyle = {
  label: string;
  dotEmoji: string;
  badgeClass: string;
  dotClass: string;
};

const STATUS_CONFIG: Record<string, StatusStyle> = {
  pending: {
    label: "Pending",
    dotEmoji: "🟡",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60 font-semibold",
    dotClass: "bg-amber-600 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  },
  confirmed: {
    label: "Confirmed",
    dotEmoji: "🔵",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60 font-semibold",
    dotClass: "bg-sky-600 dark:bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]",
  },
  guaranteed: {
    label: "Guaranteed",
    dotEmoji: "🔵",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/60 font-semibold",
    dotClass: "bg-blue-600 dark:bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]",
  },
  checked_in: {
    label: "Checked-in",
    dotEmoji: "🟢",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60 font-semibold",
    dotClass: "bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  },
  checked_out: {
    label: "Checked-out",
    dotEmoji: "⚪",
    badgeClass: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-semibold",
    dotClass: "bg-slate-600 dark:bg-zinc-400",
  },
  cancelled: {
    label: "Cancelled",
    dotEmoji: "🔴",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60 font-semibold",
    dotClass: "bg-rose-600 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  },
  no_show: {
    label: "No-Show",
    dotEmoji: "🔴",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60 font-semibold",
    dotClass: "bg-rose-600 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  },
};

const DEFAULT_STATUS_STYLE: StatusStyle = {
  label: "Other",
  dotEmoji: "⚪",
  badgeClass: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-semibold",
  dotClass: "bg-slate-600 dark:bg-zinc-400",
};

function getStatusStyle(status?: string): StatusStyle {
  if (!status) return DEFAULT_STATUS_STYLE;
  return STATUS_CONFIG[status.toLowerCase()] ?? {
    label: status.replace("_", " "),
    dotEmoji: "⚪",
    badgeClass: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-semibold",
    dotClass: "bg-slate-600 dark:bg-zinc-400",
  };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface ReservationCalendarViewProps {
  showTitle?: boolean;
  className?: string;
}

export function ReservationCalendarView({ showTitle = true, className = "" }: ReservationCalendarViewProps) {
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
      if (!res.checkInDate || !res.checkOutDate) return;
      const startStr = res.checkInDate.slice(0, 10);
      const endStr = res.checkOutDate.slice(0, 10);

      for (let d = 1; d <= lastDay; d++) {
        const curStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (curStr >= startStr && curStr <= endStr) {
          if (!map[d]) map[d] = [];
          map[d].push(res);
        }
      }
    });
    return map;
  }, [reservations, year, month, lastDay]);

  // Overall monthly stats
  const monthlyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    reservations.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return {
      total: reservations.length,
      pending: counts["pending"] ?? 0,
      confirmed: (counts["confirmed"] ?? 0) + (counts["guaranteed"] ?? 0),
      checkedIn: counts["checked_in"] ?? 0,
      checkedOut: counts["checked_out"] ?? 0,
      cancelled: (counts["cancelled"] ?? 0) + (counts["no_show"] ?? 0),
    };
  }, [reservations]);

  const firstDow = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDow + lastDay) / 7) * 7;

  const selectedReservations = selectedDay ? (resByDay[selectedDay] ?? []) : [];

  return (
    <div className={`space-y-5 ${className}`}>
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reservation Calendar</h1>
              <p className="text-xs text-text-muted">Live room occupancy, bookings timeline, and guest stay tracking</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/guests")}>
            View Guest Lifecycle
          </Button>
        </div>
      )}

      {/* Monthly Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Total Bookings</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{monthlyStats.total}</p>
          </div>
          <span className="text-2xl">📅</span>
        </div>
        <div className="p-3 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/50 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-amber-900 dark:text-amber-400">Pending</p>
            <p className="text-xl font-extrabold text-amber-950 dark:text-amber-300 mt-0.5">{monthlyStats.pending}</p>
          </div>
          <span className="text-2xl">🟡</span>
        </div>
        <div className="p-3 rounded-xl border border-sky-300/80 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-700/50 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-sky-900 dark:text-sky-400">Confirmed</p>
            <p className="text-xl font-extrabold text-sky-950 dark:text-sky-300 mt-0.5">{monthlyStats.confirmed}</p>
          </div>
          <span className="text-2xl">🔵</span>
        </div>
        <div className="p-3 rounded-xl border border-emerald-300/80 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-700/50 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-400">In-House</p>
            <p className="text-xl font-extrabold text-emerald-950 dark:text-emerald-300 mt-0.5">{monthlyStats.checkedIn}</p>
          </div>
          <span className="text-2xl">🟢</span>
        </div>
        <div className="p-3 rounded-xl border border-slate-300/80 bg-slate-50 dark:bg-slate-900/30 dark:border-slate-700 flex items-center justify-between col-span-2 sm:col-span-1 shadow-xs">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-400">Departed</p>
            <p className="text-xl font-extrabold text-slate-950 dark:text-slate-200 mt-0.5">{monthlyStats.checkedOut}</p>
          </div>
          <span className="text-2xl">⚪</span>
        </div>
      </div>

      {/* Calendar Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8" title="Previous Month" aria-label="Previous Month">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{MONTH_NAMES[month]} {year}</CardTitle>
              <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">Click any date to inspect guest folios and room assignments</p>
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8" title="Next Month" aria-label="Next Month">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1.5">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider py-2 bg-slate-100 dark:bg-zinc-800/40 rounded-md">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
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
                    className={`min-h-[96px] bg-surface p-2 transition-all ${
                      isValid ? "cursor-pointer hover:bg-muted/40" : "bg-bg/40 opacity-40 pointer-events-none"
                    } ${
                      isSelected ? "ring-2 ring-primary bg-primary/10 z-10" : ""
                    } ${
                      isToday ? "border-t-2 border-t-primary" : ""
                    }`}
                  >
                    {isValid && (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                              isToday
                                ? "bg-primary text-white font-extrabold shadow-[0_0_8px_rgba(0,197,200,0.5)]"
                                : isSelected
                                ? "bg-primary/20 text-primary font-extrabold"
                                : "text-slate-800 dark:text-white"
                            }`}
                          >
                            {day}
                          </span>
                          {dayRes.length > 0 && (
                            <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                              {dayRes.length} res
                            </span>
                          )}
                        </div>

                        {/* Visual Status Badges */}
                        <div className="space-y-1">
                          {Object.entries(counts).map(([status, count]) => {
                            const style = getStatusStyle(status);
                            return (
                              <div
                                key={status}
                                className={`text-[11px] rounded-md px-1.5 py-0.5 font-bold flex items-center gap-1.5 border shadow-xs transition-colors ${style.badgeClass}`}
                                title={`${count} ${style.label}`}
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dotClass}`} />
                                <span className="font-extrabold">{count}</span>
                                <span className="truncate">{style.label}</span>
                              </div>
                            );
                          })}

                          {/* Preview first room/guest if available */}
                          {dayRes.length > 0 && dayRes[0]?.roomNumber && (
                            <div className="text-[10px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800/80 rounded px-1.5 py-0.5 truncate border border-slate-200 dark:border-zinc-700/60 mt-1">
                              <span className="font-bold text-primary mr-1">R.{dayRes[0].roomNumber}</span>
                              <span className="truncate">{dayRes[0].guestName}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comprehensive Color Legend */}
          <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">Status Legend:</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {Object.entries(STATUS_CONFIG)
                .filter(([key]) => ["pending", "confirmed", "checked_in", "checked_out", "cancelled"].includes(key))
                .map(([statusKey, cfg]) => (
                  <div
                    key={statusKey}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-xs ${cfg.badgeClass}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                    <span>{cfg.label}</span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Inspection Panel */}
      {selectedDay && (
        <Card className="border-2 border-primary/40 shadow-xl bg-surface">
          <CardHeader className="pb-3 border-b border-border/50 bg-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {MONTH_NAMES[month]} {selectedDay}, {year}
                </CardTitle>
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400 mt-0.5">
                  {selectedReservations.length} reservation{selectedReservations.length !== 1 ? "s" : ""} active on this date
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)} className="text-xs font-semibold">
                Close Panel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {selectedReservations.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center font-medium">No reservations active on this day.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedReservations.map((res) => {
                  const style = getStatusStyle(res.status);
                  return (
                    <div
                      key={res.id}
                      onClick={() => router.push(`/guests?tab=reservations&id=${res.id}`)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary transition-colors">
                            {res.guestName ?? "Guest"}
                          </p>
                          <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400 font-mono mt-0.5">
                            #{res.reservationNumber} &bull; Room {res.roomNumber ?? "TBD"}
                          </p>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-xs ${style.badgeClass}`}>
                          <span className={`w-2 h-2 rounded-full ${style.dotClass}`} />
                          <span>{style.label}</span>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800/80 pt-2 flex items-center justify-between">
                        <span>Stay: <strong className="text-slate-800 dark:text-zinc-200">{res.checkInDate.slice(0, 10)}</strong> → <strong className="text-slate-800 dark:text-zinc-200">{res.checkOutDate.slice(0, 10)}</strong></span>
                        <span className="text-primary hover:underline font-bold">View Guest Record &rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

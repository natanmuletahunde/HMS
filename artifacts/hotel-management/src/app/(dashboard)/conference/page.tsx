"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type ConferenceDashboard = {
  totalHalls: number;
  availableHalls: number;
  todayEvents: number;
  totalRevenue: number;
  upcomingBookings?: ConferenceBooking[];
};

type ConferenceHall = {
  id: string;
  name: string;
  capacity?: number;
  location?: string;
  floor?: number | string;
  hourlyRate?: number;
  halfDayRate?: number;
  fullDayRate?: number;
  status: string;
  description?: string;
};

type ConferenceBooking = {
  id: string;
  bookingNumber: string;
  hallId?: string;
  hallName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  eventName?: string;
  eventType?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  attendees?: number;
  totalAmount?: number;
  status: string;
};

type CalendarDay = { date: string; bookingCount: number; bookings?: ConferenceBooking[] };

const BOOKING_STATUS_BADGE: Record<string, string> = {
  inquiry: "muted",
  confirmed: "success",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

type TabType = "dashboard" | "halls" | "bookings" | "calendar";

export default function ConferencePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Halls
  const [isAddHallOpen, setIsAddHallOpen] = useState(false);
  const [editHall, setEditHall] = useState<ConferenceHall | null>(null);

  // Bookings
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingDateFilter, setBookingDateFilter] = useState("");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  // Calendar
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useQuery<ConferenceDashboard>({
    queryKey: ["conference-dashboard"],
    queryFn: () => apiFetch<ConferenceDashboard>("/conference/dashboard"),
    enabled: tab === "dashboard",
  });

  const { data: halls = [], isLoading: hallsLoading } = useQuery<ConferenceHall[]>({
    queryKey: ["conference-halls"],
    queryFn: () => apiFetch<ConferenceHall[]>("/conference/halls"),
    enabled: tab === "halls" || tab === "bookings",
  });

  const bookingParams = new URLSearchParams();
  if (bookingStatusFilter !== "all") bookingParams.set("status", bookingStatusFilter);
  if (bookingDateFilter) bookingParams.set("date", bookingDateFilter);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<ConferenceBooking[]>({
    queryKey: ["conference-bookings", bookingStatusFilter, bookingDateFilter],
    queryFn: () => apiFetch<ConferenceBooking[]>(`/conference/bookings?${bookingParams}`),
    enabled: tab === "bookings",
  });

  const { data: calendarData = [], isLoading: calLoading } = useQuery<CalendarDay[]>({
    queryKey: ["conference-calendar", calendarDate],
    queryFn: () => apiFetch<CalendarDay[]>(`/conference/calendar?month=${calendarDate}`),
    enabled: tab === "calendar",
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["conference-halls"] });
    queryClient.invalidateQueries({ queryKey: ["conference-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["conference-dashboard"] });
  }

  const addHallMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/conference/halls", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setIsAddHallOpen(false); toast({ title: "Hall added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editHallMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/conference/halls/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setEditHall(null); toast({ title: "Hall updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createBookingMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/conference/bookings", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); setIsNewBookingOpen(false); toast({ title: "Booking created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchBookingMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/conference/bookings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidateAll(); toast({ title: "Booking updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Calendar helpers
  function prevMonth() {
    const [y, m] = calendarDate.split("-").map(Number);
    const d = new Date(y, m - 2);
    setCalendarDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    const [y, m] = calendarDate.split("-").map(Number);
    const d = new Date(y, m);
    setCalendarDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function buildCalendarGrid() {
    const [y, m] = calendarDate.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  function getBookingsForDay(day: number) {
    const dateStr = `${calendarDate}-${String(day).padStart(2, "0")}`;
    return calendarData.find(c => c.date === dateStr);
  }

  const calGrid = buildCalendarGrid();
  const selectedDayBookings = selectedCalDay
    ? calendarData.find(c => c.date === selectedCalDay)?.bookings ?? []
    : [];

  const upcomingBookingsPagination = usePagination(dashboard?.upcomingBookings ?? [], 5);
  const bookingsPagination = usePagination(bookings, 5);
  const selectedDayBookingsPagination = usePagination(selectedDayBookings, 5);

  const TABS: { key: TabType; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "halls", label: "Halls" },
    { key: "bookings", label: "Bookings" },
    { key: "calendar", label: "Calendar" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Conference</h1>
        {tab === "halls" && (
          <Button onClick={() => setIsAddHallOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Hall
          </Button>
        )}
        {tab === "bookings" && (
          <Button onClick={() => setIsNewBookingOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Halls", value: dashboard?.totalHalls, color: "text-primary" },
              { label: "Available", value: dashboard?.availableHalls, color: "text-success" },
              { label: "Today's Events", value: dashboard?.todayEvents, color: "text-warning" },
              { label: "Total Revenue", value: dashboard?.totalRevenue != null ? `$${Number(dashboard.totalRevenue).toFixed(2)}` : undefined, color: "text-info" },
            ].map((s) => (
              <Card key={s.label} className="bg-surface/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
          {dashboard?.upcomingBookings && dashboard.upcomingBookings.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Upcoming Bookings</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking #</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingBookingsPagination.paginatedItems.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.bookingNumber}</TableCell>
                        <TableCell>{b.hallName ?? "—"}</TableCell>
                        <TableCell>{b.customerName ?? "—"}</TableCell>
                        <TableCell>{b.eventName ?? "—"}</TableCell>
                        <TableCell className="text-xs text-text-muted">{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={(BOOKING_STATUS_BADGE[b.status] ?? "muted") as any} className="text-[10px] capitalize">
                            {b.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={upcomingBookingsPagination.currentPage}
                  totalPages={upcomingBookingsPagination.totalPages}
                  totalItems={upcomingBookingsPagination.totalItems}
                  pageSize={5}
                  onPrev={upcomingBookingsPagination.onPrev}
                  onNext={upcomingBookingsPagination.onNext}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* HALLS TAB */}
      {tab === "halls" && (
        <div className="space-y-4">
          {hallsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
          ) : halls.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted">No halls found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {halls.map((hall) => (
                <Card key={hall.id} className="bg-surface/50 border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{hall.name}</div>
                        {hall.location && <div className="text-xs text-text-muted">{hall.location}{hall.floor ? `, Floor ${hall.floor}` : ""}</div>}
                      </div>
                      <Badge variant={(hall.status === "available" ? "success" : hall.status === "booked" ? "warning" : "muted") as any} className="text-[10px] uppercase">
                        {hall.status}
                      </Badge>
                    </div>
                    {hall.capacity && <div className="text-sm text-text-muted">Capacity: <span className="font-medium text-text">{hall.capacity}</span></div>}
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {hall.hourlyRate && <div className="text-text-muted">Hourly<br /><span className="font-medium text-text">${Number(hall.hourlyRate).toFixed(0)}</span></div>}
                      {hall.halfDayRate && <div className="text-text-muted">Half Day<br /><span className="font-medium text-text">${Number(hall.halfDayRate).toFixed(0)}</span></div>}
                      {hall.fullDayRate && <div className="text-text-muted">Full Day<br /><span className="font-medium text-text">${Number(hall.fullDayRate).toFixed(0)}</span></div>}
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setEditHall(hall)}>Edit Hall</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOOKINGS TAB */}
      {tab === "bookings" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={bookingDateFilter} onChange={(e) => setBookingDateFilter(e.target.value)} className="w-[160px]" />
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Hall</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Attendees</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(10)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : bookings.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-24 text-center text-text-muted">No bookings found.</TableCell></TableRow>
                ) : bookingsPagination.paginatedItems.map((b) => (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{b.bookingNumber}</TableCell>
                    <TableCell>{b.hallName ?? "—"}</TableCell>
                    <TableCell>{b.customerName ?? "—"}</TableCell>
                    <TableCell>{b.eventName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-xs">{b.startTime ?? "—"} {b.endTime ? `- ${b.endTime}` : ""}</TableCell>
                    <TableCell className="text-right">{b.attendees ?? "—"}</TableCell>
                    <TableCell className="text-right">${Number(b.totalAmount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={(BOOKING_STATUS_BADGE[b.status] ?? "muted") as any} className="text-[10px] capitalize">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.status === "inquiry" && (
                            <DropdownMenuItem onClick={() => patchBookingMutation.mutate({ id: b.id, body: { status: "confirmed" } })}>Confirm</DropdownMenuItem>
                          )}
                          {b.status !== "cancelled" && b.status !== "completed" && (
                            <DropdownMenuItem className="text-danger" onClick={() => patchBookingMutation.mutate({ id: b.id, body: { status: "cancelled" } })}>Cancel</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={bookingsPagination.currentPage}
              totalPages={bookingsPagination.totalPages}
              totalItems={bookingsPagination.totalItems}
              pageSize={5}
              onPrev={bookingsPagination.onPrev}
              onNext={bookingsPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-sm">{new Date(calendarDate + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {calLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="border-r border-b border-border bg-muted/50 px-2 py-1 text-xs font-medium text-text-muted text-center">{d}</div>
                ))}
                {calGrid.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="border-r border-b border-border h-20 bg-muted/20" />;
                  }
                  const dateStr = `${calendarDate}-${String(day).padStart(2, "0")}`;
                  const calDay = getBookingsForDay(day);
                  const isSelected = selectedCalDay === dateStr;
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedCalDay(isSelected ? null : dateStr)}
                      className={`border-r border-b border-border h-20 p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/10" : ""}`}
                    >
                      <div className="text-xs font-medium">{day}</div>
                      {calDay && calDay.bookingCount > 0 && (
                        <div className="mt-1">
                          <Badge variant={"info" as any} className="text-[10px]">{calDay.bookingCount} event{calDay.bookingCount > 1 ? "s" : ""}</Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedCalDay && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Events on {new Date(selectedCalDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {selectedDayBookings.length === 0 ? (
                      <p className="p-4 text-sm text-text-muted">No events on this day.</p>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Booking #</TableHead>
                              <TableHead>Hall</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDayBookingsPagination.paginatedItems.map((b) => (
                              <TableRow key={b.id}>
                                <TableCell className="font-mono text-xs">{b.bookingNumber}</TableCell>
                                <TableCell>{b.hallName ?? "—"}</TableCell>
                                <TableCell>{b.customerName ?? "—"}</TableCell>
                                <TableCell>{b.eventName ?? "—"}</TableCell>
                                <TableCell className="text-xs">{b.startTime ?? "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={(BOOKING_STATUS_BADGE[b.status] ?? "muted") as any} className="text-[10px] capitalize">
                                    {b.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <TablePagination
                          currentPage={selectedDayBookingsPagination.currentPage}
                          totalPages={selectedDayBookingsPagination.totalPages}
                          totalItems={selectedDayBookingsPagination.totalItems}
                          pageSize={5}
                          onPrev={selectedDayBookingsPagination.onPrev}
                          onNext={selectedDayBookingsPagination.onNext}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Hall Dialog */}
      <Dialog open={isAddHallOpen} onOpenChange={setIsAddHallOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Conference Hall</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            ["capacity", "floor", "hourlyRate", "halfDayRate", "fullDayRate"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
            addHallMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Hall Name *</Label>
                <Input name="name" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Input name="location" />
              </div>
              <div className="grid gap-1.5">
                <Label>Floor</Label>
                <Input name="floor" type="number" />
              </div>
              <div className="grid gap-1.5">
                <Label>Capacity</Label>
                <Input name="capacity" type="number" min="1" />
              </div>
              <div className="grid gap-1.5">
                <Label>Hourly Rate</Label>
                <Input name="hourlyRate" type="number" step="0.01" />
              </div>
              <div className="grid gap-1.5">
                <Label>Half Day Rate</Label>
                <Input name="halfDayRate" type="number" step="0.01" />
              </div>
              <div className="grid gap-1.5">
                <Label>Full Day Rate</Label>
                <Input name="fullDayRate" type="number" step="0.01" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Description</Label>
                <textarea name="description" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addHallMutation.isPending}>
              {addHallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Hall
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Hall Dialog */}
      <Dialog open={!!editHall} onOpenChange={(o) => !o && setEditHall(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Hall</DialogTitle></DialogHeader>
          {editHall && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const body: Record<string, unknown> = {};
              fd.forEach((v, k) => { if (v !== "") body[k] = v; });
              ["capacity", "floor", "hourlyRate", "halfDayRate", "fullDayRate"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
              editHallMutation.mutate({ id: editHall.id, body });
            }}>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5 col-span-2">
                  <Label>Hall Name *</Label>
                  <Input name="name" required defaultValue={editHall.name} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Location</Label>
                  <Input name="location" defaultValue={editHall.location ?? ""} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Capacity</Label>
                  <Input name="capacity" type="number" min="1" defaultValue={editHall.capacity ?? ""} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Hourly Rate</Label>
                  <Input name="hourlyRate" type="number" step="0.01" defaultValue={editHall.hourlyRate ?? ""} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Half Day Rate</Label>
                  <Input name="halfDayRate" type="number" step="0.01" defaultValue={editHall.halfDayRate ?? ""} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Full Day Rate</Label>
                  <Input name="fullDayRate" type="number" step="0.01" defaultValue={editHall.fullDayRate ?? ""} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={editHallMutation.isPending}>
                {editHallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Conference Booking</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => {
              if (k === "cateringRequired") body[k] = true;
              else if (v !== "") body[k] = v;
            });
            if (!fd.has("cateringRequired")) body["cateringRequired"] = false;
            ["attendees", "hallRate"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
            createBookingMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Hall *</Label>
                <select name="hallId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select hall</option>
                  {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Event Name *</Label>
                <Input name="eventName" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Customer Name *</Label>
                <Input name="customerName" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Customer Email</Label>
                <Input name="customerEmail" type="email" />
              </div>
              <div className="grid gap-1.5">
                <Label>Customer Phone</Label>
                <Input name="customerPhone" />
              </div>
              <div className="grid gap-1.5">
                <Label>Event Type</Label>
                <select name="eventType" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="conference">Conference</option>
                  <option value="meeting">Meeting</option>
                  <option value="wedding">Wedding</option>
                  <option value="seminar">Seminar</option>
                  <option value="workshop">Workshop</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Layout</Label>
                <select name="layout" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="theater">Theater</option>
                  <option value="classroom">Classroom</option>
                  <option value="boardroom">Boardroom</option>
                  <option value="banquet">Banquet</option>
                  <option value="reception">Reception</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Attendees</Label>
                <Input name="attendees" type="number" min="1" />
              </div>
              <div className="grid gap-1.5">
                <Label>Booking Date *</Label>
                <Input name="bookingDate" type="date" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Start Time</Label>
                <Input name="startTime" type="time" />
              </div>
              <div className="grid gap-1.5">
                <Label>End Time</Label>
                <Input name="endTime" type="time" />
              </div>
              <div className="grid gap-1.5">
                <Label>Hall Rate</Label>
                <Input name="hallRate" type="number" step="0.01" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="cateringRequired" name="cateringRequired" className="h-4 w-4" />
                <label htmlFor="cateringRequired" className="text-sm">Catering Required</label>
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Special Requirements</Label>
                <textarea name="specialRequirements" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Notes</Label>
                <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createBookingMutation.isPending}>
              {createBookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Booking
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

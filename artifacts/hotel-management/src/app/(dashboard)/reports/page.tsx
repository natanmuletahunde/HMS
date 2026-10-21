"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Download,
  Printer,
  FileText,
  CheckCircle2,
  Star,
  Phone,
  Mail,
  Globe,
  Key,
  RotateCcw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

type TabType = "guests" | "occupancy" | "revenue" | "reservations" | "restaurant" | "inventory" | "hr" | "complaints" | "financial" | "executive";

function exportGuestsCsv(data: any[]) {
  if (!data || data.length === 0) return;
  const headers = [
    "Guest Code",
    "Full Name",
    "Gender",
    "DOB",
    "Phone",
    "Email",
    "Address",
    "City",
    "Country",
    "Nationality",
    "Guest Type",
    "VIP Status",
    "ID Type",
    "ID Number",
    "Passport #",
    "National ID / Fayida",
    "ID Verified",
    "Reservation #",
    "Booking Source",
    "Room #",
    "Room Type",
    "Check-in Date",
    "Check-out Date",
    "Total Amount (ETB)",
    "Status",
    "Deposit Collected",
    "Deposit Amount",
    "Keycard RFID",
    "Checked In By",
    "Total Stays",
    "Created At",
  ];
  const rows = data.map((r) => [
    `"${r.guestCode || ""}"`,
    `"${[r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")}"`,
    `"${r.gender || ""}"`,
    `"${r.dateOfBirth || ""}"`,
    `"${r.phone || ""}"`,
    `"${r.email || ""}"`,
    `"${r.address || ""}"`,
    `"${r.city || ""}"`,
    `"${r.country || ""}"`,
    `"${r.nationality || ""}"`,
    `"${r.guestType || "individual"}"`,
    `"${r.vipStatus ? "Yes" : "No"}"`,
    `"${r.idType || ""}"`,
    `"${r.idNumber || ""}"`,
    `"${r.passportNumber || ""}"`,
    `"${r.nationalId || ""}"`,
    `"${r.identityVerified || r.idNumber || r.passportNumber ? "Verified" : "Pending"}"`,
    `"${r.reservationNumber || ""}"`,
    `"${r.reservationType || r.bookingSource || "Direct"}"`,
    `"${r.roomNumber || ""}"`,
    `"${r.roomTypeName || ""}"`,
    `"${r.checkInDate || ""}"`,
    `"${r.checkOutDate || ""}"`,
    `"${r.totalAmount || "0"}"`,
    `"${r.reservationStatus || (r.checkinId ? "checked_in" : "registered")}"`,
    `"${r.depositCollected ? "Yes" : "No"}"`,
    `"${r.depositAmount || "0"}"`,
    `"${r.keyCardNumber || ""}"`,
    `"${r.checkedInBy || ""}"`,
    `"${r.totalStays ?? 0}"`,
    `"${r.createdAt || ""}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `guest-master-report-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function StatCard({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Card className="bg-surface/50 border border-border rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-text-muted">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color ?? ""}`}>{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(today.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(fmt(thirtyAgo));
  const [endDate, setEndDate] = useState(fmt(today));
  const [appliedStart, setAppliedStart] = useState(fmt(thirtyAgo));
  const [appliedEnd, setAppliedEnd] = useState(fmt(today));
  const [tab, setTab] = useState<TabType>("guests");

  // Guest report specific filters
  const [guestSearch, setGuestSearch] = useState("");
  const [guestStatus, setGuestStatus] = useState("all");
  const [guestTypeFilter, setGuestTypeFilter] = useState("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab") as TabType;
      if (urlTab && TABS.some((t) => t.key === urlTab)) {
        setTab(urlTab);
      }
    }
  }, []);

  function applyDates() {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  const TABS: { key: TabType; label: string }[] = [
    { key: "guests", label: "Guest Reports" },
    { key: "occupancy", label: "Occupancy" },
    { key: "revenue", label: "Revenue" },
    { key: "reservations", label: "Reservations" },
    { key: "restaurant", label: "Restaurant" },
    { key: "inventory", label: "Inventory" },
    { key: "hr", label: "HR" },
    { key: "complaints", label: "Complaints" },
    { key: "financial", label: "Financial" },
    { key: "executive", label: "Executive" },
  ];

  const { data: guestsReport, isLoading: gLoading } = useQuery<any>({
    queryKey: ["report-guests", appliedStart, appliedEnd, guestSearch, guestStatus],
    queryFn: () =>
      apiFetch<any>(
        `/reports/guests?startDate=${appliedStart}&endDate=${appliedEnd}&search=${encodeURIComponent(guestSearch)}&status=${guestStatus}`
      ),
    enabled: tab === "guests",
  });

  const rawGuests = guestsReport?.data ?? [];
  const filteredGuests = rawGuests.filter((r: any) => {
    if (guestTypeFilter !== "all" && (r.guestType || "individual") !== guestTypeFilter) return false;
    return true;
  });

  const guestsPagination = usePagination(filteredGuests, 5);

  const { data: occupancyData, isLoading: oLoading } = useQuery<any>({
    queryKey: ["report-occupancy", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/occupancy?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "occupancy",
  });

  const { data: revenueData, isLoading: rLoading } = useQuery<any>({
    queryKey: ["report-revenue", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/revenue?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "revenue",
  });

  const { data: resData, isLoading: resLoading } = useQuery<any>({
    queryKey: ["report-reservations", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/reservations?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "reservations",
  });

  const { data: restaurantData, isLoading: restLoading } = useQuery<any>({
    queryKey: ["report-restaurant", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/restaurant?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "restaurant",
  });

  const { data: inventoryData, isLoading: invLoading } = useQuery<any>({
    queryKey: ["report-inventory", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/inventory?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "inventory",
  });

  const { data: hrData, isLoading: hrLoading } = useQuery<any>({
    queryKey: ["report-hr", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/hr?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "hr",
  });

  const { data: complaintsData, isLoading: csLoading } = useQuery<any>({
    queryKey: ["report-complaints", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/complaints?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "complaints",
  });

  const { data: financialData, isLoading: finLoading } = useQuery<any>({
    queryKey: ["report-financial", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/financial?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "financial",
  });

  const { data: executiveData, isLoading: execLoading } = useQuery<any>({
    queryKey: ["report-executive", appliedStart, appliedEnd],
    queryFn: () => apiFetch<any>(`/reports/executive-summary?startDate=${appliedStart}&endDate=${appliedEnd}`),
    enabled: tab === "executive",
  });

  const netIncome = (revenueData?.totalRevenue ?? 0) - (revenueData?.totalExpenses ?? 0);
  const finNetIncome = (financialData?.revenue ?? 0) - (financialData?.expenses ?? 0);

  const paymentMethodPagination = usePagination(revenueData?.byPaymentMethod ?? [], 5);
  const finBreakdownPagination = usePagination(financialData?.breakdown ?? [], 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      </div>

      {/* Date range header */}
      <div className="flex flex-wrap gap-3 items-end p-4 bg-surface/50 border border-border rounded-lg">
        <div className="grid gap-1">
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
        </div>
        <Button onClick={applyDates}>Apply</Button>
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

      {/* ── GUEST REPORTS TAB ────────────────────────────────────────────── */}
      {tab === "guests" && (
        <div className="space-y-6">
          {/* Guest Filters & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 bg-surface/50 border border-border rounded-lg">
            <div className="flex flex-1 flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guest name, ID, passport, phone, room #..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Select value={guestStatus} onValueChange={setGuestStatus}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="checked_in">Checked In (In-House)</SelectItem>
                  <SelectItem value="confirmed">Confirmed / Reserved</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={guestTypeFilter} onValueChange={setGuestTypeFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Guest Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guest Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="travel_agency">Travel Agency</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
              {(guestSearch || guestStatus !== "all" || guestTypeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGuestSearch("");
                    setGuestStatus("all");
                    setGuestTypeFilter("all");
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-9 text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-primary" />
                <span>Print Document</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportGuestsCsv(filteredGuests)}
                disabled={filteredGuests.length === 0}
                className="h-9 text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Guest Records"
              value={gLoading ? <Skeleton className="h-7 w-16" /> : (guestsReport?.summary?.totalGuests ?? 0)}
              color="text-primary"
            />
            <StatCard
              label="Currently In-House"
              value={gLoading ? <Skeleton className="h-7 w-16" /> : (guestsReport?.summary?.inHouseCheckedIn ?? 0)}
              color="text-emerald-500"
            />
            <StatCard
              label="Verified IDs / Passports"
              value={gLoading ? <Skeleton className="h-7 w-16" /> : `${guestsReport?.summary?.verifiedCount ?? 0}`}
              color="text-blue-500"
            />
            <StatCard
              label="Total Stay Revenue (ETB)"
              value={gLoading ? <Skeleton className="h-7 w-20" /> : `${Number(guestsReport?.summary?.totalStayRevenue ?? 0).toLocaleString()} ETB`}
              color="text-amber-500"
            />
          </div>

          {/* Table */}
          <Card className="border border-border bg-surface/50 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Guest Compliance & Stay Master Report</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete official record of guest identification, room assignments, stay folios, and deposits.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {guestsReport?.data?.length ?? 0} Records Found
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {gLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (guestsReport?.data ?? []).length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  No guest reports found matching the selected dates and criteria.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10 text-[11px] uppercase tracking-wider">
                          <TableHead className="min-w-[190px]">Guest Information</TableHead>
                          <TableHead className="min-w-[170px]">Contact & Address</TableHead>
                          <TableHead className="min-w-[160px]">ID / Regulatory Proof</TableHead>
                          <TableHead className="min-w-[130px]">Reservation</TableHead>
                          <TableHead className="min-w-[130px]">Room Assignment</TableHead>
                          <TableHead className="min-w-[150px]">Stay Period</TableHead>
                          <TableHead className="min-w-[130px]">Payment & Rate</TableHead>
                          <TableHead className="min-w-[150px]">Deposit & Keycard</TableHead>
                          <TableHead className="min-w-[130px]">Status & History</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guestsPagination.paginatedItems.map((r: any) => {
                          const nights = r.checkInDate && r.checkOutDate
                            ? Math.max(1, Math.round((new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
                            : 1;
                          const idVal = r.idNumber || r.passportNumber || r.nationalId;
                          const isVerified = r.identityVerified || !!idVal;
                          const hasDeposit = r.depositCollected || (r.depositAmount && Number(r.depositAmount) > 0);
                          const fullName = [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
                          const addressText = [r.address, r.city, r.country].filter(Boolean).join(", ");

                          return (
                            <TableRow key={r.id + (r.reservationId || "")} className="text-xs hover:bg-muted/30">
                              {/* Guest Name & Code */}
                              <TableCell>
                                <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                  <span>{fullName || "Unnamed Guest"}</span>
                                  {r.vipStatus && (
                                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] px-1 py-0">
                                      <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-500" /> VIP
                                    </Badge>
                                  )}
                                  {r.guestType && (
                                    <Badge variant="muted" className="text-[10px] capitalize px-1 py-0">
                                      {r.guestType}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  {r.guestCode || "GST-NEW"}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span>{r.nationality || "Ethiopian"}</span>
                                  </span>
                                  {r.gender && (
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                      • {r.gender}
                                    </span>
                                  )}
                                  {r.dateOfBirth && (
                                    <span className="text-[10px] text-muted-foreground">
                                      • DOB: {r.dateOfBirth}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Contact & Address */}
                              <TableCell>
                                <div className="flex items-center gap-1 text-foreground">
                                  <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span>{r.phone || "—"}</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground mt-0.5 truncate max-w-[160px]">
                                  <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{r.email || "—"}</span>
                                </div>
                                {addressText && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[160px]" title={addressText}>
                                    {addressText}
                                  </div>
                                )}
                              </TableCell>

                              {/* ID / Passport Document */}
                              <TableCell>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge variant="muted" className="text-[10px] uppercase font-mono px-1.5 py-0">
                                    {r.idType || (r.passportNumber ? "PASSPORT" : r.nationalId ? "FAYIDA" : "ID")}
                                  </Badge>
                                  {isVerified ? (
                                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] px-1 py-0">
                                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] px-1 py-0">
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-foreground mt-1">
                                  {idVal || "No ID Recorded"}
                                </div>
                              </TableCell>

                              {/* Reservation */}
                              <TableCell>
                                {r.reservationNumber ? (
                                  <>
                                    <div className="font-mono font-semibold text-primary">
                                      #{r.reservationNumber}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground capitalize">
                                      {(r.reservationType || r.bookingSource || "Direct").replace(/_/g, " ")}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">Walk-in profile</span>
                                )}
                              </TableCell>

                              {/* Room Assignment */}
                              <TableCell>
                                {r.roomNumber ? (
                                  <>
                                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-xs inline-block">
                                      Room {r.roomNumber}
                                    </span>
                                    <div className="text-[11px] text-muted-foreground mt-1 truncate">
                                      {r.roomTypeName || "Standard"}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">Unassigned</span>
                                )}
                              </TableCell>

                              {/* Stay Period */}
                              <TableCell>
                                {r.checkInDate ? (
                                  <>
                                    <div className="text-foreground font-medium">
                                      {r.checkInDate} &rarr; {r.checkOutDate}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                      {nights} {nights === 1 ? "Night" : "Nights"} ({r.adults ?? 1} Ad{Number(r.children) > 0 ? `, ${r.children} Ch` : ""})
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">Walk-in profile</span>
                                )}
                              </TableCell>

                              {/* Payment & Rate */}
                              <TableCell>
                                <div className="font-semibold text-foreground">
                                  {r.totalAmount ? `${Number(r.totalAmount).toLocaleString()} ETB` : "0.00 ETB"}
                                </div>
                                {r.basePrice && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {Number(r.basePrice).toLocaleString()} ETB / nt
                                  </div>
                                )}
                              </TableCell>

                              {/* Deposit & Keycard */}
                              <TableCell>
                                <div className="text-[11px]">
                                  {hasDeposit ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      Deposit: {Number(r.depositAmount || 0).toLocaleString()} ETB
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Deposit: None</span>
                                  )}
                                </div>
                                {r.keyCardNumber ? (
                                  <div className="font-mono text-[11px] text-primary flex items-center gap-1 mt-0.5">
                                    <Key className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span>{r.keyCardNumber}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground mt-0.5 italic">No key encoded</div>
                                )}
                              </TableCell>

                              {/* Status & History */}
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    r.reservationStatus === "checked_in" || r.checkinId
                                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                      : r.reservationStatus === "confirmed"
                                      ? "border-blue-500/40 text-blue-500 bg-blue-500/10"
                                      : r.reservationStatus === "checked_out"
                                      ? "border-slate-500/40 text-slate-500 bg-slate-500/10"
                                      : "border-muted text-muted-foreground"
                                  }
                                >
                                  {r.reservationStatus === "checked_in" || r.checkinId
                                    ? "Checked In"
                                    : r.reservationStatus === "confirmed"
                                    ? "Reserved"
                                    : r.reservationStatus === "checked_out"
                                    ? "Checked Out"
                                    : (r.reservationStatus || "Registered")}
                                </Badge>
                                {r.checkedInBy && (
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    by {r.checkedInBy}
                                  </div>
                                )}
                                {r.totalStays !== undefined && r.totalStays !== null && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {r.totalStays} {r.totalStays === 1 ? 'stay' : 'stays'} recorded
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="p-0 border-t border-border">
                    <TablePagination
                      currentPage={guestsPagination.currentPage}
                      totalPages={guestsPagination.totalPages}
                      totalItems={guestsPagination.totalItems}
                      pageSize={guestsPagination.pageSize}
                      onPrev={guestsPagination.onPrev}
                      onNext={guestsPagination.onNext}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* OCCUPANCY TAB */}
      {tab === "occupancy" && (
        <div className="space-y-6">
          {oLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Occupancy Rate %" value={`${occupancyData?.occupancyRate ?? 0}%`} color="text-primary" />
                <StatCard label="Total Rooms" value={occupancyData?.totalRooms} />
                <StatCard label="Total Reservations" value={occupancyData?.totalReservations} />
              </div>
              {(occupancyData?.byRoomType ?? []).length > 0 && (
                <Card className="bg-surface/50 border border-border rounded-lg p-6">
                  <CardTitle className="text-sm mb-4">By Room Type</CardTitle>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={occupancyData?.byRoomType ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                      <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* REVENUE TAB */}
      {tab === "revenue" && (
        <div className="space-y-6">
          {rLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Total Revenue" value={`$${Number(revenueData?.totalRevenue ?? 0).toLocaleString()}`} color="text-success" />
                <StatCard label="Total Expenses" value={`$${Number(revenueData?.totalExpenses ?? 0).toLocaleString()}`} color="text-danger" />
                <StatCard label="Net Income" value={`$${Number(netIncome).toLocaleString()}`} color={netIncome >= 0 ? "text-success" : "text-danger"} />
              </div>
              {(revenueData?.byCategory ?? []).length > 0 && (
                <Card className="bg-surface/50 border border-border rounded-lg p-6">
                  <CardTitle className="text-sm mb-4">By Category</CardTitle>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={revenueData?.byCategory ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                      <XAxis dataKey="category" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                      <Bar dataKey="amount" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
              {(revenueData?.byPaymentMethod ?? []).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">By Payment Method</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {paymentMethodPagination.paginatedItems.map((r: any, i: number) => (
                          <TableRow key={i}><TableCell className="capitalize">{r.method?.replace(/_/g, " ")}</TableCell><TableCell className="text-right">${Number(r.amount ?? 0).toLocaleString()}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination {...paymentMethodPagination} pageSize={5} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* RESERVATIONS TAB */}
      {tab === "reservations" && (
        <div className="space-y-6">
          {resLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total" value={resData?.total} color="text-primary" />
                <StatCard label="Confirmed" value={resData?.confirmed} color="text-success" />
                <StatCard label="Checked In" value={resData?.checkedIn} color="text-info" />
                <StatCard label="Checked Out" value={resData?.checkedOut} />
                <StatCard label="Cancelled" value={resData?.cancelled} color="text-danger" />
              </div>
              {(resData?.byStatus ?? []).length > 0 && (
                <Card className="bg-surface/50 border border-border rounded-lg p-6">
                  <CardTitle className="text-sm mb-4">Status Distribution</CardTitle>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={resData?.byStatus ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                        {(resData?.byStatus ?? []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* RESTAURANT TAB */}
      {tab === "restaurant" && (
        <div className="space-y-6">
          {restLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Orders" value={restaurantData?.orders} color="text-primary" />
                <StatCard label="Revenue" value={`$${Number(restaurantData?.revenue ?? 0).toLocaleString()}`} color="text-success" />
                <StatCard label="Avg Order Value" value={`$${Number(restaurantData?.avgOrderValue ?? 0).toFixed(2)}`} />
              </div>
              {(restaurantData?.topItems ?? []).length > 0 && (
                <Card className="bg-surface/50 border border-border rounded-lg p-6">
                  <CardTitle className="text-sm mb-4">Top Items</CardTitle>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={restaurantData?.topItems ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                      <Bar dataKey="amount" fill={COLORS[4]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {tab === "inventory" && (
        <div className="space-y-6">
          {invLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Items" value={inventoryData?.totalItems} color="text-primary" />
                <StatCard label="Low Stock" value={inventoryData?.lowStock} color="text-warning" />
                <StatCard label="Out of Stock" value={inventoryData?.outOfStock} color="text-danger" />
                <StatCard label="Total Value" value={`$${Number(inventoryData?.totalValue ?? 0).toLocaleString()}`} color="text-success" />
              </div>
              {(inventoryData?.byCategory ?? []).slice(0, 8).length > 0 && (
                <Card className="bg-surface/50 border border-border rounded-lg p-6">
                  <CardTitle className="text-sm mb-4">By Category</CardTitle>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={(inventoryData?.byCategory ?? []).slice(0, 8)} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={100} label>
                        {(inventoryData?.byCategory ?? []).slice(0, 8).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* HR TAB */}
      {tab === "hr" && (
        <div className="space-y-6">
          {hrLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Employees" value={hrData?.total} color="text-primary" />
                <StatCard label="Active" value={hrData?.active} color="text-success" />
                <StatCard label="Departments" value={(hrData?.byDepartment ?? []).length} />
                <StatCard label="Leave Requests" value={hrData?.leaveRequests} color="text-warning" />
              </div>
              {(hrData?.byDepartment ?? []).length > 0 && (
                <Card className="bg-surface/50 border border-border rounded-lg p-6">
                  <CardTitle className="text-sm mb-4">By Department</CardTitle>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={hrData?.byDepartment ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                      <Bar dataKey="count" fill={COLORS[5]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* COMPLAINTS TAB */}
      {tab === "complaints" && (
        <div className="space-y-6">
          {csLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={complaintsData?.total} color="text-primary" />
                <StatCard label="Resolved" value={complaintsData?.resolved} color="text-success" />
                <StatCard label="Avg Response Hours" value={complaintsData?.avgResponseHours != null ? `${Number(complaintsData.avgResponseHours).toFixed(1)}h` : "—"} />
                <StatCard label="Satisfaction Score" value={complaintsData?.satisfactionScore != null ? `${complaintsData.satisfactionScore}%` : "—"} color="text-primary" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(complaintsData?.byCategory ?? []).length > 0 && (
                  <Card className="bg-surface/50 border border-border rounded-lg p-6">
                    <CardTitle className="text-sm mb-4">By Category</CardTitle>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={complaintsData?.byCategory ?? []} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label>
                          {(complaintsData?.byCategory ?? []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                )}
                {(complaintsData?.byPriority ?? []).length > 0 && (
                  <Card className="bg-surface/50 border border-border rounded-lg p-6">
                    <CardTitle className="text-sm mb-4">By Priority</CardTitle>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={complaintsData?.byPriority ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                        <XAxis dataKey="priority" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                        <Bar dataKey="count" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* FINANCIAL TAB */}
      {tab === "financial" && (
        <div className="space-y-6">
          {finLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Revenue" value={`$${Number(financialData?.revenue ?? 0).toLocaleString()}`} color="text-success" />
                <StatCard label="Expenses" value={`$${Number(financialData?.expenses ?? 0).toLocaleString()}`} color="text-danger" />
                <StatCard label="Net Income" value={`$${Number(finNetIncome).toLocaleString()}`} color={finNetIncome >= 0 ? "text-success" : "text-danger"} />
                <StatCard label="Cash on Hand" value={`$${Number(financialData?.cashOnHand ?? 0).toLocaleString()}`} color="text-primary" />
              </div>
              {(financialData?.breakdown ?? []).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Breakdown</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {finBreakdownPagination.paginatedItems.map((r: any, i: number) => (
                          <TableRow key={i}><TableCell className="capitalize">{r.category?.replace(/_/g, " ")}</TableCell><TableCell className="text-right">${Number(r.amount ?? 0).toLocaleString()}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination {...finBreakdownPagination} pageSize={5} />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* EXECUTIVE TAB */}
      {tab === "executive" && (
        <div className="space-y-6">
          {execLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Occupancy Rate", value: `${executiveData?.occupancyRate ?? 0}%`, description: "Current room occupancy" },
                { label: "Total Revenue", value: `$${Number(executiveData?.totalRevenue ?? 0).toLocaleString()}`, description: "Period revenue" },
                { label: "Net Income", value: `$${Number(executiveData?.netIncome ?? 0).toLocaleString()}`, description: "Revenue minus expenses" },
                { label: "Total Guests", value: executiveData?.totalGuests ?? 0, description: "Guests in period" },
                { label: "Total Reservations", value: executiveData?.totalReservations ?? 0, description: "All reservations" },
                { label: "Open Complaints", value: executiveData?.openComplaints ?? 0, description: "Unresolved issues" },
                { label: "Low Stock Items", value: executiveData?.lowStockItems ?? 0, description: "Items needing reorder" },
                { label: "Employee Count", value: executiveData?.employeeCount ?? 0, description: "Active employees" },
                { label: "Complaint Resolution Rate", value: `${executiveData?.complaintResolutionRate ?? 0}%`, description: "Resolved complaints" },
              ].map((kpi, i) => (
                <Card key={i} className="bg-surface/50 border border-border rounded-lg p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-muted">{kpi.label}</p>
                    <p className="text-4xl font-bold text-primary">{kpi.value}</p>
                    <p className="text-xs text-text-muted">{kpi.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

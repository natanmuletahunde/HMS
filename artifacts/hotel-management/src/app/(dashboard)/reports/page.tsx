"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

type TabType = "occupancy" | "revenue" | "reservations" | "restaurant" | "inventory" | "hr" | "complaints" | "financial" | "executive";

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
  const [tab, setTab] = useState<TabType>("occupancy");

  function applyDates() {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  const TABS: { key: TabType; label: string }[] = [
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
                        {(revenueData?.byPaymentMethod ?? []).map((r: any, i: number) => (
                          <TableRow key={i}><TableCell className="capitalize">{r.method?.replace(/_/g, " ")}</TableCell><TableCell className="text-right">${Number(r.amount ?? 0).toLocaleString()}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                        {(financialData?.breakdown ?? []).map((r: any, i: number) => (
                          <TableRow key={i}><TableCell className="capitalize">{r.category?.replace(/_/g, " ")}</TableCell><TableCell className="text-right">${Number(r.amount ?? 0).toLocaleString()}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

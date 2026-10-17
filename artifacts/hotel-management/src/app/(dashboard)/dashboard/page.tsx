"use client";

import { useQuery } from "@tanstack/react-query";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { BedDouble, Users, CalendarCheck, DollarSign, Wrench, Package, UtensilsCrossed, Building2, GitBranch, Building, Layers } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

const PRIORITY_BADGE: Record<string, string> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "secondary",
};

export default function DashboardPage() {
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(today.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const startDate = fmt(thirtyAgo);
  const endDate = fmt(today);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch<any>("/dashboard/stats"),
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: () => apiFetch<any[]>("/dashboard/revenue?period=month"),
  });

  const { data: occupancy, isLoading: occupancyLoading } = useQuery({
    queryKey: ["dashboard-occupancy"],
    queryFn: () => apiFetch<any[]>("/dashboard/occupancy?period=month"),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => apiFetch<any[]>("/dashboard/activity"),
  });

  const { data: revenueReport } = useQuery({
    queryKey: ["dashboard-revenue-overview", startDate, endDate],
    queryFn: () => apiFetch<any>(`/reports/revenue?startDate=${startDate}&endDate=${endDate}`),
  });

  const { data: reservationReport } = useQuery({
    queryKey: ["dashboard-reservation-status"],
    queryFn: () => apiFetch<any>(`/reports/reservations?startDate=${startDate}&endDate=${endDate}`),
  });

  const { data: openComplaints = [] } = useQuery<any[]>({
    queryKey: ["dashboard-open-complaints"],
    queryFn: () => apiFetch<any[]>("/customer-service?status=new"),
  });

  const { data: lowStockAlerts = [] } = useQuery<any[]>({
    queryKey: ["dashboard-low-stock"],
    queryFn: () => apiFetch<any[]>("/inventory/alerts"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {[
          { title: "Total Hotels", icon: Building2, value: stats?.totalHotels },
          { title: "Total Branches", icon: GitBranch, value: stats?.totalBranches },
          { title: "Total Buildings", icon: Building, value: stats?.totalBuildings },
          { title: "Total Floors", icon: Layers, value: stats?.totalFloors },
          { title: "Total Rooms", icon: BedDouble, value: stats?.totalRooms },
        ].map((stat, i) => (
          <Card key={i} className="bg-surface/50 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{stat.value ?? "-"}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Available Rooms", icon: CalendarCheck, value: stats?.availableRooms },
          { title: "Rooms Out Of Service", icon: Wrench, value: stats?.roomsOutOfService },
          { title: "Blocked Rooms", icon: Package, value: stats?.blockedRooms },
          { title: "Today Arrivals", icon: Users, value: stats?.todayArrivals },
          { title: "Revenue (Month)", icon: DollarSign, value: stats?.revenue ? `$${stats.revenue.toLocaleString()}` : null },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-text-muted" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{stat.value ?? "-"}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Checked In Guests", icon: Users, value: stats?.checkedInGuests },
          { title: "Pending Maintenance", icon: Wrench, value: stats?.pendingMaintenance },
          { title: "Low Stock Alerts", icon: Package, value: stats?.lowStockAlerts },
          { title: "Restaurant Orders Today", icon: UtensilsCrossed, value: stats?.restaurantOrdersToday },
        ].map((stat, i) => (
          <Card key={i} className="bg-surface/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div className="text-xl font-bold">{stat.value ?? "-"}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7 border-border">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {revenueLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : revenue?.length ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00c5c8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00c5c8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                    <XAxis dataKey="date" stroke="#8b8b9a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b8b9a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }}
                      itemStyle={{ color: "#ffffff" }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#00c5c8" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-text-muted">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : occupancy?.length ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancy} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                    <XAxis dataKey="date" stroke="#8b8b9a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b8b9a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      cursor={{ fill: '#2a2a32', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }}
                    />
                    <Bar dataKey="rate" fill="#00c5c8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-text-muted">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : activity?.length ? (
            <div className="space-y-4">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.action}</span>
                    <span className="text-sm text-text-muted">{item.user} &bull; {item.resource}</span>
                  </div>
                  <div className="text-sm text-text-muted">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-muted">No recent activity</div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <h2 className="text-lg font-semibold tracking-tight">Analytics</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-surface/50 border border-border rounded-lg p-6">
          <CardTitle className="text-sm mb-4">Revenue Overview</CardTitle>
          {revenueReport?.byCategory?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueReport.byCategory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevOverview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                <XAxis dataKey="category" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="amount" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorRevOverview)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-text-muted text-sm">No data available</div>
          )}
        </Card>

        <Card className="bg-surface/50 border border-border rounded-lg p-6">
          <CardTitle className="text-sm mb-4">Reservation Status</CardTitle>
          {reservationReport?.byStatus?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={reservationReport.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                  {reservationReport.byStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-text-muted text-sm">No data available</div>
          )}
        </Card>
      </div>

      {/* Quick tables */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Open Complaints</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CMP#</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openComplaints.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-16 text-center text-text-muted text-sm">No open complaints</TableCell></TableRow>
                ) : openComplaints.slice(0, 5).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.complaintNumber ?? c.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs truncate max-w-[160px]">{c.subject ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(PRIORITY_BADGE[c.priority ?? ""] ?? "secondary") as any} className="text-[10px] capitalize">{c.priority ?? "—"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Low Stock Alerts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockAlerts.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-16 text-center text-text-muted text-sm">No low stock alerts</TableCell></TableRow>
                ) : lowStockAlerts.slice(0, 5).map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-medium">{item.name ?? item.itemName ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs text-danger font-bold">{item.currentStock ?? item.quantity ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs text-text-muted">{item.minStock ?? item.minimumStock ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

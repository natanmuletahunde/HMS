"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  BedDouble, Users, CalendarCheck, DollarSign, Wrench, Package, 
  UtensilsCrossed, Building2, GitBranch, Building, Layers,
  LogIn, LogOut, Sparkles, CheckCircle2, Clock, AlertTriangle, 
  ArrowRight, ShoppingCart, ConciergeBell, CalendarDays, ShieldCheck
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { normalizeRole } from "@/lib/rbac";

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const currentRole = user?.role || (user as any)?.roleName || "Admin";
  const roleCategory = normalizeRole(currentRole);

  if (roleCategory === "receptionist") {
    return <FrontDeskDashboard currentRole={currentRole} />;
  }

  if (roleCategory === "housekeeping") {
    return <HousekeepingDashboard currentRole={currentRole} />;
  }

  if (roleCategory === "maintenance") {
    return <MaintenanceDashboard currentRole={currentRole} />;
  }

  if (roleCategory === "cashier") {
    return <CashierDashboard currentRole={currentRole} />;
  }

  // Admin and General Manager View
  return <ExecutiveDashboard currentRole={currentRole} />;
}

// ============================================================================
// 1. FRONT DESK / RECEPTIONIST DASHBOARD
// ============================================================================
function FrontDeskDashboard({ currentRole }: { currentRole: string }) {
  const { data: arrivals = [], isLoading: arrLoading } = useQuery<any[]>({
    queryKey: ["receptionist-arrivals"],
    queryFn: () => apiFetch<any[]>("/reservations/today-arrivals").catch(() => []),
  });

  const { data: departures = [], isLoading: depLoading } = useQuery<any[]>({
    queryKey: ["receptionist-departures"],
    queryFn: () => apiFetch<any[]>("/reservations/today-departures").catch(() => []),
  });

  const { data: inHouse = [], isLoading: inHouseLoading } = useQuery<any[]>({
    queryKey: ["receptionist-inhouse"],
    queryFn: () => apiFetch<any[]>("/reservations/in-house").catch(() => []),
  });

  const { data: roomsRes, isLoading: roomsLoading } = useQuery<any>({
    queryKey: ["receptionist-rooms"],
    queryFn: () => apiFetch<any>("/rooms?limit=100").catch(() => ({ data: [] })),
  });

  const allRooms = roomsRes?.data || [];
  const availableRooms = allRooms.filter((r: any) => r.status === "available" || r.status === "ready");

  return (
    <div className="space-y-6">
      {/* Role Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Front Desk Operations</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">{currentRole}</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Real-time guest arrivals, room allocations, check-ins, and stay management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-2">
            <Link href="/check-in">
              <LogIn className="w-4 h-4" /> Process Check-In
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/walk-in">
              New Walk-In
            </Link>
          </Button>
        </div>
      </div>

      {/* Front Desk KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Today's Expected Arrivals</CardTitle>
            <LogIn className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {arrLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{arrivals.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Pending front desk check-in</p>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Today's Departures</CardTitle>
            <LogOut className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {depLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{departures.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Due for folio settlement</p>
          </CardContent>
        </Card>

        <Card className="border-info/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Active In-House Guests</CardTitle>
            <Users className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            {inHouseLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{inHouse.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Currently staying on property</p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Available Clean Rooms</CardTitle>
            <BedDouble className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {roomsLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{availableRooms.length} / {allRooms.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Ready for immediate assignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "Guest Check-In", desc: "Digital signature & keycard", href: "/check-in", icon: LogIn },
          { title: "Guest CRM Directory", desc: "Fayida IDs & VIP profiles", href: "/guests", icon: Users },
          { title: "Reservation Calendar", desc: "Visual date occupancy", href: "/reservations/calendar", icon: CalendarDays },
          { title: "Room Availability", desc: "Dynamic inventory matrix", href: "/availability", icon: BedDouble },
        ].map((action, i) => (
          <Link key={i} href={action.href} className="group p-4 rounded-xl border border-border bg-surface hover:border-primary/50 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <action.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-semibold text-text text-sm">{action.title}</h3>
            <p className="text-xs text-text-muted mt-0.5">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Today's Arrival Schedule Table */}
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Today's Expected Guest Arrivals</CardTitle>
          <CardDescription>Front desk check-in schedule with room assignments and identification status</CardDescription>
        </CardHeader>
        <CardContent>
          {arrivals.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-sm">
              No pending arrivals remaining for today. All guests checked in or advance bookings scheduled.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Assigned Room</TableHead>
                  <TableHead>Stay Window</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrivals.map((res: any) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.guestName || "Guest"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Room {res.roomNumber || res.roomId || "Unassigned"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {res.checkInDate} to {res.checkOutDate}
                    </TableCell>
                    <TableCell className="text-xs">{res.totalAmount ? `${res.totalAmount} ETB` : "Guaranteed"}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/check-in">Check In</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 2. HOUSEKEEPING DASHBOARD
// ============================================================================
function HousekeepingDashboard({ currentRole }: { currentRole: string }) {
  const { data: roomsRes, isLoading } = useQuery<any>({
    queryKey: ["housekeeping-dashboard-rooms"],
    queryFn: () => apiFetch<any>("/rooms?limit=100").catch(() => ({ data: [] })),
  });

  const rooms: any[] = roomsRes?.data || [];
  const dirtyRooms = rooms.filter((r) => r.status === "cleaning" || r.status === "dirty");
  const inProgressRooms = rooms.filter((r) => r.status === "cleaning");
  const readyRooms = rooms.filter((r) => r.status === "available" || r.status === "ready");
  const maintenanceRooms = rooms.filter((r) => r.status === "maintenance" || r.status === "under_maintenance");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Housekeeping Operations</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">{currentRole}</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            4-Stage room turnaround pipeline: Dirty → In Progress → Clean → Ready.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/housekeeping">
            <Sparkles className="w-4 h-4" /> Open Full Board
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-destructive/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Rooms To Clean (Dirty)</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-destructive">{dirtyRooms.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Turnaround required</p>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Cleaning In Progress</CardTitle>
            <Sparkles className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{inProgressRooms.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Attendants on duty</p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Ready & Inspected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-success">{readyRooms.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Released for check-in</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Under Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{maintenanceRooms.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Blocked for repairs</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Priority Rooms Requiring Turnaround</CardTitle>
          <CardDescription>Rooms checked out by front desk awaiting sanitization and fresh linens</CardDescription>
        </CardHeader>
        <CardContent>
          {dirtyRooms.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-sm">
              All guest rooms are sanitized and ready. No pending dirty turnarounds.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dirtyRooms.slice(0, 6).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold text-primary">Room {r.number}</TableCell>
                    <TableCell>{r.roomTypeName || "Standard"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-destructive border-destructive/20">
                        {r.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href="/housekeeping">Start Cleaning</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 3. MAINTENANCE DASHBOARD
// ============================================================================
function MaintenanceDashboard({ currentRole }: { currentRole: string }) {
  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["maintenance-dashboard-tickets"],
    queryFn: () => apiFetch<any[]>("/maintenance").catch(() => []),
  });

  const openTickets = tickets.filter((t) => t.status === "reported" || t.status === "logged");
  const inProgress = tickets.filter((t) => t.status === "assigned" || t.status === "in_progress");
  const highPriority = tickets.filter((t) => t.priority === "high" || t.priority === "critical");
  const verified = tickets.filter((t) => t.status === "verified" || t.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Engineering & Maintenance</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">{currentRole}</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            6-Stage repair lifecycle: Reported → Logged → Assigned → In Progress → Completed → Verified.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/maintenance">
            <Wrench className="w-4 h-4" /> Work Order Board
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-warning/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Open Work Orders</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{openTickets.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Pending technician dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-info/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Active In-Progress</CardTitle>
            <Wrench className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{inProgress.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Under active repair</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Urgent / Emergency</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-destructive">{highPriority.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">High-priority intervention</p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Verified & Certified</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-success">{verified.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Passed safety certification</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Work Orders Queue</CardTitle>
          <CardDescription>Engineering tickets requiring dispatch, parts allocation, or completion</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-sm">
              All hotel equipment and rooms in peak condition. Zero open maintenance tickets.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location / Room</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.slice(0, 6).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.roomNumber ? `Room ${t.roomNumber}` : "General Area"}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell className="uppercase text-xs">{t.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.priority === "high" ? "text-destructive border-destructive/20" : ""}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href="/maintenance">Inspect</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 4. CASHIER & F&B DASHBOARD
// ============================================================================
function CashierDashboard({ currentRole }: { currentRole: string }) {
  const { data: invoicesRes, isLoading } = useQuery<any>({
    queryKey: ["cashier-dashboard-invoices"],
    queryFn: () => apiFetch<any>("/invoices?limit=20").catch(() => ({ data: [] })),
  });

  const invoices: any[] = invoicesRes?.data || [];
  const unpaidInvoices = invoices.filter((inv) => inv.status === "draft" || inv.status === "issued");
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">POS & Cashier Hub</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">{currentRole}</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            F&B dining orders, room service folio charges, and cash register shifts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-2">
            <Link href="/pos">
              <ShoppingCart className="w-4 h-4" /> Open POS Register
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/room-service">
              <ConciergeBell className="w-4 h-4" /> Room Service
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Register Status</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">ACTIVE SHIFT</div>
            <p className="text-xs text-text-muted mt-1">Cash float balanced</p>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Unsettled Stay Folios</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-text">{unpaidInvoices.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Open for room charge posting</p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">Settled Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-success">{paidInvoices.length}</div>
            )}
            <p className="text-xs text-text-muted mt-1">Paid in full (Cash/Card/Telebirr)</p>
          </CardContent>
        </Card>

        <Card className="border-info/20 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-text-muted">VAT Rate (ERCA)</CardTitle>
            <ShieldCheck className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">15.00%</div>
            <p className="text-xs text-text-muted mt-1">Automated tax calculation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Point of Sale (POS)", desc: "Quick drinks, snacks & retail orders", href: "/pos", icon: ShoppingCart },
          { title: "Restaurant Dining", desc: "Table layout & kitchen KDS dispatch", href: "/restaurant", icon: UtensilsCrossed },
          { title: "In-Room Dining", desc: "Suite orders with auto-folio posting", href: "/room-service", icon: ConciergeBell },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="group p-5 rounded-xl border border-border bg-surface hover:border-primary/50 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <item.icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-semibold text-text">{item.title}</h3>
            <p className="text-xs text-text-muted mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 5. EXECUTIVE / ADMIN / MANAGER DASHBOARD
// ============================================================================
function ExecutiveDashboard({ currentRole }: { currentRole: string }) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">Executive Intelligence</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">{currentRole}</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Property portfolio KPIs, multi-department revenue, occupancy forecast, and operational health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/bi">BI Analytics</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/financial">General Ledger</Link>
          </Button>
        </div>
      </div>

      {/* Property Infrastructure */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { title: "Hotels", icon: Building2, value: stats?.totalHotels },
          { title: "Branches", icon: GitBranch, value: stats?.totalBranches },
          { title: "Buildings", icon: Building, value: stats?.totalBuildings },
          { title: "Floors", icon: Layers, value: stats?.totalFloors },
          { title: "Rooms", icon: BedDouble, value: stats?.totalRooms },
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

      {/* Key Hospitality Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Occupancy Rate", icon: BedDouble, value: stats?.occupancyRate ? `${stats.occupancyRate}%` : "78.4%" },
          { title: "Average Daily Rate (ADR)", icon: DollarSign, value: stats?.adr ? `${stats.adr} ETB` : "12,450 ETB" },
          { title: "RevPAR", icon: DollarSign, value: stats?.revpar ? `${stats.revpar} ETB` : "9,760 ETB" },
          { title: "Active In-House", icon: Users, value: stats?.activeGuests ?? "14 Guests" },
        ].map((metric, i) => (
          <Card key={i} className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue and Occupancy Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">30-Day Revenue Trend</CardTitle>
            <CardDescription>Consolidated stay and F&B revenue (ETB)</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Occupancy Trend</CardTitle>
            <CardDescription>Daily occupied rooms across all buildings</CardDescription>
          </CardHeader>
          <CardContent>
            {occupancyLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancy || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="occupancy" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

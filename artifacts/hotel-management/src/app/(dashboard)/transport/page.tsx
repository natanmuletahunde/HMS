"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal } from "lucide-react";
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

type TransportDashboard = {
  totalVehicles: number;
  availableVehicles: number;
  totalDrivers: number;
  todayTrips: number;
  activeTrips?: Trip[];
};

type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: number;
  fuelType?: string;
  plateNumber?: string;
  status: string;
  driverName?: string;
};

type Driver = {
  id: string;
  driverCode?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  status: string;
  rating?: number;
  totalTrips?: number;
};

type Trip = {
  id: string;
  tripNumber: string;
  tripType: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleNumber?: string;
  driverId?: string;
  driverName?: string;
  guestName?: string;
  guestPhone?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  scheduledTime?: string;
  fare?: number;
  status: string;
  passengerCount?: number;
};

const VEHICLE_STATUS_BADGE: Record<string, string> = {
  available: "success",
  assigned: "warning",
  maintenance: "info",
  out_of_service: "danger",
};

const TRIP_STATUS_BADGE: Record<string, string> = {
  scheduled: "muted",
  assigned: "warning",
  started: "info",
  completed: "success",
  cancelled: "danger",
};

type TabType = "dashboard" | "vehicles" | "drivers" | "trips";

export default function TransportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Vehicles filters
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Drivers
  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);

  // Trips
  const [tripStatusTab, setTripStatusTab] = useState("all");
  const [tripTypeFilter, setTripTypeFilter] = useState("all");
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState<Trip | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [assignDriverId, setAssignDriverId] = useState("");

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useQuery<TransportDashboard>({
    queryKey: ["transport-dashboard"],
    queryFn: () => apiFetch<TransportDashboard>("/transport/dashboard"),
    enabled: tab === "dashboard",
  });

  const vehicleParams = new URLSearchParams();
  if (vehicleStatusFilter !== "all") vehicleParams.set("status", vehicleStatusFilter);
  if (vehicleTypeFilter !== "all") vehicleParams.set("vehicleType", vehicleTypeFilter);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", vehicleStatusFilter, vehicleTypeFilter],
    queryFn: () => apiFetch<Vehicle[]>(`/transport/vehicles?${vehicleParams}`),
    enabled: tab === "vehicles" || tab === "trips",
  });

  const driverParams = new URLSearchParams();
  if (driverSearch) driverParams.set("search", driverSearch);
  if (driverStatusFilter !== "all") driverParams.set("status", driverStatusFilter);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["drivers", driverSearch, driverStatusFilter],
    queryFn: () => apiFetch<Driver[]>(`/transport/drivers?${driverParams}`),
    enabled: tab === "drivers" || tab === "trips",
  });

  const tripParams = new URLSearchParams();
  if (tripStatusTab !== "all") tripParams.set("status", tripStatusTab);
  if (tripTypeFilter !== "all") tripParams.set("tripType", tripTypeFilter);

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ["trips", tripStatusTab, tripTypeFilter],
    queryFn: () => apiFetch<Trip[]>(`/transport/trips?${tripParams}`),
    enabled: tab === "trips",
  });

  const activeTripsPagination = usePagination(dashboard?.activeTrips ?? [], 5);
  const vehiclesPagination = usePagination(vehicles, 5);
  const driversPagination = usePagination(drivers, 5);
  const tripsPagination = usePagination(trips, 5);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["drivers"] });
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["transport-dashboard"] });
  }

  const addVehicleMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/transport/vehicles", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsAddVehicleOpen(false); toast({ title: "Vehicle added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchVehicleMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/transport/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: "Vehicle updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addDriverMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/transport/drivers", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsAddDriverOpen(false); toast({ title: "Driver added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createTripMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/transport/trips", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsNewTripOpen(false); toast({ title: "Trip created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchTripMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/transport/trips/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: "Trip updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const TABS: { key: TabType; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "vehicles", label: "Vehicles" },
    { key: "drivers", label: "Drivers" },
    { key: "trips", label: "Trips" },
  ];

  const TRIP_STATUS_TABS = ["all", "scheduled", "assigned", "started", "completed", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Transport</h1>
        {tab === "vehicles" && (
          <Button onClick={() => setIsAddVehicleOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Vehicle
          </Button>
        )}
        {tab === "drivers" && (
          <Button onClick={() => setIsAddDriverOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Driver
          </Button>
        )}
        {tab === "trips" && (
          <Button onClick={() => setIsNewTripOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Trip
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
              { label: "Total Vehicles", value: dashboard?.totalVehicles, color: "text-primary" },
              { label: "Available", value: dashboard?.availableVehicles, color: "text-success" },
              { label: "Total Drivers", value: dashboard?.totalDrivers, color: "text-info" },
              { label: "Today's Trips", value: dashboard?.todayTrips, color: "text-warning" },
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
          {dashboard?.activeTrips && dashboard.activeTrips.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Active Trips</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTripsPagination.paginatedItems.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.tripNumber}</TableCell>
                        <TableCell className="capitalize text-xs">{t.tripType?.replace(/_/g, " ") ?? "—"}</TableCell>
                        <TableCell>{t.vehicleNumber ?? t.vehicleName ?? "—"}</TableCell>
                        <TableCell>{t.driverName ?? "—"}</TableCell>
                        <TableCell>{t.guestName ?? "—"}</TableCell>
                        <TableCell className="text-xs">{t.pickupLocation ?? "—"} → {t.dropoffLocation ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={(TRIP_STATUS_BADGE[t.status] ?? "muted") as any} className="text-[10px] capitalize">
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={activeTripsPagination.currentPage}
                  totalPages={activeTripsPagination.totalPages}
                  totalItems={activeTripsPagination.totalItems}
                  pageSize={5}
                  onPrev={activeTripsPagination.onPrev}
                  onNext={activeTripsPagination.onNext}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* VEHICLES TAB */}
      {tab === "vehicles" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={vehicleStatusFilter} onValueChange={setVehicleStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="limousine">Limousine</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiclesLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : vehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-text-muted">No vehicles found.</TableCell></TableRow>
                ) : vehiclesPagination.paginatedItems.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{v.vehicleNumber}</TableCell>
                    <TableCell className="capitalize">{v.vehicleType}</TableCell>
                    <TableCell>{v.make ?? ""} {v.model ?? ""}{v.year ? ` (${v.year})` : ""}</TableCell>
                    <TableCell className="text-right">{v.capacity ?? "—"}</TableCell>
                    <TableCell className="capitalize">{v.fuelType ?? "—"}</TableCell>
                    <TableCell>{v.plateNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(VEHICLE_STATUS_BADGE[v.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {v.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{v.driverName ?? "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => patchVehicleMutation.mutate({ id: v.id, body: { status: "available" } })}>Set Available</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => patchVehicleMutation.mutate({ id: v.id, body: { status: "maintenance" } })}>Set Maintenance</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => patchVehicleMutation.mutate({ id: v.id, body: { status: "out_of_service" } })}>Out of Service</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={vehiclesPagination.currentPage}
              totalPages={vehiclesPagination.totalPages}
              totalItems={vehiclesPagination.totalItems}
              pageSize={5}
              onPrev={vehiclesPagination.onPrev}
              onNext={vehiclesPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* DRIVERS TAB */}
      {tab === "drivers" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search drivers..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              className="w-[200px]"
            />
            <Select value={driverStatusFilter} onValueChange={setDriverStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="on_trip">On Trip</SelectItem>
                <SelectItem value="off_duty">Off Duty</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License #</TableHead>
                  <TableHead>License Type</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driversLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(10)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : drivers.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-24 text-center text-text-muted">No drivers found.</TableCell></TableRow>
                ) : driversPagination.paginatedItems.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{d.driverCode ?? "—"}</TableCell>
                    <TableCell className="font-medium">{d.firstName} {d.lastName}</TableCell>
                    <TableCell>{d.phone ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{d.licenseNumber ?? "—"}</TableCell>
                    <TableCell>{d.licenseType ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(d.status === "available" ? "success" : d.status === "on_trip" ? "warning" : "muted") as any} className="text-[10px] capitalize">
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-warning">{"★".repeat(Math.round(d.rating ?? 0))}</span>
                      <span className="text-text-muted">{"★".repeat(5 - Math.round(d.rating ?? 0))}</span>
                    </TableCell>
                    <TableCell className="text-right">{d.totalTrips ?? 0}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => apiFetch(`/transport/drivers/${d.id}`, { method: "PATCH", body: JSON.stringify({ status: d.status === "available" ? "off_duty" : "available" }) }).then(() => invalidate())}>
                            {d.status === "available" ? "Set Off Duty" : "Set Available"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={driversPagination.currentPage}
              totalPages={driversPagination.totalPages}
              totalItems={driversPagination.totalItems}
              pageSize={5}
              onPrev={driversPagination.onPrev}
              onNext={driversPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* TRIPS TAB */}
      {tab === "trips" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1 overflow-x-auto">
              {TRIP_STATUS_TABS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTripStatusTab(s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                    tripStatusTab === s ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted hover:bg-muted/70"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <Select value={tripTypeFilter} onValueChange={setTripTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trip Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="airport_pickup">Airport Pickup</SelectItem>
                <SelectItem value="airport_dropoff">Airport Drop-off</SelectItem>
                <SelectItem value="city_tour">City Tour</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Fare</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(10)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : trips.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-24 text-center text-text-muted">No trips found.</TableCell></TableRow>
                ) : tripsPagination.paginatedItems.map((trip) => (
                  <TableRow key={trip.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{trip.tripNumber}</TableCell>
                    <TableCell className="capitalize text-xs">{trip.tripType?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell>{trip.vehicleNumber ?? trip.vehicleName ?? "—"}</TableCell>
                    <TableCell>{trip.driverName ?? "—"}</TableCell>
                    <TableCell>{trip.guestName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{trip.pickupLocation ?? "—"} → {trip.dropoffLocation ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">
                      {trip.scheduledTime ? new Date(trip.scheduledTime).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">{trip.fare != null ? `$${Number(trip.fare).toFixed(2)}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(TRIP_STATUS_BADGE[trip.status] ?? "muted") as any} className="text-[10px] capitalize">
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(trip.status === "scheduled") && (
                            <DropdownMenuItem onClick={() => { setAssignDialog(trip); setAssignVehicleId(""); setAssignDriverId(""); }}>Assign</DropdownMenuItem>
                          )}
                          {trip.status === "assigned" && (
                            <DropdownMenuItem onClick={() => patchTripMutation.mutate({ id: trip.id, body: { status: "started" } })}>Start</DropdownMenuItem>
                          )}
                          {trip.status === "started" && (
                            <DropdownMenuItem onClick={() => patchTripMutation.mutate({ id: trip.id, body: { status: "completed" } })}>Complete</DropdownMenuItem>
                          )}
                          {!["completed", "cancelled"].includes(trip.status) && (
                            <DropdownMenuItem className="text-danger" onClick={() => patchTripMutation.mutate({ id: trip.id, body: { status: "cancelled" } })}>Cancel</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={tripsPagination.currentPage}
              totalPages={tripsPagination.totalPages}
              totalItems={tripsPagination.totalItems}
              pageSize={5}
              onPrev={tripsPagination.onPrev}
              onNext={tripsPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* Add Vehicle Dialog */}
      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            ["year", "capacity"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
            addVehicleMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vehicle Number *</Label>
                <Input name="vehicleNumber" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Vehicle Type *</Label>
                <select name="vehicleType" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                  <option value="bus">Bus</option>
                  <option value="limousine">Limousine</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Make</Label>
                <Input name="make" placeholder="e.g. Toyota" />
              </div>
              <div className="grid gap-1.5">
                <Label>Model</Label>
                <Input name="model" placeholder="e.g. Camry" />
              </div>
              <div className="grid gap-1.5">
                <Label>Year</Label>
                <Input name="year" type="number" placeholder="2024" />
              </div>
              <div className="grid gap-1.5">
                <Label>Capacity</Label>
                <Input name="capacity" type="number" min="1" />
              </div>
              <div className="grid gap-1.5">
                <Label>Fuel Type</Label>
                <select name="fuelType" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Plate Number</Label>
                <Input name="plateNumber" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addVehicleMutation.isPending}>
              {addVehicleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Vehicle
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Driver Dialog */}
      <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            addDriverMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>First Name *</Label>
                <Input name="firstName" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Last Name *</Label>
                <Input name="lastName" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input name="phone" />
              </div>
              <div className="grid gap-1.5">
                <Label>License Number *</Label>
                <Input name="licenseNumber" required />
              </div>
              <div className="grid gap-1.5">
                <Label>License Type</Label>
                <select name="licenseType" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                  <option value="D">Class D</option>
                  <option value="E">Class E</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>License Expiry</Label>
                <Input name="licenseExpiry" type="date" />
              </div>
              <div className="grid gap-1.5">
                <Label>Availability</Label>
                <select name="availability" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="on_call">On Call</option>
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addDriverMutation.isPending}>
              {addDriverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Driver
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Trip Dialog */}
      <Dialog open={isNewTripOpen} onOpenChange={setIsNewTripOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Trip</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => {
              if (k === "chargeToRoom") body[k] = true;
              else if (v !== "") body[k] = v;
            });
            if (!fd.has("chargeToRoom")) body["chargeToRoom"] = false;
            ["passengerCount", "fare"].forEach(f => { if (body[f]) body[f] = Number(body[f]); });
            createTripMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Trip Type *</Label>
                <select name="tripType" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="airport_pickup">Airport Pickup</option>
                  <option value="airport_dropoff">Airport Drop-off</option>
                  <option value="city_tour">City Tour</option>
                  <option value="transfer">Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Vehicle</Label>
                <select name="vehicleId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select vehicle</option>
                  {vehicles.filter(v => v.status === "available").map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.make} {v.model}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Driver</Label>
                <select name="driverId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select driver</option>
                  {drivers.filter(d => d.status === "available").map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Guest Name</Label>
                <Input name="guestName" />
              </div>
              <div className="grid gap-1.5">
                <Label>Guest Phone</Label>
                <Input name="guestPhone" />
              </div>
              <div className="grid gap-1.5">
                <Label>Passengers</Label>
                <Input name="passengerCount" type="number" min="1" defaultValue="1" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Pickup Location *</Label>
                <Input name="pickupLocation" required />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Dropoff Location *</Label>
                <Input name="dropoffLocation" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Flight Number</Label>
                <Input name="flightNumber" />
              </div>
              <div className="grid gap-1.5">
                <Label>Scheduled Time</Label>
                <Input name="scheduledTime" type="datetime-local" />
              </div>
              <div className="grid gap-1.5">
                <Label>Fare</Label>
                <Input name="fare" type="number" step="0.01" min="0" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="chargeToRoom" name="chargeToRoom" className="h-4 w-4" />
                <label htmlFor="chargeToRoom" className="text-sm">Charge to Room</label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createTripMutation.isPending}>
              {createTripMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Trip
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Trip Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Trip — {assignDialog?.tripNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Vehicle</Label>
              <select value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">Select vehicle</option>
                {vehicles.filter(v => v.status === "available").map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.make} {v.model}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Driver</Label>
              <select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">Select driver</option>
                {drivers.filter(d => d.status === "available").map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={() => {
              if (!assignDialog) return;
              patchTripMutation.mutate({ id: assignDialog.id, body: { status: "assigned", vehicleId: assignVehicleId || undefined, driverId: assignDriverId || undefined } });
              setAssignDialog(null);
            }}>
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

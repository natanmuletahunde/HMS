"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Plus, MoreHorizontal, Loader2, Filter, BedDouble, 
  ArrowRight, Search, Users, CalendarSearch, Sparkles, CalendarDays 
} from "lucide-react";
import { ReservationCalendarView } from "@/components/reservation-calendar-view";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination 
} from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import Link from "next/link";

const STATUSES = [
  "available", "occupied", "reserved", "dirty", 
  "cleaning", "blocked", "under_maintenance", "out_of_service"
];

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    available: "success",
    occupied: "danger",
    reserved: "warning",
    dirty: "warning",
    cleaning: "info",
    ready: "success",
    blocked: "muted",
    under_maintenance: "warning",
    out_of_service: "danger"
  };
  const label = status === "ready" ? "available" : status.replace(/_/g, ' ');
  return <Badge variant={(map[status] || "default") as any} className="uppercase text-[10px]">{label}</Badge>;
};

function calcNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 1;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

type AvailRoom = {
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

function RoomsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "calendar" ? "calendar" : tabParam === "availability" ? "availability" : "inventory";
  const [activeTab, setActiveTab] = useState<"inventory" | "availability" | "calendar">(initialTab);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync tab with URL search parameter if changed externally
  useEffect(() => {
    const currentTabParam = searchParams.get("tab");
    if (currentTabParam === "calendar" && activeTab !== "calendar") {
      setActiveTab("calendar");
    } else if (currentTabParam === "availability" && activeTab !== "availability") {
      setActiveTab("availability");
    } else if (!currentTabParam && activeTab !== "inventory") {
      setActiveTab("inventory");
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: "inventory" | "availability" | "calendar") => {
    setActiveTab(tab);
    const url = tab === "calendar" ? "/rooms?tab=calendar" : tab === "availability" ? "/rooms?tab=availability" : "/rooms";
    router.replace(url, { scroll: false });
  };

  // ----------------------------------------------------------------------
  // TAB 1: INVENTORY STATE & DATA
  // ----------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  let queryStr = `/rooms?search=${debouncedSearch}`;
  if (statusFilter !== "all") queryStr += `&status=${statusFilter}`;
  if (typeFilter !== "all") queryStr += `&roomTypeId=${typeFilter}`;
  if (buildingFilter !== "all") queryStr += `&buildingId=${buildingFilter}`;

  const { data: rawRooms, isLoading: isRoomsLoading } = useQuery({
    queryKey: ["rooms", debouncedSearch, statusFilter, typeFilter, buildingFilter],
    queryFn: () => apiFetch<any>(queryStr),
  });
  const rooms: any[] = Array.isArray(rawRooms) ? rawRooms : (rawRooms?.data ?? []);

  const inventoryPagination = usePagination(rooms, 5);

  useEffect(() => {
    inventoryPagination.setCurrentPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, buildingFilter]);

  const { data: types = [] } = useQuery({ queryKey: ["room-types"], queryFn: () => apiFetch<any[]>("/room-types") });
  const { data: categories = [] } = useQuery({ queryKey: ["room-categories"], queryFn: () => apiFetch<any[]>("/room-categories") });
  const { data: bedTypes = [] } = useQuery({ queryKey: ["bed-types"], queryFn: () => apiFetch<any[]>("/bed-types") });
  const { data: rawBuildings } = useQuery({ queryKey: ["buildings"], queryFn: () => apiFetch<any>("/buildings") });
  const buildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);
  const { data: rawFloors } = useQuery({ queryKey: ["floors"], queryFn: () => apiFetch<any>("/floors") });
  const floors: any[] = Array.isArray(rawFloors) ? rawFloors : (rawFloors?.data ?? []);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/rooms/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/rooms", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast({ title: editItem ? "Room updated" : "Room created" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/rooms/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast({ title: "Room deleted" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => apiFetch(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast({ title: "Status updated" });
    }
  });

  const onInventorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      ...Object.fromEntries(fd),
      capacityAdults: Number(fd.get("capacityAdults")),
      capacityChildren: Number(fd.get("capacityChildren")),
      size: Number(fd.get("size")),
      currentPrice: Number(fd.get("currentPrice")),
      smokingAllowed: fd.get("smokingAllowed") === "on",
    });
  };

  // ----------------------------------------------------------------------
  // TAB 2: AVAILABILITY STATE & DATA
  // ----------------------------------------------------------------------
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [availRoomTypeId, setAvailRoomTypeId] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const availSearchParams = new URLSearchParams({
    checkIn,
    checkOut,
    ...(availRoomTypeId ? { roomTypeId: availRoomTypeId } : {}),
  });

  const { data: rawAvailRooms = [], isLoading: isAvailLoading, refetch: refetchAvail } = useQuery<AvailRoom[]>({
    queryKey: ["availability", checkIn, checkOut, availRoomTypeId],
    queryFn: () => apiFetch<AvailRoom[]>(`/reservations/availability?${availSearchParams}`),
    enabled: activeTab === "availability",
  });

  const filteredAvailRooms = (Array.isArray(rawAvailRooms) ? rawAvailRooms : []).filter((r) => {
    if (adults && r.maxAdults && r.maxAdults < adults) return false;
    return true;
  });

  const availPagination = usePagination(filteredAvailRooms, 5);
  const nights = calcNights(checkIn, checkOut);

  function handleAvailSearch(e: React.FormEvent) {
    e.preventDefault();
    refetchAvail();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Front Desk / Rooms & Availability</h1>
          <h2 className="text-2xl font-bold tracking-tight">Rooms & Availability</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => handleTabChange("inventory")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "inventory"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <BedDouble className="h-4 w-4" />
          <span>Room Inventory & Status</span>
        </button>
        <button
          onClick={() => handleTabChange("availability")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "availability"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <CalendarSearch className="h-4 w-4" />
          <span>Date Availability & Booking</span>
        </button>
        <button
          onClick={() => handleTabChange("calendar")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "calendar"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Reservation Calendar</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: ROOM INVENTORY & STATUS CONTENT                           */}
      {/* ================================================================= */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input 
                placeholder="Search rooms..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[150px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Room Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isAddOpen} onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) setEditItem(null);
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Room</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editItem ? "Edit Room" : "Add Room"}</DialogTitle>
                </DialogHeader>
                <form className="space-y-6" onSubmit={onInventorySubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Room Number</Label>
                      <Input name="number" defaultValue={editItem?.number} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Room Name</Label>
                      <Input name="roomName" defaultValue={editItem?.roomName} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select name="roomTypeId" defaultValue={editItem?.roomTypeId} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {types.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select name="roomCategoryId" defaultValue={editItem?.roomCategoryId} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Bed Type</Label>
                      <Select name="bedTypeId" defaultValue={editItem?.bedTypeId} required>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {bedTypes.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Building</Label>
                      <Select name="buildingId" defaultValue={editItem?.buildingId}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {buildings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Floor Config</Label>
                      <Select name="floorId" defaultValue={editItem?.floorId}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {floors.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.floorName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Floor Number (Legacy)</Label>
                      <Input name="floor" type="number" defaultValue={editItem?.floor} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label>Adults Cap.</Label>
                      <Input name="capacityAdults" type="number" min={1} defaultValue={editItem?.capacityAdults || 2} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Child Cap.</Label>
                      <Input name="capacityChildren" type="number" min={0} defaultValue={editItem?.capacityChildren || 0} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Size (sqm)</Label>
                      <Input name="size" type="number" defaultValue={editItem?.size} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Current Price</Label>
                      <Input name="currentPrice" type="number" defaultValue={editItem?.currentPrice} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="smokingAllowed" defaultChecked={editItem?.smokingAllowed} className="rounded" />
                      <span className="text-sm font-medium">Smoking Allowed</span>
                    </label>
                  </div>

                  <div className="grid gap-2">
                    <Label>Keycard / Lock ID</Label>
                    <Input name="keyCardId" defaultValue={editItem?.keyCardId} placeholder="e.g. RFID-101" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Input name="notes" defaultValue={editItem?.notes} />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Room
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Type & Price</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRoomsLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                      <BedDouble className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No rooms found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryPagination.paginatedItems.map((room) => {
                    const b = buildings.find((x: any) => x.id === room.buildingId);
                    const f = floors.find((x: any) => x.id === room.floorId);
                    const t = types.find((x: any) => x.id === room.roomTypeId);
                    return (
                      <TableRow key={room.id}>
                        <TableCell>
                          <div className="font-bold text-base">{room.number}</div>
                          <div className="text-xs text-text-muted">{room.roomName || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t?.name || room.type || '-'}</div>
                          <div className="text-xs text-text-muted">${room.currentPrice || 0}/night</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{room.capacityAdults}A / {room.capacityChildren}C</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{b?.buildingName || '-'}</div>
                          <div className="text-xs text-text-muted">{f?.floorName || `Floor ${room.floor}`}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(room.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/rooms/${room.id}`} className="flex w-full items-center cursor-pointer">
                                  View Detail <ArrowRight className="ml-auto h-3 w-3" />
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditItem(room); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                              
                              {room.status !== 'available' && <DropdownMenuItem onClick={() => statusMutation.mutate({ id: room.id, status: 'available' })}>Mark Available</DropdownMenuItem>}
                              {room.status !== 'dirty' && <DropdownMenuItem onClick={() => statusMutation.mutate({ id: room.id, status: 'dirty' })}>Mark Dirty</DropdownMenuItem>}
                              {room.status !== 'out_of_service' ? (
                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: room.id, status: 'out_of_service' })}>Mark Out of Service</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: room.id, status: 'available' })}>Put In Service</DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem className="text-danger focus:bg-danger/10 focus:text-danger" onClick={() => deleteMutation.mutate(room.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={inventoryPagination.currentPage}
              totalPages={inventoryPagination.totalPages}
              totalItems={inventoryPagination.totalItems}
              pageSize={5}
              onPrev={inventoryPagination.onPrev}
              onNext={inventoryPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: DATE AVAILABILITY & BOOKING CONTENT                       */}
      {/* ================================================================= */}
      {activeTab === "availability" && (
        <div className="space-y-6">
          {/* Availability Search Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Search Real-Time Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-wrap gap-4 items-end" onSubmit={handleAvailSearch}>
                <div className="grid gap-1.5">
                  <Label htmlFor="checkIn">Check-in Date</Label>
                  <Input 
                    id="checkIn" 
                    type="date" 
                    value={checkIn} 
                    onChange={e => setCheckIn(e.target.value)} 
                    min={today} 
                    className="w-[160px]" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="checkOut">Check-out Date</Label>
                  <Input 
                    id="checkOut" 
                    type="date" 
                    value={checkOut} 
                    onChange={e => setCheckOut(e.target.value)} 
                    min={checkIn} 
                    className="w-[160px]" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="availRoomType">Room Type</Label>
                  <select
                    id="availRoomType"
                    value={availRoomTypeId}
                    onChange={e => setAvailRoomTypeId(e.target.value)}
                    className="flex h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm w-[160px]"
                  >
                    <option value="">Any Type</option>
                    {types.map((rt: any) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="adults">Adults</Label>
                  <Input 
                    id="adults" 
                    type="number" 
                    min={1} 
                    value={adults} 
                    onChange={e => setAdults(Number(e.target.value))} 
                    className="w-[80px]" 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="children">Children</Label>
                  <Input 
                    id="children" 
                    type="number" 
                    min={0} 
                    value={children} 
                    onChange={e => setChildren(Number(e.target.value))} 
                    className="w-[80px]" 
                  />
                </div>
                <Button type="submit" className="gap-2">
                  <Search className="h-4 w-4" /> Check Availability
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Availability Status Banner */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {isAvailLoading ? "Searching room calendar..." : `${filteredAvailRooms.length} room${filteredAvailRooms.length !== 1 ? "s" : ""} available`}
              {nights > 0 && ` for ${nights} night${nights !== 1 ? "s" : ""}`}
              {checkIn && checkOut && ` (${new Date(checkIn).toLocaleDateString()} → ${new Date(checkOut).toLocaleDateString()})`}
            </p>
            {nights > 0 && !isAvailLoading && filteredAvailRooms.length > 0 && (
              <p className="text-sm font-medium text-primary">
                Rates starting from ${(Math.min(...filteredAvailRooms.map(r => r.currentPrice ?? 0)) * nights).toFixed(0)} total
              </p>
            )}
          </div>

          {/* Results Grid / List */}
          {isAvailLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredAvailRooms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 gap-3">
                <BedDouble className="h-10 w-10 text-text-muted" />
                <p className="text-text-muted">No rooms available for the selected dates and criteria.</p>
                <p className="text-xs text-text-muted">Try selecting different dates or room type.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availPagination.paginatedItems.map((room) => {
                  const estimatedTotal = Number(room.currentPrice ?? 0) * nights;
                  return (
                    <Card key={room.id} className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-bold">Room {room.number}</CardTitle>
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="border border-border rounded-md bg-surface">
                <TablePagination
                  currentPage={availPagination.currentPage}
                  totalPages={availPagination.totalPages}
                  totalItems={availPagination.totalItems}
                  pageSize={5}
                  onPrev={availPagination.onPrev}
                  onNext={availPagination.onNext}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: RESERVATION CALENDAR CONTENT                             */}
      {/* ================================================================= */}
      {activeTab === "calendar" && (
        <div className="space-y-4 pt-2">
          <ReservationCalendarView showTitle={true} />
        </div>
      )}

      {/* ── LIVE RESERVATION CALENDAR BELOW ROOMS (FOR INVENTORY TAB) ──── */}
      {activeTab === "inventory" && (
        <div className="pt-8 border-t border-border mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Reservation Calendar & Room Schedule
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Live room booking schedule, check-in dates, and occupancy timeline
              </p>
            </div>
            <Link href="/reservations/calendar">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                Open Full Screen Calendar &rarr;
              </Button>
            </Link>
          </div>

          <ReservationCalendarView showTitle={false} />
        </div>
      )}
    </div>
  );
}

export default function RoomsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">Loading Rooms & Availability...</div>}>
      <RoomsContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Filter, BedDouble, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import Link from "next/link";

const STATUSES = [
  "available", "occupied", "reserved", "dirty", 
  "cleaning", "ready", "blocked", "under_maintenance", "out_of_service"
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
  return <Badge variant={(map[status] || "default") as any} className="uppercase text-[10px]">{status.replace(/_/g, ' ')}</Badge>;
};

export default function RoomsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Construct query string
  let queryStr = `/rooms?search=${debouncedSearch}`;
  if (statusFilter !== "all") queryStr += `&status=${statusFilter}`;
  if (typeFilter !== "all") queryStr += `&roomTypeId=${typeFilter}`;
  if (buildingFilter !== "all") queryStr += `&buildingId=${buildingFilter}`;

  const { data: rawRooms, isLoading } = useQuery({
    queryKey: ["rooms", debouncedSearch, statusFilter, typeFilter, buildingFilter],
    queryFn: () => apiFetch<any>(queryStr),
  });
  const rooms: any[] = Array.isArray(rawRooms) ? rawRooms : (rawRooms?.data ?? []);

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedRooms,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(rooms, 5);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, buildingFilter, setCurrentPage]);

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
      toast({ title: "Room deleted" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => apiFetch(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Status updated" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold tracking-tight text-text-muted uppercase">Front Desk / Rooms</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Rooms Inventory</h2>
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
              <form className="space-y-6" onSubmit={onSubmit}>
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
                    <Label>Size (sq ft/m)</Label>
                    <Input name="size" type="number" defaultValue={editItem?.size} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Base Price</Label>
                    <Input name="currentPrice" type="number" step="0.01" defaultValue={editItem?.currentPrice} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>View</Label>
                    <Input name="view" placeholder="e.g. Ocean View" defaultValue={editItem?.view} />
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <input type="checkbox" id="smoking" name="smokingAllowed" defaultChecked={editItem?.smokingAllowed} className="h-4 w-4 rounded border-border bg-surface text-primary" />
                    <Label htmlFor="smoking">Smoking Allowed</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Room
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                  <BedDouble className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No rooms found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRooms.map((room) => {
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
                          
                          {/* Quick status changes */}
                          {room.status !== 'ready' && <DropdownMenuItem onClick={() => statusMutation.mutate({ id: room.id, status: 'ready' })}>Mark Ready</DropdownMenuItem>}
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
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>
    </div>
  );
}

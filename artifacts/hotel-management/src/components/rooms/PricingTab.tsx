"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, DollarSign, Filter, Layers, BedDouble } from "lucide-react";
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

const PRICING_TYPES = [
  { value: "base", label: "Base Rate" },
  { value: "weekend", label: "Weekend Rate" },
  { value: "holiday", label: "Holiday Rate" },
  { value: "seasonal", label: "Seasonal Rate" },
  { value: "corporate", label: "Corporate Rate" },
  { value: "travel_agency", label: "Travel Agency" },
  { value: "vip", label: "VIP Rate" }
];

export function PricingTab() {
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [targetMode, setTargetMode] = useState<"type" | "room">("type");
  const [modalRoomTypeId, setModalRoomTypeId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roomTypes = [] } = useQuery({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<any[]>("/room-types"),
  });

  const { data: rawRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiFetch<any>("/rooms"),
  });
  const rooms: any[] = Array.isArray(rawRooms) ? rawRooms : (rawRooms?.data ?? []);

  // Compute pricing query URL based on active filters
  const queryParams = new URLSearchParams();
  if (selectedRoomTypeId !== "all") queryParams.set("roomTypeId", selectedRoomTypeId);
  if (selectedRoomId !== "all") queryParams.set("roomId", selectedRoomId);
  const queryString = queryParams.toString();

  const { data: pricing = [], isLoading } = useQuery({
    queryKey: ["room-pricing", selectedRoomTypeId, selectedRoomId],
    queryFn: () => apiFetch<any[]>(queryString ? `/room-pricing?${queryString}` : "/room-pricing"),
  });

  const {
    paginatedItems: paginatedPricing,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(pricing, 5);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/room-pricing/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/room-pricing", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      toast({ title: editItem ? "Pricing rule updated" : "Pricing rule applied" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/room-pricing/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-pricing"] });
      toast({ title: "Pricing rule deleted" });
    }
  });

  const openAdd = () => {
    setEditItem(null);
    setTargetMode("type");
    setModalRoomTypeId(roomTypes[0]?.id || "");
    setIsAddOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditItem(rule);
    setTargetMode("room");
    setIsAddOpen(true);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(fd);

    const payload: any = {
      pricingType: data.pricingType,
      price: Number(data.price),
      discountPercent: Number(data.discountPercent || 0),
      taxPercent: Number(data.taxPercent || 0),
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate || null,
      notes: data.notes || null,
    };

    if (editItem) {
      saveMutation.mutate(payload);
      return;
    }

    if (targetMode === "type") {
      payload.roomTypeId = modalRoomTypeId || data.roomTypeId;
      payload.roomId = "all";
    } else {
      payload.roomId = data.roomId;
    }

    saveMutation.mutate(payload);
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      base: "default",
      weekend: "info",
      holiday: "warning",
      seasonal: "success",
      corporate: "muted",
      travel_agency: "outline",
      vip: "danger"
    };
    return <Badge variant={(map[type] || "default") as any} className="uppercase text-[10px]">{type.replace('_', ' ')}</Badge>;
  };

  const filteredRoomsForFilter = selectedRoomTypeId === "all" 
    ? rooms 
    : rooms.filter(r => r.roomTypeId === selectedRoomTypeId);

  const roomsMatchingModalType = modalRoomTypeId 
    ? rooms.filter(r => r.roomTypeId === modalRoomTypeId) 
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Pricing Rules</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure rates by Room Type (propagating to all rooms) or set custom overrides per physical room.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Room Type Filter */}
          <div className="flex items-center gap-2 border border-[var(--border)] rounded-md px-2.5 py-1 bg-[var(--surface)] shadow-xs">
            <Layers className="h-4 w-4 text-blue-600" />
            <Select 
              value={selectedRoomTypeId} 
              onValueChange={(val) => {
                setSelectedRoomTypeId(val);
                setSelectedRoomId("all");
              }}
            >
              <SelectTrigger className="w-[160px] border-0 bg-transparent focus:ring-0 shadow-none h-7 text-xs p-0">
                <SelectValue placeholder="All Room Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Room Types</SelectItem>
                {roomTypes.map((rt: any) => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Physical Room Filter */}
          <div className="flex items-center gap-2 border border-[var(--border)] rounded-md px-2.5 py-1 bg-[var(--surface)] shadow-xs">
            <BedDouble className="h-4 w-4 text-[var(--text-secondary)]" />
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="w-[150px] border-0 bg-transparent focus:ring-0 shadow-none h-7 text-xs p-0">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Physical Rooms</SelectItem>
                {filteredRoomsForFilter.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.number} {r.roomTypeName ? `(${r.roomTypeName})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={openAdd} className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
            <Plus className="mr-2 h-4 w-4" /> Add Pricing Rule
          </Button>

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)] shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                  {editItem ? "Edit Pricing Rule" : "Add Pricing Rule"}
                </DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                {!editItem && (
                  <div className="space-y-2 border border-[var(--border)] p-3 rounded-md bg-[var(--surface-hover)]/40">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Pricing Target</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetMode("type")}
                        className={`px-3 py-2 text-xs font-medium border text-center transition-all ${
                          targetMode === "type"
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-400"
                        }`}
                      >
                        By Room Type (Bulk)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetMode("room")}
                        className={`px-3 py-2 text-xs font-medium border text-center transition-all ${
                          targetMode === "room"
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-400"
                        }`}
                      >
                        Single Room Override
                      </button>
                    </div>
                  </div>
                )}

                {targetMode === "type" && !editItem ? (
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Select Room Type</Label>
                    <Select value={modalRoomTypeId} onValueChange={setModalRoomTypeId} required>
                      <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                        <SelectValue placeholder="Select Room Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((rt: any) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name} (Base: ${Number(rt.basePrice).toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Applies to all {roomsMatchingModalType.length} physical {roomsMatchingModalType.length === 1 ? 'room' : 'rooms'} of this type and updates the type's base price.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Target Room</Label>
                    <Select 
                      name="roomId" 
                      defaultValue={editItem?.roomId || (selectedRoomId !== "all" ? selectedRoomId : rooms[0]?.id)} 
                      disabled={!!editItem}
                      required
                    >
                      <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                        <SelectValue placeholder="Select Room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            Room {r.number} {r.roomTypeName ? `(${r.roomTypeName})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Pricing Type</Label>
                  <Select name="pricingType" defaultValue={editItem?.pricingType || "base"} required>
                    <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Price ($)</Label>
                    <Input name="price" type="number" step="0.01" min={0} defaultValue={editItem?.price || 100} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Discount %</Label>
                    <Input name="discountPercent" type="number" step="0.1" min={0} max={100} defaultValue={editItem?.discountPercent || 0} className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Tax %</Label>
                    <Input name="taxPercent" type="number" step="0.1" min={0} max={100} defaultValue={editItem?.taxPercent || 0} className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Effective Date</Label>
                    <Input name="effectiveDate" type="date" defaultValue={editItem?.effectiveDate?.split('T')[0] || new Date().toISOString().split('T')[0]} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Expiration Date</Label>
                    <Input name="expirationDate" type="date" defaultValue={editItem?.expirationDate?.split('T')[0]} className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Notes</Label>
                  <Input name="notes" defaultValue={editItem?.notes} placeholder="e.g. High season rate / special holiday" className="border-[var(--border)] bg-[var(--surface)]" />
                </div>

                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-xs" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {targetMode === "type" && !editItem ? "Apply to Room Type" : "Save Rule"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
              <TableHead className="font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">Room #</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">Room Type</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">Rate Type</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">Effective Price</TableHead>
              <TableHead className="font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">Date Range</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : pricing.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-[var(--text-secondary)]">
                  <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No pricing rules found for the selected filter.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPricing.map((rule) => {
                const room = rooms.find(r => r.id === rule.roomId);
                const roomType = roomTypes.find(rt => rt.id === (rule.roomTypeId || room?.roomTypeId));
                const finalPrice = Number(rule.price ?? 0) * (1 - (Number(rule.discountPercent) || 0) / 100) * (1 + (Number(rule.taxPercent) || 0) / 100);

                return (
                  <TableRow key={rule.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">
                    <TableCell className="font-semibold text-[var(--text-primary)]">
                      {room?.number ? `Room ${room.number}` : (rule.roomNumber ? `Room ${rule.roomNumber}` : rule.roomId)}
                    </TableCell>
                    <TableCell>
                      {roomType?.name || rule.roomTypeName ? (
                        <Badge variant="outline" className="font-medium text-xs">
                          {roomType?.name || rule.roomTypeName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getTypeBadge(rule.pricingType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--text-primary)] font-mono">${finalPrice.toFixed(2)}</span>
                        {(Number(rule.discountPercent) > 0 || Number(rule.taxPercent) > 0) && (
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                            Base: ${Number(rule.price).toFixed(2)}
                            {Number(rule.discountPercent) > 0 ? ` (-${rule.discountPercent}%)` : ''} 
                            {Number(rule.taxPercent) > 0 ? ` (+${rule.taxPercent}%)` : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)]">
                      {rule.effectiveDate ? new Date(rule.effectiveDate).toLocaleDateString() : 'Immediate'} &rarr; {rule.expirationDate ? new Date(rule.expirationDate).toLocaleDateString() : 'Ongoing'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border border-[var(--border)] bg-[var(--surface)] shadow-md">
                          <DropdownMenuItem onClick={() => openEdit(rule)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(rule.id)}>Delete</DropdownMenuItem>
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

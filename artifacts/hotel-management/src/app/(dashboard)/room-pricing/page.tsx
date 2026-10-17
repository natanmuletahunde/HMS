"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, DollarSign, Filter } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const PRICING_TYPES = [
  { value: "base", label: "Base Rate" },
  { value: "weekend", label: "Weekend Rate" },
  { value: "holiday", label: "Holiday Rate" },
  { value: "seasonal", label: "Seasonal Rate" },
  { value: "corporate", label: "Corporate Rate" },
  { value: "travel_agency", label: "Travel Agency" },
  { value: "vip", label: "VIP Rate" }
];

export default function RoomPricingPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pricing = [], isLoading } = useQuery({
    queryKey: ["room-pricing", selectedRoomId],
    queryFn: () => apiFetch<any[]>(selectedRoomId === "all" ? "/room-pricing" : `/room-pricing?roomId=${selectedRoomId}`),
  });

  const { data: rawRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiFetch<any>("/rooms"),
  });
  const rooms: any[] = Array.isArray(rawRooms) ? rawRooms : (rawRooms?.data ?? []);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/room-pricing/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/room-pricing", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-pricing"] });
      toast({ title: editItem ? "Pricing updated" : "Pricing added" });
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      ...Object.fromEntries(fd),
      price: Number(fd.get("price")),
      discountPercent: Number(fd.get("discountPercent")),
      taxPercent: Number(fd.get("taxPercent"))
    });
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

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold tracking-tight text-text-muted uppercase">Room Setup / Pricing</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Room Pricing</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-border rounded-md px-3 py-1 bg-surface">
            <Filter className="h-4 w-4 text-text-muted" />
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0 shadow-none h-8">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>Room {r.number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Pricing Rule" : "Add Pricing Rule"}</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label>Room</Label>
                  <Select name="roomId" defaultValue={editItem?.roomId || (selectedRoomId !== "all" ? selectedRoomId : undefined)} required>
                    <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>Room {r.number} ({r.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Pricing Type</Label>
                  <Select name="pricingType" defaultValue={editItem?.pricingType || "base"} required>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>
                      {PRICING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Price</Label>
                    <Input name="price" type="number" step="0.01" min={0} defaultValue={editItem?.price} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Discount %</Label>
                    <Input name="discountPercent" type="number" step="0.1" min={0} max={100} defaultValue={editItem?.discountPercent || 0} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tax %</Label>
                    <Input name="taxPercent" type="number" step="0.1" min={0} max={100} defaultValue={editItem?.taxPercent || 0} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Effective Date</Label>
                    <Input name="effectiveDate" type="date" defaultValue={editItem?.effectiveDate?.split('T')[0]} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Expiration Date</Label>
                    <Input name="expirationDate" type="date" defaultValue={editItem?.expirationDate?.split('T')[0]} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Input name="notes" defaultValue={editItem?.notes} />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Rule
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
              <TableHead>Room #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : pricing.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-text-muted">
                  <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No pricing rules found.</p>
                </TableCell>
              </TableRow>
            ) : (
              pricing.map((rule) => {
                const room = rooms.find(r => r.id === rule.roomId);
                const finalPrice = Number(rule.price ?? 0) * (1 - (Number(rule.discountPercent) || 0) / 100) * (1 + (Number(rule.taxPercent) || 0) / 100);
                return (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{room?.number || rule.roomId}</TableCell>
                    <TableCell>{getTypeBadge(rule.pricingType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">${finalPrice.toFixed(2)}</span>
                        {(rule.discountPercent > 0 || rule.taxPercent > 0) && (
                          <span className="text-[10px] text-text-muted">
                            Base: ${rule.price} 
                            {rule.discountPercent > 0 ? ` (-${rule.discountPercent}%)` : ''} 
                            {rule.taxPercent > 0 ? ` (+${rule.taxPercent}%)` : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {new Date(rule.effectiveDate).toLocaleDateString()} &rarr; {rule.expirationDate ? new Date(rule.expirationDate).toLocaleDateString() : 'Forever'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditItem(rule); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
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
      </div>
    </div>
  );
}

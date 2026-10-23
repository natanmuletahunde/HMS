"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, BedDouble } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

export function RoomTypesTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<any[]>("/room-types"),
  });

  const {
    paginatedItems: paginatedTypes,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(types, 5);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/room-types/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/room-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      toast({ title: editItem ? "Room type updated" : "Room type added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/room-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      toast({ title: "Room type deleted" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd);
    saveMutation.mutate({
      ...data,
      maximumAdults: Number(data.maximumAdults),
      maximumChildren: Number(data.maximumChildren),
      maxOccupancy: Number(data.maximumAdults) + Number(data.maximumChildren),
      basePrice: Number(data.basePrice)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight">Room Types</h3>
        <div className="flex items-center gap-2">
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Room Type</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Room Type" : "Add Room Type"}</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input name="name" defaultValue={editItem?.name} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Max Adults</Label>
                    <Input name="maximumAdults" type="number" min={1} defaultValue={editItem?.maximumAdults} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Children</Label>
                    <Input name="maximumChildren" type="number" min={0} defaultValue={editItem?.maximumChildren} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Base Price ($)</Label>
                  <Input name="basePrice" type="number" step="0.01" min={0} defaultValue={editItem?.basePrice} required />
                </div>
                <div className="grid gap-2">
                  <Label>Image URL (Optional)</Label>
                  <Input name="imageUrl" defaultValue={editItem?.imageUrl} />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input name="description" defaultValue={editItem?.description} />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
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
              <TableHead>Type Name</TableHead>
              <TableHead>Max Adults</TableHead>
              <TableHead>Max Children</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                  <BedDouble className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No room types found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.maximumAdults || type.capacity}</TableCell>
                  <TableCell>{type.maximumChildren || 0}</TableCell>
                  <TableCell>${Number(type.basePrice ?? 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={type.status === 'active' ? 'success' : 'muted'}>{type.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditItem(type); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(type.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, BedSingle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function BedTypesPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bedTypes = [], isLoading } = useQuery({
    queryKey: ["bed-types"],
    queryFn: () => apiFetch<any[]>("/bed-types"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/bed-types/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/bed-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bed-types"] });
      toast({ title: editItem ? "Bed type updated" : "Bed type added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/bed-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bed-types"] });
      toast({ title: "Bed type deleted" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      ...Object.fromEntries(fd),
      capacity: Number(fd.get("capacity")),
      sortOrder: Number(fd.get("sortOrder"))
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold tracking-tight text-text-muted uppercase">Room Setup / Bed Types</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Bed Types</h2>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditItem(null);
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Bed Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Bed Type" : "Add Bed Type"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label>Name (e.g. King, Queen, Twin)</Label>
                <Input name="name" defaultValue={editItem?.name} required />
              </div>
              <div className="grid gap-2">
                <Label>Capacity (Persons)</Label>
                <Input name="capacity" type="number" min={1} defaultValue={editItem?.capacity || 1} required />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editItem?.description} />
              </div>
              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input name="sortOrder" type="number" defaultValue={editItem?.sortOrder || bedTypes.length} required />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bed Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : bedTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                  <BedSingle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No bed types found.</p>
                </TableCell>
              </TableRow>
            ) : (
              [...bedTypes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((bed) => (
                <TableRow key={bed.id}>
                  <TableCell className="font-medium">{bed.name}</TableCell>
                  <TableCell>{bed.capacity} Persons</TableCell>
                  <TableCell>{bed.description || '-'}</TableCell>
                  <TableCell>{bed.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={bed.status === 'active' ? 'success' : 'muted'}>{bed.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditItem(bed); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(bed.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

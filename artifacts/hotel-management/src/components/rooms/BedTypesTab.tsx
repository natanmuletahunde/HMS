"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, BedSingle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

export function BedTypesTab() {
  const { user } = useAuth();
  const isGlobal = user?.roleName === "Admin" || user?.roleName === "System Admin" || user?.roleScope === "global";

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bedTypes = [], isLoading } = useQuery({
    queryKey: ["bed-types"],
    queryFn: () => apiFetch<any[]>("/bed-types"),
  });

  const sortedBeds = [...bedTypes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedBeds,
    onPrev,
    onNext,
  } = usePagination(sortedBeds, 5);

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Bed Types</h3>
        {isGlobal && (
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
                <Plus className="mr-2 h-4 w-4" /> Add Bed Type
              </Button>
            </DialogTrigger>
            <DialogContent className="border-[var(--border)] bg-[var(--surface)]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                  {editItem ? "Edit Bed Type" : "Add Bed Type"}
                </DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Name (e.g. King, Queen, Twin)</Label>
                  <Input name="name" defaultValue={editItem?.name} required className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Capacity (Persons)</Label>
                  <Input name="capacity" type="number" min={1} defaultValue={editItem?.capacity || 1} required className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Description</Label>
                  <Input name="description" defaultValue={editItem?.description} className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Sort Order</Label>
                  <Input name="sortOrder" type="number" defaultValue={editItem?.sortOrder || bedTypes.length} required className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Bed Type</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Capacity</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Description</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Sort Order</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Status</TableHead>
              {isGlobal && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isGlobal ? 6 : 5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : bedTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isGlobal ? 6 : 5} className="h-48 text-center text-[var(--text-secondary)]">
                  <BedSingle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No bed types found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBeds.map((bed) => (
                <TableRow key={bed.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                  <TableCell className="font-semibold text-[var(--text-primary)]">{bed.name}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{bed.capacity} {bed.capacity === 1 ? 'Person' : 'Persons'}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{bed.description || '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{bed.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={bed.status === 'active' ? 'success' : 'muted'}>{bed.status || 'Active'}</Badge>
                  </TableCell>
                  {isGlobal && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                          <DropdownMenuItem onClick={() => { setEditItem(bed); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(bed.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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

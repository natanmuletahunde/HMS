"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Tag } from "lucide-react";
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

export function RoomCategoriesTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["room-categories"],
    queryFn: () => apiFetch<any[]>("/room-categories"),
  });

  const sortedCategories = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const {
    paginatedItems: paginatedCategories,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(sortedCategories, 5);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/room-categories/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/room-categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-categories"] });
      toast({ title: editItem ? "Category updated" : "Category added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/room-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-categories"] });
      toast({ title: "Category deleted" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      ...Object.fromEntries(fd),
      sortOrder: Number(fd.get("sortOrder"))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Room Categories</h3>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditItem(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="border-[var(--border)] bg-[var(--surface)]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                {editItem ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Name</Label>
                <Input name="name" defaultValue={editItem?.name} required className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Description</Label>
                <Input name="description" defaultValue={editItem?.description} className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Sort Order</Label>
                <Input name="sortOrder" type="number" defaultValue={editItem?.sortOrder || categories.length} required className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Category Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Description</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Sort Order</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-[var(--text-secondary)]">
                  <Tag className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No room categories found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCategories.map((cat) => (
                <TableRow key={cat.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                  <TableCell className="font-semibold text-[var(--text-primary)]">{cat.name}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{cat.description || '-'}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{cat.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={cat.status === 'active' ? 'success' : 'muted'}>{cat.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                        <DropdownMenuItem onClick={() => { setEditItem(cat); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(cat.id)}>Delete</DropdownMenuItem>
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

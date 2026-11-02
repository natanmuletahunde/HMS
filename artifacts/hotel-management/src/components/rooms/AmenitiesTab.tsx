"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Sparkles, Filter } from "lucide-react";
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

const CATEGORIES = ["All", "Technology", "Comfort", "View", "Bathroom", "Food & Beverage", "Recreation", "Other"];

export function AmenitiesTab() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: amenities = [], isLoading } = useQuery({
    queryKey: ["room-amenities", activeCategory],
    queryFn: () => apiFetch<any[]>(activeCategory === "All" ? "/room-amenities" : `/room-amenities?category=${activeCategory}`),
  });

  const sortedAmenities = [...amenities].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const {
    paginatedItems: paginatedAmenities,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(sortedAmenities, 5);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/room-amenities/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/room-amenities", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-amenities"] });
      toast({ title: editItem ? "Amenity updated" : "Amenity added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/room-amenities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-amenities"] });
      toast({ title: "Amenity deleted" });
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
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Room Amenities</h3>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditItem(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
              <Plus className="mr-2 h-4 w-4" /> Add Amenity
            </Button>
          </DialogTrigger>
          <DialogContent className="border-[var(--border)] bg-[var(--surface)]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                {editItem ? "Edit Amenity" : "Add Amenity"}
              </DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Name</Label>
                <Input name="name" defaultValue={editItem?.name} required className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Category</Label>
                <Select name="category" defaultValue={editItem?.category || "Comfort"} required>
                  <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                    {CATEGORIES.filter(c => c !== "All").map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Icon (Lucide icon name or emoji)</Label>
                <Input name="icon" defaultValue={editItem?.icon} className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Description</Label>
                <Input name="description" defaultValue={editItem?.description} className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Sort Order</Label>
                <Input name="sortOrder" type="number" defaultValue={editItem?.sortOrder || amenities.length} required className="border-[var(--border)] bg-[var(--surface)]" />
              </div>
              <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2">
        {CATEGORIES.map(cat => (
          <Button 
            key={cat} 
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap text-xs h-8 ${activeCategory === cat ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}`}
          >
            {cat === "All" && <Filter className="mr-1.5 h-3 w-3" />}
            {cat}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Amenity</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Category</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Icon</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Sort Order</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : amenities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-[var(--text-secondary)]">
                  <Sparkles className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No amenities found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAmenities.map((amenity) => (
                <TableRow key={amenity.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                  <TableCell className="font-semibold text-[var(--text-primary)]">{amenity.name}</TableCell>
                  <TableCell><Badge variant="outline">{amenity.category}</Badge></TableCell>
                  <TableCell className="text-lg">{amenity.icon || '✨'}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{amenity.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={amenity.status === 'active' ? 'success' : 'muted'}>{amenity.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                        <DropdownMenuItem onClick={() => { setEditItem(amenity); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(amenity.id)}>Delete</DropdownMenuItem>
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

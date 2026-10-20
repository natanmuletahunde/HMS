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

export default function RoomAmenitiesPage() {
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
    <div className="space-y-6">
      <h1 className="text-sm font-semibold tracking-tight text-text-muted uppercase">Room Setup / Amenities</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Room Amenities</h2>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditItem(null);
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Amenity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Amenity" : "Add Amenity"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input name="name" defaultValue={editItem?.name} required />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select name="category" defaultValue={editItem?.category || "Comfort"} required>
                  <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c !== "All").map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Icon (Lucide icon name or emoji)</Label>
                <Input name="icon" defaultValue={editItem?.icon} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editItem?.description} />
              </div>
              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input name="sortOrder" type="number" defaultValue={editItem?.sortOrder || amenities.length} required />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
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
            className="whitespace-nowrap"
          >
            {cat === "All" && <Filter className="mr-2 h-3 w-3" />}
            {cat}
          </Button>
        ))}
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amenity</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : amenities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                  <Sparkles className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No amenities found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAmenities.map((amenity) => (
                <TableRow key={amenity.id}>
                  <TableCell className="font-medium">{amenity.name}</TableCell>
                  <TableCell><Badge variant="outline">{amenity.category}</Badge></TableCell>
                  <TableCell className="text-xl">{amenity.icon || '✨'}</TableCell>
                  <TableCell>{amenity.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={amenity.status === 'active' ? 'success' : 'muted'}>{amenity.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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

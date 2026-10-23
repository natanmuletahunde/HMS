"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Building } from "lucide-react";
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

export default function BuildingsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: rawBuildings, isLoading } = useQuery({
    queryKey: ["buildings", debouncedSearch],
    queryFn: () => apiFetch<any>(`/buildings?search=${debouncedSearch}`),
  });
  const buildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedBuildings,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(buildings, 5);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, setCurrentPage]);

  const { data: rawBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<any>("/branches"),
  });
  const branches: any[] = Array.isArray(rawBranches) ? rawBranches : (rawBranches?.data ?? []);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/buildings/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/buildings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: editItem ? "Building updated" : "Building added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/buildings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "Building deleted" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate(Object.fromEntries(fd));
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Buildings</h2>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search buildings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[250px]"
          />
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Building</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Building" : "Add Building"}</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label>Branch</Label>
                  <Select name="branchId" defaultValue={editItem?.branchId || (branches.length === 1 ? branches[0].id : undefined)} required>
                    <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.branchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Building Name</Label>
                  <Input name="buildingName" defaultValue={editItem?.buildingName} required />
                </div>
                <div className="grid gap-2">
                  <Label>Building Code</Label>
                  <Input name="buildingCode" defaultValue={editItem?.buildingCode} required />
                </div>
                <div className="grid gap-2">
                  <Label>Number of Floors</Label>
                  <Input name="numberOfFloors" type="number" defaultValue={editItem?.numberOfFloors} required />
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
              <TableHead>Building Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Floors</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : buildings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                  <Building className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No buildings found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBuildings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.buildingName}</TableCell>
                  <TableCell>{b.buildingCode}</TableCell>
                  <TableCell>{branches.find((br: any) => br.id === b.branchId)?.branchName || b.branchId}</TableCell>
                  <TableCell>{b.numberOfFloors}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === 'active' ? 'success' : 'muted'}>{b.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditItem(b); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(b.id)}>Delete</DropdownMenuItem>
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

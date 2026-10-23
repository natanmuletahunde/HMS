"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Building, Search } from "lucide-react";
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

export function BuildingsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
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
  const allBuildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);

  const { data: rawBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<any>("/branches"),
  });
  const branches: any[] = Array.isArray(rawBranches) ? rawBranches : (rawBranches?.data ?? []);

  const buildings = branchFilter === "all"
    ? allBuildings
    : allBuildings.filter((b: any) => b.branchId === branchFilter);

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
  }, [debouncedSearch, branchFilter, setCurrentPage]);

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Buildings</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Input 
            placeholder="Search buildings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[180px] border-[var(--border)] bg-[var(--surface)]"
          />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px] border-[var(--border)] bg-[var(--surface)]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.branchName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
                <Plus className="mr-2 h-4 w-4" /> Add Building
              </Button>
            </DialogTrigger>
            <DialogContent className="border-[var(--border)] bg-[var(--surface)]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                  {editItem ? "Edit Building" : "Add Building"}
                </DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Branch</Label>
                  <Select name="branchId" defaultValue={editItem?.branchId || (branches.length === 1 ? branches[0].id : undefined)} required>
                    <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.branchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Building Name</Label>
                  <Input name="buildingName" defaultValue={editItem?.buildingName} required className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Building Code</Label>
                  <Input name="buildingCode" defaultValue={editItem?.buildingCode} required className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Total Floors</Label>
                  <Input name="totalFloors" type="number" defaultValue={editItem?.totalFloors} className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Building
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Building Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Branch</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Building Code</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Floors</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : buildings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-[var(--text-secondary)]">
                  <Building className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No buildings found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBuildings.map((bldg) => {
                const branch = branches.find((b: any) => b.id === bldg.branchId);
                return (
                  <TableRow key={bldg.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                    <TableCell className="font-semibold text-[var(--text-primary)]">{bldg.buildingName}</TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{branch?.branchName || '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{bldg.buildingCode}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{bldg.totalFloors || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                          <DropdownMenuItem onClick={() => { setEditItem(bldg); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(bldg.id)}>Delete</DropdownMenuItem>
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

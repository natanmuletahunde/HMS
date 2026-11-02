"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Layers } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
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

export function FloorsTab() {
  const { user, hasPermission } = useAuth();
  const isGlobal =
    user?.roleName === "Admin" ||
    user?.roleName === "System Admin" ||
    user?.roleScope === "global";

  const canManageFloors =
    isGlobal ||
    hasPermission("*") ||
    hasPermission("hotel:*") ||
    hasPermission("rooms:*");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>("all");
  const [modalBuildingId, setModalBuildingId] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: rawFloors, isLoading } = useQuery({
    queryKey: ["floors", debouncedSearch, selectedBuildingFilter],
    queryFn: () => {
      let url = `/floors?search=${debouncedSearch}`;
      if (selectedBuildingFilter !== "all") {
        url += `&buildingId=${selectedBuildingFilter}`;
      }
      return apiFetch<any>(url);
    },
  });
  const allFloors: any[] = Array.isArray(rawFloors) ? rawFloors : (rawFloors?.data ?? []);

  const { data: rawBuildings } = useQuery({
    queryKey: ["buildings"],
    queryFn: () => apiFetch<any>("/buildings"),
  });
  const allBuildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);

  const allowedBranchIds = isGlobal
    ? null
    : new Set(
        user?.branches?.map((b) => b.id) ||
        [user?.activeBranchId, user?.primaryBranchId].filter(Boolean)
      );

  const accessibleBuildings: any[] = isGlobal
    ? allBuildings
    : allBuildings.filter((b: any) => allowedBranchIds?.has(b.branchId));

  const scopedBuildingIds = isGlobal ? null : new Set(accessibleBuildings.map((b: any) => b.id));

  const scopedFloors = isGlobal
    ? allFloors
    : allFloors.filter((f: any) => scopedBuildingIds?.has(f.buildingId));

  const floors = selectedBuildingFilter === "all"
    ? scopedFloors
    : scopedFloors.filter((f: any) => f.buildingId === selectedBuildingFilter);

  const {
    paginatedItems: paginatedFloors,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(floors, 5);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/floors/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/floors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floors"] });
      toast({ title: editItem ? "Floor updated" : "Floor added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/floors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floors"] });
      toast({ title: "Floor deleted" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const bId = modalBuildingId || fd.get("buildingId")?.toString();
    if (!bId) {
      toast({ title: "Error", description: "Please select a building", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      buildingId: bId,
      floorName: fd.get("floorName")?.toString(),
      floorNumber: Number(fd.get("floorNumber")),
      description: fd.get("description")?.toString() || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Floors</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Input 
            placeholder="Search floors..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[180px] border-[var(--border)] bg-[var(--surface)]"
          />
          <Select value={selectedBuildingFilter} onValueChange={setSelectedBuildingFilter}>
            <SelectTrigger className="w-[180px] border-[var(--border)] bg-[var(--surface)]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
              <SelectItem value="all">All Buildings</SelectItem>
              {accessibleBuildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageFloors && accessibleBuildings.length > 0 && (
            <Dialog open={isAddOpen} onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) {
                setEditItem(null);
                setModalBuildingId("");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
                  <Plus className="mr-2 h-4 w-4" /> Add Floor
                </Button>
              </DialogTrigger>
              <DialogContent className="border-[var(--border)] bg-[var(--surface)]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                    {editItem ? "Edit Floor" : "Add Floor"}
                  </DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Building</Label>
                    <Select 
                      name="buildingId" 
                      value={modalBuildingId || editItem?.buildingId || accessibleBuildings[0]?.id}
                      onValueChange={(val) => setModalBuildingId(val)}
                      disabled={!isGlobal && accessibleBuildings.length <= 1}
                      required
                    >
                      <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                        <SelectValue placeholder="Select Building" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                        {accessibleBuildings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isGlobal && accessibleBuildings.length <= 1 && (
                      <input type="hidden" name="buildingId" value={modalBuildingId || editItem?.buildingId || accessibleBuildings[0]?.id || ""} />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Floor Name</Label>
                    <Input name="floorName" defaultValue={editItem?.floorName} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Floor Number</Label>
                    <Input name="floorNumber" type="number" defaultValue={editItem?.floorNumber ?? 1} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Description</Label>
                    <Input name="description" defaultValue={editItem?.description} className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Floor
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Building</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Floor Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Floor Number</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Description</TableHead>
              {canManageFloors && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={canManageFloors ? 5 : 4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : floors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageFloors ? 5 : 4} className="h-48 text-center text-[var(--text-secondary)]">
                  <Layers className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No floors found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedFloors.map((floor) => {
                const bldg = allBuildings.find((b) => b.id === floor.buildingId);
                return (
                  <TableRow key={floor.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                    <TableCell className="font-medium text-[var(--text-primary)]">{bldg?.buildingName || '-'}</TableCell>
                    <TableCell className="font-semibold text-[var(--text-primary)]">{floor.floorName}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{floor.floorNumber}</TableCell>
                    <TableCell className="text-[var(--text-secondary)]">{floor.description || '-'}</TableCell>
                    {canManageFloors && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                            <DropdownMenuItem onClick={() => { setEditItem(floor); setModalBuildingId(floor.buildingId); setIsAddOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(floor.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
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

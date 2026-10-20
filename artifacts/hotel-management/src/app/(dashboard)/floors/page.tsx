"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, Layers } from "lucide-react";
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

export default function FloorsPage() {
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
  const floors: any[] = Array.isArray(rawFloors) ? rawFloors : (rawFloors?.data ?? []);
  const {
    paginatedItems: paginatedFloors,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(floors, 5);

  const { data: rawBuildings } = useQuery({
    queryKey: ["buildings"],
    queryFn: () => apiFetch<any>("/buildings"),
  });
  const buildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);

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

  const selectedBuildingObj = buildings.find((b: any) => b.id === selectedBuildingFilter);

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold tracking-tight text-text-muted uppercase">Hotel Setup / Floors</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Floors</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Input 
            placeholder="Search floors..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[180px]"
          />
          <Select value={selectedBuildingFilter} onValueChange={setSelectedBuildingFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditItem(null);
            } else if (!editItem) {
              setModalBuildingId(selectedBuildingFilter !== "all" ? selectedBuildingFilter : (buildings[0]?.id || ""));
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Floor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Floor" : "Add Floor"}</DialogTitle>
              </DialogHeader>
              <form key={editItem?.id || "add-floor-form"} className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label>Building</Label>
                  <Select value={modalBuildingId} onValueChange={setModalBuildingId} required>
                    <SelectTrigger><SelectValue placeholder="Select Building" /></SelectTrigger>
                    <SelectContent>
                      {buildings.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Floor Name</Label>
                  <Input name="floorName" defaultValue={editItem?.floorName} placeholder="e.g. Ground Floor, Floor 1" required />
                </div>
                <div className="grid gap-2">
                  <Label>Floor Number</Label>
                  <Input name="floorNumber" type="number" defaultValue={editItem?.floorNumber ?? 1} placeholder="e.g. 1" required />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input name="description" defaultValue={editItem?.description} placeholder="e.g. Executive suites & lounge" />
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
              <TableHead>Floor Name</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" /></TableCell></TableRow>
            ) : floors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-text-muted">
                  <Layers className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>
                    {selectedBuildingObj 
                      ? `No floors found in ${selectedBuildingObj.buildingName}.` 
                      : "No floors found."}
                  </p>
                  {selectedBuildingObj && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        setEditItem(null);
                        setModalBuildingId(selectedBuildingFilter);
                        setIsAddOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Floor for {selectedBuildingObj.buildingName}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedFloors.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.floorName}</TableCell>
                  <TableCell>{f.floorNumber}</TableCell>
                  <TableCell>{f.buildingName || buildings.find((b: any) => b.id === f.buildingId)?.buildingName || f.buildingId}</TableCell>
                  <TableCell>
                    <Badge variant={f.status === 'active' ? 'success' : 'muted'}>{f.status || 'Active'}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { 
                          setEditItem(f); 
                          setModalBuildingId(f.buildingId);
                          setIsAddOpen(true); 
                        }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(f.id)}>Delete</DropdownMenuItem>
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

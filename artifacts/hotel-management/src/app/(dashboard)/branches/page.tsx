"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, GitBranch } from "lucide-react";
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

export default function BranchesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Simple debounce effect
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: rawBranches, isLoading } = useQuery({
    queryKey: ["branches", debouncedSearch],
    queryFn: () => apiFetch<any>(`/branches?search=${debouncedSearch}`),
  });

  const branches: any[] = Array.isArray(rawBranches) ? rawBranches : (rawBranches?.data ?? []);

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedBranches,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(branches, 5);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, setCurrentPage]);

  const { data: hotels = [] } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel").then(h => Array.isArray(h) ? h : (h?.id ? [h] : [])),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/branches/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/branches", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: editItem ? "Branch updated" : "Branch added" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch deleted" });
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate(Object.fromEntries(fd));
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold tracking-tight text-text-muted uppercase">Hotel Setup / Branches</h1>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Branches</h2>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search branches..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[250px]"
          />
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditItem(null);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Branch</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit Branch" : "Add Branch"}</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-2">
                  <Label>Hotel</Label>
                  <Select name="hotelId" defaultValue={editItem?.hotelId || hotels[0]?.id} required>
                    <SelectTrigger><SelectValue placeholder="Select Hotel" /></SelectTrigger>
                    <SelectContent>
                      {hotels.map((h: any) => (
                        <SelectItem key={h.id} value={h.id}>{h.hotelName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Branch Name</Label>
                  <Input name="branchName" defaultValue={editItem?.branchName} required />
                </div>
                <div className="grid gap-2">
                  <Label>Branch Code</Label>
                  <Input name="branchCode" defaultValue={editItem?.branchCode} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Manager</Label>
                    <Input name="manager" defaultValue={editItem?.manager} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input name="phone" defaultValue={editItem?.phone} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" defaultValue={editItem?.email} />
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input name="address" defaultValue={editItem?.address} />
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
              <TableHead>Branch Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-text-muted">
                  <GitBranch className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No branches found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBranches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.branchName}</TableCell>
                  <TableCell>{branch.branchCode}</TableCell>
                  <TableCell>{branch.manager || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <div className="truncate">{branch.email}</div>
                    <div className="text-text-muted">{branch.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.status === 'active' ? 'success' : 'muted'}>
                      {branch.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(branch)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(branch.id)}>Delete</DropdownMenuItem>
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

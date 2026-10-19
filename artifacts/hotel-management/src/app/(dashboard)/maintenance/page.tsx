"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type MaintenanceRequest = {
  id: string;
  requestNumber: string;
  roomId?: string;
  roomNumber?: string;
  category?: string;
  categoryName?: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  reportedBy?: string;
  notes?: string;
  createdAt?: string;
};

type MaintenanceDashboard = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
};

type MaintenanceCategory = { id: string; name: string };
type Room = { id: string; roomNumber?: string; number?: string; roomName?: string };

const STATUS_TABS = ["all", "pending", "approved", "assigned", "in_progress", "under_inspection", "completed"] as const;
const STATUS_TAB_LABELS: Record<string, string> = {
  all: "All",
  pending: "1. Requested / Pending",
  approved: "2. Approved",
  assigned: "3. Assigned",
  in_progress: "4. In Repair",
  under_inspection: "5. Inspection",
  completed: "6. Completed",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "muted",
  approved: "secondary",
  assigned: "secondary",
  in_progress: "warning",
  waiting_parts: "info",
  under_inspection: "info",
  inspected: "info",
  completed: "success",
  rejected: "danger",
  cancelled: "danger",
};

const PRIORITY_BADGE: Record<string, string> = {
  low: "muted",
  medium: "secondary",
  high: "warning",
  critical: "danger",
};

export default function MaintenancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<MaintenanceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [inspectItem, setInspectItem] = useState<MaintenanceRequest | null>(null);
  const [inspectNotes, setInspectNotes] = useState("");

  const queryParams = new URLSearchParams({
    ...(statusTab !== "all" ? { status: statusTab } : {}),
    ...(search ? { search } : {}),
    ...(priority !== "all" ? { priority } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<MaintenanceDashboard>({
    queryKey: ["maintenance-dashboard"],
    queryFn: () => apiFetch<MaintenanceDashboard>("/maintenance/dashboard"),
  });

  const { data: requests = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ["maintenance", statusTab, search, priority, categoryFilter],
    queryFn: () => apiFetch<MaintenanceRequest[]>(`/maintenance?${queryParams}`),
  });

  const { data: categories = [] } = useQuery<MaintenanceCategory[]>({
    queryKey: ["maintenance-categories"],
    queryFn: () => apiFetch<MaintenanceCategory[]>("/maintenance/categories"),
  });

  const { data: rawRooms } = useQuery<any>({
    queryKey: ["rooms-list"],
    queryFn: () => apiFetch<any>("/rooms"),
  });
  const rooms: Room[] = Array.isArray(rawRooms)
    ? rawRooms
    : Array.isArray(rawRooms?.data)
      ? rawRooms.data
      : [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    queryClient.invalidateQueries({ queryKey: ["maintenance-dashboard"] });
  }

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: "Request updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const inspectMutation = useMutation({
    mutationFn: ({ requestId, result, notes }: { requestId: string; result: "passed" | "failed"; notes?: string }) =>
      apiFetch(`/maintenance/inspections`, {
        method: "POST",
        body: JSON.stringify({ requestId, result, notes }),
      }),
    onSuccess: () => {
      invalidate();
      setInspectItem(null);
      setInspectNotes("");
      toast({ title: "Inspection recorded successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/maintenance", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsNewOpen(false); toast({ title: "Request created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statCards = [
    { label: "Total", value: dashboard?.total, color: "text-primary" },
    { label: "Pending", value: dashboard?.pending, color: "text-warning" },
    { label: "In Progress", value: dashboard?.inProgress, color: "text-info" },
    { label: "Completed", value: dashboard?.completed, color: "text-success" },
  ];

  function handleRejectSubmit() {
    if (!rejectItem) return;
    patchMutation.mutate({ id: rejectItem.id, body: { status: "rejected", rejectionReason: rejectReason } });
    setRejectItem(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-surface/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {dashLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusTab(s)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              statusTab === s ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {STATUS_TAB_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search requests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px]"
        />
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-text-muted">No requests found.</TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{req.requestNumber}</TableCell>
                  <TableCell>{req.roomNumber ?? "—"}</TableCell>
                  <TableCell>{req.categoryName ?? req.category ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{req.title}</TableCell>
                  <TableCell>
                    <Badge variant={(PRIORITY_BADGE[req.priority] ?? "muted") as any} className="text-[10px] uppercase">
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(STATUS_BADGE[req.status] ?? "muted") as any} className="text-[10px] uppercase">
                      {req.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{req.assignedToName ?? req.assignedTo ?? "—"}</TableCell>
                  <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    {req.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-success mx-auto" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {req.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "approved" } })}>1→2. Approve Request</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setRejectItem(req)}>Reject</DropdownMenuItem>
                            </>
                          )}
                          {req.status === "approved" && (
                            <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "assigned" } })}>2→3. Assign Technician</DropdownMenuItem>
                          )}
                          {req.status === "assigned" && (
                            <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "in_progress" } })}>3→4. Start Repair</DropdownMenuItem>
                          )}
                          {req.status === "in_progress" && (
                            <>
                              <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "under_inspection" } })}>4→5. Submit for Inspection</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "waiting_parts" } })}>Waiting Parts</DropdownMenuItem>
                            </>
                          )}
                          {req.status === "waiting_parts" && (
                            <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "in_progress" } })}>Resume Repair</DropdownMenuItem>
                          )}
                          {req.status === "under_inspection" && (
                            <DropdownMenuItem onClick={() => { setInspectItem(req); setInspectNotes(""); }}>5→6. Conduct Inspection</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Request Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Maintenance Request</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            createMutation.mutate(body);
          }}>
            <div className="grid gap-1.5">
              <Label>Room (optional)</Label>
              <select name="roomId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">Select Room</option>
                {(rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.roomNumber ?? r.number ?? r.roomName ?? r.id}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Category *</Label>
              <select name="categoryId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Title *</Label>
              <Input name="title" required placeholder="Brief description" />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <textarea name="description" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <select name="priority" defaultValue="medium" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Reported By</Label>
                <Input name="reportedBy" placeholder="Staff name" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectItem} onOpenChange={(o) => !o && setRejectItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Rejection Reason</Label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectItem(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleRejectSubmit}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6-Stage Pipeline: Inspection Sign-off Dialog */}
      <Dialog open={!!inspectItem} onOpenChange={(o) => !o && setInspectItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stage 5 &bull; Quality Inspection Sign-off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Request: <span className="font-semibold text-text">{inspectItem?.title}</span> (#{inspectItem?.requestNumber})
              <br />
              Room: <span className="font-semibold text-text">{inspectItem?.roomNumber ?? "General Facility"}</span>
            </p>
            <div className="grid gap-1.5">
              <Label>Supervisor / Inspector Findings</Label>
              <textarea
                rows={3}
                value={inspectNotes}
                onChange={(e) => setInspectNotes(e.target.value)}
                placeholder="Notes regarding repair quality, test run, or parts replaced..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-warning/50 text-warning hover:bg-warning/10"
                disabled={inspectMutation.isPending}
                onClick={() => {
                  if (!inspectItem) return;
                  inspectMutation.mutate({
                    requestId: inspectItem.id,
                    result: "failed",
                    notes: inspectNotes || "Failed inspection - rework required",
                  });
                }}
              >
                Failed (Return to Repair)
              </Button>
              <Button
                className="flex-1 bg-success hover:bg-success/90 text-white"
                disabled={inspectMutation.isPending}
                onClick={() => {
                  if (!inspectItem) return;
                  inspectMutation.mutate({
                    requestId: inspectItem.id,
                    result: "passed",
                    notes: inspectNotes || "Passed inspection - approved for room release",
                  });
                }}
              >
                {inspectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pass & Complete (Stage 6)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal, CheckCircle, Wrench, UserCheck, Pencil, Phone, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

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
  assignedToId?: string;
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
  const [assignItem, setAssignItem] = useState<MaintenanceRequest | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("9612a8e6-0b0c-48af-b5db-3c5a60486565");
  const [assignNotes, setAssignNotes] = useState("");

  const { data: rawUsers } = useQuery<any>({
    queryKey: ["users-technicians-list"],
    queryFn: () => apiFetch<any>("/users?limit=50").catch(() => []),
  });
  const usersList: any[] = Array.isArray(rawUsers)
    ? rawUsers
    : Array.isArray(rawUsers?.data)
      ? rawUsers.data
      : [];

  const maintenanceStaff = usersList.filter(
    (u: any) =>
      u.roleName?.toLowerCase().includes("maintenance") ||
      u.role?.toLowerCase().includes("maintenance") ||
      u.email?.includes("tech") ||
      u.email?.includes("maintenance")
  );

  const fallbackTechs = [
    { id: "9612a8e6-0b0c-48af-b5db-3c5a60486565", firstName: "Dawit", lastName: "Mekonnen", email: "maintenance@nexushms.com", phone: "+251-911-500600" },
    { id: "5962537a-02ca-4e16-921b-53da7e0bf626", firstName: "Abebe", lastName: "Kebede", email: "tech.plumber@nexushms.com", phone: "+251-911-550001" },
    { id: "49777ffb-1b76-4ff9-b1f0-93d67da97835", firstName: "Kassahun", lastName: "Desta", email: "tech.electric@nexushms.com", phone: "+251-911-550002" },
    { id: "14961c14-5870-427b-b1db-b8d32660b02b", firstName: "Tewodros", lastName: "Tsegaye", email: "tech.hvac@nexushms.com", phone: "+251-911-550003" },
    { id: "155da388-e6cc-46c4-a7d5-16b2d4084bd9", firstName: "Almaz", lastName: "Haile", email: "tech.carpenter@nexushms.com", phone: "+251-911-550004" },
  ];

  const availableTechnicians = (maintenanceStaff.length > 0 ? maintenanceStaff : fallbackTechs).map((u: any) => {
    let specialty = "Maintenance Technician";
    if (u.email?.includes("plumber")) specialty = "Plumbing & Fixture Specialist";
    else if (u.email?.includes("electric")) specialty = "Senior Electrical Specialist";
    else if (u.email?.includes("hvac")) specialty = "HVAC & Air Conditioning Specialist";
    else if (u.email?.includes("carpenter")) specialty = "Carpentry & Finishing Specialist";
    else if (u.email?.includes("maintenance")) specialty = "Lead Maintenance Officer";

    return {
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      role: specialty,
      phone: u.phone || "+251-911-500000",
      email: u.email,
    };
  });

  function openAssignModal(req: MaintenanceRequest) {
    setAssignItem(req);
    setSelectedWorkerId(req.assignedToId || availableTechnicians[0]?.id || "9612a8e6-0b0c-48af-b5db-3c5a60486565");
    setAssignNotes(req.notes || "");
  }

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

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedRequests,
    onPrev,
    onNext,
  } = usePagination(requests, 5);

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
              paginatedRequests.map((req) => (
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
                    {req.status === "approved" ? (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        APPROVED (TO ASSIGN)
                      </Badge>
                    ) : (
                      <Badge variant={(STATUS_BADGE[req.status] ?? "muted") as any} className="text-[10px] uppercase">
                        {req.status.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.assignedToName ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-foreground flex items-center gap-1.5 bg-surface px-2 py-1 rounded border border-border">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                          <span className="truncate max-w-[120px]">{req.assignedToName}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-text-muted hover:text-foreground"
                          title="Reassign Technician"
                          onClick={() => openAssignModal(req)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (req.status === "approved" || req.status === "assigned" || req.status === "pending") ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2.5 font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-xs"
                        onClick={() => openAssignModal(req)}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assign Worker
                      </Button>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </TableCell>
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
                              <DropdownMenuItem onClick={() => openAssignModal(req)}>
                                <UserCheck className="mr-2 h-3.5 w-3.5 text-primary" />
                                1. Approve & Assign Technician
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "approved" } })}>
                                Quick Approve Request
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setRejectItem(req)}>Reject</DropdownMenuItem>
                            </>
                          )}
                          {(req.status === "approved" || req.status === "assigned") && (
                            <>
                              <DropdownMenuItem onClick={() => openAssignModal(req)}>
                                <UserCheck className="mr-2 h-3.5 w-3.5 text-primary" />
                                {req.assignedToName ? "Reassign Worker" : "2→3. Assign Worker"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "in_progress" } })}>
                                3→4. Start Repair
                              </DropdownMenuItem>
                            </>
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
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
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

      {/* Assign Worker Dialog */}
      <Dialog open={!!assignItem} onOpenChange={(o) => !o && setAssignItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div>Assign Technician to Work Order</div>
                <p className="text-xs font-normal text-text-muted">
                  Select a certified technician from engineering to dispatch this repair
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {assignItem && (() => {
            const currentSelectedTech = availableTechnicians.find((t) => t.id === selectedWorkerId) || availableTechnicians[0];
            const initials = currentSelectedTech?.name
              ? currentSelectedTech.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "TC";

            return (
              <form
                className="space-y-4 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  patchMutation.mutate({
                    id: assignItem.id,
                    body: {
                      status: "assigned",
                      assignedToId: selectedWorkerId,
                      notes: assignNotes
                        ? `${assignItem.notes ? assignItem.notes + " | " : ""}${assignNotes}`
                        : assignItem.notes,
                    },
                  });
                  toast({
                    title: "Technician Dispatched",
                    description: `Assigned ${currentSelectedTech?.name} to Work Order ${assignItem.requestNumber}.`,
                  });
                  setAssignItem(null);
                  setAssignNotes("");
                }}
              >
                {/* Work Order Info Box */}
                <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                      {assignItem.requestNumber}
                    </span>
                    <Badge variant={(PRIORITY_BADGE[assignItem.priority] ?? "muted") as any} className="text-[10px] uppercase">
                      {assignItem.priority} Priority
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{assignItem.title}</h4>
                    {assignItem.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{assignItem.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted pt-1 border-t border-border/60">
                    <div>Room: <strong className="text-foreground">{assignItem.roomNumber ?? "General Facility"}</strong></div>
                    {assignItem.categoryName && (
                      <div>Category: <strong className="text-foreground">{assignItem.categoryName}</strong></div>
                    )}
                  </div>
                </div>

                {/* Technician Dropdown Selector */}
                <div className="grid gap-2">
                  <Label htmlFor="technician-select" className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Assigned Technician / Specialist *
                  </Label>
                  <select
                    id="technician-select"
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer transition-colors"
                    required
                  >
                    {availableTechnicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Preview Card for Selected Technician */}
                {currentSelectedTech && (
                  <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{currentSelectedTech.name}</div>
                        <div className="text-xs text-text-muted">{currentSelectedTech.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available / On Duty
                      </span>
                      {currentSelectedTech.phone && (
                        <div className="text-[11px] text-text-muted font-mono mt-0.5 flex items-center justify-end gap-1">
                          <Phone className="w-3 h-3 text-text-muted" />
                          {currentSelectedTech.phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Instructions Textarea */}
                <div className="grid gap-1.5">
                  <Label htmlFor="assignNotes" className="text-xs font-medium">
                    Special Instructions / Tools Required (Optional)
                  </Label>
                  <textarea
                    id="assignNotes"
                    rows={3}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="e.g. Inspect AC sensor and carry thermal multimeter. Room keycard available at front desk."
                    className="flex w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Modal Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setAssignItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={patchMutation.isPending}>
                    {patchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Confirm & Dispatch
                  </Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

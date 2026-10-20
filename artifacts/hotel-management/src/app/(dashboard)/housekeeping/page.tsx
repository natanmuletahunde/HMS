"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal } from "lucide-react";
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

type HousekeepingTask = {
  id: string;
  taskNumber: string;
  roomId?: string;
  roomNumber?: string;
  areaType?: string;
  cleaningType: string;
  priority: string;
  assignedStaff?: string;
  scheduledDate?: string;
  status: string;
  notes?: string;
};

type HousekeepingDashboard = {
  todaysTasks: number;
  pending: number;
  inProgress: number;
  readyForInspection: number;
};

type Room = { id: string; roomNumber?: string; number?: string; roomName?: string };

const STATUS_TABS = ["all", "today", "pending", "in_progress", "ready_for_inspection", "completed"] as const;
const STATUS_TAB_LABELS: Record<string, string> = {
  all: "All",
  today: "Today",
  pending: "Pending",
  in_progress: "In Progress",
  ready_for_inspection: "Ready for Inspection",
  completed: "Completed",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "muted",
  assigned: "secondary",
  accepted: "secondary",
  in_progress: "warning",
  ready_for_inspection: "info",
  completed: "success",
  cancelled: "danger",
};

const PRIORITY_BADGE: Record<string, string> = {
  low: "muted",
  normal: "secondary",
  high: "warning",
  urgent: "danger",
};

export default function HousekeepingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [cleaningType, setCleaningType] = useState("all");
  const [priority, setPriority] = useState("all");

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editNotesTask, setEditNotesTask] = useState<HousekeepingTask | null>(null);
  const [rejectTask, setRejectTask] = useState<HousekeepingTask | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryParams = new URLSearchParams({
    ...(statusTab !== "all" && statusTab !== "today" ? { status: statusTab } : {}),
    ...(statusTab === "today" ? { date: new Date().toISOString().split("T")[0] } : {}),
    ...(search ? { search } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(cleaningType !== "all" ? { cleaningType } : {}),
    ...(priority !== "all" ? { priority } : {}),
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<HousekeepingDashboard>({
    queryKey: ["housekeeping-dashboard"],
    queryFn: () => apiFetch<HousekeepingDashboard>("/housekeeping/dashboard"),
  });

  const { data: tasks = [], isLoading } = useQuery<HousekeepingTask[]>({
    queryKey: ["housekeeping", statusTab, search, dateFilter, cleaningType, priority],
    queryFn: () => apiFetch<HousekeepingTask[]>(`/housekeeping?${queryParams}`),
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedTasks,
    onPrev,
    onNext,
  } = usePagination(tasks, 5);

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
    queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
    queryClient.invalidateQueries({ queryKey: ["housekeeping-dashboard"] });
  }

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/housekeeping/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: "Task updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/housekeeping", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsNewOpen(false); toast({ title: "Task created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statCards = [
    { label: "Today's Tasks", value: dashboard?.todaysTasks, color: "text-primary" },
    { label: "Pending", value: dashboard?.pending, color: "text-warning" },
    { label: "In Progress", value: dashboard?.inProgress, color: "text-info" },
    { label: "Ready for Inspection", value: dashboard?.readyForInspection, color: "text-success" },
  ];

  function handleStatusChange(task: HousekeepingTask, newStatus: string) {
    patchMutation.mutate({ id: task.id, body: { status: newStatus } });
  }

  function handleRejectSubmit() {
    if (!rejectTask) return;
    patchMutation.mutate({ id: rejectTask.id, body: { status: "pending", rejectionReason: rejectReason } });
    setRejectTask(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Housekeeping</h1>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Task
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
          placeholder="Search task or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px]"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-[150px]"
        />
        <Select value={cleaningType} onValueChange={setCleaningType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Cleaning Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="checkout">Checkout</SelectItem>
            <SelectItem value="deep">Deep</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task #</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Area Type</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
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
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-text-muted">No tasks found.</TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{task.taskNumber}</TableCell>
                  <TableCell>{task.roomNumber ?? "—"}</TableCell>
                  <TableCell className="capitalize">{task.areaType ?? "—"}</TableCell>
                  <TableCell className="capitalize">{task.cleaningType}</TableCell>
                  <TableCell>
                    <Badge variant={(PRIORITY_BADGE[task.priority] ?? "muted") as any} className="text-[10px] uppercase">
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.assignedStaff ?? "—"}</TableCell>
                  <TableCell>{task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(STATUS_BADGE[task.status] ?? "muted") as any} className="text-[10px] uppercase">
                      {task.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {task.status === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(task, "accepted")}>Accept</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditNotesTask(task)}>Assign</DropdownMenuItem>
                          </>
                        )}
                        {(task.status === "assigned" || task.status === "accepted") && (
                          <DropdownMenuItem onClick={() => handleStatusChange(task, "in_progress")}>Start</DropdownMenuItem>
                        )}
                        {task.status === "in_progress" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(task, "ready_for_inspection")}>Mark Ready</DropdownMenuItem>
                        )}
                        {task.status === "ready_for_inspection" && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(task, "completed")}>✓ Approve</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRejectTask(task)}>Reject</DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => setEditNotesTask(task)}>Edit Notes</DropdownMenuItem>
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

      {/* New Task Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Housekeeping Task</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            createMutation.mutate(body);
          }}>
            <div className="grid gap-1.5">
              <Label>Room</Label>
              <select name="roomId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">Select Room</option>
                {(rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.roomNumber ?? r.number ?? r.roomName ?? r.id}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Cleaning Type *</Label>
                <select name="cleaningType" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="daily">Daily</option>
                  <option value="checkout">Checkout</option>
                  <option value="deep">Deep</option>
                  <option value="emergency">Emergency</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <select name="priority" defaultValue="normal" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Scheduled Date</Label>
              <Input type="date" name="scheduledDate" />
            </div>
            <div className="grid gap-1.5">
              <Label>Staff (optional)</Label>
              <Input name="assignedStaff" placeholder="Staff name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <textarea name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editNotesTask} onOpenChange={(o) => !o && setEditNotesTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Notes</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!editNotesTask) return;
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            patchMutation.mutate({ id: editNotesTask.id, body });
            setEditNotesTask(null);
          }}>
            <div className="grid gap-1.5">
              <Label>Staff</Label>
              <Input name="assignedStaff" defaultValue={editNotesTask?.assignedStaff ?? ""} placeholder="Staff name" />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <textarea name="notes" rows={3} defaultValue={editNotesTask?.notes ?? ""} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTask} onOpenChange={(o) => !o && setRejectTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Task</DialogTitle></DialogHeader>
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
              <Button variant="outline" className="flex-1" onClick={() => setRejectTask(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleRejectSubmit}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Wine,
  ShieldCheck,
  Package,
  Sparkles,
  Minus,
} from "lucide-react";
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

type PreCheckoutInspection = {
  id: string;
  inspectionNumber: string;
  reservationId: string;
  roomId: string;
  roomNumber?: string;
  guestId: string;
  guestName?: string;
  guestPhone?: string;
  reservationNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  status: "pending" | "in_progress" | "cleared" | "issues_reported";
  minibarItems?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  minibarTotal: string | number;
  damageCharges: string | number;
  damageNotes?: string;
  assetsIntact: boolean;
  lostAndFoundFound: boolean;
  lostAndFoundNotes?: string;
  inspectedBy?: string;
  inspectedById?: string;
  inspectedAt?: string;
  notes?: string;
  createdAt: string;
};

const STANDARD_MINIBAR = [
  { id: "water", name: "Mineral Water (Still/Sparkling 500ml)", unitPrice: 3.0 },
  { id: "soda", name: "Soft Drink / Soda (Can)", unitPrice: 4.5 },
  { id: "beer", name: "Premium Craft Beer (Bottle)", unitPrice: 7.5 },
  { id: "wine", name: "House Wine (Mini Bottle)", unitPrice: 18.0 },
  { id: "snacks", name: "Gourmet Chocolates & Roasted Nuts", unitPrice: 6.0 },
];

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

  const [activeHubSection, setActiveHubSection] = useState<"tasks" | "inspections">("tasks");
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [cleaningType, setCleaningType] = useState("all");
  const [priority, setPriority] = useState("all");

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editNotesTask, setEditNotesTask] = useState<HousekeepingTask | null>(null);
  const [rejectTask, setRejectTask] = useState<HousekeepingTask | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Pre-checkout inspection modal state
  const [inspectingItem, setInspectingItem] = useState<PreCheckoutInspection | null>(null);
  const [minibarCounts, setMinibarCounts] = useState<Record<string, number>>({});
  const [assetsChecklist, setAssetsChecklist] = useState({
    tvAndElectronics: true,
    acAndClimate: true,
    linenAndTowels: true,
    bathroomFixtures: true,
    furnitureAndSafe: true,
  });
  const [damageCharges, setDamageCharges] = useState(0);
  const [damageNotes, setDamageNotes] = useState("");
  const [lostFoundFound, setLostFoundFound] = useState(false);
  const [lostFoundNotes, setLostFoundNotes] = useState("");
  const [inspectorName, setInspectorName] = useState("Housekeeping Staff");
  const [inspectionNotes, setInspectionNotes] = useState("");

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

  // Pre-Checkout Inspections Query & Mutations
  const { data: preCheckoutInspections = [], isLoading: pciLoading } = useQuery<PreCheckoutInspection[]>({
    queryKey: ["pre-checkout-inspections"],
    queryFn: () => apiFetch<PreCheckoutInspection[]>("/housekeeping/pre-checkout"),
    refetchInterval: 6000,
  });

  const pciPagination = usePagination(preCheckoutInspections, 6);

  const pendingPciCount = preCheckoutInspections.filter(
    (i) => i.status === "pending" || i.status === "in_progress"
  ).length;

  const submitInspectionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiFetch(`/housekeeping/pre-checkout/${id}/submit`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-checkout-inspections"] });
      setInspectingItem(null);
      toast({
        title: "✅ Inspection Saved & Cleared",
        description: "Room clearance recorded and charges automatically added to the guest folio.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to submit inspection", description: e.message, variant: "destructive" }),
  });

  const openInspectModal = (item: PreCheckoutInspection) => {
    setInspectingItem(item);
    const counts: Record<string, number> = {};
    STANDARD_MINIBAR.forEach((m) => {
      const found = item.minibarItems?.find((i) => i.name === m.name);
      counts[m.id] = found ? found.quantity : 0;
    });
    setMinibarCounts(counts);
    setAssetsChecklist({
      tvAndElectronics: item.assetsIntact ?? true,
      acAndClimate: item.assetsIntact ?? true,
      linenAndTowels: item.assetsIntact ?? true,
      bathroomFixtures: item.assetsIntact ?? true,
      furnitureAndSafe: item.assetsIntact ?? true,
    });
    setDamageCharges(Number(item.damageCharges || 0));
    setDamageNotes(item.damageNotes || "");
    setLostFoundFound(item.lostAndFoundFound || false);
    setLostFoundNotes(item.lostAndFoundNotes || "");
    setInspectorName(item.inspectedBy || "Housekeeping Staff");
    setInspectionNotes(item.notes || "");
  };

  const minibarTotal = STANDARD_MINIBAR.reduce(
    (sum, item) => sum + (minibarCounts[item.id] || 0) * item.unitPrice,
    0
  );

  const handleClearAndApprove = (markStatus: "cleared" | "in_progress" | "issues_reported") => {
    if (!inspectingItem) return;
    const items = STANDARD_MINIBAR.map((m) => ({
      name: m.name,
      quantity: minibarCounts[m.id] || 0,
      unitPrice: m.unitPrice,
      total: (minibarCounts[m.id] || 0) * m.unitPrice,
    }));
    const allAssetsIntact = Object.values(assetsChecklist).every(Boolean);

    submitInspectionMutation.mutate({
      id: inspectingItem.id,
      body: {
        status: markStatus,
        minibarItems: items,
        minibarTotal,
        damageCharges,
        damageNotes: damageCharges > 0 ? damageNotes : "",
        assetsIntact: allAssetsIntact,
        lostAndFoundFound: lostFoundFound,
        lostAndFoundNotes: lostFoundFound ? lostFoundNotes : "",
        inspectedBy: inspectorName || "Housekeeping Staff",
        notes: inspectionNotes,
      },
    });
  };

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Housekeeping Operations</h1>
          <p className="text-xs text-text-muted mt-1">
            Manage daily cleaning turnovers and pre-checkout room inspections (minibar, equipment & lost items).
          </p>
        </div>
        {activeHubSection === "tasks" && (
          <Button onClick={() => setIsNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        )}
      </div>

      {/* Top Section Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveHubSection("tasks")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeHubSection === "tasks"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <span>🧹 Cleaning & Turnover Tasks</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-muted text-text-muted">
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveHubSection("inspections")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeHubSection === "inspections"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> Pre-Checkout Room Clearance
          </span>
          {pendingPciCount > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white animate-pulse">
              {pendingPciCount} Pending
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-muted text-text-muted">
              {preCheckoutInspections.length}
            </span>
          )}
        </button>
      </div>

      {activeHubSection === "tasks" && (
        <>
          {/* Stat Cards (Standardized) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <Card key={s.label} className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
                <div className="text-xs font-medium text-text-muted truncate">{s.label}</div>
                <div className="mt-2">
                  {dashLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className={`text-2xl font-bold font-mono tracking-tight ${s.color}`}>{s.value ?? 0}</div>
                  )}
                </div>
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
                  statusTab === s
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
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
                      {[...Array(9)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-text-muted">
                      No tasks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{task.taskNumber}</TableCell>
                      <TableCell>{task.roomNumber ?? "—"}</TableCell>
                      <TableCell className="capitalize">{task.areaType ?? "—"}</TableCell>
                      <TableCell className="capitalize">{task.cleaningType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={(PRIORITY_BADGE[task.priority] ?? "muted") as any}
                          className="text-[10px] uppercase"
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.assignedStaff ?? "—"}</TableCell>
                      <TableCell>
                        {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(STATUS_BADGE[task.status] ?? "muted") as any}
                          className="text-[10px] uppercase"
                        >
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
                                <DropdownMenuItem onClick={() => handleStatusChange(task, "accepted")}>
                                  Accept
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditNotesTask(task)}>
                                  Assign
                                </DropdownMenuItem>
                              </>
                            )}
                            {(task.status === "assigned" || task.status === "accepted") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(task, "in_progress")}>
                                Start
                              </DropdownMenuItem>
                            )}
                            {task.status === "in_progress" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(task, "ready_for_inspection")}>
                                Mark Ready
                              </DropdownMenuItem>
                            )}
                            {task.status === "ready_for_inspection" && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(task, "completed")}>
                                  ✓ Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRejectTask(task)}>Reject</DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setEditNotesTask(task)}>
                              Edit Notes
                            </DropdownMenuItem>
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
        </>
      )}

      {/* Pre-Checkout Inspections Tab */}
      {activeHubSection === "inspections" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
              <div className="text-xs font-medium text-text-muted truncate">Total Inspections</div>
              <div className="mt-2 text-2xl font-bold font-mono tracking-tight">{preCheckoutInspections.length}</div>
            </Card>
            <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
              <div className="text-xs font-medium text-text-muted truncate">Awaiting Inspection</div>
              <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-amber-500">{pendingPciCount}</div>
            </Card>
            <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
              <div className="text-xs font-medium text-text-muted truncate">Cleared & Approved</div>
              <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-emerald-500">
                {preCheckoutInspections.filter((i) => i.status === "cleared").length}
              </div>
            </Card>
            <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
              <div className="text-xs font-medium text-text-muted truncate">Issues / Folio Charges</div>
              <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-rose-500">
                {preCheckoutInspections.filter((i) => i.status === "issues_reported").length}
              </div>
            </Card>
          </div>

          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection #</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Guest / Res #</TableHead>
                  <TableHead>Minibar Charges</TableHead>
                  <TableHead>Assets Status</TableHead>
                  <TableHead>Lost & Found</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pciLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : preCheckoutInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-text-muted">
                      No pre-checkout inspections currently requested.
                    </TableCell>
                  </TableRow>
                ) : (
                  pciPagination.paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{item.inspectionNumber}</TableCell>
                      <TableCell className="font-semibold text-primary">{item.roomNumber ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{item.guestName || "Guest"}</div>
                        <div className="font-mono text-xs text-text-muted">{item.reservationNumber ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-text">
                          ${Number(item.minibarTotal || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.assetsIntact ? (
                          <Badge variant="success" className="text-[10px]">
                            All Intact
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">
                            Damage (${Number(item.damageCharges || 0).toFixed(2)})
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.lostAndFoundFound ? (
                          <Badge variant="warning" className="text-[10px]">
                            Items Found
                          </Badge>
                        ) : (
                          <span className="text-text-muted text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === "pending" ? (
                          <Badge variant="warning" className="text-[10px]">
                            Pending
                          </Badge>
                        ) : item.status === "in_progress" ? (
                          <Badge variant="info" className="text-[10px]">
                            In Progress
                          </Badge>
                        ) : item.status === "cleared" ? (
                          <Badge variant="success" className="text-[10px]">
                            Cleared
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">
                            Issues Reported
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => openInspectModal(item)}
                          className={`gap-1.5 text-xs ${
                            item.status === "pending" || item.status === "in_progress"
                              ? "bg-primary text-white"
                              : "bg-surface border border-border text-text hover:bg-muted"
                          }`}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          {item.status === "cleared" ? "View Clearance" : "Inspect Room"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={pciPagination.currentPage}
              totalPages={pciPagination.totalPages}
              totalItems={pciPagination.totalItems}
              pageSize={6}
              onPrev={pciPagination.onPrev}
              onNext={pciPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* Inspect & Clear Room Dialog */}
      <Dialog open={!!inspectingItem} onOpenChange={(o) => !o && setInspectingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Pre-Checkout Room Inspection & Clearance
            </DialogTitle>
          </DialogHeader>

          {inspectingItem && (
            <div className="space-y-5 py-1">
              {/* Header Info */}
              <div className="rounded-lg bg-surface/70 border border-border p-3 flex flex-wrap items-center justify-between text-xs gap-3">
                <div>
                  <span className="text-text-muted">Room: </span>
                  <span className="font-bold text-base text-primary">{inspectingItem.roomNumber}</span>
                </div>
                <div>
                  <span className="text-text-muted">Guest: </span>
                  <span className="font-medium text-text">{inspectingItem.guestName || "In-House Guest"}</span>
                </div>
                <div>
                  <span className="text-text-muted">Res #: </span>
                  <span className="font-mono font-medium text-text">{inspectingItem.reservationNumber}</span>
                </div>
                <div>
                  <Badge
                    variant={
                      inspectingItem.status === "cleared"
                        ? "success"
                        : inspectingItem.status === "issues_reported"
                        ? "danger"
                        : "warning"
                    }
                    className="text-[10px] uppercase"
                  >
                    Status: {inspectingItem.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Minibar Inventory Section */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Wine className="h-4 w-4 text-primary" />
                    <span>1. Minibar Consumption Count</span>
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    Minibar Total: ${minibarTotal.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {STANDARD_MINIBAR.map((item) => {
                    const count = minibarCounts[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 border border-border/50"
                      >
                        <div>
                          <div className="font-medium text-text">{item.name}</div>
                          <div className="text-[11px] text-text-muted">${item.unitPrice.toFixed(2)} each</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              setMinibarCounts((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                              }))
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold text-sm">{count}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              setMinibarCounts((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1,
                              }))
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="w-16 text-right font-medium text-text">
                            ${(count * item.unitPrice).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Assets & Equipment Integrity */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>2. Room Assets & Equipment Checklist</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { key: "tvAndElectronics", label: "Smart TV, Cable Box & Remote Control Intact" },
                    { key: "acAndClimate", label: "AC, Climate Thermostat & Lighting Working" },
                    { key: "linenAndTowels", label: "Bed Linen, Duvet & Bathrobes Accounted For" },
                    { key: "bathroomFixtures", label: "Shower, Plumbing & Bathroom Fixtures Undamaged" },
                    { key: "furnitureAndSafe", label: "Furniture, Desk, Mirror & Safe Working" },
                  ].map((chk) => (
                    <label
                      key={chk.key}
                      className="flex items-center gap-2 p-2 rounded border border-border/50 hover:bg-muted/20 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(assetsChecklist as any)[chk.key]}
                        onChange={(e) =>
                          setAssetsChecklist((prev) => ({ ...prev, [chk.key]: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{chk.label}</span>
                    </label>
                  ))}
                </div>

                {/* If assets are missing or damaged */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-text">Damage / Incidentals Charge ($)</Label>
                    <span className="text-[11px] text-text-muted">Added directly to guest folio if &gt; $0</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={damageCharges || ""}
                      onChange={(e) => setDamageCharges(Number(e.target.value) || 0)}
                      className="col-span-1"
                    />
                    <Input
                      placeholder="Describe damage (e.g. Broken lamp shade, missing towel)"
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      className="col-span-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Lost & Found Check */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Package className="h-4 w-4 text-amber-500" />
                    <span>3. Lost & Found (Forgotten Guest Belongings)</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lostFoundFound}
                    onChange={(e) => setLostFoundFound(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-amber-500"
                  />
                  <span>Guest left items behind in the room</span>
                </label>
                {lostFoundFound && (
                  <Input
                    placeholder="Enter forgotten items details (e.g., iPhone charger on bedside table, sunglasses in safe)"
                    value={lostFoundNotes}
                    onChange={(e) => setLostFoundNotes(e.target.value)}
                    className="text-xs"
                  />
                )}
              </div>

              {/* Inspector Sign-off */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="grid gap-1.5">
                  <Label>Housekeeper / Inspector Name</Label>
                  <Input
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Inspector name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Inspection Notes (Optional)</Label>
                  <Input
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="General room inspection remarks"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInspectingItem(null)}
                  disabled={submitInspectionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleClearAndApprove("in_progress")}
                  disabled={submitInspectionMutation.isPending}
                >
                  Save as In-Progress
                </Button>
                <Button
                  type="button"
                  onClick={() => handleClearAndApprove(damageCharges > 0 ? "issues_reported" : "cleared")}
                  disabled={submitInspectionMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                >
                  {submitInspectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4" />
                  Clear & Approve Room for Checkout
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

"use client";

import { useState, useEffect } from "react";
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

type RoomServiceRequest = {
  id: string;
  requestNumber: string;
  roomNumber?: string;
  guestName?: string;
  serviceType: string;
  department?: string;
  priority: string;
  status: string;
  description?: string;
  specialInstructions?: string;
  chargeAmount?: number;
  chargeToRoom?: boolean;
  requestedAt?: string;
  createdAt?: string;
};

type RoomServiceDashboard = {
  total: number;
  requested: number;
  inProgress: number;
  completed: number;
};

const SERVICE_TYPES = [
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "drinks", label: "Drinks", emoji: "🥤" },
  { value: "laundry", label: "Laundry", emoji: "👕" },
  { value: "spa", label: "Spa", emoji: "💆" },
  { value: "taxi", label: "Taxi", emoji: "🚗" },
  { value: "airport", label: "Airport Transfer", emoji: "🚗" },
  { value: "housekeeping", label: "Housekeeping", emoji: "🧹" },
  { value: "maintenance", label: "Maintenance", emoji: "🔧" },
  { value: "wake_up", label: "Wake-up Call", emoji: "⏰" },
  { value: "newspaper", label: "Newspaper", emoji: "📰" },
  { value: "luggage", label: "Luggage", emoji: "🧳" },
  { value: "tour", label: "Tour Info", emoji: "🗺️" },
  { value: "pharmacy", label: "Pharmacy", emoji: "💊" },
  { value: "other", label: "Other", emoji: "📋" },
];

function getServiceDisplay(type: string) {
  const found = SERVICE_TYPES.find(s => s.value === type);
  return found ? `${found.emoji} ${found.label}` : type;
}

const STATUS_TABS = ["all", "requested", "accepted", "in_progress", "completed"] as const;
const STATUS_TAB_LABELS: Record<string, string> = {
  all: "All",
  requested: "Requested",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_BADGE: Record<string, string> = {
  requested: "muted",
  accepted: "secondary",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

const DEPT_BADGE: Record<string, string> = {
  food_beverage: "warning",
  housekeeping: "info",
  maintenance: "secondary",
  concierge: "success",
  front_desk: "default",
};

const STATUS_TABS_TYPE = ["all", "requested", "accepted", "in_progress", "completed"] as const;
type StatusTabType = typeof STATUS_TABS_TYPE[number];

export default function RoomServicePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState<StatusTabType>("all");
  const [search, setSearch] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<RoomServiceRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [selectedGuestId, setSelectedGuestId] = useState<string>("dawit-102");
  const [formRoom, setFormRoom] = useState("102");
  const [formGuest, setFormGuest] = useState("Dr. Dawit Alene");
  const [formAmount, setFormAmount] = useState("750");
  const [formDesc, setFormDesc] = useState("Traditional Doro Wat Feast + Mineral Water");

  const queryParams = new URLSearchParams({
    ...(statusTab !== "all" ? { status: statusTab } : {}),
    ...(search ? { search } : {}),
    ...(serviceTypeFilter !== "all" ? { serviceType: serviceTypeFilter } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<RoomServiceDashboard>({
    queryKey: ["room-service-dashboard"],
    queryFn: () => apiFetch<RoomServiceDashboard>("/room-service/dashboard"),
  });

  const { data: inHouseGuests = [] } = useQuery<any[]>({
    queryKey: ["room-service-inhouse-guests"],
    queryFn: () => apiFetch<any[]>("/reservations/in-house").catch(() => []),
  });

  const fallbackGuests = [
    {
      id: "dawit-102",
      roomNumber: "102",
      guestName: "Dr. Dawit Alene",
      vipStatus: "VIP",
      label: "Dr. Dawit Alene — Room 102 (Checked-In VIP)",
    },
  ];

  const guestOptions = inHouseGuests && inHouseGuests.length > 0
    ? inHouseGuests.map((g: any) => {
        const rNum = (g.roomNumber || g.roomName || "102").replace(/[^0-9]/g, "");
        const gName = (g.guestFirstName && g.guestLastName)
          ? `${g.guestFirstName} ${g.guestLastName}`.trim()
          : (g.guestName || "Dr. Dawit Alene");
        const vip = g.guestVipStatus || "In-House";
        return {
          id: String(g.id || `room-${rNum}`),
          roomNumber: rNum,
          guestName: gName,
          vipStatus: vip,
          label: `${gName} — Room ${rNum} (${vip.toUpperCase()})`,
        };
      })
    : fallbackGuests;

  useEffect(() => {
    if (guestOptions.length > 0 && !formRoom) {
      const first = guestOptions[0];
      setSelectedGuestId(first.id);
      setFormRoom(first.roomNumber);
      setFormGuest(first.guestName);
    }
  }, [guestOptions, formRoom]);

  function handleGuestSelect(id: string) {
    setSelectedGuestId(id);
    if (id === "custom") {
      setFormRoom("");
      setFormGuest("");
      return;
    }
    const found = guestOptions.find((g) => g.id === id);
    if (found) {
      setFormRoom(found.roomNumber);
      setFormGuest(found.guestName);
    }
  }

  const { data: requests = [], isLoading } = useQuery<RoomServiceRequest[]>({
    queryKey: ["room-service", statusTab, search, serviceTypeFilter, priorityFilter],
    queryFn: () => apiFetch<RoomServiceRequest[]>(`/room-service?${queryParams}`),
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedRequests,
    onPrev,
    onNext,
  } = usePagination(requests, 5);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["room-service"] });
    queryClient.invalidateQueries({ queryKey: ["room-service-dashboard"] });
  }

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/room-service/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: "Request updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/room-service", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsNewOpen(false); toast({ title: "Request created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statCards = [
    { label: "Total", value: dashboard?.total, color: "text-primary" },
    { label: "Requested", value: dashboard?.requested, color: "text-warning" },
    { label: "In Progress", value: dashboard?.inProgress, color: "text-info" },
    { label: "Completed", value: dashboard?.completed, color: "text-success" },
  ];

  function handleCancelSubmit() {
    if (!cancelRequest) return;
    patchMutation.mutate({ id: cancelRequest.id, body: { status: "cancelled", cancelReason } });
    setCancelRequest(null);
    setCancelReason("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Room Service</h1>
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
          placeholder="Search room or guest..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[200px]"
        />
        <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SERVICE_TYPES.map((st) => (
              <SelectItem key={st.value} value={st.value}>{st.emoji} {st.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
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
              <TableHead>Request #</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested At</TableHead>
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
                <TableCell colSpan={9} className="h-28 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <p className="text-sm">{search ? `No room service orders found matching "${search}".` : "No room service orders found."}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => {
                        if (search) setFormRoom(search);
                        setIsNewOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Place Order {search ? `for Room ${search}` : ""}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{req.requestNumber}</TableCell>
                  <TableCell>{req.roomNumber ?? "—"}</TableCell>
                  <TableCell>{req.guestName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{getServiceDisplay(req.serviceType)}</TableCell>
                  <TableCell>
                    {req.department ? (
                      <Badge variant={(DEPT_BADGE[req.department] ?? "muted") as any} className="text-[10px]">
                        {req.department.replace(/_/g, " ")}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(req.priority === "urgent" ? "danger" : req.priority === "high" ? "warning" : req.priority === "normal" ? "secondary" : "muted") as any} className="text-[10px] uppercase">
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(STATUS_BADGE[req.status] ?? "muted") as any} className="text-[10px] uppercase">
                      {req.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {(req.requestedAt ?? req.createdAt) ? new Date(req.requestedAt ?? req.createdAt!).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    {!["completed", "cancelled"].includes(req.status) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {req.status === "requested" && (
                            <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "accepted" } })}>Accept</DropdownMenuItem>
                          )}
                          {req.status === "accepted" && (
                            <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "in_progress" } })}>Start</DropdownMenuItem>
                          )}
                          {req.status === "in_progress" && (
                            <DropdownMenuItem onClick={() => patchMutation.mutate({ id: req.id, body: { status: "completed" } })}>Complete</DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-danger" onClick={() => setCancelRequest(req)}>Cancel</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>New Room Service Request</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => {
              if (k === "chargeToRoom") body[k] = true;
              else if (v !== "") body[k] = v;
            });
            if (!fd.has("chargeToRoom")) body["chargeToRoom"] = false;
            if (body.chargeAmount) body.chargeAmount = Number(body.chargeAmount);
            createMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Room Number *</Label>
                <Input 
                  name="roomNumber" 
                  required 
                  placeholder="e.g. 102" 
                  value={formRoom} 
                  onChange={(e) => setFormRoom(e.target.value)} 
                  className="font-medium bg-surface"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Guest Name *</span>
                  <span className="text-[10px] text-primary font-normal">Active In-House</span>
                </Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  value={selectedGuestId}
                  onChange={(e) => handleGuestSelect(e.target.value)}
                >
                  <option value="" disabled>-- Select In-House Guest --</option>
                  {guestOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.guestName} (Room {g.roomNumber})
                    </option>
                  ))}
                  <option value="custom">✍️ Type Other Guest Name...</option>
                </select>
                <input type="hidden" name="guestName" value={formGuest} />
                {selectedGuestId === "custom" && (
                  <Input 
                    placeholder="Enter guest name..." 
                    value={formGuest} 
                    onChange={(e) => setFormGuest(e.target.value)} 
                    className="mt-1 font-medium"
                    required
                  />
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Service Type *</Label>
                <select name="serviceType" defaultValue="food" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  {SERVICE_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>{st.emoji} {st.label}</option>
                  ))}
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
              <div className="grid gap-1.5 col-span-2">
                <Label>Order Description</Label>
                <textarea 
                  name="description" 
                  rows={2} 
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" 
                />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Special Instructions</Label>
                <textarea name="specialInstructions" placeholder="Deliver warm to room" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <Label>Charge Amount (ETB)</Label>
                <Input 
                  name="chargeAmount" 
                  type="number" 
                  step="0.01" 
                  placeholder="750.00" 
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="chargeToRoom" name="chargeToRoom" defaultChecked className="h-4 w-4" />
                <label htmlFor="chargeToRoom" className="text-sm font-medium">Charge to Room Folio</label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Room Service Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelRequest} onOpenChange={(o) => !o && setCancelRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Cancel Reason</Label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCancelRequest(null)}>Keep It</Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancelSubmit}>Cancel Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

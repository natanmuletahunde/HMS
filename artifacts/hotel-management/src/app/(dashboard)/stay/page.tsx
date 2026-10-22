"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Settings,
  Bed,
  ConciergeBell,
  History,
  Plus,
  MoreHorizontal,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  UtensilsCrossed,
  Clock,
  Car,
  Coffee,
  Check,
  X,
  User,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

// ─── Types ──────────────────────────────────────────────────────────────────
type InHouseReservation = {
  id: string;
  reservationNumber: string;
  guestId?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  roomNumber?: string;
  roomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  actualCheckIn?: string;
  status: string;
  specialRequests?: string;
};

type StayChange = {
  id: string;
  reservationId?: string;
  guestId?: string;
  reservationNumber?: string;
  guestName?: string;
  actionType?: string;
  fromRoomNumber?: string;
  toRoomNumber?: string;
  createdAt?: string;
  reason?: string;
  performedBy?: string;
  newCheckOut?: string;
};

type StayListResponse = {
  data: StayChange[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type Room = { id: string; number: string; status: string; roomTypeName?: string; currentPrice?: number };

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

const ROOM_ACTIONS = ["room_upgrade", "room_downgrade", "room_transfer"];
const DATE_ACTIONS = ["extend_stay", "shorten_stay"];

const SERVICE_TYPES = [
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "drinks", label: "Drinks", emoji: "🥤" },
  { value: "transport", label: "Transport & Chauffeur", emoji: "🚗" },
  { value: "taxi", label: "Taxi", emoji: "🚗" },
  { value: "airport", label: "Airport Transfer", emoji: "✈️" },
  { value: "shuttle", label: "Hotel Shuttle", emoji: "🚐" },
  { value: "laundry", label: "Laundry", emoji: "👕" },
  { value: "spa", label: "Spa", emoji: "💆" },
  { value: "housekeeping", label: "Housekeeping", emoji: "🧹" },
  { value: "maintenance", label: "Maintenance", emoji: "🔧" },
  { value: "wake_up", label: "Wake-up Call", emoji: "⏰" },
  { value: "newspaper", label: "Newspaper", emoji: "📰" },
  { value: "luggage", label: "Luggage", emoji: "🧳" },
  { value: "tour", label: "Tour Info", emoji: "🗺️" },
  { value: "other", label: "Other", emoji: "📋" },
];

function getServiceDisplay(type: string) {
  const found = SERVICE_TYPES.find((s) => s.value === type);
  return found ? `${found.emoji} ${found.label}` : type;
}

const RS_STATUS_TABS = ["all", "requested", "accepted", "in_progress", "completed"] as const;
type RsStatusTabType = typeof RS_STATUS_TABS[number];

const RS_STATUS_BADGE: Record<string, string> = {
  requested: "muted",
  accepted: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

const DEPT_BADGE: Record<string, string> = {
  restaurant: "warning",
  food_beverage: "warning",
  housekeeping: "info",
  maintenance: "default",
  concierge: "success",
  reception: "default",
  transport: "success",
  spa: "info",
  laundry: "default",
};

function nightsLeft(checkOut?: string) {
  if (!checkOut) return "—";
  const diff = new Date(checkOut).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days} night${days !== 1 ? "s" : ""}` : "Today";
}

export default function StayManagementHubPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active Main Hub Tab: "stay" | "room-service" | "history"
  const [activeHubTab, setActiveHubTab] = useState<"stay" | "room-service" | "history">("stay");

  // Read ?tab= from URL on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const qTab = new URLSearchParams(window.location.search).get("tab");
      if (qTab === "room-service" || qTab === "history" || qTab === "stay") {
        setActiveHubTab(qTab);
      }
    }
  }, []);

  // ─── Stay Management State ────────────────────────────────────────────────
  const [manageTarget, setManageTarget] = useState<InHouseReservation | null>(null);
  const [actionType, setActionType] = useState("room_upgrade");
  const [manageReason, setManageReason] = useState("");
  const [manageNotes, setManageNotes] = useState("");
  const [manageNewRoomId, setManageNewRoomId] = useState("");
  const [manageNewCheckOutDate, setManageNewCheckOutDate] = useState("");
  const [handledStayAlerts, setHandledStayAlerts] = useState<Set<string>>(new Set());
  const [handledServiceAlerts, setHandledServiceAlerts] = useState<Set<string>>(new Set());
  const [activeServiceRequestId, setActiveServiceRequestId] = useState<string | null>(null);
  const [activeServiceRequestObj, setActiveServiceRequestObj] = useState<RoomServiceRequest | null>(null);

  // ─── Room Service State ───────────────────────────────────────────────────
  const [rsStatusTab, setRsStatusTab] = useState<RsStatusTabType>("all");
  const [rsSearch, setRsSearch] = useState("");
  const [rsTypeFilter, setRsTypeFilter] = useState("all");
  const [rsPriorityFilter, setRsPriorityFilter] = useState("all");

  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [serviceRoom, setServiceRoom] = useState("");
  const [serviceGuest, setServiceGuest] = useState("");
  const [serviceGuestId, setServiceGuestId] = useState("");
  const [serviceReservationId, setServiceReservationId] = useState("");
  const [serviceType, setServiceType] = useState("food");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePriority, setServicePriority] = useState("normal");
  const [serviceChargeToRoom, setServiceChargeToRoom] = useState(true);

  const [cancelRequest, setCancelRequest] = useState<RoomServiceRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: inHouse = [], isLoading: inHouseLoading } = useQuery<InHouseReservation[]>({
    queryKey: ["in-house"],
    queryFn: () => apiFetch<InHouseReservation[]>("/reservations/in-house"),
  });

  const { data: stayChangesData, isLoading: changesLoading } = useQuery<StayListResponse>({
    queryKey: ["stay-changes"],
    queryFn: () => apiFetch<StayListResponse>("/stay-management?limit=20"),
  });

  const { data: rawRooms } = useQuery<any>({
    queryKey: ["rooms"],
    queryFn: () => apiFetch<any>("/rooms"),
    enabled: true,
  });
  const rooms: Room[] = Array.isArray(rawRooms) ? rawRooms : (rawRooms?.data ?? []);

  const { data: rsDashboard, isLoading: rsDashLoading } = useQuery<RoomServiceDashboard>({
    queryKey: ["room-service-dashboard"],
    queryFn: () => apiFetch<RoomServiceDashboard>("/room-service/dashboard"),
  });

  const rsQueryParams = new URLSearchParams({
    ...(rsStatusTab !== "all" ? { status: rsStatusTab } : {}),
    ...(rsSearch ? { search: rsSearch } : {}),
    ...(rsTypeFilter !== "all" ? { serviceType: rsTypeFilter } : {}),
    ...(rsPriorityFilter !== "all" ? { priority: rsPriorityFilter } : {}),
  });

  const { data: rsRequests = [], isLoading: rsLoading } = useQuery<RoomServiceRequest[]>({
    queryKey: ["room-service", rsStatusTab, rsSearch, rsTypeFilter, rsPriorityFilter],
    queryFn: () => apiFetch<RoomServiceRequest[]>(`/room-service?${rsQueryParams}`),
  });

  // Global query for all pending in-room / transport requests (unfiltered by Tab 2)
  const { data: allPendingRsRequests = [] } = useQuery<RoomServiceRequest[]>({
    queryKey: ["room-service-all-pending"],
    queryFn: () => apiFetch<RoomServiceRequest[]>("/room-service?status=requested"),
    refetchInterval: 4000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const stayMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/stay-management", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stay-changes"] });
      queryClient.invalidateQueries({ queryKey: ["in-house"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      if (manageTarget) {
        if (manageTarget.id) {
          setHandledStayAlerts((prev) => new Set(prev).add(manageTarget.id));
        }
        if (manageTarget.roomNumber) {
          setHandledStayAlerts((prev) => new Set(prev).add(manageTarget.roomNumber!));
        }
      }
      setManageTarget(null);
      toast({ title: "Stay modification completed & alert cleared" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function invalidateRs() {
    queryClient.invalidateQueries({ queryKey: ["room-service"] });
    queryClient.invalidateQueries({ queryKey: ["room-service-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["room-service-all-pending"] });
  }

  const patchRsMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/room-service/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (_, variables) => {
      const targetReq = rsRequests.find((r) => r.id === variables.id);
      if (targetReq?.roomNumber) {
        setHandledServiceAlerts((prev) => new Set(prev).add(targetReq.roomNumber!));
      }
      if (variables.id) {
        setHandledServiceAlerts((prev) => new Set(prev).add(variables.id));
      }
      invalidateRs();
      toast({ title: "Room service request updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createRsMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/room-service", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (activeServiceRequestId) {
        patchRsMutation.mutate({ id: activeServiceRequestId, body: { status: "accepted" } });
        setHandledServiceAlerts((prev) => new Set(prev).add(activeServiceRequestId));
        setActiveServiceRequestId(null);
        setActiveServiceRequestObj(null);
      }
      if (serviceRoom) {
        setHandledServiceAlerts((prev) => new Set(prev).add(serviceRoom));
      }
      invalidateRs();
      setIsNewServiceOpen(false);
      toast({ title: "Room service request processed & alert cleared" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function dismissStayAlert(res: InHouseReservation) {
    if (res.id) setHandledStayAlerts((prev) => new Set(prev).add(res.id));
    if (res.roomNumber) setHandledStayAlerts((prev) => new Set(prev).add(res.roomNumber!));
    toast({ title: `Stay alert dismissed for Room ${res.roomNumber ?? res.reservationNumber}` });
  }

  function dismissServiceAlert(res: InHouseReservation) {
    if (res.roomNumber) {
      setHandledServiceAlerts((prev) => new Set(prev).add(res.roomNumber!));
      const req = allPendingRsRequests.find(
        (r) => (r.roomNumber === res.roomNumber || r.guestName?.toLowerCase() === res.guestName?.toLowerCase()) && r.status === "requested"
      );
      if (req?.id) {
        patchRsMutation.mutate({ id: req.id, body: { status: "accepted" } });
      }
      toast({ title: `Order alert dismissed for Room ${res.roomNumber}` });
    }
  }

  // Helper to launch Room Service pre-filled for an in-house guest (Auto-synced with Guest Portal)
  function openServiceForInHouseGuest(res: InHouseReservation) {
    setServiceRoom(res.roomNumber ?? "");
    setServiceGuest(res.guestName ?? "");
    setServiceGuestId(res.guestId ?? "");
    setServiceReservationId(res.id);

    // Auto-fill from guest portal active request if one exists for this room or guest
    const existingReq =
      allPendingRsRequests.find(
        (r) =>
          (r.roomNumber === res.roomNumber || r.guestName?.toLowerCase() === res.guestName?.toLowerCase()) &&
          ["requested", "accepted", "in_progress"].includes(r.status)
      ) ||
      rsRequests.find(
        (r) =>
          (r.roomNumber === res.roomNumber || r.guestName?.toLowerCase() === res.guestName?.toLowerCase()) &&
          ["requested", "accepted", "in_progress"].includes(r.status)
      ) ||
      rsRequests.find(
        (r) => r.roomNumber === res.roomNumber || r.guestName?.toLowerCase() === res.guestName?.toLowerCase()
      );

    if (existingReq) {
      setActiveServiceRequestId(existingReq.id);
      setActiveServiceRequestObj(existingReq);
      setServiceType(existingReq.serviceType || "transport");
      setServiceAmount(
        existingReq.chargeAmount != null && Number(existingReq.chargeAmount) > 0
          ? String(existingReq.chargeAmount)
          : "25.00"
      );
      setServiceDesc(
        existingReq.description ||
          (existingReq.specialInstructions ? `Special request: ${existingReq.specialInstructions}` : "") ||
          `${existingReq.serviceType} requested by ${res.guestName}`
      );
      setServicePriority(existingReq.priority || "normal");
      setServiceChargeToRoom(existingReq.chargeToRoom ?? true);
    } else {
      setActiveServiceRequestId(null);
      setActiveServiceRequestObj(null);
      // Smart default pre-fill so receptionist never sees blank inputs
      setServiceType("food");
      setServiceAmount("25.00");
      setServiceDesc(`1x In-Room Chef Special Dining & Beverage for ${res.guestName || "Guest"} (Room ${res.roomNumber})`);
      setServicePriority("normal");
      setServiceChargeToRoom(true);
    }

    setIsNewServiceOpen(true);
  }

  const stayChanges = stayChangesData?.data ?? [];
  const stayChangesPagination = usePagination(stayChanges, 5);
  const inHousePagination = usePagination(inHouse, 5);
  const rsPagination = usePagination(rsRequests, 5);

  // Map of rooms with unhandled pending service requests needing receptionist action
  const serviceRequestMap = new Map<string, RoomServiceRequest>();
  rsRequests
    .filter(
      (r) =>
        r.status === "requested" &&
        (!r.roomNumber || !handledServiceAlerts.has(r.roomNumber)) &&
        (!r.id || !handledServiceAlerts.has(r.id))
    )
    .forEach((r) => {
      if (r.roomNumber) serviceRequestMap.set(r.roomNumber, r);
    });

  // Helper to detect unhandled stay modification requests for an in-house guest
  function getPendingStayRequest(res: InHouseReservation): StayChange | null {
    const isHandled =
      (res.id && handledStayAlerts.has(res.id)) ||
      (res.roomNumber && handledStayAlerts.has(res.roomNumber));
    if (isHandled) return null;

    // 1. Look in stayChanges for guest requests
    const guestChange = stayChanges.find(
      (c) =>
        (c.reservationId === res.id ||
          c.reservationNumber === res.reservationNumber ||
          (res.roomNumber && (c.fromRoomNumber === res.roomNumber || (c as any).roomNumber === res.roomNumber))) &&
        (c.performedBy === "Guest Self-Service" ||
          c.reason?.includes("[GUEST PORTAL REQUEST]") ||
          c.reason?.toLowerCase().includes("guest requested") ||
          c.actionType === "room_upgrade" ||
          c.actionType === "extend_stay")
    );
    if (guestChange) return guestChange;

    // 2. Look in reservation specialRequests
    if (
      res.specialRequests &&
      /upgrade|extend|transfer|checkout|check-out|room change/i.test(res.specialRequests)
    ) {
      return {
        id: `spec-${res.id}`,
        reservationId: res.id,
        actionType: /extend|checkout/i.test(res.specialRequests) ? "extend_stay" : "room_upgrade",
        reason: res.specialRequests,
        performedBy: "Guest Self-Service",
      } as StayChange;
    }

    return null;
  }

  // Helper to launch Manage Stay pre-filled for an in-house guest (Auto-synced with Guest Portal)
  function openManageStayForGuest(res: InHouseReservation) {
    setManageTarget(res);

    // Check if there is an existing stay-change or request from the guest portal
    const existingChange =
      getPendingStayRequest(res) ||
      stayChanges.find(
        (c) =>
          c.reservationId === res.id ||
          c.reservationNumber === res.reservationNumber ||
          c.guestName?.toLowerCase() === res.guestName?.toLowerCase()
      );

    // Pick first available room from inventory that is not current room
    const availRooms = rooms.filter((r) => r.status === "available" && r.number !== res.roomNumber);
    const defaultRoomId = availRooms[0]?.id || "";
    setManageNewRoomId(defaultRoomId);

    // Compute sensible next checkout date (+1 day from current checkout)
    const baseDate = res.checkOutDate ? new Date(res.checkOutDate) : new Date();
    const nextDay = new Date(baseDate.getTime() + 86400000).toISOString().split("T")[0];

    if (existingChange && existingChange.performedBy === "Guest Self-Service") {
      const act = existingChange.actionType || "room_upgrade";
      setActionType(act);
      setManageReason(existingChange.reason || `Guest requested ${act.replace(/_/g, " ")} via In-Room Portal`);
      setManageNotes(`Requested via Guest Portal for ${res.guestName}`);
      setManageNewCheckOutDate(existingChange.newCheckOut ? existingChange.newCheckOut.split("T")[0] : nextDay);
    } else {
      setActionType("room_upgrade");
      setManageReason(res.specialRequests || "");
      setManageNotes(`Front desk routine stay adjustment for ${res.guestName || "Guest"}`);
      setManageNewCheckOutDate(nextDay);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stay & Room Services</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Centralized operations for in-house guests: room allocation, stay adjustments & in-room services.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1.5 font-medium"
            onClick={() => window.open("/guest-portal", "_blank")}
            title="Open the In-Room Guest Self-Service Web Portal in a new tab"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            In-Room Guest Portal
          </Button>

          <Button
            onClick={() => {
              // Reset service form for new standalone request
              setServiceRoom("");
              setServiceGuest("");
              setServiceGuestId("");
              setServiceReservationId("");
              setServiceType("food");
              setServiceAmount("");
              setServiceDesc("");
              setServiceChargeToRoom(true);
              setIsNewServiceOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Order Room Service
          </Button>
        </div>
      </div>

      {/* Top Combined KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
          <div className="text-xs font-medium text-text-muted flex items-center justify-between">
            <span>Active In-House Guests</span>
            <Bed className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            {inHouseLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold font-mono tracking-tight text-primary">{inHouse.length}</div>}
          </div>
        </Card>

        <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
          <div className="text-xs font-medium text-text-muted flex items-center justify-between">
            <span>Pending Service Requests</span>
            <ConciergeBell className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2">
            {rsDashLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold font-mono tracking-tight text-warning">{rsDashboard?.requested ?? 0}</div>}
          </div>
        </Card>

        <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
          <div className="text-xs font-medium text-text-muted flex items-center justify-between">
            <span>In-Progress Deliveries</span>
            <Clock className="h-4 w-4 text-info" />
          </div>
          <div className="mt-2">
            {rsDashLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold font-mono tracking-tight text-info">{rsDashboard?.inProgress ?? 0}</div>}
          </div>
        </Card>

        <Card className="bg-surface/50 border-border p-4 shadow-none min-h-[96px] flex flex-col justify-between rounded-xl">
          <div className="text-xs font-medium text-text-muted flex items-center justify-between">
            <span>Completed Requests</span>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="mt-2">
            {rsDashLoading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold font-mono tracking-tight text-success">{rsDashboard?.completed ?? 0}</div>}
          </div>
        </Card>
      </div>

      {/* Main Hub Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0">
        <button
          onClick={() => setActiveHubTab("stay")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${
            activeHubTab === "stay"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-text-muted hover:text-text hover:bg-muted/30"
          }`}
        >
          <Bed className="w-4 h-4" />
          <span>In-House Guests & Stay Control</span>
          <Badge variant="muted" className="text-xs ml-1 px-1.5 py-0">
            {inHouse.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveHubTab("room-service")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${
            activeHubTab === "room-service"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-text-muted hover:text-text hover:bg-muted/30"
          }`}
        >
          <ConciergeBell className="w-4 h-4" />
          <span>Room Service & In-Room Requests</span>
          {(rsDashboard?.requested ?? 0) > 0 && (
            <Badge variant="warning" className="text-xs ml-1 px-1.5 py-0">
              {rsDashboard?.requested} pending
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveHubTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap ${
            activeHubTab === "history"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-text-muted hover:text-text hover:bg-muted/30"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stay Changes History</span>
          <Badge variant="muted" className="text-xs ml-1 px-1.5 py-0">
            {stayChanges.length}
          </Badge>
        </button>
      </div>

      {/* ─── TAB 1: IN-HOUSE GUESTS & STAY CONTROL ───────────────────────── */}
      {activeHubTab === "stay" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active In-House Guests</CardTitle>
              <p className="text-xs text-text-muted mt-0.5">
                Current occupied rooms. Click <strong>Manage</strong> to change room/dates, or <strong>Order Service</strong> to deliver items.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-md border-t border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Res #</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Nights Left</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inHouseLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : inHouse.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                        No in-house guests currently checked in.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inHousePagination.paginatedItems.map((res) => {
                      const pendingStay = getPendingStayRequest(res);
                      const hasStay = !!pendingStay;
                      const pendingService = allPendingRsRequests.find(
                        (r) =>
                          (r.roomNumber === res.roomNumber || r.guestName?.toLowerCase() === res.guestName?.toLowerCase()) &&
                          r.status === "requested" &&
                          (!res.roomNumber || !handledServiceAlerts.has(res.roomNumber)) &&
                          (!r.id || !handledServiceAlerts.has(r.id))
                      );
                      const hasService = !!pendingService;
                      const isTransport = pendingService?.serviceType === "transport" || pendingService?.department === "transport";

                      return (
                        <TableRow key={res.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium">
                            {res.guestName ?? "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                          <TableCell className="font-semibold text-primary">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>Room {res.roomNumber ?? "—"}</span>

                              {/* Stay Request Alert */}
                              {hasStay && (
                                <div className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 rounded-md px-1.5 py-0.5 animate-pulse">
                                  <button
                                    type="button"
                                    onClick={() => openManageStayForGuest(res)}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 hover:underline"
                                    title={`Stay Request: ${pendingStay?.reason || "Stay modification"}`}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    Stay Alert
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dismissStayAlert(res);
                                    }}
                                    className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 text-xs px-0.5 rounded leading-none"
                                    title="Dismiss stay alert"
                                  >
                                    &times;
                                  </button>
                                </div>
                              )}

                              {/* Order / Transport Service Alert */}
                              {hasService && (
                                <div className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 rounded-md px-1.5 py-0.5 animate-pulse">
                                  <button
                                    type="button"
                                    onClick={() => openServiceForInHouseGuest(res)}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 hover:underline"
                                    title={`Pending: ${pendingService?.description || "In-room service"}`}
                                  >
                                    {isTransport ? <Car className="h-3 w-3" /> : <ConciergeBell className="h-3 w-3" />}
                                    {isTransport ? "Transport Alert" : "Order Alert"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      dismissServiceAlert(res);
                                    }}
                                    className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 text-xs px-0.5 rounded leading-none"
                                    title="Dismiss alert"
                                  >
                                    &times;
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {res.actualCheckIn
                              ? new Date(res.actualCheckIn).toLocaleDateString()
                              : res.checkInDate
                              ? new Date(res.checkInDate).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="muted" className="text-xs">
                              {nightsLeft(res.checkOutDate)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* If transport or room service requested: show dedicated Fulfill button */}
                              {hasService && (
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1 shadow-xs"
                                  title={isTransport ? "Fulfill guest transport / chauffeur request" : "Fulfill in-room service order"}
                                  onClick={() => openServiceForInHouseGuest(res)}
                                >
                                  {isTransport ? <Car className="h-3.5 w-3.5" /> : <ConciergeBell className="h-3.5 w-3.5" />}
                                  {isTransport ? "Fulfill Transport" : "Fulfill Order"}
                                </Button>
                              )}

                              {/* If stay modification requested: show Stay button */}
                              {hasStay && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs text-primary border-primary/40 hover:bg-primary/10 gap-1 font-medium shadow-xs"
                                  title="Handle stay modification (upgrade / extension / transfer)"
                                  onClick={() => openManageStayForGuest(res)}
                                >
                                  <Settings className="h-3.5 w-3.5" />
                                  Stay
                                </Button>
                              )}

                              {/* Action options */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-text-muted hover:text-foreground"
                                    title="More actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openServiceForInHouseGuest(res)}>
                                    <ConciergeBell className="mr-2 h-3.5 w-3.5" /> In-Room Services
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openManageStayForGuest(res)}>
                                    <Settings className="mr-2 h-3.5 w-3.5" /> Manage Stay (Room/Dates)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={inHousePagination.currentPage}
                totalPages={inHousePagination.totalPages}
                totalItems={inHousePagination.totalItems}
                pageSize={5}
                onPrev={inHousePagination.onPrev}
                onNext={inHousePagination.onNext}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: ROOM SERVICE & DELIVERIES ───────────────────────────── */}
      {activeHubTab === "room-service" && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
            {RS_STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setRsStatusTab(s)}
                className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer capitalize ${
                  rsStatusTab === s
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Search room or guest..."
                value={rsSearch}
                onChange={(e) => setRsSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Select value={rsTypeFilter} onValueChange={setRsTypeFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rsPriorityFilter} onValueChange={setRsPriorityFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 ml-auto text-text-muted hover:text-text"
              onClick={() => window.location.href = '/transport'}
              title="Manage transport vehicles, drivers, and fleet dispatch"
            >
              <Car className="h-3.5 w-3.5 text-primary" />
              Fleet & Drivers
            </Button>
          </div>

          {/* Requests Table */}
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rsRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-text-muted">
                      No room service requests match your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  rsPagination.paginatedItems.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{req.requestNumber}</TableCell>
                      <TableCell className="font-semibold text-primary">Room {req.roomNumber ?? "—"}</TableCell>
                      <TableCell className="font-medium text-xs">{req.guestName ?? "—"}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">{getServiceDisplay(req.serviceType)}</span>
                        {req.description && (
                          <p className="text-[11px] text-text-muted truncate max-w-[200px]">{req.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.department ? (
                          <Badge
                            variant={(DEPT_BADGE[req.department] ?? "muted") as any}
                            className="text-[10px] capitalize"
                          >
                            {req.department.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (req.priority === "urgent"
                              ? "danger"
                              : req.priority === "high"
                              ? "warning"
                              : req.priority === "normal"
                              ? "default"
                              : "muted") as any
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(RS_STATUS_BADGE[req.status] ?? "muted") as any}
                          className="text-[10px] uppercase"
                        >
                          {req.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-text-muted">
                        {(req.requestedAt ?? req.createdAt)
                          ? new Date(req.requestedAt ?? req.createdAt!).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {!["completed", "cancelled"].includes(req.status) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {req.status === "requested" && (
                                <DropdownMenuItem
                                  onClick={() => patchRsMutation.mutate({ id: req.id, body: { status: "accepted" } })}
                                >
                                  Accept Order
                                </DropdownMenuItem>
                              )}
                              {req.status === "accepted" && (
                                <DropdownMenuItem
                                  onClick={() => patchRsMutation.mutate({ id: req.id, body: { status: "in_progress" } })}
                                >
                                  Start Preparation / Delivery
                                </DropdownMenuItem>
                              )}
                              {req.status === "in_progress" && (
                                <DropdownMenuItem
                                  onClick={() => patchRsMutation.mutate({ id: req.id, body: { status: "completed" } })}
                                >
                                  Mark Completed & Charge
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-danger"
                                onClick={() => setCancelRequest(req)}
                              >
                                Cancel Request
                              </DropdownMenuItem>
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
              currentPage={rsPagination.currentPage}
              totalPages={rsPagination.totalPages}
              totalItems={rsPagination.totalItems}
              pageSize={5}
              onPrev={rsPagination.onPrev}
              onNext={rsPagination.onNext}
            />
          </div>
        </div>
      )}

      {/* ─── TAB 3: STAY CHANGES AUDIT LOG ─────────────────────────────── */}
      {activeHubTab === "history" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Stay Modifications History</CardTitle>
            <p className="text-xs text-text-muted mt-0.5">
              Historical record of room upgrades, transfers, and stay extensions.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-md border-t border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Res #</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>From Room</TableHead>
                    <TableHead>To Room</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changesLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : stayChanges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                        No recent stay changes recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stayChangesPagination.paginatedItems.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.reservationNumber ?? "—"}</TableCell>
                        <TableCell className="font-medium text-xs">{c.guestName ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="muted" className="text-xs capitalize">
                            {(c.actionType ?? "").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{c.fromRoomNumber ?? "—"}</TableCell>
                        <TableCell className="text-xs">{c.toRoomNumber ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-text-muted">
                          {c.reason ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={stayChangesPagination.currentPage}
                totalPages={stayChangesPagination.totalPages}
                totalItems={stayChangesPagination.totalItems}
                pageSize={5}
                onPrev={stayChangesPagination.onPrev}
                onNext={stayChangesPagination.onNext}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── MODAL: MANAGE STAY (ROOM UPGRADE / TRANSFER / EXTENSION) ────── */}
      <Dialog open={!!manageTarget} onOpenChange={(o) => !o && setManageTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Stay — {manageTarget?.guestName}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-text-muted -mt-1">
            Reservation #{manageTarget?.reservationNumber} &bull; Currently in Room:{" "}
            <strong className="text-primary font-bold">{manageTarget?.roomNumber ?? "—"}</strong>
          </p>

          {/* Active Guest Request Banner if guest requested transport or in-room service */}
          {manageTarget && (() => {
            const pendingReq = allPendingRsRequests.find(
              (r) =>
                (r.roomNumber === manageTarget.roomNumber || r.guestName?.toLowerCase() === manageTarget.guestName?.toLowerCase()) &&
                ["requested", "accepted", "in_progress"].includes(r.status)
            );
            if (!pendingReq) return null;
            const isTransport = pendingReq.serviceType === "transport" || pendingReq.department === "transport";

            return (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    {isTransport ? <Car className="h-4 w-4" /> : <ConciergeBell className="h-4 w-4" />}
                    <span>Active Request: {isTransport ? "Chauffeur & Transport" : "In-Room Service"}</span>
                  </div>
                  <Badge variant="warning" className="text-[10px] uppercase font-mono">
                    {pendingReq.status}
                  </Badge>
                </div>
                <div className="bg-surface/90 p-2.5 rounded border border-border/70">
                  <p className="font-semibold text-text text-xs leading-relaxed">{pendingReq.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-text-muted mt-1.5 pt-1 border-t border-border/50">
                    <span>Room {manageTarget.roomNumber} &bull; {manageTarget.guestName}</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {Number(pendingReq.chargeAmount) > 0 ? `$${Number(pendingReq.chargeAmount).toFixed(2)}` : "Complimentary"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-text-muted">
                    This dialog manages Room/Dates. To fulfill transport:
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1"
                    onClick={() => {
                      const target = manageTarget;
                      setManageTarget(null);
                      openServiceForInHouseGuest(target);
                    }}
                  >
                    Open Transport Request &rarr;
                  </Button>
                </div>
              </div>
            );
          })()}

          <form
            className="space-y-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!manageTarget) return;
              const body: Record<string, unknown> = {
                reservationId: manageTarget.id,
                actionType,
                reason: manageReason || `Front desk stay modification for Room ${manageTarget.roomNumber}`,
                notes: manageNotes || undefined,
              };
              if (ROOM_ACTIONS.includes(actionType)) {
                const selectedRoom = manageNewRoomId || rooms.filter((r) => r.status === "available" && r.number !== manageTarget.roomNumber)[0]?.id;
                body.newRoomId = selectedRoom || undefined;
              }
              if (DATE_ACTIONS.includes(actionType)) {
                body.newCheckOutDate = manageNewCheckOutDate || undefined;
              }
              stayMutation.mutate(body);
            }}
          >
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Action Type</Label>
              <Select
                value={actionType}
                onValueChange={(val) => {
                  setActionType(val);
                  if (val === "extend_stay") {
                    setManageReason(`Stay extension (Room ${manageTarget?.roomNumber ?? ""})`);
                  } else if (val === "room_transfer") {
                    setManageReason(`Room transfer (Room ${manageTarget?.roomNumber ?? ""})`);
                  } else if (val === "room_upgrade") {
                    setManageReason(`Room upgrade (Room ${manageTarget?.roomNumber ?? ""})`);
                  } else if (val === "shorten_stay") {
                    setManageReason(`Early departure (Room ${manageTarget?.roomNumber ?? ""})`);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room_upgrade">Room Upgrade</SelectItem>
                  <SelectItem value="room_downgrade">Room Downgrade</SelectItem>
                  <SelectItem value="room_transfer">Room Transfer (Change Room)</SelectItem>
                  <SelectItem value="extend_stay">Extend Stay</SelectItem>
                  <SelectItem value="shorten_stay">Shorten Stay</SelectItem>
                  <SelectItem value="add_note">Add Internal Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ROOM_ACTIONS.includes(actionType) && (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newRoomId" className="text-xs font-semibold">
                    New Available Room *
                  </Label>
                  <span className="text-[10px] text-emerald-500 font-medium">Auto-matched clean room</span>
                </div>
                <select
                  name="newRoomId"
                  value={manageNewRoomId}
                  onChange={(e) => setManageNewRoomId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-surface px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <option value="">Select a new available room</option>
                  {rooms
                    .filter((r) => r.status === "available" && r.number !== manageTarget?.roomNumber)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} — {r.roomTypeName ?? r.status} {r.currentPrice ? `($${r.currentPrice}/nt)` : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {DATE_ACTIONS.includes(actionType) && (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newCheckOutDate" className="text-xs font-semibold">
                    New Check-out Date *
                  </Label>
                  <span className="text-[10px] text-primary font-medium">Auto-calculated extension</span>
                </div>
                <Input
                  id="newCheckOutDate"
                  name="newCheckOutDate"
                  type="date"
                  required
                  min={manageTarget?.checkInDate?.split("T")[0]}
                  value={manageNewCheckOutDate}
                  onChange={(e) => setManageNewCheckOutDate(e.target.value)}
                  className="h-9 text-xs font-semibold text-text"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reason" className="text-xs font-semibold">
                  Reason *
                </Label>
                <span className="text-[10px] text-text-muted font-medium">
                  {manageTarget && getPendingStayRequest(manageTarget) ? "Auto-filled from Guest Portal" : "Front Desk Adjustment"}
                </span>
              </div>
              <textarea
                id="reason"
                name="reason"
                rows={2}
                required
                value={manageReason}
                onChange={(e) => setManageReason(e.target.value)}
                placeholder="e.g. VIP guest complimentary upgrade / room transfer..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="notes" className="text-xs font-semibold">
                  Internal Notes (Optional)
                </Label>
                <span className="text-[10px] text-text-muted">Auto-tagged</span>
              </div>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={manageNotes}
                onChange={(e) => setManageNotes(e.target.value)}
                placeholder="Additional notes for front desk staff..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
              />
            </div>

            <Button type="submit" className="w-full" disabled={stayMutation.isPending}>
              {stayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Stay Change
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: IN-ROOM SERVICE / FULFILL REQUEST ─────────────────────── */}
      <Dialog open={isNewServiceOpen} onOpenChange={(o) => {
        setIsNewServiceOpen(o);
        if (!o) {
          setActiveServiceRequestId(null);
          setActiveServiceRequestObj(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeServiceRequestObj ? (
                <>
                  {activeServiceRequestObj.serviceType === "transport" ? (
                    <Car className="h-5 w-5 text-amber-400" />
                  ) : (
                    <ConciergeBell className="h-5 w-5 text-primary" />
                  )}
                  <span>
                    Fulfill Guest Request &mdash; Room {serviceRoom} ({serviceGuest})
                  </span>
                </>
              ) : (
                <>
                  <ConciergeBell className="h-5 w-5 text-primary" />
                  <span>Order In-Room Service</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {activeServiceRequestObj ? (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="warning" className="text-xs font-bold uppercase tracking-wider">
                    {activeServiceRequestObj.serviceType === "transport" ? "🚗 Transport Booking" : activeServiceRequestObj.serviceType}
                  </Badge>
                  <span className="text-xs font-mono text-text-muted">
                    Ref: {activeServiceRequestObj.requestNumber}
                  </span>
                </div>

                <div className="bg-surface/90 rounded-md p-3 border border-border space-y-1.5">
                  <div className="text-sm font-semibold text-text">
                    {activeServiceRequestObj.description}
                  </div>
                  {activeServiceRequestObj.specialInstructions && (
                    <div className="text-xs text-amber-300">
                      <strong>Special instructions:</strong> {activeServiceRequestObj.specialInstructions}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/80 text-xs">
                    <span className="text-text-muted">Room {activeServiceRequestObj.roomNumber} &bull; {activeServiceRequestObj.guestName}</span>
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {Number(activeServiceRequestObj.chargeAmount) > 0
                        ? `$${Number(activeServiceRequestObj.chargeAmount).toFixed(2)} Charged to Room`
                        : "Complimentary"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-2.5 rounded-md border border-border text-xs text-text-muted flex items-center justify-between">
                <span>Current Status: <strong className="text-text capitalize">{activeServiceRequestObj.status.replace(/_/g, " ")}</strong></span>
                <span>Department: <strong className="text-primary capitalize">{activeServiceRequestObj.department || "Transport"}</strong></span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewServiceOpen(false)}
                >
                  Close
                </Button>

                {activeServiceRequestObj.status === "requested" && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5"
                    disabled={patchRsMutation.isPending}
                    onClick={() => {
                      patchRsMutation.mutate(
                        { id: activeServiceRequestObj.id, body: { status: "accepted" } },
                        {
                          onSuccess: () => {
                            setIsNewServiceOpen(false);
                            setActiveServiceRequestId(null);
                            setActiveServiceRequestObj(null);
                            toast({ title: "Request Accepted", description: "Driver dispatched & guest notified via portal!" });
                          },
                        }
                      );
                    }}
                  >
                    {patchRsMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Car className="h-3.5 w-3.5" /> Accept & Dispatch Driver
                  </Button>
                )}

                {activeServiceRequestObj.status !== "completed" && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                    disabled={patchRsMutation.isPending}
                    onClick={() => {
                      patchRsMutation.mutate(
                        { id: activeServiceRequestObj.id, body: { status: "completed" } },
                        {
                          onSuccess: () => {
                            setIsNewServiceOpen(false);
                            setActiveServiceRequestId(null);
                            setActiveServiceRequestObj(null);
                            toast({ title: "Completed & Charged", description: "Trip completed and added to guest folio." });
                          },
                        }
                      );
                    }}
                  >
                    {patchRsMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed & Charge
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form
              className="space-y-4 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!serviceRoom) {
                  toast({ title: "Room Required", description: "Please enter or select a room number", variant: "destructive" });
                  return;
                }

                const body: Record<string, unknown> = {
                  roomNumber: serviceRoom,
                  guestName: serviceGuest || undefined,
                  guestId: serviceGuestId || undefined,
                  reservationId: serviceReservationId || undefined,
                  serviceType,
                  priority: servicePriority,
                  chargeAmount: serviceAmount ? Number(serviceAmount) : 0,
                  chargeToRoom: serviceChargeToRoom,
                  description: serviceDesc || undefined,
                };

                createRsMutation.mutate(body);
              }}
            >
              {/* Quick Guest Selector / Confirmation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Room Number *</Label>
                  <Input
                    value={serviceRoom}
                    onChange={(e) => setServiceRoom(e.target.value)}
                    placeholder="e.g. 102"
                    required
                    className="h-9 text-xs font-bold text-primary"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Guest Name</Label>
                  <Input
                    value={serviceGuest}
                    onChange={(e) => setServiceGuest(e.target.value)}
                    placeholder="e.g. Dr. Dawit Alene"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* In-House Guest Quick Fill Banner */}
              {inHouse.length > 0 && !serviceReservationId && (
                <div className="p-2.5 rounded-md bg-muted/40 border border-border text-xs">
                  <span className="font-semibold text-text-muted">Quick Pick In-House Guest: </span>
                  <select
                    className="mt-1 flex h-8 w-full rounded border border-input bg-surface px-2 text-xs"
                    onChange={(e) => {
                      const found = inHouse.find((g) => g.id === e.target.value);
                      if (found) {
                        openServiceForInHouseGuest(found);
                      }
                    }}
                  >
                    <option value="">-- Or Choose Current In-House Guest --</option>
                    {inHouse.map((g) => (
                      <option key={g.id} value={g.id}>
                        Room {g.roomNumber} &bull; {g.guestName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Service Type *</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.emoji} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select value={servicePriority} onValueChange={setServicePriority}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Items / Request Description</Label>
                <textarea
                  rows={2}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="e.g. 1x Traditional Breakfast, 2x Fresh Orange Juice, extra pillows..."
                  className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Charge Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={serviceAmount}
                    onChange={(e) => setServiceAmount(e.target.value)}
                    placeholder="0.00 (Free if complimentary)"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chargeToRoom"
                    checked={serviceChargeToRoom}
                    onChange={(e) => setServiceChargeToRoom(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="chargeToRoom" className="text-xs font-medium cursor-pointer">
                    Charge to Guest Folio
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createRsMutation.isPending}>
                {createRsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Room Service Request
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: CANCEL ROOM SERVICE REQUEST ──────────────────────────── */}
      <Dialog open={!!cancelRequest} onOpenChange={(o) => !o && setCancelRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Request #{cancelRequest?.requestNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Cancellation Reason *</Label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Guest cancelled order / item unavailable..."
                required
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCancelRequest(null)}>
                Close
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!cancelReason.trim() || patchRsMutation.isPending}
                onClick={() => {
                  if (!cancelRequest) return;
                  patchRsMutation.mutate({
                    id: cancelRequest.id,
                    body: { status: "cancelled", cancelReason },
                  });
                  setCancelRequest(null);
                  setCancelReason("");
                }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

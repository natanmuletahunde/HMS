"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Settings,
  Bed,
  Bell,
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
  Phone,
  UserCheck,
  Zap,
  Receipt,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
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
  DialogDescription,
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
import { getInHouseRequests, assignWaiterToInHouseRequest, AVAILABLE_WAITERS, InHouseServiceRequest } from "@/lib/in-house-requests";

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
  assignedToName?: string;
  assignedToId?: string;
  notes?: string;
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

const HOTEL_DEPARTMENTS = [
  { value: "restaurant", label: "Kitchen & Dining / Bar", emoji: "🍽️" },
  { value: "housekeeping", label: "Housekeeping & Linens", emoji: "🧹" },
  { value: "transport", label: "Transport & Chauffeur", emoji: "🚗" },
  { value: "laundry", label: "Laundry & Dry Cleaning", emoji: "👕" },
  { value: "maintenance", label: "Engineering & Maintenance", emoji: "🔧" },
  { value: "reception", label: "Front Desk", emoji: "🛎️" },
];

const DEFAULT_HOTEL_STAFF = [
  { id: "staff-chef-abebe", name: "Chef Abebe Tessema", role: "Executive Head Chef", department: "restaurant" },
  { id: "staff-chef-tariku", name: "Tariku Kebede", role: "Kitchen & Barista Staff", department: "restaurant" },
  { id: "staff-hk-tigist", name: "Tigist Bekele", role: "Senior Housekeeping Lead", department: "housekeeping" },
  { id: "staff-hk-almaz", name: "Almaz Desta", role: "Housekeeping Attendant", department: "housekeeping" },
  { id: "staff-tr-dawit", name: "Dawit Alene", role: "VIP Chauffeur & Airport Transport", department: "transport" },
  { id: "staff-lnd-bethlehem", name: "Bethlehem Worku", role: "Laundry Specialist", department: "laundry" },
  { id: "staff-mnt-mulugeta", name: "Mulugeta Haile", role: "Chief Maintenance Engineer", department: "maintenance" },
  { id: "staff-rec-selamawit", name: "Selamawit Kebede", role: "Front Office Receptionist", department: "reception" },
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
  guest_services: "success",
  services: "success",
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
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active Main Hub Tab: "stay" (In-House Guests) | "changes" (Stay Changes & In-Room Requests)
  const [activeHubTab, setActiveHubTab] = useState<"stay" | "changes">("stay");
  const [stayStatusFilter, setStayStatusFilter] = useState<string>("all");

  // Read ?tab= from URL on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const qTab = new URLSearchParams(window.location.search).get("tab");
      if (qTab === "changes" || qTab === "room-service" || qTab === "history") {
        setActiveHubTab("changes");
      } else if (qTab === "stay") {
        setActiveHubTab("stay");
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
  const [serviceDept, setServiceDept] = useState("restaurant");
  const [serviceAssignedToId, setServiceAssignedToId] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePriority, setServicePriority] = useState("normal");
  const [serviceChargeToRoom, setServiceChargeToRoom] = useState(true);

  const [dispatchTarget, setDispatchTarget] = useState<RoomServiceRequest | null>(null);
  const [dispatchStaffId, setDispatchStaffId] = useState("");
  const [dispatchDept, setDispatchDept] = useState("");

  const [cancelRequest, setCancelRequest] = useState<RoomServiceRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // In-House Guest Room Service Orders & Receptionist Waiter Assignment
  const [inHouseRequests, setInHouseRequests] = useState<InHouseServiceRequest[]>([]);
  const [assignWaiterModalOpen, setAssignWaiterModalOpen] = useState(false);
  const [assignTargetReq, setAssignTargetReq] = useState<InHouseServiceRequest | null>(null);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>(AVAILABLE_WAITERS[0].id);

  useEffect(() => {
    setInHouseRequests(getInHouseRequests());
    const handleSync = (e: any) => {
      if (e?.detail) {
        setInHouseRequests(e.detail);
      } else {
        setInHouseRequests(getInHouseRequests());
      }
    };
    window.addEventListener("nexus_inhouse_requests_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("nexus_inhouse_requests_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const handleConfirmAssignWaiter = () => {
    if (!assignTargetReq) return;
    const waiter = AVAILABLE_WAITERS.find((w) => w.id === selectedWaiterId) || AVAILABLE_WAITERS[0];
    assignWaiterToInHouseRequest(assignTargetReq.id, waiter.id, waiter.name);
    setAssignWaiterModalOpen(false);
    setAssignTargetReq(null);
    toast({
      title: "Waiter Assigned & SMS Alert Dispatched",
      description: `Assigned ${waiter.name} to Room ${assignTargetReq.roomNumber} order. AfroMessage SMS sent to 0954123456.`,
    });
  };

  const { data: rawUsers = [] } = useQuery<any>({
    queryKey: ["users-staff-list"],
    queryFn: () => apiFetch<any>("/users?limit=100").catch(() => []),
  });
  const staffUsers: any[] = Array.isArray(rawUsers)
    ? rawUsers
    : Array.isArray(rawUsers?.data)
    ? rawUsers.data
    : [];

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

  const filteredRsRequests = rsRequests.filter((req) => {
    if (stayStatusFilter === "all") return true;
    if (stayStatusFilter === "pending") return req.status === "requested";
    if (stayStatusFilter === "approved") return req.status === "accepted";
    if (stayStatusFilter === "in_progress") return req.status === "in_progress";
    if (stayStatusFilter === "completed") return req.status === "completed";
    if (stayStatusFilter === "rejected") return req.status === "cancelled";
    return true;
  });
  const rsPagination = usePagination(filteredRsRequests, 5);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stay & Room Services</h1>
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
            <Bell className="h-4 w-4 text-warning" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="inline-flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 border border-border/70 rounded-xl shadow-xs">
          <button
            onClick={() => setActiveHubTab("stay")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeHubTab === "stay"
                ? "bg-white dark:bg-[#0E172E] text-primary font-bold shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium border border-transparent"
            }`}
          >
            <Bed className={`w-4 h-4 transition-colors ${activeHubTab === "stay" ? "text-primary" : "text-muted-foreground"}`} />
            <span>In-House Guests & Stay Control</span>
          </button>

          <button
            onClick={() => setActiveHubTab("changes")}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeHubTab === "changes"
                ? "bg-white dark:bg-[#0E172E] text-primary font-bold shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium border border-transparent"
            }`}
          >
            <Bell className={`w-4 h-4 transition-colors ${activeHubTab === "changes" ? "text-primary" : "text-muted-foreground"}`} />
            <span>In-Room & Guest Services</span>
          </button>
        </div>

        {/* Small button redirecting to Stay Modification History */}
        <div className="hidden sm:block">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/stay/history")}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <History className="h-3.5 w-3.5 text-primary" />
            Stay History
          </Button>
        </div>
      </div>

      {/* ─── TAB 1: IN-HOUSE GUESTS & STAY CONTROL ───────────────────────── */}
      {activeHubTab === "stay" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active In-House Guests</CardTitle>
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
                    <TableHead className="text-right">Actions</TableHead>
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
                            Room {res.roomNumber ?? "—"}
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
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
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
                                    {isTransport ? <Car className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
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

                              {/* Quick Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openManageStayForGuest(res)}>
                                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary" />
                                    Manage Stay (Room / Dates)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openServiceForInHouseGuest(res)}>
                                    <Bell className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                                    Order In-Room Service
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

      {/* ─── TAB 2: STAY CHANGES & IN-ROOM REQUESTS ───────────────────── */}
      {activeHubTab === "changes" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-2.5 items-center">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Search room, guest, or request..."
                value={rsSearch}
                onChange={(e) => setRsSearch(e.target.value)}
                className="pl-8 h-10 text-xs"
              />
            </div>

            {/* Status Filter Dropdown */}
            <Select value={stayStatusFilter} onValueChange={setStayStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={rsTypeFilter} onValueChange={setRsTypeFilter}>
              <SelectTrigger className="w-[140px] h-10 text-xs">
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
              <SelectTrigger className="w-[130px] h-10 text-xs">
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

          </div>

          {/* In-House Food & Drink Room Service Orders (Shifted to Receptionist for Waiter Assignment) */}
          <Card className="overflow-hidden border border-amber-500/30 bg-white dark:bg-card shadow-xs">
            <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 py-3.5 px-4 border-b border-amber-500/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  In-House Guest Food & Drinks Orders (Assign Waiter)
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold">
                  {inHouseRequests.filter((r) => r.status === "pending").length} Pending Assignment
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Guest & Phone</TableHead>
                    <TableHead>Ordered Dishes</TableHead>
                    <TableHead>Charge</TableHead>
                    <TableHead>Assigned Waiter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inHouseRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-xs text-text-muted">
                        No in-house food or drink requests currently pending.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inHouseRequests.map((req) => {
                      const hasWaiter = !!req.assignedWaiterId;
                      return (
                        <TableRow key={req.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs font-semibold">
                            {req.requestNumber.replace(/#/g, "").replace(/-/g, " ")}
                          </TableCell>
                          <TableCell className="font-bold text-primary text-xs">
                            Room {req.roomNumber}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{req.guestName}</div>
                            {req.phone && (
                              <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{req.phone}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            <div className="line-clamp-2 text-slate-700 dark:text-slate-300">
                              {Array.isArray(req.items)
                                ? req.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")
                                : String(req.items || "—")}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {req.totalAmount ? `ETB ${req.totalAmount.toLocaleString()}` : "Folio"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {hasWaiter ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{req.assignedWaiterName}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Awaiting Assignment
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant={req.status === "served" ? "success" : req.status === "dispatched" ? "warning" : "default"} className="text-[10px] uppercase">
                              {req.stage === "waiter_assigned" ? "Assigned" : req.stage === "cooking" ? "Cooking" : req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setAssignTargetReq(req);
                                setAssignWaiterModalOpen(true);
                              }}
                              className="h-7 px-2.5 text-xs font-semibold bg-[#FBB72C] hover:bg-[#F5AB1A] text-slate-950 rounded-lg shadow-2xs gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{hasWaiter ? "Reassign Waiter" : "Assign Waiter"}</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Service Requests Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div>
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
                      <TableHead>Charge (ETB)</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(10)].map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredRsRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-text-muted">
                          No service requests match your filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rsPagination.paginatedItems.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs">
                            <div className="font-semibold">{req.requestNumber}</div>
                            <div className="mt-1">
                              {req.requestNumber?.startsWith("RS-PHONE-") || req.notes?.includes("Phone") ? (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 px-1.5 py-0 font-medium">
                                  <Phone className="h-2.5 w-2.5" /> Phone Order
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1 px-1.5 py-0 font-medium">
                                  <Sparkles className="h-2.5 w-2.5" /> In-Room Portal
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-primary">Room {req.roomNumber ?? "—"}</TableCell>
                          <TableCell className="font-medium text-xs">{req.guestName ?? "—"}</TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">{getServiceDisplay(req.serviceType)}</span>
                            {req.description && (
                              <p className="text-[11px] text-text-muted truncate max-w-[200px]">{req.description}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {req.department ? (
                                <Badge
                                  variant={(DEPT_BADGE[req.department] ?? "muted") as any}
                                  className="text-[10px] capitalize"
                                >
                                  {req.department.replace(/_/g, " ")}
                                </Badge>
                              ) : (
                                <span className="text-xs text-text-muted">—</span>
                              )}
                              {req.assignedToName && (
                                <div>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <UserCheck className="h-3 w-3" /> {req.assignedToName}
                                  </span>
                                </div>
                              )}
                            </div>
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
                          <TableCell className="font-mono text-xs font-semibold text-amber-500">
                            {Number(req.chargeAmount) > 0 ? `ETB ${Number(req.chargeAmount).toFixed(2)}` : "Free"}
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
                            <div className="flex items-center justify-end">
                              {!["completed", "cancelled"].includes(req.status) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {!req.assignedToName && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDispatchTarget(req);
                                          setDispatchDept(req.department || "restaurant");
                                          const match = DEFAULT_HOTEL_STAFF.find((s) => s.department === (req.department || "restaurant"));
                                          setDispatchStaffId(match?.name || DEFAULT_HOTEL_STAFF[0].name);
                                        }}
                                      >
                                        <UserCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                        Dispatch / Assign Staff
                                      </DropdownMenuItem>
                                    )}
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
                                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                        Mark Completed & Sync Folio
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-amber-500 hover:text-amber-600 focus:text-amber-600"
                                      onClick={() => {
                                        setCancelRequest(req);
                                        setCancelReason(
                                          `Dear ${req.guestName || "Valued Guest"}, we sincerely apologize, but "${req.description || "your requested item"}" is currently unavailable. Our front desk team is delighted to recommend suitable alternatives or assist you with another selection.`
                                        );
                                      }}
                                    >
                                      <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                                      Notify Guest: Item Unavailable
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── MODAL: MANAGE STAY (ROOM UPGRADE / TRANSFER / EXTENSION) ────── */}
      <Dialog open={!!manageTarget} onOpenChange={(o) => !o && setManageTarget(null)}>
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl text-foreground">
          <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Manage Stay &mdash; {manageTarget?.guestName}</span>
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Res #{manageTarget?.reservationNumber}</span>
                  <span>&bull;</span>
                  <span>Currently in Room: <strong className="text-primary font-bold">{manageTarget?.roomNumber ?? "—"}</strong></span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <form
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
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
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Stay Modification Action *</Label>
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
                <SelectTrigger className="h-10 text-sm">
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newRoomId" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    New Available Room *
                  </Label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Clean & Inspected</span>
                </div>
                <select
                  name="newRoomId"
                  value={manageNewRoomId}
                  onChange={(e) => setManageNewRoomId(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-primary"
                >
                  <option value="">Select a new available room</option>
                  {rooms
                    .filter((r) => r.status === "available" && r.number !== manageTarget?.roomNumber)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.number} &mdash; {r.roomTypeName ?? r.status}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {DATE_ACTIONS.includes(actionType) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newCheckOutDate" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    New Check-out Date *
                  </Label>
                  <span className="text-[11px] text-primary font-medium">Auto-calculated extension</span>
                </div>
                <Input
                  id="newCheckOutDate"
                  name="newCheckOutDate"
                  type="date"
                  required
                  min={manageTarget?.checkInDate?.split("T")[0]}
                  value={manageNewCheckOutDate}
                  onChange={(e) => setManageNewCheckOutDate(e.target.value)}
                  className="h-10 text-sm font-semibold"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Reason *
              </Label>
              <textarea
                id="reason"
                name="reason"
                rows={2}
                required
                value={manageReason}
                onChange={(e) => setManageReason(e.target.value)}
                placeholder="e.g. VIP guest complimentary upgrade / room transfer request..."
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>

            <div className="px-6 py-4 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-end gap-2.5 shrink-0">
              <Button type="button" variant="outline" className="h-10 text-xs sm:text-sm font-medium px-4" onClick={() => setManageTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" className="h-10 text-xs sm:text-sm font-semibold px-5 bg-primary hover:bg-primary/90 text-primary-foreground gap-2" disabled={stayMutation.isPending}>
                {stayMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Confirm Stay Change</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: IN-HOUSE PHONE SERVICE ORDER ─────────────────────────── */}
      <Dialog open={isNewServiceOpen} onOpenChange={(o) => {
        setIsNewServiceOpen(o);
        if (!o) {
          setActiveServiceRequestId(null);
          setActiveServiceRequestObj(null);
        }
      }}>
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl text-foreground">
          <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>In-House Phone Service Order</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Direct room folio billing active. Orders are dispatched immediately to on-duty staff.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              if (!serviceRoom) {
                toast({ title: "Room Required", description: "Please enter or select a room number", variant: "destructive" });
                return;
              }

              const selectedStaff = DEFAULT_HOTEL_STAFF.find((s) => s.id === serviceAssignedToId);
              const body: Record<string, unknown> = {
                orderSource: "phone",
                roomNumber: serviceRoom,
                guestName: serviceGuest || undefined,
                guestId: serviceGuestId || undefined,
                reservationId: serviceReservationId || undefined,
                serviceType,
                department: serviceDept,
                priority: servicePriority,
                chargeAmount: serviceAmount ? Number(serviceAmount) : 0,
                chargeToRoom: serviceChargeToRoom,
                description: serviceDesc || undefined,
                assignedToId: serviceAssignedToId || undefined,
                notes: `[Phone Order logged by Receptionist] Assigned to ${selectedStaff?.name || "On-Duty Staff"}`,
              };

              createRsMutation.mutate(body);
            }}
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Quick Guest Selector Banner */}
            {inHouse.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Select In-House Guest to Auto-Fill
                </Label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-xs font-medium"
                  value={serviceReservationId}
                  onChange={(e) => {
                    const found = inHouse.find((g) => g.id === e.target.value);
                    if (found) {
                      openServiceForInHouseGuest(found);
                    }
                  }}
                >
                  <option value="">-- Choose In-House Guest to Auto-Fill Room & Folio --</option>
                  {inHouse.map((g) => (
                    <option key={g.id} value={g.id}>
                      Room {g.roomNumber} &bull; {g.guestName} (Res #{g.reservationNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Room & Guest Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Room Number *</Label>
                <Input
                  value={serviceRoom}
                  onChange={(e) => setServiceRoom(e.target.value)}
                  placeholder="e.g. 102"
                  required
                  className="h-10 text-sm font-bold text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Guest Name</Label>
                <Input
                  value={serviceGuest}
                  onChange={(e) => setServiceGuest(e.target.value)}
                  placeholder="e.g. Dr. Dawit Alene"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Accountable Department & Dispatched Staff */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Accountable Department *
                </Label>
                <Select
                  value={serviceDept}
                  onValueChange={(val) => {
                    setServiceDept(val);
                    const match = DEFAULT_HOTEL_STAFF.find((s) => s.department === val);
                    if (match) setServiceAssignedToId(match.id);
                  }}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOTEL_DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.emoji} {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
                  <span>Accountable Staff Assigned</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    On-Duty
                  </Badge>
                </Label>
                <select
                  value={serviceAssignedToId}
                  onChange={(e) => setServiceAssignedToId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-xs font-medium"
                >
                  <option value="">-- Select Accountable Staff Member --</option>
                  {DEFAULT_HOTEL_STAFF.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.role} ({st.department.toUpperCase()})
                    </option>
                  ))}
                  {staffUsers.filter((u: any) => !DEFAULT_HOTEL_STAFF.some((s) => s.id === u.id)).map((u: any) => {
                    const nm = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
                    return (
                      <option key={u.id} value={u.id}>
                        {nm} (Hotel Staff)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Ethiopian Hospitality Quick Order Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Quick Ethiopian Order Preset
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { name: "Traditional Doro Wat Feast", price: "450.00", type: "food", dept: "restaurant" },
                  { name: "Ethiopian Coffee Ceremony", price: "150.00", type: "food", dept: "restaurant" },
                  { name: "Bole Airport VIP Transfer", price: "850.00", type: "transport", dept: "transport" },
                  { name: "Fresh Towels & Extra Linens", price: "0.00", type: "housekeeping", dept: "housekeeping" },
                  { name: "Laundry & Garment Pressing", price: "250.00", type: "laundry", dept: "laundry" },
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setServiceType(item.type);
                      setServiceDept(item.dept);
                      setServiceAmount(item.price);
                      setServiceDesc(item.name);
                      const match = DEFAULT_HOTEL_STAFF.find((s) => s.department === item.dept);
                      if (match) setServiceAssignedToId(match.id);
                    }}
                    className="px-2.5 py-1 text-xs rounded-full border border-border bg-muted/40 hover:bg-muted text-text-muted hover:text-text transition-colors"
                  >
                    + {item.name} {Number(item.price) > 0 ? `(ETB ${item.price})` : "(Free)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Service Type *</Label>
                <Select
                  value={serviceType}
                  onValueChange={(val) => {
                    setServiceType(val);
                    if (["food", "drinks"].includes(val)) setServiceDept("restaurant");
                    else if (["laundry"].includes(val)) setServiceDept("laundry");
                    else if (["transport", "taxi", "airport", "shuttle"].includes(val)) setServiceDept("transport");
                    else if (["housekeeping"].includes(val)) setServiceDept("housekeeping");
                    else if (["maintenance"].includes(val)) setServiceDept("maintenance");
                  }}
                >
                  <SelectTrigger className="h-10 text-sm">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Priority</Label>
                <Select value={servicePriority} onValueChange={setServicePriority}>
                  <SelectTrigger className="h-10 text-sm">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Order Description & Items
              </Label>
              <textarea
                rows={2}
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                placeholder="e.g. 1x Traditional Breakfast, 2x Fresh Orange Juice, extra pillows..."
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Charge Amount (ETB)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={serviceAmount}
                  onChange={(e) => setServiceAmount(e.target.value)}
                  placeholder="0.00 (Free if complimentary)"
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="chargeToRoom"
                  checked={serviceChargeToRoom}
                  onChange={(e) => setServiceChargeToRoom(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="chargeToRoom" className="text-xs font-semibold cursor-pointer">
                  Charge directly to Guest Room Folio
                </label>
              </div>
            </div>

            {serviceChargeToRoom && Number(serviceAmount) > 0 && (
              <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Receipt className="h-4 w-4" /> Running Stay Folio Line Item Preview:
                </span>
                <span className="font-mono font-bold">+ ETB {Number(serviceAmount).toFixed(2)}</span>
              </div>
            )}

            </div>

            <div className="px-6 py-4 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-end gap-2.5 shrink-0">
              <Button type="button" variant="outline" className="h-10 text-xs sm:text-sm font-medium px-4" onClick={() => setIsNewServiceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-10 text-xs sm:text-sm font-semibold px-5 bg-primary hover:bg-primary/90 text-primary-foreground gap-2" disabled={createRsMutation.isPending}>
                {createRsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Confirm Phone Order & Post Folio</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: DISPATCH ACCOUNTABLE STAFF (FOR PORTAL OR PHONE ORDERS) ─── */}
      <Dialog open={!!dispatchTarget} onOpenChange={(o) => !o && setDispatchTarget(null)}>
        <DialogContent className="max-w-md p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl text-foreground">
          <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                  Dispatch Accountable Staff
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Assign service ticket to on-duty team member.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs space-y-1.5">
              <div className="font-semibold text-text flex items-center justify-between">
                <span>Request #{dispatchTarget?.requestNumber}</span>
                <span className="font-mono text-primary font-bold">Room {dispatchTarget?.roomNumber}</span>
              </div>
              <p className="text-text-muted truncate">{dispatchTarget?.description || dispatchTarget?.serviceType}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Accountable Department
              </Label>
              <Select
                value={dispatchDept}
                onValueChange={(val) => {
                  setDispatchDept(val);
                  const match = DEFAULT_HOTEL_STAFF.find((s) => s.department === val);
                  if (match) setDispatchStaffId(match.name);
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOTEL_DEPARTMENTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.emoji} {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Assign Staff Member
              </Label>
              <select
                value={dispatchStaffId}
                onChange={(e) => setDispatchStaffId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-xs font-medium"
              >
                {DEFAULT_HOTEL_STAFF.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} — {st.role} ({st.department.toUpperCase()})
                  </option>
                ))}
                {staffUsers.map((u: any) => {
                  const nm = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
                  return (
                    <option key={u.id} value={nm}>
                      {nm} (Hotel Staff)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-end gap-2.5 shrink-0">
            <Button variant="outline" size="sm" className="h-9 text-xs px-3.5" onClick={() => setDispatchTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 gap-1.5"
              disabled={patchRsMutation.isPending}
              onClick={() => {
                if (!dispatchTarget) return;
                patchRsMutation.mutate({
                  id: dispatchTarget.id,
                  body: {
                    department: dispatchDept,
                    status: dispatchTarget.status === "requested" ? "assigned" : dispatchTarget.status,
                    notes: `Dispatched to ${dispatchStaffId} (${dispatchDept})`,
                  },
                });
                setDispatchTarget(null);
              }}
            >
              {patchRsMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <span>Dispatch & Notify</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: POLITE GUEST NOTIFICATION (ITEM UNAVAILABLE) ─────────── */}
      <Dialog open={!!cancelRequest} onOpenChange={(o) => !o && setCancelRequest(null)}>
        <DialogContent className="max-w-md p-0 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-[#0D1527] shadow-2xl text-foreground">
          <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                  Notify Guest: Item Unavailable
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Send polite front desk cancellation notice to in-house guest.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Request #{cancelRequest?.requestNumber}</span>
                <span className="font-semibold text-foreground">Room {cancelRequest?.roomNumber} • {cancelRequest?.guestName}</span>
              </div>
              <div className="text-foreground font-medium truncate">
                Item: {cancelRequest?.description || "In-Room Service"}
              </div>
            </div>

            {/* Quick polite message presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Polite Templates
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCancelReason(
                      `Dear ${cancelRequest?.guestName || "Guest"}, we sincerely apologize, but "${cancelRequest?.description || "your ordered food"}" is currently unavailable due to fresh kitchen inventory. Our chef is delighted to prepare a fresh alternative dish or assist you directly.`
                    )
                  }
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors"
                >
                  Dish Unavailable
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCancelReason(
                      `Dear ${cancelRequest?.guestName || "Guest"}, we apologize that this requested service item is momentarily out of stock. Please let us know if we can offer an upgraded amenity or alternative.`
                    )
                  }
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors"
                >
                  Amenity Out of Stock
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCancelReason(
                      `Dear ${cancelRequest?.guestName || "Guest"}, our front desk team reached out regarding your request. We apologize for any inconvenience as this service cannot be fulfilled at this specific time.`
                    )
                  }
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground border border-border transition-colors"
                >
                  General Front Desk Note
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Polite Message to Guest *
              </Label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Politely explain to the guest that the item is unavailable..."
                required
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="px-6 py-3.5 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-end gap-2.5 shrink-0">
            <Button variant="outline" size="sm" className="h-9 text-xs px-3.5" onClick={() => setCancelRequest(null)}>
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 gap-1.5"
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
              <span>Send Message & Update</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ASSIGN WAITER TO IN-HOUSE ROOM SERVICE ORDER ────────── */}
      <Dialog open={assignWaiterModalOpen} onOpenChange={setAssignWaiterModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="p-0 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span>Assign Waiter to Room Service Order</span>
            </DialogTitle>
          </DialogHeader>

          {assignTargetReq && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-bold">{assignTargetReq.requestNumber.replace(/#/g, "").replace(/-/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Room:</span>
                  <span className="font-bold text-primary">Room {assignTargetReq.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest Name:</span>
                  <span className="font-semibold">{assignTargetReq.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono">{assignTargetReq.phone || "0954123456"}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Dishes:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {Array.isArray(assignTargetReq.items)
                      ? assignTargetReq.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")
                      : String(assignTargetReq.items || "—")}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Available Waiter</Label>
                <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
                  <SelectTrigger className="w-full h-10 text-xs">
                    <SelectValue placeholder="Choose a waiter" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_WAITERS.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs py-2">
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="font-medium">{w.name} ({w.role})</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                            {w.status}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>AfroMessage SMS Notification</span>
                </div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                  Upon assignment, an automated AfroMessage SMS dispatch will be sent to the waiter&apos;s phone at <strong>0954123456</strong>, alerting them to fulfill the order for Room {assignTargetReq.roomNumber}.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAssignWaiterModalOpen(false)}
                  className="h-9 px-4 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmAssignWaiter}
                  className="h-9 px-5 text-xs font-bold bg-[#084C42] hover:bg-[#063a32] text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm & Dispatch SMS Alert
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

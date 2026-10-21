"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Calendar,
  User,
  Key,
  CheckCircle2,
  LogIn,
  BedDouble,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type RoomType = {
  id: string;
  name: string;
  code?: string;
  basePrice?: string;
};

type AvailableRoom = {
  id: string;
  number: string;
  roomTypeName?: string;
  roomTypeId?: string;
  currentPrice?: number;
};

type CreatedReservation = {
  id: string;
  reservationNumber?: string;
  guestId?: string;
  roomId?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount?: string;
  reservationType?: string;
};

type ReservationRecord = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  guestId?: string;
  roomTypeName?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  status: string;
  totalAmount?: number | string;
  reservationType?: string;
  bookingSource?: string;
};

type CheckInRecord = {
  id: string;
  checkInNumber?: string;
  checkinNumber?: string;
  reservationId?: string;
  reservationNumber?: string;
  guestId?: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  roomNumber?: string;
  identityVerified?: boolean;
  depositCollected?: boolean;
  depositAmount?: number | string;
  keyCardNumber?: string;
  digitalSignature?: string | null;
  checkedInBy?: string;
  notes?: string;
  createdAt?: string;
};

type Guest = {
  id: string;
  guestCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  passportNumber?: string;
  nationalId?: string;
  visaNumber?: string;
  phone?: string;
  alternativePhone?: string;
  email?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vipStatus?: boolean;
  guestType?: string;
  smokingPreference?: string;
  bedPreference?: string;
  floorPreference?: string;
  foodPreference?: string;
  specialRequests?: string;
  remarks?: string;
  notes?: string;
  totalStays?: number;
  isActive?: boolean;
  createdAt?: string;
};

type GuestStats = {
  total: number;
  vip: number;
  corporate: number;
  individual: number;
  travel_agency: number;
  government: number;
};

type GuestListResponse = {
  data: Guest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function guestTypeBadge(type?: string) {
  if (!type) return <Badge variant="muted">—</Badge>;
  const styles: Record<string, React.CSSProperties> = {
    individual: {},
    corporate: { backgroundColor: "#3b82f6", color: "#fff", border: "none" },
    travel_agency: { backgroundColor: "#8b5cf6", color: "#fff", border: "none" },
    government: { backgroundColor: "#f97316", color: "#fff", border: "none" },
  };
  const labels: Record<string, string> = {
    individual: "Individual",
    corporate: "Corporate",
    travel_agency: "Travel Agency",
    government: "Government",
  };
  return (
    <Badge
      variant={type === "individual" ? "default" : "muted"}
      style={styles[type] ?? {}}
    >
      {labels[type] ?? type}
    </Badge>
  );
}

function GuestFormFields({ defaultValues }: { defaultValues?: Partial<Guest> }) {
  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Personal</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" name="firstName" required defaultValue={defaultValues?.firstName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input id="middleName" name="middleName" defaultValue={defaultValues?.middleName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" name="lastName" required defaultValue={defaultValues?.lastName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gender">Gender</Label>
            <select name="gender" defaultValue={defaultValues?.gender ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="guestType">Guest Type</Label>
            <select name="guestType" defaultValue={defaultValues?.guestType ?? "individual"} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="travel_agency">Travel Agency</option>
              <option value="government">Government</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>VIP Status</Label>
            <div className="flex items-center gap-2 h-10">
              <input type="checkbox" name="vipStatus" id="vipStatus" defaultChecked={defaultValues?.vipStatus} className="h-4 w-4" />
              <label htmlFor="vipStatus" className="text-sm">VIP Guest</label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input id="phone" name="phone" defaultValue={defaultValues?.phone} placeholder="+251 ..." />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={defaultValues?.country ?? "Ethiopia"} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Identity (Fayida / National ID)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="idType">ID Type</Label>
            <select name="idType" defaultValue={defaultValues?.idType ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Select</option>
              <option value="fayida_id">Fayida ID (Ethiopian National ID)</option>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="driver_license">Driver License</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="idNumber">ID / Document Number</Label>
            <Input id="idNumber" name="idNumber" defaultValue={defaultValues?.idNumber} placeholder="Document ID" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="passportNumber">Passport Number</Label>
            <Input id="passportNumber" name="passportNumber" defaultValue={defaultValues?.passportNumber} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nationalId">National ID / Fayida ID (FIN / FAN)</Label>
            <Input id="nationalId" name="nationalId" defaultValue={defaultValues?.nationalId} placeholder="e.g. FIN-12345678" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [guestType, setGuestType] = useState("all");
  const [vipOnly, setVipOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 3-Step Guided Stepper: 1 = Guest Info, 2 = Room Reservation, 3 = Check-in
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [activeReservation, setActiveReservation] = useState<CreatedReservation | null>(null);

  // Reservation Form State (Step 2)
  const [resRoomId, setResRoomId] = useState("");
  const [resRoomTypeId, setResRoomTypeId] = useState("");
  const [resCheckIn, setResCheckIn] = useState("");
  const [resCheckOut, setResCheckOut] = useState("");
  const [resAdults, setResAdults] = useState("1");
  const [resChildren, setResChildren] = useState("0");
  const [resType, setResType] = useState("walk_in");
  const [resSpecialRequests, setResSpecialRequests] = useState("");
  const [resNotes, setResNotes] = useState("");

  // Check-in Form State (Step 3)
  const [keyCardNumber, setKeyCardNumber] = useState("");
  const [identityVerified, setIdentityVerified] = useState(true);
  const [depositCollected, setDepositCollected] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("card");
  const [paymentStatus, setPaymentStatus] = useState("settle_on_checkout");
  const [registrationCardGenerated, setRegistrationCardGenerated] = useState(false);
  const [checkedInBy, setCheckedInBy] = useState("");
  const [checkInNotes, setCheckInNotes] = useState("");

  function resetStepper() {
    setCurrentStep(1);
    setActiveGuest(null);
    setActiveReservation(null);
    setResRoomId("");
    setResRoomTypeId("");
    setResCheckIn(new Date().toISOString().split("T")[0]);
    setResCheckOut(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    setResAdults("1");
    setResChildren("0");
    setResType("walk_in");
    setResSpecialRequests("");
    setResNotes("");
    setKeyCardNumber("");
    setIdentityVerified(true);
    setDepositCollected(false);
    setDepositAmount("");
    setDepositMethod("card");
    setPaymentStatus("settle_on_checkout");
    setRegistrationCardGenerated(false);
    setCheckedInBy("");
    setCheckInNotes("");
  }

  function openReservationForGuest(guest: Guest) {
    resetStepper();
    setActiveGuest(guest);
    setCurrentStep(2);
    refetchAvailableRooms();
    setIsAddOpen(true);
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
    ...(guestType !== "all" ? { guestType } : {}),
    ...(vipOnly ? { vipStatus: "true" } : {}),
  });

  const { data: listData, isLoading } = useQuery<GuestListResponse>({
    queryKey: ["guests", page, search, guestType, vipOnly],
    queryFn: () => apiFetch<GuestListResponse>(`/guests?${queryParams}`),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<GuestStats>({
    queryKey: ["guests-stats"],
    queryFn: () => apiFetch<GuestStats>("/guests/stats"),
  });

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<RoomType[]>("/room-types"),
  });

  const { data: availableRooms = [], refetch: refetchAvailableRooms } = useQuery<AvailableRoom[]>({
    queryKey: ["available-rooms"],
    queryFn: () => apiFetch<AvailableRoom[]>("/rooms/availability"),
  });

  const [mainTab, setMainTab] = useState<"guests" | "reservations" | "checkin">("guests");
  const [resSearch, setResSearch] = useState("");
  const [checkinSearch, setCheckinSearch] = useState("");
  const [resPage, setResPage] = useState(1);
  const [checkinPage, setCheckinPage] = useState(1);

  const { data: rawReservations, isLoading: resLoading } = useQuery<any>({
    queryKey: ["guests-page-reservations"],
    queryFn: () => apiFetch<any>("/reservations?limit=100"),
    enabled: mainTab === "reservations",
  });
  const reservationsList: ReservationRecord[] = Array.isArray(rawReservations)
    ? rawReservations
    : Array.isArray(rawReservations?.data)
      ? rawReservations.data
      : [];

  const filteredReservations = reservationsList.filter((r) => {
    const query = resSearch.toLowerCase();
    return (
      (r.reservationNumber ?? "").toLowerCase().includes(query) ||
      (r.guestName ?? "").toLowerCase().includes(query) ||
      (r.roomNumber ?? "").toLowerCase().includes(query) ||
      (r.roomTypeName ?? "").toLowerCase().includes(query) ||
      (r.status ?? "").toLowerCase().includes(query)
    );
  });

  const { data: rawCheckins, isLoading: checkinsLoading } = useQuery<any>({
    queryKey: ["guests-page-checkins"],
    queryFn: () =>
      apiFetch<any>("/checkins?limit=100").catch(() =>
        apiFetch<any>("/checkin?limit=100")
      ),
    enabled: mainTab === "checkin",
  });
  const checkinsList: CheckInRecord[] = Array.isArray(rawCheckins)
    ? rawCheckins
    : Array.isArray(rawCheckins?.data)
      ? rawCheckins.data
      : [];

  const filteredCheckins = checkinsList.filter((c) => {
    const query = checkinSearch.toLowerCase();
    const gName = (
      c.guestName ||
      [c.guestFirstName, c.guestLastName].filter(Boolean).join(" ") ||
      ""
    ).toLowerCase();
    return (
      (c.checkInNumber || c.checkinNumber || "").toLowerCase().includes(query) ||
      (c.reservationNumber || "").toLowerCase().includes(query) ||
      (c.roomNumber || "").toLowerCase().includes(query) ||
      (c.keyCardNumber || "").toLowerCase().includes(query) ||
      gName.includes(query)
    );
  });

  const guests = listData?.data ?? [];
  const meta = listData?.meta;

  const resPageSize = 5;
  const resTotalPages = Math.max(1, Math.ceil(filteredReservations.length / resPageSize));
  const paginatedReservations = filteredReservations.slice((resPage - 1) * resPageSize, resPage * resPageSize);

  const checkinPageSize = 5;
  const checkinTotalPages = Math.max(1, Math.ceil(filteredCheckins.length / checkinPageSize));
  const paginatedCheckins = filteredCheckins.slice((checkinPage - 1) * checkinPageSize, checkinPage * checkinPageSize);

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<Guest>("/guests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (newGuest) => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
      setActiveGuest(newGuest);
    },
    onError: (err: Error) => toast({ title: "Registration Error", description: err.message, variant: "destructive" }),
  });

  const createResMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<CreatedReservation>("/reservations", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (newRes) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
      setActiveReservation(newRes);
      const assignedRoom = availableRooms.find((r) => r.id === (newRes.roomId || resRoomId));
      const roomNum = assignedRoom?.number || "101";
      setKeyCardNumber(`RFID-${roomNum}-${Date.now().toString(36).toUpperCase()}`);
    },
    onError: (err: Error) => toast({ title: "Reservation Error", description: err.message, variant: "destructive" }),
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/reservations/${id}/check-in`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
      queryClient.invalidateQueries({ queryKey: ["guests-page-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["guests-page-reservations"] });
      setIsAddOpen(false);
      resetStepper();
      setMainTab("checkin");
      toast({
        title: "Guest Checked In Successfully! 🎉",
        description: `Checked in to room. Record added to Step 3: Check-in records.`,
      });
    },
    onError: (err: Error) => toast({ title: "Check-in Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<Guest>(`/guests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      setEditGuest(null);
      toast({ title: "Guest updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function parseFormData(fd: FormData): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    fd.forEach((val, key) => {
      if (key === "vipStatus") obj[key] = true;
      else if (val !== "") obj[key] = val;
    });
    if (!fd.has("vipStatus")) obj["vipStatus"] = false;
    return obj;
  }

  function handleCreateReservation(andProceedToCheckIn: boolean) {
    if (!activeGuest?.id) {
      toast({ title: "Error", description: "No guest selected", variant: "destructive" });
      return;
    }
    if (!resCheckIn || !resCheckOut) {
      toast({ title: "Dates Required", description: "Please enter check-in and check-out dates", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      guestId: activeGuest.id,
      checkInDate: resCheckIn,
      checkOutDate: resCheckOut,
      adults: Number(resAdults) || 1,
      children: Number(resChildren) || 0,
      reservationType: resType || "walk_in",
      bookingSource: "direct",
    };
    if (resRoomId) payload.roomId = resRoomId;
    if (resRoomTypeId) payload.roomTypeId = resRoomTypeId;
    if (resSpecialRequests) payload.specialRequests = resSpecialRequests;
    if (resNotes) payload.notes = resNotes;

    createResMutation.mutate(payload, {
      onSuccess: (newRes) => {
        toast({
          title: "Reservation Created",
          description: `Booking #${newRes.reservationNumber || "Confirmed"} saved.`,
        });
        if (andProceedToCheckIn) {
          setCurrentStep(3);
        } else {
          setIsAddOpen(false);
          resetStepper();
        }
      },
    });
  }

  async function handleDelete() {
    if (!deleteGuest) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/guests/${deleteGuest.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
      toast({ title: "Guest deleted" });
      setDeleteGuest(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }

  const statCards = [
    { label: "Total Guests", value: stats?.total, color: "text-primary" },
    { label: "VIP Guests", value: stats?.vip, color: "text-warning" },
    { label: "Corporate", value: stats?.corporate, color: "text-info" },
    { label: "Government", value: stats?.government, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guests</h1>
          <p className="text-xs text-text-muted mt-0.5">Manage guest profiles, reservations, and front desk arrivals</p>
        </div>
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetStepper();
          }}
        >
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="pb-1">
              <DialogTitle className="flex items-center justify-between text-lg font-bold">
                <span>
                  {currentStep === 1
                    ? "Step 1: Register New Guest"
                    : currentStep === 2
                    ? `Step 2: Reserve Room for ${activeGuest?.firstName} ${activeGuest?.lastName}`
                    : `Step 3: Express Check-in for ${activeGuest?.firstName} ${activeGuest?.lastName}`}
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Stepper Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-border pb-3 px-1 mb-2">
              <div className="flex items-center gap-2 w-full">
                {/* Step 1 Tab */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    currentStep === 1
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : activeGuest
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      : "text-muted-foreground opacity-60"
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[11px] font-bold">
                    {activeGuest ? "✓" : "1"}
                  </span>
                  <span>1. Guest Profile</span>
                </button>

                <div className={`h-0.5 flex-1 transition-colors ${currentStep >= 2 || activeGuest ? "bg-primary" : "bg-border"}`} />

                {/* Step 2 Tab */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeGuest) {
                      refetchAvailableRooms();
                      setCurrentStep(2);
                    }
                  }}
                  disabled={!activeGuest}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                    currentStep === 2
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : activeReservation
                      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer"
                      : activeGuest
                      ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                      : "text-muted-foreground opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[11px] font-bold">
                    {activeReservation ? "✓" : "2"}
                  </span>
                  <span>2. Reservation</span>
                </button>

                <div className={`h-0.5 flex-1 transition-colors ${currentStep >= 3 || activeReservation ? "bg-primary" : "bg-border"}`} />

                {/* Step 3 Tab */}
                <button
                  type="button"
                  onClick={() => activeReservation && setCurrentStep(3)}
                  disabled={!activeReservation}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                    currentStep === 3
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : activeReservation
                      ? "bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                      : "text-muted-foreground opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[11px] font-bold">
                    3
                  </span>
                  <span>3. Check-In</span>
                </button>
              </div>
            </div>

            {/* STEP 1: GUEST REGISTRATION FORM */}
            {currentStep === 1 && (
              <form
                id="guest-registration-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = parseFormData(new FormData(e.currentTarget));
                  addMutation.mutate(data, {
                    onSuccess: (newGuest) => {
                      toast({
                        title: "Guest Registered Successfully",
                        description: `${newGuest.firstName} ${newGuest.lastName} (${newGuest.guestCode}) registered.`,
                      });
                      refetchAvailableRooms();
                      setCurrentStep(2);
                    },
                  });
                }}
              >
                <GuestFormFields defaultValues={activeGuest ?? undefined} />

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddOpen(false);
                      resetStepper();
                    }}
                  >
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={addMutation.isPending}
                      onClick={() => {
                        const form = document.getElementById("guest-registration-form") as HTMLFormElement;
                        if (form) {
                          const data = parseFormData(new FormData(form));
                          addMutation.mutate(data, {
                            onSuccess: (newGuest) => {
                              toast({
                                title: "Guest Saved",
                                description: `${newGuest.firstName} ${newGuest.lastName} saved successfully.`,
                              });
                              setIsAddOpen(false);
                              resetStepper();
                            },
                          });
                        }
                      }}
                    >
                      Save Guest Only
                    </Button>
                    <Button type="submit" disabled={addMutation.isPending}>
                      {addMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Register & Next: Reserve Room
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: ROOM RESERVATION FORM */}
            {currentStep === 2 && activeGuest && (
              <div className="space-y-4">
                {/* Auto-selected Guest Profile Confirmation Banner */}
                <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {activeGuest.firstName} {activeGuest.middleName ? `${activeGuest.middleName} ` : ""}{activeGuest.lastName}
                        </span>
                        {activeGuest.vipStatus && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            ⭐ VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[activeGuest.guestCode, activeGuest.phone, activeGuest.nationality || "Ethiopian"].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                    ✓ Auto-linked Guest
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* Assigned Room */}
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="resRoomId" className="font-medium">Assigned Room</Label>
                      <span className="text-xs text-primary font-medium">Assigned at reservation</span>
                    </div>
                    <select
                      id="resRoomId"
                      value={resRoomId}
                      onChange={(e) => {
                        const rId = e.target.value;
                        setResRoomId(rId);
                        const found = availableRooms.find((r) => r.id === rId);
                        if (found?.roomTypeId) {
                          setResRoomTypeId(found.roomTypeId);
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="">-- Select Available Room (Assigned upon reservation) --</option>
                      {availableRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} {r.roomTypeName ? `• ${r.roomTypeName}` : ""} {r.currentPrice ? `($${Number(r.currentPrice).toFixed(2)}/night)` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-text-muted">
                      Room assignment is handled upfront so check-in can be processed instantly without re-allocating.
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="resCheckIn">Check-in Date *</Label>
                      <Input
                        id="resCheckIn"
                        type="date"
                        required
                        value={resCheckIn}
                        onChange={(e) => setResCheckIn(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="resCheckOut">Check-out Date *</Label>
                      <Input
                        id="resCheckOut"
                        type="date"
                        required
                        value={resCheckOut}
                        onChange={(e) => setResCheckOut(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Room Type */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="resRoomTypeId">Room Type</Label>
                    <select
                      id="resRoomTypeId"
                      value={resRoomTypeId}
                      onChange={(e) => setResRoomTypeId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <option value="">Match Assigned Room / Any Room Type</option>
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Adults, Children, and Reservation Type */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="resAdults">Adults</Label>
                      <Input
                        id="resAdults"
                        type="number"
                        min="1"
                        value={resAdults}
                        onChange={(e) => setResAdults(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="resChildren">Children</Label>
                      <Input
                        id="resChildren"
                        type="number"
                        min="0"
                        value={resChildren}
                        onChange={(e) => setResChildren(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="resType">Reservation Type</Label>
                      <select
                        id="resType"
                        value={resType}
                        onChange={(e) => setResType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                      >
                        <option value="walk_in">Walk-in</option>
                        <option value="standard">Standard</option>
                        <option value="group">Group</option>
                        <option value="corporate">Corporate</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                  </div>

                  {/* Special Requests and Notes */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="resSpecialRequests">Special Requests</Label>
                    <textarea
                      id="resSpecialRequests"
                      rows={2}
                      value={resSpecialRequests}
                      onChange={(e) => setResSpecialRequests(e.target.value)}
                      placeholder="e.g. Quiet room, extra towels, early morning call..."
                      className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="resNotes">Notes</Label>
                    <textarea
                      id="resNotes"
                      rows={2}
                      value={resNotes}
                      onChange={(e) => setResNotes(e.target.value)}
                      placeholder="Optional front desk reservation notes..."
                      className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back to Guest
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={createResMutation.isPending}
                        onClick={() => handleCreateReservation(false)}
                      >
                        Finish (Reserve Only)
                      </Button>
                      <Button
                        type="button"
                        disabled={createResMutation.isPending}
                        onClick={() => handleCreateReservation(true)}
                      >
                        {createResMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Reserve & Proceed to Check-In
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CHECK-IN & KEYCARD FORM */}
            {currentStep === 3 && activeGuest && activeReservation && (() => {
              const assignedRoom = availableRooms.find((r) => r.id === (activeReservation.roomId || resRoomId));
              const roomPrice = Number(assignedRoom?.currentPrice || (activeReservation.totalAmount ? Number(activeReservation.totalAmount) : 0));
              const checkInDateObj = new Date(resCheckIn || activeReservation.checkInDate || new Date());
              const checkOutDateObj = new Date(resCheckOut || activeReservation.checkOutDate || new Date(Date.now() + 86400000));
              const nightsCount = Math.max(1, Math.round((checkOutDateObj.getTime() - checkInDateObj.getTime()) / (1000 * 60 * 60 * 24))) || 1;
              const calculatedTotal = activeReservation.totalAmount ? Number(activeReservation.totalAmount) : (roomPrice * nightsCount);
              const roomDisplayNum = activeReservation.roomNumber || assignedRoom?.number || availableRooms.find((r) => r.id === resRoomId)?.number || "Assigned";

              return (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const settlementLabel =
                      paymentStatus === "settle_on_checkout"
                        ? "Settle on Checkout"
                        : paymentStatus === "paid_in_advance"
                        ? "Paid in Advance"
                        : paymentStatus === "direct_billing"
                        ? "Direct Corporate Billing"
                        : "Partial Prepayment";
                    const notesParts = [
                      checkInNotes?.trim() || null,
                      `Settlement: ${settlementLabel}`,
                      depositCollected && depositAmount
                        ? `Deposit: ${depositAmount} ETB via ${depositMethod.toUpperCase()}`
                        : null,
                    ].filter(Boolean);

                    checkInMutation.mutate({
                      id: activeReservation.id,
                      body: {
                        keyCardNumber: keyCardNumber || undefined,
                        identityVerified,
                        depositCollected,
                        depositAmount: depositAmount ? Number(depositAmount) : undefined,
                        registrationCardGenerated,
                        checkedInBy: checkedInBy || undefined,
                        notes: notesParts.length > 0 ? notesParts.join(" | ") : undefined,
                      },
                    });
                  }}
                  className="space-y-4"
                >
                  {/* SECTION A: GUEST INFORMATION */}
                  <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <User className="w-4 h-4" />
                        <span>A. Guest Information</span>
                      </div>
                      {activeGuest.vipStatus && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-xs">
                          <Star className="w-3 h-3 mr-1 fill-amber-500" /> VIP Guest
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Full Name</span>
                        <span className="font-semibold text-foreground text-sm">
                          {activeGuest.firstName} {activeGuest.middleName ? `${activeGuest.middleName} ` : ""}{activeGuest.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                        <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {activeGuest.phone || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Identification</span>
                        <span className="font-medium text-foreground">
                          {activeGuest.idType ? `${activeGuest.idType.toUpperCase()}: ` : "ID: "}
                          {activeGuest.idNumber || activeGuest.passportNumber || activeGuest.nationalId || "Verified on file"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Guest Type / Code</span>
                        <span className="font-mono text-muted-foreground">
                          {activeGuest.guestCode || activeGuest.guestType || "Individual"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION B: RESERVATION INFORMATION */}
                  <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Calendar className="w-4 h-4" />
                        <span>B. Reservation Information</span>
                      </div>
                      <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        #{activeReservation.reservationNumber || activeReservation.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Booking Type / Source</span>
                        <span className="font-medium text-foreground capitalize">
                          {(resType || activeReservation.reservationType || "Walk-in").replace(/_/g, " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Check-in Date</span>
                        <span className="font-medium text-foreground">
                          {resCheckIn || activeReservation.checkInDate || "Today"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Check-out Date</span>
                        <span className="font-medium text-foreground">
                          {resCheckOut || activeReservation.checkOutDate || "Tomorrow"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Duration & Occupancy</span>
                        <span className="font-medium text-foreground">
                          {nightsCount} {nightsCount === 1 ? "Night" : "Nights"} ({resAdults} Adult{Number(resChildren) > 0 ? `, ${resChildren} Child` : ""})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: ROOM ASSIGNMENT INFORMATION */}
                  <div className="p-3.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/15">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <BedDouble className="w-4 h-4" />
                        <span>C. Room Assignment Information</span>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Clean & Ready for Occupancy
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Assigned Room</span>
                        <span className="font-bold text-base text-foreground font-mono block mt-0.5">
                          Room {roomDisplayNum}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Room Type</span>
                        <span className="font-medium text-foreground block mt-0.5">
                          {assignedRoom?.roomTypeName || "Standard Room"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Nightly Rate</span>
                        <span className="font-semibold text-foreground block mt-0.5">
                          {roomPrice > 0 ? `${roomPrice.toLocaleString()} ETB / night` : "Standard Rate"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION D: PAYMENT & DEPOSIT INFORMATION */}
                  <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <CreditCard className="w-4 h-4" />
                        <span>D. Payment and Deposit Information</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">Estimated Total Stay</span>
                        <span className="text-sm font-bold text-foreground">
                          {calculatedTotal > 0 ? `${calculatedTotal.toLocaleString()} ETB` : "0.00 ETB"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Payment Settlement Arrangement */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="paymentStatus" className="text-xs font-medium">Payment Settlement Arrangement</Label>
                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                          <SelectTrigger id="paymentStatus" className="h-8 text-xs">
                            <SelectValue placeholder="Select arrangement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="settle_on_checkout">Settle Full Balance on Check-out</SelectItem>
                            <SelectItem value="paid_in_advance">Pre-paid in Advance (Full Payment)</SelectItem>
                            <SelectItem value="direct_billing">Direct Corporate Billing / City Ledger</SelectItem>
                            <SelectItem value="partial_prepayment">Partial Pre-payment Received</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Defines when room charges & incidentals will be settled.
                        </p>
                      </div>

                      {/* Deposit Payment Method */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="depositMethod" className="text-xs font-medium">Deposit / Payment Method</Label>
                        <Select value={depositMethod} onValueChange={setDepositMethod}>
                          <SelectTrigger id="depositMethod" className="h-8 text-xs">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Credit / Debit Card (POS)</SelectItem>
                            <SelectItem value="cash">Cash Settlement (ETB / USD)</SelectItem>
                            <SelectItem value="mobile_money">Telebirr / Mobile Money</SelectItem>
                            <SelectItem value="bank_transfer">CBE Birr / Direct Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Preferred channel for security deposit or charges.
                        </p>
                      </div>
                    </div>

                    {/* Security Deposit Amount */}
                    <div className="p-2.5 rounded-md border border-border/80 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="depositCollected"
                            checked={depositCollected}
                            onChange={(e) => setDepositCollected(e.target.checked)}
                            className="h-4 w-4 rounded accent-primary cursor-pointer"
                          />
                          <label htmlFor="depositCollected" className="text-xs font-medium cursor-pointer">
                            Collect Security / Incidentals Deposit Now
                          </label>
                        </div>
                        <span className="text-[11px] text-muted-foreground">(Refundable on check-out)</span>
                      </div>

                      {depositCollected && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                          <div>
                            <Input
                              id="depositAmount"
                              type="number"
                              step="0.01"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              placeholder="Deposit Amount (e.g. 1000 ETB)"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] px-2 flex-1"
                              onClick={() => setDepositAmount("500")}
                            >
                              500 ETB
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] px-2 flex-1"
                              onClick={() => setDepositAmount("1000")}
                            >
                              1,000 ETB
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] px-2 flex-1"
                              onClick={() => setDepositAmount("2000")}
                            >
                              2,000 ETB
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RFID Keycard UID */}
                    <div className="grid gap-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="keyCardNumber" className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-primary" /> Key Card Number / RFID UID
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[11px] font-medium text-primary hover:bg-primary/10"
                          onClick={() => {
                            const generatedUid = `RFID-${roomDisplayNum}-${Date.now().toString(36).toUpperCase()}`;
                            setKeyCardNumber(generatedUid);
                            toast({ title: "RFID Keycard Encoded", description: `Assigned: ${generatedUid}` });
                          }}
                        >
                          ⚡ Auto-Encode RFID Keycard
                        </Button>
                      </div>
                      <Input
                        id="keyCardNumber"
                        value={keyCardNumber}
                        onChange={(e) => setKeyCardNumber(e.target.value)}
                        placeholder="e.g. RFID-101-L7X89Q"
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Verification Checkboxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="identityVerified"
                          checked={identityVerified}
                          onChange={(e) => setIdentityVerified(e.target.checked)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                        />
                        <label htmlFor="identityVerified" className="text-xs font-medium cursor-pointer">
                          Identity Verified (Passport / Fayida ID)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="registrationCardGenerated"
                          checked={registrationCardGenerated}
                          onChange={(e) => setRegistrationCardGenerated(e.target.checked)}
                          className="h-4 w-4 rounded accent-primary cursor-pointer"
                        />
                        <label htmlFor="registrationCardGenerated" className="text-xs font-medium cursor-pointer">
                          Registration Card Printed & Signed
                        </label>
                      </div>
                    </div>

                    {/* Receptionist & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="grid gap-1">
                        <Label htmlFor="checkedInBy" className="text-xs font-medium">Checked In By (Staff Name)</Label>
                        <Input
                          id="checkedInBy"
                          value={checkedInBy}
                          onChange={(e) => setCheckedInBy(e.target.value)}
                          placeholder="e.g. Front Desk Officer"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="checkInNotes" className="text-xs font-medium">Arrival Notes (Optional)</Label>
                        <Input
                          id="checkInNotes"
                          value={checkInNotes}
                          onChange={(e) => setCheckInNotes(e.target.value)}
                          placeholder="e.g. Late checkout requested, luggage in room"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Actions */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back to Reservation
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsAddOpen(false);
                          resetStepper();
                          toast({
                            title: "Reservation Retained",
                            description: "Reservation confirmed. You can check in the guest later via the Check-in tab.",
                          });
                        }}
                      >
                        Skip Check-in
                      </Button>
                      <Button
                        type="submit"
                        disabled={checkInMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {checkInMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="mr-2 h-4 w-4" />
                        )}
                        Complete Check-in
                      </Button>
                    </div>
                  </div>
                </form>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards (Compact) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-surface/50 border-border p-3 shadow-none">
            <div className="text-xs font-medium text-text-muted truncate">{s.label}</div>
            <div className="mt-1">
              {statsLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <div className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* ── 3-STEP NUMBERED WORKFLOW TABS ─────────────────────────────────── */}
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Front Desk Operational Lifecycle</CardTitle>
              <p className="text-xs text-text-muted mt-0.5">
                Step-by-step guest journey: Guest Records ➔ Room Reservations ➔ Completed Check-In Logs
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium bg-surface px-2.5 py-1 rounded-md border border-border">
              <span className="h-2 w-2 rounded-full bg-success inline-block"></span>
              Live Sync
            </div>
          </div>

          {/* Stepper Buttons (1 -> 2 -> 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-4">
            {/* Step 1 Button */}
            <button
              onClick={() => setMainTab("guests")}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                mainTab === "guests"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface hover:bg-muted/40 border-border text-text"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                  mainTab === "guests"
                    ? "bg-white text-primary"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                1
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Step 1</div>
                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>Register Guest</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 ${mainTab === "guests" ? "opacity-100" : "opacity-40"}`} />
            </button>

            {/* Step 2 Button */}
            <button
              onClick={() => setMainTab("reservations")}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                mainTab === "reservations"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface hover:bg-muted/40 border-border text-text"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                  mainTab === "reservations"
                    ? "bg-white text-primary"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                2
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Step 2</div>
                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>The Reservation</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 ${mainTab === "reservations" ? "opacity-100" : "opacity-40"}`} />
            </button>

            {/* Step 3 Button */}
            <button
              onClick={() => setMainTab("checkin")}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                mainTab === "checkin"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface hover:bg-muted/40 border-border text-text"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                  mainTab === "checkin"
                    ? "bg-white text-primary"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                3
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Step 3</div>
                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5 shrink-0" />
                  <span>The Check-In</span>
                </div>
              </div>
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${mainTab === "checkin" ? "opacity-100 text-white" : "opacity-40"}`} />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1 CONTENT: REGISTERED GUESTS (STEP 1)
             ══════════════════════════════════════════════════════════════════ */}
          {mainTab === "guests" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Search guests by name, phone, or code..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={guestType} onValueChange={(v) => { setGuestType(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Guest Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="travel_agency">Travel Agency</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={vipOnly ? "default" : "outline"}
                  onClick={() => { setVipOnly(!vipOnly); setPage(1); }}
                  className="gap-1"
                >
                  <Star className="h-4 w-4" /> VIP Only
                </Button>
                <Button
                  size="sm"
                  onClick={() => { resetStepper(); setIsAddOpen(true); }}
                  className="gap-1.5 ml-auto"
                >
                  <Plus className="h-4 w-4" /> + Register Guest
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest Code</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>VIP</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Stays</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(9)].map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : guests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-text-muted">No guests found.</TableCell>
                      </TableRow>
                    ) : (
                      guests.map((guest) => (
                        <TableRow
                          key={guest.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/guests/${guest.id}`)}
                        >
                          <TableCell className="font-mono text-xs">{guest.guestCode}</TableCell>
                          <TableCell className="font-medium">
                            {[guest.firstName, guest.middleName, guest.lastName].filter(Boolean).join(" ")}
                          </TableCell>
                          <TableCell>{guestTypeBadge(guest.guestType)}</TableCell>
                          <TableCell>
                            {guest.vipStatus && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                          </TableCell>
                          <TableCell>{guest.phone ?? "—"}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{guest.email ?? "—"}</TableCell>
                          <TableCell>{guest.nationality ?? "—"}</TableCell>
                          <TableCell>{guest.totalStays ?? 0}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1 font-medium"
                                title="Reserve Room"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReservationForGuest(guest);
                                }}
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                Reserve
                              </Button>
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); setEditGuest(guest); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger hover:text-danger"
                                onClick={(e) => { e.stopPropagation(); setDeleteGuest(guest); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <TablePagination
                currentPage={page}
                totalPages={meta?.totalPages || 1}
                totalItems={meta?.total}
                pageSize={5}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(meta?.totalPages || 1, p + 1))}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2 CONTENT: THE RESERVATION (STEP 2)
             ══════════════════════════════════════════════════════════════════ */}
          {mainTab === "reservations" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Search reservation #, guest name, room, or status..."
                    value={resSearch}
                    onChange={(e) => { setResSearch(e.target.value); setResPage(1); }}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    Total Reservations: <span className="font-semibold text-text ml-1">{filteredReservations.length}</span>
                  </Badge>
                  <Button size="sm" onClick={() => router.push("/reservations")} className="gap-1.5">
                    <Calendar className="h-4 w-4" /> Go to Full Reservations
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Res #</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Room / Room Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Total (ETB)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(7)].map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : paginatedReservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                          No reservation records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedReservations.map((res) => (
                        <TableRow key={res.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs font-semibold text-text">
                            {res.reservationNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-sm">{res.guestName ?? "—"}</span>
                              {(res.reservationType === "online" || res.bookingSource === "online" || res.bookingSource === "ota") && (
                                <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30 gap-1 text-[9px] px-1.5 py-0 font-semibold">
                                  <Globe className="w-2.5 h-2.5" /> Online
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <BedDouble className="h-3.5 w-3.5 text-text-muted" />
                              <span>{res.roomNumber ? `Room ${res.roomNumber}` : "Unassigned"}</span>
                            </div>
                            <div className="text-xs text-text-muted">{res.roomTypeName ?? "—"}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-text-muted" />
                              <span>
                                {res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : "—"} →{" "}
                                {res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {res.totalAmount != null ? `$${Number(res.totalAmount).toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                res.status === "confirmed"
                                  ? "info"
                                  : res.status === "checked_in"
                                  ? "success"
                                  : res.status === "checked_out"
                                  ? "muted"
                                  : res.status === "cancelled"
                                  ? "danger"
                                  : "warning"
                              }
                              className="text-[10px] uppercase"
                            >
                              {(res.status ?? "").replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {["pending", "confirmed", "guaranteed"].includes(res.status) ? (
                              <Button
                                size="sm"
                                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => router.push(`/check-in?resId=${res.id}`)}
                              >
                                <LogIn className="h-3 w-3" /> Check-In
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-text-muted"
                                onClick={() => router.push(`/reservations`)}
                              >
                                View Folio
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Reservation Pagination */}
              <TablePagination
                currentPage={resPage}
                totalPages={resTotalPages}
                totalItems={filteredReservations.length}
                pageSize={resPageSize}
                onPrev={() => setResPage((p) => Math.max(1, p - 1))}
                onNext={() => setResPage((p) => Math.min(resTotalPages, p + 1))}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3 CONTENT: THE CHECK-IN (STEP 3)
             ══════════════════════════════════════════════════════════════════ */}
          {mainTab === "checkin" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Search check-in #, guest, room, or keycard..."
                    value={checkinSearch}
                    onChange={(e) => { setCheckinSearch(e.target.value); setCheckinPage(1); }}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    Total Check-in Records: <span className="font-semibold text-text ml-1">{filteredCheckins.length}</span>
                  </Badge>
                  <Button size="sm" onClick={() => router.push("/check-in")} className="gap-1.5">
                    <LogIn className="h-4 w-4" /> Check-In Desk
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check-in #</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Keycard RFID</TableHead>
                      <TableHead>ID Verified</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Checked In At</TableHead>
                      <TableHead>Staff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkinsLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(8)].map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : paginatedCheckins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-text-muted">
                          No check-in records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCheckins.map((chk) => {
                        const guestName =
                          chk.guestName ||
                          [chk.guestFirstName, chk.guestLastName].filter(Boolean).join(" ") ||
                          "—";
                        const checkInNum = chk.checkInNumber || chk.checkinNumber || chk.id.slice(0, 8);
                        return (
                          <TableRow key={chk.id} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs font-semibold text-text">
                              {checkInNum}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {guestName}
                              {chk.reservationNumber && (
                                <div className="text-[11px] text-text-muted font-mono">
                                  Res #{chk.reservationNumber}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-semibold">
                                Room {chk.roomNumber ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {chk.keyCardNumber ? (
                                <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted/60 px-2 py-0.5 rounded">
                                  <Key className="h-3 w-3 text-text-muted" /> {chk.keyCardNumber}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {chk.identityVerified ? (
                                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1 text-[10px]">
                                  <ShieldCheck className="h-3 w-3" /> Verified
                                </Badge>
                              ) : (
                                <Badge variant="muted" className="text-[10px]">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {chk.depositCollected ? (
                                <span className="text-success font-medium">
                                  ${Number(chk.depositAmount ?? 0).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-text-muted">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-text-muted">
                              {chk.createdAt ? new Date(chk.createdAt).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {chk.checkedInBy || "Front Desk"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Check-in Pagination */}
              <TablePagination
                currentPage={checkinPage}
                totalPages={checkinTotalPages}
                totalItems={filteredCheckins.length}
                pageSize={checkinPageSize}
                onPrev={() => setCheckinPage((p) => Math.max(1, p - 1))}
                onNext={() => setCheckinPage((p) => Math.min(checkinTotalPages, p + 1))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Guest</DialogTitle></DialogHeader>
          {editGuest && (
            <form onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate({ id: editGuest.id, body: parseFormData(new FormData(e.currentTarget)) });
            }}>
              <GuestFormFields defaultValues={editGuest} />
              <div className="mt-4">
                <Button type="submit" className="w-full" disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteGuest} onOpenChange={(o) => !o && setDeleteGuest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Guest</DialogTitle></DialogHeader>
          <p className="text-text-muted">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-text">{deleteGuest?.firstName} {deleteGuest?.lastName}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteGuest(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

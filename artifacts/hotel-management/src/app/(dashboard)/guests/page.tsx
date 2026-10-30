"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Star,
  Search,
  ChevronRight,
  Pencil,
  Trash2,
  Calendar,
  User,
  Users,
  UserCheck,
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
  Lock,
  Wrench,
  Eye,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
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
import { FaydaScanner } from "@/components/fayda-scanner";
import type { ParsedFaydaGuest } from "@/lib/fayda";
import { SpecialRequestsMultiSelect } from "@/components/special-requests-multi-select";
import { GuestRegistrationModal } from "@/components/modals/guest-registration-modal";
import { ReservationBookingModal } from "@/components/modals/reservation-booking-modal";
import { RoomCheckInModal } from "@/components/modals/room-checkin-modal";
import {
  COUNTRIES,
  ADDIS_ABABA_SUB_CITIES,
  ETHIOPIAN_MAJOR_CITIES,
  ERITREAN_MAJOR_CITIES,
  INTERNATIONAL_CITIES,
} from "@/lib/geo-data";

const ONLINE_RESERVATION_SPECIAL_REQUESTS = [
  {
    category: "🍽️ In-Room Dining & Breakfast",
    items: [
      "Traditional Doro Wat Feast ($18.50)",
      "Deluxe Angus Burger & Fries ($14.00)",
      "Continental Club Sandwich ($11.50)",
      "Fresh Seasonal Fruit Platter ($8.00)",
      "Signature Ethiopian Jebena Coffee ($4.50)",
      "Fresh Mango & Avocado Smoothie ($5.50)",
      "Sparkling Mineral Water (750ml, $3.50)",
    ],
  },
  {
    category: "🛏️ Room Amenities & Comfort",
    items: [
      "Extra Feather Pillows (x2)",
      "Extra Warm Wool Blanket",
      "Fresh Bath Towels & Robe Set",
      "Baby Cot / Crib Setup",
      "Room Evening Turn-down Service",
    ],
  },
  {
    category: "🛎️ Guest & Stay Services",
    items: [
      "Morning Wake-up Call",
      "Express Laundry & Pressing ($12.00)",
      "Quiet Room / High Floor Preference",
      "Early Check-In Request",
      "Late Check-Out Request",
      "AC / Climate Adjustment Assistance",
    ],
  },
  {
    category: "🚗 Airport & Chauffeur Transport",
    items: [
      "Airport Arrival VIP Meet & Pickup ($30.00)",
      "Airport Chauffeur Drop-off ($25.00)",
      "Complimentary Downtown / UNECA Shuttle",
      "Half-Day City Tour Chauffeur ($55.00)",
      "Luggage & Bellhop Vehicle Dispatch",
    ],
  },
];

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
  notes?: string;
  bookingSource?: string;
  paidAmount?: number | string;
  depositAmount?: number | string;
};

type ReservationRecord = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  guestId?: string;
  guestCode?: string;
  guestPhone?: string;
  guestEmail?: string;
  roomId?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  status: string;
  totalAmount?: number | string;
  reservationType?: string;
  bookingSource?: string;
  notes?: string;
  paidAmount?: number | string;
  depositAmount?: number | string;
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
  walkIn?: number;
  online?: number;
  checkedIn?: number;
};

type GuestListResponse = {
  data: Guest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function guestTypeBadge(type?: string) {
  if (!type) return <Badge variant="muted">—</Badge>;
  const styles: Record<string, React.CSSProperties> = {
    individual: {},
    couple: { backgroundColor: "#f43f5e", color: "#fff", border: "none" },
    friends: { backgroundColor: "#06b6d4", color: "#fff", border: "none" },
    family: { backgroundColor: "#10b981", color: "#fff", border: "none" },
    corporate: { backgroundColor: "#3b82f6", color: "#fff", border: "none" },
    travel_agency: { backgroundColor: "#8b5cf6", color: "#fff", border: "none" },
    government: { backgroundColor: "#f97316", color: "#fff", border: "none" },
  };
  const labels: Record<string, string> = {
    individual: "Individual",
    couple: "Couple",
    friends: "Friends / Companions",
    family: "Family",
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

function GuestFormFields({ defaultValues }: { defaultValues?: Partial<Guest> & Record<string, any> }) {
  const dobFormatted = defaultValues?.dateOfBirth ? String(defaultValues.dateOfBirth).split("T")[0] : "";
  const initialCountry = defaultValues?.country || "Ethiopia";
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);

  const initialCity = defaultValues?.city || "Bole";
  const [cityInput, setCityInput] = useState(initialCity);

  const initialPhone = (defaultValues?.phone || "").replace(/\D/g, "").slice(0, 10);
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState("");

  const initialFan = (defaultValues?.nationalId || defaultValues?.idNumber || "").replace(/\D/g, "").slice(0, 16);
  const [nationalId, setNationalId] = useState(initialFan);
  const [fanError, setFanError] = useState("");

  useEffect(() => {
    if (defaultValues?.country !== undefined) {
      setSelectedCountry(defaultValues.country || "Ethiopia");
    }
    if (defaultValues?.city !== undefined) {
      setCityInput(defaultValues.city || "");
    }
  }, [defaultValues?.country, defaultValues?.city]);

  useEffect(() => {
    if (defaultValues?.phone !== undefined) {
      const sanitized = String(defaultValues.phone || "").replace(/\D/g, "").slice(0, 10);
      setPhone(sanitized);
      setPhoneError("");
    }
  }, [defaultValues?.phone]);

  useEffect(() => {
    const rawFan = defaultValues?.nationalId || defaultValues?.idNumber;
    if (rawFan !== undefined) {
      const sanitized = String(rawFan || "").replace(/\D/g, "").slice(0, 16);
      setNationalId(sanitized);
      setFanError("");
    }
  }, [defaultValues?.nationalId, defaultValues?.idNumber]);

  const countryNormalized = (selectedCountry || "").trim().toLowerCase();
  const isEritrea = countryNormalized.includes("eritrea");
  const isKenya = countryNormalized.includes("kenya");
  const isEthiopia = countryNormalized === "" || countryNormalized.includes("ethiopia");

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Personal Details</h3>
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
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              name="phone"
              required
              maxLength={10}
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length > 10) {
                  setPhone(val.slice(0, 10));
                  setPhoneError("Phone number cannot exceed 10 digits");
                  return;
                }
                setPhone(val);
                if (val.length > 0 && val.length < 10) {
                  setPhoneError(`${val.length}/10 digits (Standard phone is 10 digits)`);
                } else {
                  setPhoneError("");
                }
              }}
              onKeyDown={(e) => {
                if (
                  phone.length >= 10 &&
                  !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"].includes(e.key) &&
                  !e.ctrlKey &&
                  !e.metaKey
                ) {
                  if (/\d/.test(e.key)) {
                    e.preventDefault();
                    setPhoneError("Cannot exceed 10 digits (e.g. 0911318622)");
                  }
                }
              }}
              placeholder="0911318622"
              className={phoneError && phone.length > 0 ? "border-rose-500/80 focus-visible:ring-rose-500 font-medium" : "font-medium"}
            />
            {phoneError && (
              <p className="text-[11px] text-rose-500 font-medium -mt-0.5">{phoneError}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nationalId">National ID / Fayda FAN</Label>
            <Input
              id="nationalId"
              name="nationalId"
              maxLength={16}
              value={nationalId}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length > 16) {
                  setNationalId(val.slice(0, 16));
                  setFanError("Fayda FAN cannot exceed 16 digits");
                  return;
                }
                setNationalId(val);
                if (val.length > 0 && val.length < 16) {
                  setFanError(`${val.length}/16 digits (Fayda FAN must be 16 digits)`);
                } else {
                  setFanError("");
                }
              }}
              onKeyDown={(e) => {
                if (
                  nationalId.length >= 16 &&
                  !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"].includes(e.key) &&
                  !e.ctrlKey &&
                  !e.metaKey
                ) {
                  if (/\d/.test(e.key)) {
                    e.preventDefault();
                    setFanError("Cannot exceed 16 digits for Fayda FAN");
                  }
                }
              }}
              placeholder="e.g. 6140123412341234"
              className={fanError && nationalId.length > 0 ? "border-rose-500/80 focus-visible:ring-rose-500 font-mono" : "font-mono"}
            />
            {fanError && (
              <p className="text-[11px] text-rose-500 font-medium -mt-0.5">{fanError}</p>
            )}
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
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dobFormatted} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" defaultValue={defaultValues?.nationality ?? "Ethiopian"} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="guestType">Guest Type</Label>
            <select name="guestType" defaultValue={defaultValues?.guestType ?? "individual"} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="individual">Individual</option>
              <option value="couple">Couple</option>
              <option value="friends">Friends / Companions</option>
              <option value="family">Family</option>
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
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Contact & Location</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} placeholder="guest@example.com" />
          </div>

          {/* Typeable Country with Autocomplete & 1-Click Common Chips */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="country">Country *</Label>
              <span className="text-[11px] text-primary font-medium">Type freely or select</span>
            </div>
            <Input
              id="country"
              name="country"
              list="countries-datalist"
              required
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              placeholder="Type country (e.g. Eritrea, Ethiopia, Kenya, USA)..."
              className="bg-surface font-medium"
            />
            <datalist id="countries-datalist">
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* Typeable City / Region with Autocomplete & Dynamic Suggestions */}
          <div className="grid gap-1.5 col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="city">
                {isEthiopia ? "City / Sub-City / Region *" : "City / Region *"}
              </Label>
              <span className="text-[11px] text-primary font-medium">Type any city, woreda, or zone</span>
            </div>
            <Input
              id="city"
              name="city"
              list="cities-datalist"
              required
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder={
                isEthiopia
                  ? "Type sub-city or town (e.g. Bole, Kazanchis, Hawassa, Adama, Woreda 03)..."
                  : isEritrea
                  ? "Type city or region (e.g. Asmara, Keren, Massawa, Mendefera)..."
                  : isKenya
                  ? "Type city (e.g. Nairobi, Mombasa, Kisumu)..."
                  : "Type city or region (e.g. London, Dubai, New York, Frankfurt)..."
              }
              className="bg-surface font-medium"
            />
            <datalist id="cities-datalist">
              {isEritrea ? (
                <>
                  {ERITREAN_MAJOR_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                  {INTERNATIONAL_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </>
              ) : isEthiopia ? (
                <>
                  {ADDIS_ABABA_SUB_CITIES.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                  <option value="Kazanchis" />
                  <option value="Piazza" />
                  <option value="Megenagna" />
                  <option value="Sarbet" />
                  <option value="CMC" />
                  <option value="Ayat" />
                  <option value="Gerji" />
                  <option value="Gotera" />
                  {ETHIOPIAN_MAJOR_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </>
              ) : (
                <>
                  {INTERNATIONAL_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                  {ADDIS_ABABA_SUB_CITIES.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                  {ETHIOPIAN_MAJOR_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </>
              )}
            </datalist>
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
  const { user } = useAuth();
  const currentStaffName = user?.name || user?.email || "Front Desk Staff";

  const [search, setSearch] = useState("");
  const [guestType, setGuestType] = useState("all");
  const [vipOnly, setVipOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [selectedGuestForReservation, setSelectedGuestForReservation] = useState<any | null>(null);
  const [selectedReservationForCheckIn, setSelectedReservationForCheckIn] = useState<any | null>(null);
  const [selectedGuestForCheckIn, setSelectedGuestForCheckIn] = useState<any | null>(null);
  const [viewingReservationDetails, setViewingReservationDetails] = useState<any | null>(null);
  const [viewingCheckInDetails, setViewingCheckInDetails] = useState<any | null>(null);

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

  // Check-in Form State (Step 3)
  const [keyCardNumber, setKeyCardNumber] = useState("");
  const [identityVerified, setIdentityVerified] = useState(true);
  const [depositCollected, setDepositCollected] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("card");
  const [paymentStatus, setPaymentStatus] = useState("settle_on_checkout");
  const [registrationCardGenerated, setRegistrationCardGenerated] = useState(false);
  const [checkedInBy, setCheckedInBy] = useState(currentStaffName);
  const [checkInNotes, setCheckInNotes] = useState("");

  useEffect(() => {
    if (user?.name || user?.email) {
      setCheckedInBy(user.name || user.email);
    }
  }, [user]);

  // Fayda National ID Decoder state
  const [faydaGuest, setFaydaGuest] = useState<ParsedFaydaGuest | null>(null);
  const [faydaFormDefaults, setFaydaFormDefaults] = useState<Record<string, any> | null>(null);
  const [formKey, setFormKey] = useState(0);

  function handleFaydaDecoded(data: ParsedFaydaGuest) {
    setFaydaGuest(data);

    // Normalize date of birth to YYYY-MM-DD for HTML5 date picker
    let dob = (data.dateOfBirth || "").trim();
    if (dob.includes("/")) {
      const parts = dob.split("/");
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        } else if (parts[0].length === 4) {
          dob = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        }
      }
    } else if (dob.includes("T")) {
      dob = dob.split("T")[0];
    }

    const gLower = (data.gender || "").toLowerCase();
    const normalizedGender = gLower.startsWith("m") ? "male" : gLower.startsWith("f") ? "female" : "other";

    setFaydaFormDefaults((prev) => ({
      ...prev,
      firstName: data.firstName || prev?.firstName || "",
      middleName: data.middleName || prev?.middleName || "",
      lastName: data.lastName || prev?.lastName || "",
      gender: normalizedGender,
      phone: data.phone || prev?.phone || "",
      dateOfBirth: dob,
      nationality: data.nationality || "Ethiopian",
      country: data.country || "Ethiopia",
      city: prev?.city || "Bole",
      idType: "fayida_id",
      idNumber: data.fan,
      nationalId: data.fan,
    }));
    setFormKey((k) => k + 1);
    toast({
      title: "🇪🇹 Fayda National ID Verified",
      description: `Autofilled credentials for ${data.fullName} (FAN: ${data.fan})`,
    });
  }

  function resetStepper() {
    setCurrentStep(1);
    setActiveGuest(null);
    setActiveReservation(null);
    setFaydaGuest(null);
    setFaydaFormDefaults(null);
    setFormKey(0);
    setResRoomId("");
    setResRoomTypeId("");
    setResCheckIn(new Date().toISOString().split("T")[0]);
    setResCheckOut(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    setResAdults("1");
    setResChildren("0");
    setResType("walk_in");
    setResSpecialRequests("");
    setKeyCardNumber("");
    setIdentityVerified(true);
    setDepositCollected(false);
    setDepositAmount("");
    setDepositMethod("card");
    setPaymentStatus("settle_on_checkout");
    setRegistrationCardGenerated(false);
    setCheckedInBy(currentStaffName);
    setCheckInNotes("");
  }

  function openReservationForGuest(guest: Guest | any) {
    setSelectedGuestForReservation(guest);
    refetchAvailableRooms();
    setIsReservationModalOpen(true);
  }

  async function openCheckInForReservation(res: ReservationRecord | any) {
    let guestObj: any = guests.find((g) => g.id === res.guestId);
    if (!guestObj && res.guestId) {
      try {
        guestObj = await apiFetch<Guest>(`/guests/${res.guestId}`);
      } catch (e) {
        console.warn("Could not fetch full guest object", e);
      }
    }
    if (!guestObj) {
      const nameParts = (res.guestName || "Guest User").trim().split(" ");
      guestObj = {
        id: res.guestId || `guest-${Date.now()}`,
        firstName: nameParts[0] || "Guest",
        lastName: nameParts.slice(1).join(" ") || "",
        phone: res.guestPhone || "",
        email: res.guestEmail || "",
        idType: "national_id",
        idNumber: "Verified via Online Portal",
        vipStatus: false,
      };
    }
    setSelectedGuestForCheckIn(guestObj);
    setSelectedReservationForCheckIn(res);
    refetchAvailableRooms();
    setIsCheckInModalOpen(true);
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

  const { data: rawRoomTypes } = useQuery<any>({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<any>("/room-types"),
  });
  const roomTypes: RoomType[] = Array.isArray(rawRoomTypes)
    ? rawRoomTypes
    : Array.isArray(rawRoomTypes?.data)
      ? rawRoomTypes.data
      : [];

  const { data: rawAvailableRooms, refetch: refetchAvailableRooms } = useQuery<any>({
    queryKey: ["available-rooms"],
    queryFn: () => apiFetch<any>("/rooms/availability"),
  });
  const availableRooms: AvailableRoom[] = Array.isArray(rawAvailableRooms)
    ? rawAvailableRooms
    : Array.isArray(rawAvailableRooms?.data)
      ? rawAvailableRooms.data
      : [];

  const filteredAvailableRooms = useMemo(() => {
    if (!resRoomTypeId) return availableRooms;
    return availableRooms.filter((r) => r.roomTypeId === resRoomTypeId);
  }, [availableRooms, resRoomTypeId]);

  const [mainTab, setMainTab] = useState<"guests" | "reservations" | "checkin">("guests");
  const [resSearch, setResSearch] = useState("");
  const [checkinSearch, setCheckinSearch] = useState("");
  const [resCategoryFilter, setResCategoryFilter] = useState<"all" | "reserve" | "reserved">("all");
  const [checkinStatusFilter, setCheckinStatusFilter] = useState<"all" | "checkin" | "checked_in">("all");
  const [resPage, setResPage] = useState(1);
  const [checkinPage, setCheckinPage] = useState(1);

  const { data: rawReservations, isLoading: resLoading } = useQuery<any>({
    queryKey: ["guests-page-reservations"],
    queryFn: () => apiFetch<any>("/reservations?limit=250"),
  });
  const reservationsList: ReservationRecord[] = Array.isArray(rawReservations)
    ? rawReservations
    : Array.isArray(rawReservations?.data)
      ? rawReservations.data
      : [];

  const activeReservationByGuest = useMemo(() => {
    const map = new Map<string, ReservationRecord>();
    const activeStatuses = new Set(["pending", "confirmed", "guaranteed", "checked_in", "reserved"]);
    for (const res of reservationsList) {
      if (res.status && activeStatuses.has(res.status.toLowerCase())) {
        if (res.guestId) map.set(res.guestId, res);
        if (res.guestCode) map.set(res.guestCode, res);
      }
    }
    return map;
  }, [reservationsList]);

  const { data: rawAllGuests } = useQuery<any>({
    queryKey: ["all-registered-guests"],
    queryFn: () => apiFetch<any>("/guests?limit=250"),
  });
  const allGuestsList: Guest[] = useMemo(() => {
    if (Array.isArray(rawAllGuests?.data)) return rawAllGuests.data;
    if (Array.isArray(rawAllGuests)) return rawAllGuests;
    return [];
  }, [rawAllGuests]);

  // Tab 2 Items: Combining existing reservations + registered guests who have not reserved yet
  const reservationTabItems = useMemo(() => {
    const items: Array<{
      id: string;
      isReserved: boolean;
      reservationNumber: string;
      guestId?: string;
      guestName: string;
      guestPhone?: string;
      guestObj?: Guest;
      resObj?: ReservationRecord;
      roomDisplay: string;
      roomTypeName: string;
      checkInDate?: string;
      checkOutDate?: string;
      totalAmount?: number | string | null;
      status: string;
      isOnlineBooking?: boolean;
    }> = [];

    const processedGuestIds = new Set<string>();

    // 1. Active pre-arrival reservations (pending, confirmed, guaranteed, reserved)
    // EXCLUDE checked-in guests — they belong strictly in Tab 3 (The Check-In)
    for (const res of reservationsList) {
      if (res.guestId) processedGuestIds.add(res.guestId);
      if (res.guestCode) processedGuestIds.add(res.guestCode);

      const statusLower = (res.status || "").toLowerCase();
      if (statusLower === "checked_in" || statusLower === "checked_out" || statusLower === "cancelled") {
        continue;
      }

      const isOnline =
        res.reservationType === "online" ||
        res.bookingSource === "online" ||
        res.bookingSource === "ota";

      items.push({
        id: `res-${res.id}`,
        isReserved: true,
        reservationNumber: res.reservationNumber || `RES-${res.id.slice(0, 6)}`,
        guestId: res.guestId,
        guestName: res.guestName || "Registered Guest",
        guestPhone: res.guestPhone,
        resObj: res,
        roomDisplay: res.roomNumber ? `Room ${res.roomNumber}` : (res.roomTypeName || "Unassigned"),
        roomTypeName: res.roomTypeName || "—",
        checkInDate: res.checkInDate,
        checkOutDate: res.checkOutDate,
        totalAmount: res.totalAmount,
        status: "reserved",
        isOnlineBooking: isOnline,
      });
    }

    // 2. Registered guests who don't have an active reservation yet
    for (const g of allGuestsList) {
      if (processedGuestIds.has(g.id) || (g.guestCode && processedGuestIds.has(g.guestCode))) {
        continue;
      }
      const fullName = [g.firstName, g.middleName, g.lastName].filter(Boolean).join(" ");
      items.push({
        id: `guest-${g.id}`,
        isReserved: false,
        reservationNumber: "—",
        guestId: g.id,
        guestName: fullName || g.guestCode || "Guest",
        guestPhone: g.phone,
        guestObj: g,
        roomDisplay: "Not Reserved",
        roomTypeName: "",
        status: "not_reserved",
      });
    }

    return items;
  }, [reservationsList, allGuestsList]);

  const filteredReservationItems = useMemo(() => {
    const query = resSearch.toLowerCase().trim();
    return reservationTabItems.filter((item) => {
      // Category filter: "reserve" (unreserved) vs "reserved" (already reserved)
      if (resCategoryFilter === "reserve" && item.isReserved) return false;
      if (resCategoryFilter === "reserved" && !item.isReserved) return false;

      if (!query) return true;
      return (
        item.reservationNumber.toLowerCase().includes(query) ||
        item.guestName.toLowerCase().includes(query) ||
        item.roomDisplay.toLowerCase().includes(query) ||
        item.roomTypeName.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
      );
    });
  }, [reservationTabItems, resSearch, resCategoryFilter]);

  // Tab 3 Items: Reservations that move to check-in (pending, confirmed, guaranteed, checked_in)
  const checkinTabItems = useMemo(() => {
    const allowedStatuses = new Set(["pending", "confirmed", "guaranteed", "checked_in"]);
    const list = reservationsList.filter((r) => r.status && allowedStatuses.has(r.status.toLowerCase()));
    return list.sort((a, b) => {
      const aChecked = a.status?.toLowerCase() === "checked_in" ? 1 : 0;
      const bChecked = b.status?.toLowerCase() === "checked_in" ? 1 : 0;
      return aChecked - bChecked;
    });
  }, [reservationsList]);

  const filteredCheckinItems = useMemo(() => {
    const query = checkinSearch.toLowerCase().trim();
    return checkinTabItems.filter((r) => {
      // Status filter: "checkin" (ready for check-in) vs "checked_in" (already checked in)
      const isAlreadyCheckedIn = r.status?.toLowerCase() === "checked_in";
      if (checkinStatusFilter === "checkin" && isAlreadyCheckedIn) return false;
      if (checkinStatusFilter === "checked_in" && !isAlreadyCheckedIn) return false;

      if (!query) return true;
      return (
        (r.reservationNumber ?? "").toLowerCase().includes(query) ||
        (r.guestName ?? "").toLowerCase().includes(query) ||
        (r.roomNumber ?? "").toLowerCase().includes(query) ||
        (r.roomTypeName ?? "").toLowerCase().includes(query) ||
        (r.status ?? "").toLowerCase().includes(query)
      );
    });
  }, [checkinTabItems, checkinSearch, checkinStatusFilter]);

  const guests: Guest[] = Array.isArray(listData?.data)
    ? listData.data
    : Array.isArray(listData)
      ? (listData as any)
      : [];
  const meta = listData?.meta;

  const resPageSize = 5;
  const resTotalPages = Math.max(1, Math.ceil(filteredReservationItems.length / resPageSize));
  const paginatedReservationItems = filteredReservationItems.slice((resPage - 1) * resPageSize, resPage * resPageSize);

  const checkinPageSize = 5;
  const checkinTotalPages = Math.max(1, Math.ceil(filteredCheckinItems.length / checkinPageSize));
  const paginatedCheckinItems = filteredCheckinItems.slice((checkinPage - 1) * checkinPageSize, checkinPage * checkinPageSize);

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
      queryClient.invalidateQueries({ queryKey: ["guests-page-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
      setActiveReservation(newRes);
      const assignedRoom = availableRooms.find((r) => r.id === (newRes.roomId || resRoomId));
      const roomNum = assignedRoom?.number || "101";
      setKeyCardNumber(`KEY-${roomNum}`);
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
    if (obj["nationalId"]) {
      if (!obj["idType"]) obj["idType"] = "fayida_id";
      if (!obj["idNumber"]) obj["idNumber"] = obj["nationalId"];
    }
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

    createResMutation.mutate(payload, {
      onSuccess: (newRes) => {
        toast({
          title: "Reservation Created",
          description: `Booking #${newRes.reservationNumber || "Confirmed"} saved.`,
        });
        if (andProceedToCheckIn) {
          const assignedRoom = availableRooms.find((r) => r.id === (newRes.roomId || resRoomId));
          const roomNum = assignedRoom?.number || "101";
          checkInMutation.mutate({
            id: newRes.id,
            body: {
              keyCardNumber: `KEY-${roomNum}`,
              identityVerified: true,
              checkedInBy: checkedInBy || currentStaffName,
            },
          });
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

  // Real-time KPI Card Metrics
  const totalGuestsCount = stats?.total ?? allGuestsList.length;

  const onlineGuestsCount = useMemo(() => {
    if (stats?.online !== undefined) return stats.online;
    const uniqueIds = new Set<string>();
    for (const r of reservationsList) {
      if (
        (r.reservationType === "online" || r.bookingSource === "online" || r.bookingSource === "ota") &&
        r.status?.toLowerCase() !== "cancelled"
      ) {
        if (r.guestId) uniqueIds.add(r.guestId);
      }
    }
    return uniqueIds.size;
  }, [stats?.online, reservationsList]);

  const checkedInGuestsCount = useMemo(() => {
    if (stats?.checkedIn !== undefined) return stats.checkedIn;
    const uniqueIds = new Set<string>();
    for (const r of reservationsList) {
      if (r.status?.toLowerCase() === "checked_in") {
        if (r.guestId) uniqueIds.add(r.guestId);
      }
    }
    return uniqueIds.size;
  }, [stats?.checkedIn, reservationsList]);

  const walkInGuestsCount = useMemo(() => {
    if (stats?.walkIn !== undefined) return stats.walkIn;
    const uniqueIds = new Set<string>();
    for (const r of reservationsList) {
      if (
        (r.reservationType === "walk_in" || r.bookingSource === "walk_in") &&
        r.status?.toLowerCase() !== "cancelled"
      ) {
        if (r.guestId) uniqueIds.add(r.guestId);
      }
    }
    return uniqueIds.size;
  }, [stats?.walkIn, reservationsList]);

  const walkInPct = totalGuestsCount > 0 ? Math.round((walkInGuestsCount / totalGuestsCount) * 100) : 0;
  const onlinePct = totalGuestsCount > 0 ? Math.round((onlineGuestsCount / totalGuestsCount) * 100) : 0;

  const statCards = [
    {
      label: "Total Guests",
      value: totalGuestsCount,
      color: "text-primary",
      iconBg: "bg-primary/10 text-primary",
      icon: Users,
      subtext: "Registered Guest Profiles",
    },
    {
      label: "Walk-in Guests",
      value: walkInGuestsCount,
      color: "text-emerald-500",
      iconBg: "bg-emerald-500/10 text-emerald-500",
      icon: UserCheck,
      subtext: `${walkInPct}% of total`,
    },
    {
      label: "Online Guests",
      value: onlineGuestsCount,
      color: "text-sky-500",
      iconBg: "bg-sky-500/10 text-sky-500",
      icon: Globe,
      subtext: `${onlinePct}% of total`,
    },
    {
      label: "Checked-in Guests",
      value: checkedInGuestsCount,
      color: "text-amber-500",
      iconBg: "bg-amber-500/10 text-amber-500",
      icon: LogIn,
      subtext: "Active in-house stays",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guests</h1>
      </div>

      {/* ── 3-TIER DEDICATED MODALS (Register -> Reserve -> Check-In) ── */}
      <GuestRegistrationModal
        open={isRegisterModalOpen}
        onOpenChange={setIsRegisterModalOpen}
        onSuccessSaveOnly={() => {
          queryClient.invalidateQueries({ queryKey: ["guests"] });
          queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
          setIsRegisterModalOpen(false);
        }}
        onProceedToReservation={(guest) => {
          setSelectedGuestForReservation(guest);
          setIsRegisterModalOpen(false);
          refetchAvailableRooms();
          setIsReservationModalOpen(true);
        }}
      />

      <ReservationBookingModal
        open={isReservationModalOpen}
        onOpenChange={setIsReservationModalOpen}
        guest={selectedGuestForReservation}
        roomTypes={roomTypes}
        availableRooms={availableRooms}
        onSuccessReserveOnly={() => {
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
          queryClient.invalidateQueries({ queryKey: ["guests-page-reservations"] });
          queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
          setIsReservationModalOpen(false);
        }}
        onProceedToCheckIn={(res, guest) => {
          setSelectedReservationForCheckIn(res);
          setSelectedGuestForCheckIn(guest);
          setIsReservationModalOpen(false);
          refetchAvailableRooms();
          setIsCheckInModalOpen(true);
        }}
        onBack={() => {
          setIsReservationModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />

      <RoomCheckInModal
        open={isCheckInModalOpen}
        onOpenChange={setIsCheckInModalOpen}
        reservation={selectedReservationForCheckIn}
        guest={selectedGuestForCheckIn}
        roomTypes={roomTypes}
        availableRooms={availableRooms}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
          queryClient.invalidateQueries({ queryKey: ["guests-page-reservations"] });
          queryClient.invalidateQueries({ queryKey: ["guests-page-checkins"] });
          queryClient.invalidateQueries({ queryKey: ["available-rooms"] });
          queryClient.invalidateQueries({ queryKey: ["guests"] });
          queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
          setIsCheckInModalOpen(false);
          setMainTab("checkin");
        }}
        onBack={() => {
          setIsCheckInModalOpen(false);
          if (selectedGuestForReservation) {
            setIsReservationModalOpen(true);
          }
        }}
      />

      {/* 4 Real-time KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="bg-surface/50 border-border p-4 shadow-none min-h-[102px] flex flex-col justify-between rounded-xl hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted truncate">{s.label}</span>
                <div className={`p-1.5 rounded-lg ${s.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                {statsLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div>
                    <div className={`text-2xl font-bold font-mono tracking-tight ${s.color}`}>
                      {s.value ?? 0}
                    </div>
                    {s.subtext && (
                      <div className="text-[11px] text-text-muted mt-0.5 truncate">
                        {s.subtext}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── 3-STEP NUMBERED WORKFLOW TABS ─────────────────────────────────── */}
      <Card className="border-primary/20 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="p-3 border-b border-border bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Register Guest Tab */}
            <button
              onClick={() => setMainTab("guests")}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                mainTab === "guests"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface hover:bg-muted/40 border-border text-text"
              }`}
            >
              <User className={`h-5 w-5 shrink-0 ${mainTab === "guests" ? "text-primary-foreground" : "text-primary"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  Register Guest
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 ${mainTab === "guests" ? "opacity-100" : "opacity-40"}`} />
            </button>

            {/* The Reservation Tab */}
            <button
              onClick={() => setMainTab("reservations")}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                mainTab === "reservations"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface hover:bg-muted/40 border-border text-text"
              }`}
            >
              <Calendar className={`h-5 w-5 shrink-0 ${mainTab === "reservations" ? "text-primary-foreground" : "text-primary"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  The Reservation
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 ${mainTab === "reservations" ? "opacity-100" : "opacity-40"}`} />
            </button>

            {/* The Check-In Tab */}
            <button
              onClick={() => setMainTab("checkin")}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                mainTab === "checkin"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-surface hover:bg-muted/40 border-border text-text"
              }`}
            >
              <LogIn className={`h-5 w-5 shrink-0 ${mainTab === "checkin" ? "text-primary-foreground" : "text-primary"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  The Check-In
                </div>
              </div>
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${mainTab === "checkin" ? "opacity-100 text-primary-foreground" : "opacity-40"}`} />
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
                    <SelectItem value="couple">Couple</SelectItem>
                    <SelectItem value="friends">Friends / Companions</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="travel_agency">Travel Agency</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => { setVipOnly(!vipOnly); setPage(1); }}
                  className={cn(
                    "gap-1.5 transition-all cursor-pointer font-medium",
                    vipOnly
                      ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold shadow-sm shadow-amber-500/10 hover:bg-amber-500/20"
                      : "text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <Star
                    className={cn(
                      "h-4 w-4 transition-all duration-200",
                      vipOnly
                        ? "text-amber-500 fill-amber-400 drop-shadow-sm scale-110"
                        : "text-muted-foreground fill-none"
                    )}
                  />
                  <span>VIP Only</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="gap-1.5 ml-auto"
                >
                  <Plus className="h-4 w-4" /> Register Guest
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
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
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
                      guests.map((guest) => {
                        return (
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
                                  className="h-7 w-7 p-0"
                                  title="Edit Guest"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditGuest(guest);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-danger hover:text-danger"
                                  title="Delete Guest"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteGuest(guest);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
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
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      placeholder="Search reservation #, guest name, room, or status..."
                      value={resSearch}
                      onChange={(e) => { setResSearch(e.target.value); setResPage(1); }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  <Select
                    value={resCategoryFilter}
                    onValueChange={(val: "all" | "reserve" | "reserved") => {
                      setResCategoryFilter(val);
                      setResPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[185px] h-9 text-xs font-medium bg-surface shrink-0">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="reserve">Not Reserved</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    Total Records: <span className="font-semibold text-text ml-1">{filteredReservationItems.length}</span>
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Res #</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Room</TableHead>
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
                    ) : paginatedReservationItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                          No reservation records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedReservationItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs font-semibold text-text">
                            {item.reservationNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-sm">{item.guestName}</span>
                              {item.isOnlineBooking && (
                                <Badge className="bg-sky-500/15 text-sky-400 border border-sky-500/30 gap-1 text-[9px] px-1.5 py-0 font-semibold">
                                  <Globe className="w-2.5 h-2.5" /> Online
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <BedDouble className="h-3.5 w-3.5 text-text-muted" />
                              <span>{item.roomDisplay}</span>
                            </div>
                            {item.roomTypeName ? (
                              <div className="text-xs text-text-muted">{item.roomTypeName}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-text-muted" />
                              <span>
                                {item.checkInDate ? new Date(item.checkInDate).toLocaleDateString() : "—"}
                                {item.checkOutDate ? ` → ${new Date(item.checkOutDate).toLocaleDateString()}` : ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm font-mono">
                            {item.totalAmount != null ? `${Number(item.totalAmount).toLocaleString()} ETB` : "—"}
                          </TableCell>
                          <TableCell>
                            {item.isReserved ? (
                              <Badge
                                variant="info"
                                className="text-[10px] uppercase font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                              >
                                Reserved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] uppercase border-dashed text-text-muted font-medium">
                                Not Reserved
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.isReserved ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 font-semibold cursor-pointer rounded-lg px-2.5 shadow-xs"
                                onClick={() => setViewingReservationDetails(item.resObj || item)}
                                title="View Reservation Details"
                              >
                                <Eye className="h-3.5 w-3.5 text-indigo-500" /> Details
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer shadow-sm rounded-lg px-3"
                                onClick={() => {
                                  if (item.guestObj) openReservationForGuest(item.guestObj);
                                }}
                              >
                                <Calendar className="h-3.5 w-3.5" /> Reserve
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
                totalItems={filteredReservationItems.length}
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
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      placeholder="Search reservation #, guest, room, or status..."
                      value={checkinSearch}
                      onChange={(e) => { setCheckinSearch(e.target.value); setCheckinPage(1); }}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  <Select
                    value={checkinStatusFilter}
                    onValueChange={(val: "all" | "checkin" | "checked_in") => {
                      setCheckinStatusFilter(val);
                      setCheckinPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[195px] h-9 text-xs font-medium bg-surface shrink-0">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="checkin">Check-In (Ready)</SelectItem>
                      <SelectItem value="checked_in">Checked-In (In-House)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    Total Check-in Records: <span className="font-semibold text-text ml-1">{filteredCheckinItems.length}</span>
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Res #</TableHead>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Room</TableHead>
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
                    ) : paginatedCheckinItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-text-muted">
                          No check-in reservation records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCheckinItems.map((res) => {
                        const isOnline =
                          res.reservationType === "online" ||
                          res.bookingSource === "online" ||
                          res.bookingSource === "ota";
                        return (
                          <TableRow key={res.id} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs font-semibold text-text">
                              {res.reservationNumber}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm">{res.guestName ?? "—"}</span>
                                {isOnline && (
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
                            <TableCell className="font-medium text-sm font-mono">
                              {res.totalAmount != null ? `${Number(res.totalAmount).toLocaleString()} ETB` : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  res.status === "confirmed"
                                    ? "info"
                                    : res.status === "checked_in"
                                    ? "success"
                                    : res.status === "guaranteed"
                                    ? "info"
                                    : "warning"
                                }
                                className="text-[10px] uppercase"
                              >
                                {(res.status ?? "").replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {res.status === "checked_in" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-xs cursor-pointer rounded-lg px-2.5 transition-colors"
                                  onClick={() => setViewingCheckInDetails(res)}
                                  title={`View Checked-In Details • Room ${res.roomNumber || "Assigned"}`}
                                >
                                  <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Details</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-sm rounded-lg px-3"
                                  onClick={() => openCheckInForReservation(res)}
                                >
                                  <LogIn className="h-3.5 w-3.5" /> Check-In
                                </Button>
                              )}
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
                totalItems={filteredCheckinItems.length}
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

      {/* Reservation Details Dialog */}
      <Dialog open={!!viewingReservationDetails} onOpenChange={(o) => !o && setViewingReservationDetails(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">Reservation Information</DialogTitle>
                  <p className="text-xs text-text-muted font-mono">
                    {viewingReservationDetails?.reservationNumber || "—"}
                  </p>
                </div>
              </div>
              <Badge variant="info" className="text-xs font-semibold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Reserved
              </Badge>
            </div>
          </DialogHeader>

          {viewingReservationDetails && (
            <div className="space-y-4 pt-2 text-sm">
              {/* Guest Profile Card */}
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Guest Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Full Name:</span>{" "}
                    <span className="font-semibold text-text">{viewingReservationDetails.guestName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Phone:</span>{" "}
                    <span className="font-mono text-text">{viewingReservationDetails.guestPhone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Email:</span>{" "}
                    <span className="text-text truncate block">{viewingReservationDetails.guestEmail || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Booking Channel:</span>{" "}
                    <span className="font-medium capitalize text-text">
                      {viewingReservationDetails.bookingSource || viewingReservationDetails.reservationType || "Direct"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Room & Stay Details */}
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-primary" /> Room & Stay Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Assigned Room:</span>{" "}
                    <span className="font-semibold text-text">
                      {viewingReservationDetails.roomNumber ? `Room ${viewingReservationDetails.roomNumber}` : (viewingReservationDetails.roomDisplay || "Unassigned")}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Room Type:</span>{" "}
                    <span className="text-text">{viewingReservationDetails.roomTypeName || "Standard Room"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Check-In:</span>{" "}
                    <span className="font-medium text-text">
                      {viewingReservationDetails.checkInDate ? new Date(viewingReservationDetails.checkInDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Check-Out:</span>{" "}
                    <span className="font-medium text-text">
                      {viewingReservationDetails.checkOutDate ? new Date(viewingReservationDetails.checkOutDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Guests:</span>{" "}
                    <span className="text-text">
                      {viewingReservationDetails.adults ?? 1} Adults, {viewingReservationDetails.children ?? 0} Children
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Status:</span>{" "}
                    <span className="font-semibold text-indigo-500 uppercase">Reserved</span>
                  </div>
                </div>
              </div>

              {/* Financial & Notes */}
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" /> Billing & Requests
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Total Amount:</span>{" "}
                    <span className="font-mono font-bold text-text">
                      {viewingReservationDetails.totalAmount != null ? `${Number(viewingReservationDetails.totalAmount).toLocaleString()} ETB` : "0 ETB"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Paid / Settled:</span>{" "}
                    <span className="font-mono text-emerald-500 font-semibold">
                      {viewingReservationDetails.paidAmount != null ? `${Number(viewingReservationDetails.paidAmount).toLocaleString()} ETB` : "0 ETB"}
                    </span>
                  </div>
                </div>
                {(viewingReservationDetails.specialRequests || viewingReservationDetails.notes) && (
                  <div className="text-xs pt-1 border-t border-border/60">
                    <span className="text-text-muted">Special Requests:</span>{" "}
                    <span className="text-text">{viewingReservationDetails.specialRequests || viewingReservationDetails.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewingReservationDetails(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    const res = viewingReservationDetails;
                    setViewingReservationDetails(null);
                    openCheckInForReservation(res);
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" /> Proceed to Check-In
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-In Details Dialog */}
      <Dialog open={!!viewingCheckInDetails} onOpenChange={(o) => !o && setViewingCheckInDetails(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">In-House Guest Stay Details</DialogTitle>
                  <p className="text-xs text-text-muted font-mono">
                    {viewingCheckInDetails?.reservationNumber || "—"}
                  </p>
                </div>
              </div>
              <Badge variant="success" className="text-xs font-semibold uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                Checked In
              </Badge>
            </div>
          </DialogHeader>

          {viewingCheckInDetails && (
            <div className="space-y-4 pt-2 text-sm">
              {/* Guest Profile Card */}
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-500" /> Guest Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Guest Name:</span>{" "}
                    <span className="font-semibold text-text">{viewingCheckInDetails.guestName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Phone:</span>{" "}
                    <span className="font-mono text-text">{viewingCheckInDetails.guestPhone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Email:</span>{" "}
                    <span className="text-text truncate block">{viewingCheckInDetails.guestEmail || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Identity Status:</span>{" "}
                    <span className="font-semibold text-emerald-500 inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Room & Stay Details */}
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-emerald-500" /> Room & Access Card
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Current Room:</span>{" "}
                    <span className="font-bold text-text text-sm">
                      {viewingCheckInDetails.roomNumber ? `Room ${viewingCheckInDetails.roomNumber}` : "Assigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Room Type:</span>{" "}
                    <span className="text-text">{viewingCheckInDetails.roomTypeName || "Standard Room"}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Keycard RFID:</span>{" "}
                    <span className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded text-text inline-flex items-center gap-1">
                      <Key className="h-3 w-3 text-text-muted" /> {viewingCheckInDetails.keyCardNumber || `KEY-${viewingCheckInDetails.roomNumber || "101"}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Staff:</span>{" "}
                    <span className="text-text font-medium">{viewingCheckInDetails.checkedInBy || currentStaffName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Check-In Date:</span>{" "}
                    <span className="font-medium text-text">
                      {viewingCheckInDetails.checkInDate ? new Date(viewingCheckInDetails.checkInDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Scheduled Check-Out:</span>{" "}
                    <span className="font-medium text-text">
                      {viewingCheckInDetails.checkOutDate ? new Date(viewingCheckInDetails.checkOutDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Details */}
              <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-500" /> Folio & Billing
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted">Total Folio Charges:</span>{" "}
                    <span className="font-mono font-bold text-text">
                      {viewingCheckInDetails.totalAmount != null ? `${Number(viewingCheckInDetails.totalAmount).toLocaleString()} ETB` : "0 ETB"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Deposit Collected:</span>{" "}
                    <span className="font-mono text-emerald-500 font-semibold">
                      {viewingCheckInDetails.depositAmount != null ? `${Number(viewingCheckInDetails.depositAmount).toLocaleString()} ETB` : "Settled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewingCheckInDetails(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setViewingCheckInDetails(null);
                    router.push("/reservations");
                  }}
                >
                  <CreditCard className="h-3.5 w-3.5" /> View Guest Folio
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

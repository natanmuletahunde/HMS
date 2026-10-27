"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FaydaScanner } from "@/components/fayda-scanner";
import type { ParsedFaydaGuest } from "@/lib/fayda";
import { apiFetch } from "@/lib/api";
import {
  ArrowRight,
  Loader2,
  UserPlus,
  Users,
  Heart,
  FileText,
  Upload,
  Trash2,
  Plus,
  Paperclip,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  COUNTRIES,
  ADDIS_ABABA_SUB_CITIES,
  ETHIOPIAN_MAJOR_CITIES,
  ERITREAN_MAJOR_CITIES,
  INTERNATIONAL_CITIES,
} from "@/lib/geo-data";

export interface IdTypeSpec {
  label: string;
  placeholder: string;
  maxLength: number;
  format: (raw: string) => string;
  badge: (val: string) => string;
  isComplete: (val: string) => boolean;
}

export const getIdTypeSpec = (type: string): IdTypeSpec => {
  switch (type) {
    case "national_id":
    case "fayda":
      return {
        label: "Fayda FAN (16 Digits)",
        placeholder: "",
        maxLength: 16,
        format: (val) => val.replace(/\D/g, "").slice(0, 16),
        badge: (val) => `${val.length}/16 digits`,
        isComplete: (val) => val.length === 16,
      };
    case "passport":
      return {
        label: "Passport Number (Max 9)",
        placeholder: "",
        maxLength: 9,
        format: (val) => val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9),
        badge: (val) => `${val.length}/9 chars`,
        isComplete: (val) => val.length >= 7 && val.length <= 9,
      };
    case "driver_license":
      return {
        label: "Driver's License # (Max 15)",
        placeholder: "",
        maxLength: 15,
        format: (val) => val.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 15),
        badge: (val) => `${val.length}/15 chars`,
        isComplete: (val) => val.length >= 6,
      };
    case "birth_certificate":
      return {
        label: "Birth Certificate # (Max 15)",
        placeholder: "",
        maxLength: 15,
        format: (val) => val.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 15),
        badge: (val) => `${val.length}/15 chars`,
        isComplete: (val) => val.length >= 4,
      };
    case "none":
    default:
      return {
        label: "Verification Status",
        placeholder: "",
        maxLength: 40,
        format: (val) => val.slice(0, 40),
        badge: () => "At check-in",
        isComplete: () => true,
      };
  }
};

export interface AccompanyingGuest {
  id: string;
  fullName: string;
  relationship: "spouse" | "child" | "parent" | "sibling" | "friend" | "colleague" | "engaged" | "other";
  gender: "male" | "female" | "other";
  ageCategory: "adult" | "child" | "infant";
  idType?: "fayda" | "passport" | "national_id" | "driver_license" | "birth_certificate" | "none";
  idNumber?: string;
  phone?: string;
  isVerifiedAtCheckIn?: boolean;
}

export interface GuestRecord {
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
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  vipStatus?: boolean;
  guestType?: string;
  // Optional Marital / Relationship Verification
  hasRelationshipDoc?: boolean;
  relationshipStatus?: string;
  relationshipDocName?: string;
  relationshipDocUrl?: string;
  relationshipDocNumber?: string;
  // Partner attributes for couples
  partnerFullName?: string;
  partnerRelationship?: string;
  partnerGender?: string;
  partnerAgeCategory?: string;
  partnerIdType?: string;
  partnerIdNumber?: string;
  // Optional Accompanying / Multi-Guests
  hasAccompanyingGuests?: boolean;
  accompanyingGuests?: AccompanyingGuest[];
}

interface GuestRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccessSaveOnly?: (guest: GuestRecord) => void;
  onProceedToReservation?: (guest: GuestRecord) => void;
}

export function GuestRegistrationModal({
  open,
  onOpenChange,
  onSuccessSaveOnly,
  onProceedToReservation,
}: GuestRegistrationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [faydaFormDefaults, setFaydaFormDefaults] = useState<Partial<GuestRecord> | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Form field state for validation
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [fanError, setFanError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Ethiopia");
  const [cityInput, setCityInput] = useState("Bole");

  // Guest Type filter state (controls conditional visibility of couple & family tabs)
  const [selectedGuestType, setSelectedGuestType] = useState<string>("individual");

  // Optional Couple / Relationship Verification State
  const [hasRelationshipDoc, setHasRelationshipDoc] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState("married");
  const [relationshipDocName, setRelationshipDocName] = useState("");
  const [relationshipDocUrl, setRelationshipDocUrl] = useState("");
  const [relationshipDocNumber, setRelationshipDocNumber] = useState("");

  // Partner attributes for couple registration
  const [partnerFullName, setPartnerFullName] = useState("");
  const [partnerRelationship, setPartnerRelationship] = useState("spouse");
  const [partnerGender, setPartnerGender] = useState("female");
  const [partnerAgeCategory, setPartnerAgeCategory] = useState("adult");
  const [partnerIdType, setPartnerIdType] = useState("national_id");
  const [partnerIdNumber, setPartnerIdNumber] = useState("");

  // Optional Accompanying / Multi-Guests State
  const [hasAccompanyingGuests, setHasAccompanyingGuests] = useState(false);
  const [accompanyingGuests, setAccompanyingGuests] = useState<AccompanyingGuest[]>([]);

  // Reset conditional sections when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedGuestType("individual");
      setHasRelationshipDoc(false);
      setHasAccompanyingGuests(false);
      setAccompanyingGuests([]);
      setRelationshipDocName("");
      setRelationshipDocUrl("");
      setRelationshipDocNumber("");
      setPartnerFullName("");
      setPartnerRelationship("spouse");
      setPartnerGender("female");
      setPartnerAgeCategory("adult");
      setPartnerIdType("national_id");
      setPartnerIdNumber("");
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image or document smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    setRelationshipDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRelationshipDocUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeRelationshipFile = () => {
    setRelationshipDocName("");
    setRelationshipDocUrl("");
  };

  const addAccompanyingGuest = (defaultRelationship?: AccompanyingGuest["relationship"]) => {
    const newGuest: AccompanyingGuest = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: "",
      relationship: defaultRelationship || (selectedGuestType === "friends" ? "friend" : "spouse"),
      gender: "female",
      ageCategory: "adult",
      idType: "national_id",
      idNumber: "",
      phone: "",
      isVerifiedAtCheckIn: false,
    };
    setAccompanyingGuests((prev) => [...prev, newGuest]);
  };

  const updateAccompanyingGuest = (id: string, updates: Partial<AccompanyingGuest>) => {
    setAccompanyingGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  const removeAccompanyingGuest = (id: string) => {
    setAccompanyingGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const addGuestMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<GuestRecord>("/guests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (newGuest) => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Registration Error", description: err.message, variant: "destructive" });
    },
  });

  const handleFaydaDecoded = (decoded: ParsedFaydaGuest) => {
    const rawDob = decoded.dateOfBirth || "";
    let cleanDob = rawDob;
    if (rawDob.length === 8 && !rawDob.includes("-")) {
      cleanDob = `${rawDob.slice(0, 4)}-${rawDob.slice(4, 6)}-${rawDob.slice(6, 8)}`;
    }
    const cleanPhone = (decoded.phone || "").replace(/\D/g, "").slice(0, 10);
    const cleanFan = (decoded.idNumber || decoded.nationalId || decoded.fan || "").replace(/\D/g, "").slice(0, 16);
    const decodedAny = decoded as any;
    const resolvedCity = decodedAny.city || decodedAny.subCity || "Addis Ababa";

    setPhone(cleanPhone);
    setNationalId(cleanFan);
    setSelectedCountry("Ethiopia");
    setCityInput(resolvedCity);
    setSelectedGuestType("individual");

    setFaydaFormDefaults({
      firstName: decoded.firstName || "",
      middleName: decoded.middleName || "",
      lastName: decoded.lastName || "",
      gender: decoded.gender || "",
      dateOfBirth: cleanDob,
      nationalId: cleanFan,
      idNumber: cleanFan,
      idType: "national_id",
      nationality: "Ethiopian",
      phone: cleanPhone,
      email: decodedAny.email || "",
      country: "Ethiopia",
      city: resolvedCity,
      vipStatus: false,
      guestType: "individual",
    });
    setFormKey((k) => k + 1);

    toast({
      title: "Fayda ID Verified & Auto-Filled",
      description: `${decoded.firstName} ${decoded.lastName} (${cleanFan})`,
    });
  };

  const parseFormData = (fd: FormData): Record<string, unknown> => {
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
  };

  const handleSave = (proceedToReservation: boolean) => {
    const form = document.getElementById("guest-registration-modal-form") as HTMLFormElement;
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = parseFormData(new FormData(form));
    data.guestType = selectedGuestType;

    let finalAccompanyingGuests: AccompanyingGuest[] = hasAccompanyingGuests ? [...accompanyingGuests] : [];

    if (selectedGuestType === "couple" && hasRelationshipDoc) {
      if (!partnerFullName.trim()) {
        toast({
          title: "Partner Name Required",
          description: "Please enter the full name of the accompanying partner / spouse.",
          variant: "destructive",
        });
        return;
      }

      const partnerGuest: AccompanyingGuest = {
        id: `acc-partner-${Date.now()}`,
        fullName: partnerFullName.trim(),
        relationship: (partnerRelationship as any) || "spouse",
        gender: (partnerGender as any) || "female",
        ageCategory: (partnerAgeCategory as any) || "adult",
        idType: (partnerIdType as any) || "national_id",
        idNumber: partnerIdNumber.trim() || undefined,
        isVerifiedAtCheckIn: false,
      };

      finalAccompanyingGuests = [partnerGuest, ...finalAccompanyingGuests];
    }

    if (finalAccompanyingGuests.length > 0) {
      const invalid = finalAccompanyingGuests.some((g) => !g.fullName.trim());
      if (invalid) {
        toast({
          title: "Accompanying Guest Name Required",
          description: "Please enter the full name for all accompanying guests, or delete empty guest cards.",
          variant: "destructive",
        });
        return;
      }
    }

    const extraMetadata: Partial<GuestRecord> = {
      hasRelationshipDoc,
      relationshipStatus: hasRelationshipDoc ? relationshipStatus : undefined,
      relationshipDocName: hasRelationshipDoc ? relationshipDocName : undefined,
      relationshipDocUrl: hasRelationshipDoc ? relationshipDocUrl : undefined,
      relationshipDocNumber: hasRelationshipDoc ? relationshipDocNumber : undefined,
      partnerFullName: hasRelationshipDoc ? partnerFullName.trim() : undefined,
      partnerRelationship: hasRelationshipDoc ? partnerRelationship : undefined,
      partnerGender: hasRelationshipDoc ? partnerGender : undefined,
      partnerAgeCategory: hasRelationshipDoc ? partnerAgeCategory : undefined,
      partnerIdType: hasRelationshipDoc ? partnerIdType : undefined,
      partnerIdNumber: hasRelationshipDoc ? partnerIdNumber.trim() : undefined,
      hasAccompanyingGuests: finalAccompanyingGuests.length > 0 || hasAccompanyingGuests,
      accompanyingGuests: finalAccompanyingGuests,
    };

    addGuestMutation.mutate(data, {
      onSuccess: (newGuest) => {
        toast({
          title: "Guest Registered Successfully",
          description: `${newGuest.firstName} ${newGuest.lastName} (${newGuest.guestCode}) registered.`,
        });
        const enrichedGuest: GuestRecord = {
          ...newGuest,
          ...extraMetadata,
        };
        onOpenChange(false);
        if (proceedToReservation && onProceedToReservation) {
          onProceedToReservation(enrichedGuest);
        } else if (onSuccessSaveOnly) {
          onSuccessSaveOnly(enrichedGuest);
        }
      },
    });
  };

  const countryNormalized = (selectedCountry || "").trim().toLowerCase();
  const isEritrea = countryNormalized.includes("eritrea");
  const isKenya = countryNormalized.includes("kenya");
  const isEthiopia = countryNormalized === "" || countryNormalized.includes("ethiopia");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 flex flex-col max-h-[90vh] overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-[#0D1527]">
        <DialogHeader className="px-6 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Register New Guest
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Capture guest demographics, scan Fayda national ID credentials, and establish guest profile.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="guest-registration-modal-form"
          key={`reg-form-${formKey}`}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(true);
          }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Fayda Scanner Component */}
            <FaydaScanner
              onDecoded={handleFaydaDecoded}
              onClear={() => {
                setFaydaFormDefaults(null);
                setPhone("");
                setNationalId("");
                setFormKey((k) => k + 1);
              }}
            />

            <div className="space-y-5">
              {/* Personal Details */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold">First Name *</Label>
                    <Input id="firstName" name="firstName" required defaultValue={faydaFormDefaults?.firstName} className="h-10 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="middleName" className="text-xs font-semibold">Middle Name</Label>
                    <Input id="middleName" name="middleName" defaultValue={faydaFormDefaults?.middleName} className="h-10 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold">Last Name *</Label>
                    <Input id="lastName" name="lastName" required defaultValue={faydaFormDefaults?.lastName} className="h-10 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPhone(val.slice(0, 10));
                        if (val.length > 0 && val.length < 10) {
                          setPhoneError(`${val.length}/10 digits`);
                        } else {
                          setPhoneError("");
                        }
                      }}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Identification Details */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                  Identification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="nationalId" className="text-xs font-semibold">National ID / Fayda FAN</Label>
                    <Input
                      id="nationalId"
                      name="nationalId"
                      maxLength={16}
                      value={nationalId}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setNationalId(val.slice(0, 16));
                        if (val.length > 0 && val.length < 16) {
                          setFanError(`${val.length}/16 digits`);
                        } else {
                          setFanError("");
                        }
                      }}
                      className="h-10 text-sm font-mono"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gender" className="text-xs font-semibold">Gender</Label>
                    <select
                      id="gender"
                      name="gender"
                      defaultValue={faydaFormDefaults?.gender || ""}
                      className="h-10 rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="dateOfBirth" className="text-xs font-semibold">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      defaultValue={faydaFormDefaults?.dateOfBirth}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="nationality" className="text-xs font-semibold">Nationality</Label>
                    <Input
                      id="nationality"
                      name="nationality"
                      defaultValue={faydaFormDefaults?.nationality || "Ethiopian"}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                  Classification & Preferences
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="grid gap-1.5">
                    <Label htmlFor="guestType" className="text-xs font-semibold">Guest Type</Label>
                    <select
                      id="guestType"
                      name="guestType"
                      value={selectedGuestType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedGuestType(val);
                        if (val !== "couple") {
                          setHasRelationshipDoc(false);
                        }
                        if (val !== "family" && val !== "friends") {
                          setHasAccompanyingGuests(false);
                        }
                      }}
                      className="h-10 rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 py-2 text-sm text-foreground"
                    >
                      <option value="individual">Individual</option>
                      <option value="couple">Couple</option>
                      <option value="friends">Friends / Companions</option>
                      <option value="family">Family</option>
                      <option value="corporate">Corporate</option>
                      <option value="travel_agency">Travel Agency</option>
                      <option value="government">Government</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="vipStatus"
                      name="vipStatus"
                      defaultChecked={faydaFormDefaults?.vipStatus}
                      className="h-4 w-4 rounded border-border text-primary cursor-pointer"
                    />
                    <Label htmlFor="vipStatus" className="text-xs font-semibold cursor-pointer">
                      ⭐ VIP Guest Status
                    </Label>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════
                  SECTION: OPTIONAL COUPLE & RELATIONSHIP VERIFICATION (ONLY FOR COUPLE GUEST TYPE)
                 ══════════════════════════════════════════════════════════════ */}
              {selectedGuestType === "couple" && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="hasRelationshipDoc"
                      checked={hasRelationshipDoc}
                      onChange={(e) => setHasRelationshipDoc(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-rose-500 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="hasRelationshipDoc" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                        <span>Traveling as Couple / Marital Status Verification (Optional)</span>
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Attach marriage certificate or relationship indicator card if requested by hotel policy or local authority.
                      </p>
                    </div>
                  </div>
                  {hasRelationshipDoc && (
                    <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10">
                      Optional Document
                    </Badge>
                  )}
                </div>

                {hasRelationshipDoc && (
                  <div className="pt-3 border-t border-border/60 space-y-3.5 animate-in fade-in-50 duration-200">
                    {/* Accompanying Partner / Spouse Details Card */}
                    <div className="p-3 rounded-lg border border-rose-500/30 bg-white dark:bg-[#0B132B] space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-border/50">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                          <span>Accompanying Partner / Spouse Details</span>
                        </span>
                        <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10">
                          Partner Form
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Full Name *</Label>
                          <Input
                            value={partnerFullName}
                            onChange={(e) => setPartnerFullName(e.target.value)}
                            className="h-8 text-xs"
                            required={hasRelationshipDoc}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Relationship</Label>
                          <select
                            value={partnerRelationship}
                            onChange={(e) => setPartnerRelationship(e.target.value)}
                            className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                          >
                            <option value="spouse">Spouse</option>
                            <option value="engaged">Fiancé(e)</option>
                            <option value="friend">Friend</option>
                            <option value="colleague">Colleague</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Gender</Label>
                          <select
                            value={partnerGender}
                            onChange={(e) => setPartnerGender(e.target.value)}
                            className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Age Category</Label>
                          <select
                            value={partnerAgeCategory}
                            onChange={(e) => setPartnerAgeCategory(e.target.value)}
                            className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                          >
                            <option value="adult">Adult</option>
                            <option value="child">Child (under 12)</option>
                            <option value="infant">Infant (under 2)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">ID Type (Optional)</Label>
                          <select
                            value={partnerIdType}
                            onChange={(e) => {
                              const newType = e.target.value;
                              setPartnerIdType(newType);
                              const newSpec = getIdTypeSpec(newType);
                              setPartnerIdNumber(newSpec.format(partnerIdNumber));
                            }}
                            className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                          >
                            <option value="national_id">Fayda / National ID</option>
                            <option value="passport">Passport</option>
                            <option value="driver_license">Driver's License</option>
                            <option value="none">Provide at Arrival</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-semibold">
                              {getIdTypeSpec(partnerIdType).label}
                            </Label>
                            <span
                              className={`text-[10px] font-medium ${
                                getIdTypeSpec(partnerIdType).isComplete(partnerIdNumber)
                                  ? "text-emerald-500 font-bold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {getIdTypeSpec(partnerIdType).badge(partnerIdNumber)}
                            </span>
                          </div>
                          <Input
                            placeholder={getIdTypeSpec(partnerIdType).placeholder}
                            value={partnerIdNumber}
                            maxLength={getIdTypeSpec(partnerIdType).maxLength}
                            onChange={(e) => {
                              const spec = getIdTypeSpec(partnerIdType);
                              setPartnerIdNumber(spec.format(e.target.value));
                            }}
                            disabled={partnerIdType === "none"}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Relationship Proof & Certificate (Optional) */}
                    <div className="p-3 rounded-lg border border-border bg-white/50 dark:bg-[#0E172E]/50 space-y-3">
                      <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>Marriage / Relationship Documentation (Optional)</span>
                        <span className="text-[10px] text-muted-foreground">Verification Certificate</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="relationshipStatus" className="text-xs font-semibold">
                            Relationship Status
                          </Label>
                          <select
                            id="relationshipStatus"
                            value={relationshipStatus}
                            onChange={(e) => setRelationshipStatus(e.target.value)}
                            className="w-full h-9 rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 py-1.5 text-xs text-foreground"
                          >
                            <option value="married">Married (Spouses)</option>
                            <option value="engaged">Engaged / Fiancé(e)</option>
                            <option value="family">Family Relatives</option>
                            <option value="colleagues">Colleagues / Traveling Together</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="relationshipDocNumber" className="text-xs font-semibold">
                            Certificate / Registration # (Optional)
                          </Label>
                          <Input
                            id="relationshipDocNumber"
                            value={relationshipDocNumber}
                            onChange={(e) => setRelationshipDocNumber(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Upload Card / Certificate */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold flex items-center justify-between">
                          <span>Marriage Certificate / Relationship Proof Card</span>
                          <span className="text-[10px] text-muted-foreground">JPG, PNG, PDF up to 5MB</span>
                        </Label>

                        {relationshipDocName ? (
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5">
                            <div className="flex items-center gap-2.5 truncate">
                              {relationshipDocUrl && relationshipDocUrl.startsWith("data:image") ? (
                                <img
                                  src={relationshipDocUrl}
                                  alt="Certificate Preview"
                                  className="w-9 h-9 rounded object-cover border border-border"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded bg-rose-500/10 flex items-center justify-center text-rose-500">
                                  <FileText className="w-4 h-4" />
                                </div>
                              )}
                              <div className="truncate">
                                <p className="text-xs font-semibold truncate text-foreground">{relationshipDocName}</p>
                                <p className="text-[10px] text-muted-foreground">Document attached successfully</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={removeRelationshipFile}
                              className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                              title="Remove Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              id="relationshipFile"
                              accept="image/*,application/pdf"
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground cursor-pointer">
                              <Upload className="w-4 h-4 text-rose-500" />
                              <span>Click or drag to upload Marriage / Relationship Card</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* ══════════════════════════════════════════════════════════════
                  SECTION: OPTIONAL MULTI-GUEST / FAMILY / FRIENDS REGISTRATION
                 ══════════════════════════════════════════════════════════════ */}
              {(selectedGuestType === "family" || selectedGuestType === "friends") && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="hasAccompanyingGuests"
                      checked={hasAccompanyingGuests}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasAccompanyingGuests(checked);
                        if (checked && accompanyingGuests.length === 0) {
                          addAccompanyingGuest();
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="hasAccompanyingGuests" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {selectedGuestType === "friends"
                            ? "Register Accompanying Friends / Companions (Optional)"
                            : "Register Accompanying Guests / Family Members (Optional)"}
                        </span>
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {selectedGuestType === "friends"
                          ? "For friends traveling together (male/male, female/female, or group companions sharing room). All companions must present verified IDs at check-in."
                          : "Add family members or companions. Primary guest reserves for all; all guests must be present and verified at check-in."}
                      </p>
                    </div>
                  </div>
                  {hasAccompanyingGuests && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addAccompanyingGuest(selectedGuestType === "friends" ? "friend" : "spouse")}
                      className="h-7 text-xs font-semibold gap-1 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-3 h-3" /> {selectedGuestType === "friends" ? "Add Friend" : "Add Guest"}
                    </Button>
                  )}
                </div>

                {hasAccompanyingGuests && (
                  <div className="pt-2 border-t border-border/60 space-y-3 animate-in fade-in-50 duration-200">
                    {accompanyingGuests.length === 0 ? (
                      <div className="text-center py-3 text-xs text-muted-foreground">
                        No companions added yet. Click &quot;{selectedGuestType === "friends" ? "Add Friend" : "Add Guest"}&quot; above.
                      </div>
                    ) : (
                      accompanyingGuests.map((guest, idx) => (
                        <div
                          key={guest.id}
                          className="p-3 rounded-lg border border-border bg-white dark:bg-[#0B132B] space-y-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-border/50">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                                {idx + 2}
                              </span>
                              <span>
                                {selectedGuestType === "friends"
                                  ? `Accompanying Friend #${idx + 1}`
                                  : `Accompanying Guest #${idx + 1}`}
                              </span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAccompanyingGuest(guest.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                              title="Remove Guest"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Full Name *</Label>
                              <Input
                                value={guest.fullName}
                                onChange={(e) => updateAccompanyingGuest(guest.id, { fullName: e.target.value })}
                                className="h-8 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Relationship</Label>
                              <select
                                value={guest.relationship}
                                onChange={(e) => updateAccompanyingGuest(guest.id, { relationship: e.target.value as any })}
                                className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                              >
                                <option value="spouse">Spouse</option>
                                <option value="child">Child</option>
                                <option value="parent">Parent</option>
                                <option value="sibling">Sibling</option>
                                <option value="friend">Friend</option>
                                <option value="colleague">Colleague</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Gender</Label>
                              <select
                                value={guest.gender}
                                onChange={(e) => updateAccompanyingGuest(guest.id, { gender: e.target.value as any })}
                                className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                              >
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">Age Category</Label>
                              <select
                                value={guest.ageCategory}
                                onChange={(e) => updateAccompanyingGuest(guest.id, { ageCategory: e.target.value as any })}
                                className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                              >
                                <option value="adult">Adult</option>
                                <option value="child">Child (under 12)</option>
                                <option value="infant">Infant (under 2)</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold">ID Type (Optional)</Label>
                              <select
                                value={guest.idType || "national_id"}
                                onChange={(e) => {
                                  const newType = e.target.value as any;
                                  const newSpec = getIdTypeSpec(newType);
                                  updateAccompanyingGuest(guest.id, {
                                    idType: newType,
                                    idNumber: newSpec.format(guest.idNumber || ""),
                                  });
                                }}
                                className="w-full h-8 rounded-md border border-border bg-white dark:bg-[#0E172E] px-2 text-xs text-foreground"
                              >
                                <option value="national_id">Fayda / National ID</option>
                                <option value="passport">Passport</option>
                                <option value="driver_license">Driver's License</option>
                                <option value="birth_certificate">Birth Certificate (Minor)</option>
                                <option value="none">Provide at Arrival</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-semibold">
                                  {getIdTypeSpec(guest.idType || "national_id").label}
                                </Label>
                                <span
                                  className={`text-[10px] font-medium ${
                                    getIdTypeSpec(guest.idType || "national_id").isComplete(guest.idNumber || "")
                                      ? "text-emerald-500 font-bold"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {getIdTypeSpec(guest.idType || "national_id").badge(guest.idNumber || "")}
                                </span>
                              </div>
                              <Input
                                placeholder={getIdTypeSpec(guest.idType || "national_id").placeholder}
                                value={guest.idNumber || ""}
                                maxLength={getIdTypeSpec(guest.idType || "national_id").maxLength}
                                onChange={(e) => {
                                  const spec = getIdTypeSpec(guest.idType || "national_id");
                                  updateAccompanyingGuest(guest.id, {
                                    idNumber: spec.format(e.target.value),
                                  });
                                }}
                                disabled={guest.idType === "none"}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border/80 bg-muted/20 dark:bg-muted/10 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs sm:text-sm font-medium px-4"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={addGuestMutation.isPending}
                onClick={() => handleSave(false)}
                className="h-10 text-xs sm:text-sm font-semibold border-primary/30 text-primary hover:bg-primary/10"
              >
                Save Guest Only
              </Button>
              <Button
                type="button"
                disabled={addGuestMutation.isPending}
                onClick={() => handleSave(true)}
                className="h-10 px-5 flex items-center gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm text-xs sm:text-sm"
                title="Save & Proceed to Reservation"
                aria-label="Save & Proceed to Reservation"
              >
                {addGuestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Save & Reserve</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

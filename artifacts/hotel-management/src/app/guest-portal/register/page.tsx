"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  QrCode,
  Users,
  Heart,
  FileText,
  Upload,
  Trash2,
  Plus,
  UtensilsCrossed,
  BedDouble,
  Cigarette,
  Paperclip,
  Hotel,
  PhoneCall,
  ChevronLeft,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaydaScanner } from "@/components/fayda-scanner";
import type { ParsedFaydaGuest } from "@/lib/fayda";
import {
  COUNTRIES,
  ADDIS_ABABA_SUB_CITIES,
  ETHIOPIAN_MAJOR_CITIES,
  ERITREAN_MAJOR_CITIES,
} from "@/lib/geo-data";

interface IdTypeSpec {
  label: string;
  maxLength: number;
  format: (raw: string) => string;
  badge: (val: string) => string;
  isComplete: (val: string) => boolean;
}

const getIdTypeSpec = (type: string): IdTypeSpec => {
  switch (type) {
    case "national_id":
    case "fayda":
      return {
        label: "Fayda FAN",
        maxLength: 16,
        format: (val) => val.replace(/\D/g, "").slice(0, 16),
        badge: () => "",
        isComplete: (val) => val.length === 16,
      };
    case "passport":
      return {
        label: "Passport Number",
        maxLength: 9,
        format: (val) => val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9),
        badge: () => "",
        isComplete: (val) => val.length >= 7 && val.length <= 9,
      };
    case "driver_license":
      return {
        label: "Driver's License #",
        maxLength: 15,
        format: (val) => val.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 15),
        badge: () => "",
        isComplete: (val) => val.length >= 6,
      };
    case "birth_certificate":
      return {
        label: "Birth Certificate #",
        maxLength: 15,
        format: (val) => val.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 15),
        badge: () => "",
        isComplete: (val) => val.length >= 4,
      };
    case "none":
    default:
      return {
        label: "Verification Status",
        maxLength: 40,
        format: (val) => val.slice(0, 40),
        badge: () => "At check-in",
        isComplete: () => true,
      };
  }
};

interface AccompanyingGuest {
  id: string;
  fullName: string;
  relationship: "spouse" | "child" | "parent" | "sibling" | "friend" | "colleague" | "engaged" | "other";
  gender: "male" | "female" | "other";
  ageCategory: "adult" | "child" | "infant";
  idType?: "fayda" | "passport" | "national_id" | "driver_license" | "birth_certificate" | "none";
  idNumber?: string;
  phone?: string;
}

const STEPS = [
  { step: 1, title: "Guest & Identity" },
  { step: 2, title: "Contact & Location" },
  { step: 3, title: "Preferences & Companions" },
];

function RegisterForm() {
  const router = useRouter();

  // Stepper State (1, 2, 3)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Primary Identity
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("Ethiopian");

  // Step 1: Identification
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");

  // Step 2: Contact Details
  const [phone, setPhone] = useState("");
  const [alternativePhone, setAlternativePhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2: Account Security & Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Address & Geography
  const [selectedCountry, setSelectedCountry] = useState("Ethiopia");
  const [cityInput, setCityInput] = useState("Bole");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Step 3: Classification & Preferences
  const [selectedGuestType, setSelectedGuestType] = useState<string>("individual");
  const [vipStatus, setVipStatus] = useState(false);
  const [smokingPreference, setSmokingPreference] = useState("non_smoking");
  const [bedPreference, setBedPreference] = useState("king");
  const [foodPreference, setFoodPreference] = useState("none");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 3: Optional Couple / Relationship Verification (ONLY when selectedGuestType === 'couple')
  const [hasRelationshipDoc, setHasRelationshipDoc] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState("married");
  const [relationshipDocName, setRelationshipDocName] = useState("");
  const [relationshipDocUrl, setRelationshipDocUrl] = useState("");
  const [relationshipDocNumber, setRelationshipDocNumber] = useState("");
  const [partnerFullName, setPartnerFullName] = useState("");
  const [partnerRelationship, setPartnerRelationship] = useState("spouse");
  const [partnerGender, setPartnerGender] = useState("female");
  const [partnerAgeCategory, setPartnerAgeCategory] = useState("adult");
  const [partnerIdType, setPartnerIdType] = useState("national_id");
  const [partnerIdNumber, setPartnerIdNumber] = useState("");

  // Step 3: Optional Accompanying / Multi-Guests (ONLY when selectedGuestType === 'family')
  const [hasAccompanyingGuests, setHasAccompanyingGuests] = useState(false);
  const [accompanyingGuests, setAccompanyingGuests] = useState<AccompanyingGuest[]>([]);

  // Fayda scanner
  const [faydaScanned, setFaydaScanned] = useState<ParsedFaydaGuest | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Status & Submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredGuestName, setRegisteredGuestName] = useState("");

  const idSpec = getIdTypeSpec(idType);

  // Handlers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    if (error && raw.length === 10) setError("");
  };

  const handleIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = idSpec.format(e.target.value);
    setIdNumber(formatted);
  };

  const handlePartnerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pSpec = getIdTypeSpec(partnerIdType);
    setPartnerIdNumber(pSpec.format(e.target.value));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an image or document smaller than 5MB");
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

  const addAccompanyingGuest = (defaultRel?: AccompanyingGuest["relationship"]) => {
    const newGuest: AccompanyingGuest = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: "",
      relationship:
        defaultRel ||
        (selectedGuestType === "corporate" ? "colleague" : "child"),
      gender: "female",
      ageCategory: "adult",
      idType: "national_id",
      idNumber: "",
      phone: "",
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

  const handleFaydaDecoded = (data: ParsedFaydaGuest) => {
    setFaydaScanned(data);
    setError("");

    if (data.firstName) setFirstName(data.firstName);
    if (data.middleName) setMiddleName(data.middleName);
    if (data.lastName) setLastName(data.lastName);
    if (!data.firstName && data.fullName) {
      const parts = data.fullName.trim().split(/\s+/);
      setFirstName(parts[0] || "");
      if (parts.length > 2) {
        setMiddleName(parts[1] || "");
        setLastName(parts.slice(2).join(" ") || "");
      } else {
        setLastName(parts[1] || "");
      }
    }

    if (data.gender) {
      const gLower = data.gender.toLowerCase();
      if (gLower.startsWith("f")) setGender("female");
      else if (gLower.startsWith("m")) setGender("male");
    }

    if (data.dateOfBirth) {
      let cleanDob = data.dateOfBirth;
      if (cleanDob.length === 8 && !cleanDob.includes("-")) {
        cleanDob = `${cleanDob.slice(0, 4)}-${cleanDob.slice(4, 6)}-${cleanDob.slice(6, 8)}`;
      }
      setDateOfBirth(cleanDob);
    }

    const fanVal = (data.fan || data.nationalId || "").replace(/\D/g, "").slice(0, 16);
    if (fanVal) {
      setIdType("national_id");
      setIdNumber(fanVal);
    }

    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, "");
      const formatted = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      if (formatted.length === 10) setPhone(formatted);
    }

    const decodedAny = data as any;
    if (decodedAny.city || decodedAny.subCity) {
      setCityInput(decodedAny.city || decodedAny.subCity);
    }
  };

  // Step Validations
  const validateStep1 = (): boolean => {
    const fName = firstName.trim();
    const lName = lastName.trim();
    if (!fName || !lName) {
      setError("First Name and Last Name are required.");
      return false;
    }
    if (idType === "national_id" && idNumber.length !== 16) {
      setError("Fayda National ID must be exactly 16 digits.");
      return false;
    }
    if (idType !== "none" && !idNumber.trim()) {
      setError("ID Document Number is required.");
      return false;
    }
    setError("");
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!phone || phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile phone number.");
      return false;
    }
    if (!password || password.trim().length < 4) {
      setError("Please choose a secure account password (at least 4 characters).");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    // Couple verification check
    if (selectedGuestType === "couple" && hasRelationshipDoc) {
      if (!partnerFullName.trim()) {
        setError("Partner Full Name is required when traveling as a verified couple.");
        return;
      }
    }

    // Accompanying guests validation
    if ((selectedGuestType === "family" || selectedGuestType === "corporate") && hasAccompanyingGuests && accompanyingGuests.length > 0) {
      const invalid = accompanyingGuests.some((g) => !g.fullName.trim());
      if (invalid) {
        setError("Please enter the full name for all accompanying members, or remove empty cards.");
        return;
      }
    }

    setLoading(true);

    try {
      let finalAccompanyingGuests: AccompanyingGuest[] =
        (selectedGuestType === "family" || selectedGuestType === "corporate") && hasAccompanyingGuests ? [...accompanyingGuests] : [];

      if (selectedGuestType === "couple" && hasRelationshipDoc && partnerFullName.trim()) {
        const partnerGuest: AccompanyingGuest = {
          id: `acc-partner-${Date.now()}`,
          fullName: partnerFullName.trim(),
          relationship: (partnerRelationship as any) || "spouse",
          gender: (partnerGender as any) || "female",
          ageCategory: (partnerAgeCategory as any) || "adult",
          idType: (partnerIdType as any) || "national_id",
          idNumber: partnerIdNumber.trim() || undefined,
        };
        finalAccompanyingGuests = [partnerGuest, ...finalAccompanyingGuests];
      }

      const fName = firstName.trim();
      const lName = lastName.trim();

      const payload = {
        firstName: fName,
        middleName: middleName.trim() || undefined,
        lastName: lName,
        fullName: `${fName} ${middleName ? middleName.trim() + " " : ""}${lName}`.trim(),
        gender,
        dateOfBirth: dateOfBirth || undefined,
        nationality: nationality.trim() || "Ethiopian",
        phone: phone.trim(),
        alternativePhone: alternativePhone.trim() || undefined,
        email: email.trim() || undefined,
        idType,
        idNumber: idNumber.trim() || undefined,
        nationalId: idType === "national_id" ? idNumber.trim() : undefined,
        passportNumber: passportNumber.trim() || (idType === "passport" ? idNumber.trim() : undefined),
        country: selectedCountry,
        city: cityInput.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        guestType: selectedGuestType,
        vipStatus,
        smokingPreference,
        bedPreference,
        foodPreference,
        specialRequests: specialRequests.trim() || undefined,
        hasRelationshipDoc: selectedGuestType === "couple" && hasRelationshipDoc,
        relationshipStatus: selectedGuestType === "couple" && hasRelationshipDoc ? relationshipStatus : undefined,
        relationshipDocNumber: selectedGuestType === "couple" && hasRelationshipDoc ? relationshipDocNumber.trim() : undefined,
        relationshipDocName: selectedGuestType === "couple" && hasRelationshipDoc ? relationshipDocName : undefined,
        relationshipDocUrl: selectedGuestType === "couple" && hasRelationshipDoc ? relationshipDocUrl : undefined,
        partnerFullName: selectedGuestType === "couple" && hasRelationshipDoc ? partnerFullName.trim() : undefined,
        partnerRelationship: selectedGuestType === "couple" && hasRelationshipDoc ? partnerRelationship : undefined,
        partnerGender: selectedGuestType === "couple" && hasRelationshipDoc ? partnerGender : undefined,
        partnerAgeCategory: selectedGuestType === "couple" && hasRelationshipDoc ? partnerAgeCategory : undefined,
        partnerIdType: selectedGuestType === "couple" && hasRelationshipDoc ? partnerIdType : undefined,
        partnerIdNumber: selectedGuestType === "couple" && hasRelationshipDoc ? partnerIdNumber.trim() : undefined,
        hasAccompanyingGuests: finalAccompanyingGuests.length > 0,
        accompanyingGuests: finalAccompanyingGuests,
        password: password.trim() || undefined,
      };

      const res = await fetch("/api/guest-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to register guest profile.");
      }

      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
          document.cookie = `nexus_guest_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }

      setRegisteredGuestName(`${fName} ${lName}`);
      setSuccess(true);

      setTimeout(() => {
        router.push("/?registered=true");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please verify your details or contact front desk.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-amber-500/40 bg-[#10121a]/95 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl rounded-2xl max-w-xl mx-auto overflow-hidden">
        <CardContent className="pt-10 pb-10 text-center space-y-5 px-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center animate-bounce shadow-lg shadow-amber-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-serif font-bold tracking-tight text-white">Welcome, {registeredGuestName}</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed font-light">
              Your guest profile has been successfully registered in the AURA guest directory. You may now book suites or request in-room services.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-medium font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Redirecting to hotel portal...</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <Button
              className="flex-1 bg-gradient-to-r from-[#d97736] to-[#b85e24] hover:from-[#e08342] hover:to-[#c4682c] text-white font-semibold text-xs h-11 gap-2 rounded-xl shadow-lg shadow-amber-500/20"
              onClick={() => router.push("/?registered=true")}
            >
              <Sparkles className="w-4 h-4" /> Go to Hotel Home &rarr;
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-[#10121a]/95 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(217,119,54,0.06)] backdrop-blur-2xl rounded-2xl max-w-3xl mx-auto overflow-hidden">
      <CardHeader className="space-y-2 text-center pb-4 pt-6 px-6 sm:px-8 border-b border-white/5 relative flex flex-col items-center justify-center">
        {/* Centered Luxury Hotel Crest Logo */}
        <div className="relative mb-2 flex items-center justify-center">
          {/* Outer Subtle Ambient Gold Glow */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-amber-600/30 blur-md opacity-75" />
          
          {/* Circular Luxury Emblem Badge */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0a0d18] border-2 border-amber-400/50 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(217,119,54,0.35)] overflow-hidden">
            <img
              src="/hotel-logo.png"
              alt="Hotel Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        <CardTitle className="text-2xl font-serif font-bold tracking-wide text-white">
          Guest Online Registration
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs sm:text-sm font-light">
          Complete the 3-step verification to pre-register your identity, contact information, and stay preferences.
        </CardDescription>
      </CardHeader>

      {/* 3-STEP PROGRESS STEPPER */}
      <div className="px-6 py-5 bg-black/40 border-b border-white/5">
        <div className="flex items-center justify-between relative max-w-md mx-auto">
          {/* Background connecting line */}
          <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-0.5 bg-white/10 -z-0" />
          <div
            className="absolute left-6 top-4 -translate-y-1/2 h-0.5 bg-gradient-to-r from-amber-500 to-[#d97736] transition-all duration-300 -z-0"
            style={{
              width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
            }}
          />

          {STEPS.map((s) => {
            const isCompleted = currentStep > s.step;
            const isActive = currentStep === s.step;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step < currentStep) {
                    setError("");
                    setCurrentStep(s.step);
                  } else if (s.step === 2 && currentStep === 1) {
                    if (validateStep1()) setCurrentStep(2);
                  } else if (s.step === 3) {
                    if (currentStep === 1 && validateStep1()) {
                      setCurrentStep(2);
                    } else if (currentStep === 2 && validateStep2()) {
                      setCurrentStep(3);
                    }
                  }
                }}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 ${
                    isCompleted
                      ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                      : isActive
                      ? "bg-[#090a10] border-amber-400 text-amber-400 ring-4 ring-amber-500/20 shadow-md"
                      : "bg-[#141622] border-white/15 text-slate-400 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : s.step}
                </div>
                <span
                  className={`mt-2 text-[11px] font-medium tracking-wide transition-colors ${
                    isActive ? "text-amber-400 font-semibold" : isCompleted ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <CardContent className="space-y-6 pt-6 px-6 sm:px-8 pb-8">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs sm:text-sm text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ══════════════════════════════════════════════════════════════
              STEP 1: GUEST & IDENTITY
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Fayda Scan Section */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Fast-Track with Fayda National ID</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScanner(!showScanner)}
                    className="text-xs h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    {showScanner ? "Hide Scanner" : "Scan / Upload Fayda Card"}
                  </Button>
                </div>

                {showScanner && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
                    <FaydaScanner
                      onDecoded={handleFaydaDecoded}
                      onClear={() => setFaydaScanned(null)}
                    />
                  </div>
                )}

                {faydaScanned && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Fayda Verified: <strong>{faydaScanned.fullName || `${firstName} ${lastName}`}</strong> ({faydaScanned.fan?.slice(0, 4)}...{faydaScanned.fan?.slice(-4)})
                      </span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                      Auto-Filled
                    </Badge>
                  </div>
                )}
              </div>

              {/* Primary Guest Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  <span>Primary Guest Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-xs font-semibold text-slate-300">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="middleName" className="text-xs font-semibold text-slate-300">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-xs font-semibold text-slate-300">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gender" className="text-xs font-semibold text-slate-300">Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="dateOfBirth" className="text-xs font-semibold text-slate-300">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="nationality" className="text-xs font-semibold text-slate-300">Nationality</Label>
                    <Input
                      id="nationality"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Identification Documents */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Identification Documents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="idType" className="text-xs font-semibold text-slate-300">ID Document Type</Label>
                    <select
                      id="idType"
                      value={idType}
                      onChange={(e) => {
                        setIdType(e.target.value);
                        setIdNumber("");
                      }}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100"
                    >
                      <option value="national_id">Fayda National ID</option>
                      <option value="passport">Passport</option>
                      <option value="driver_license">Driver's License</option>
                      <option value="birth_certificate">Birth Certificate</option>
                      <option value="none">Provide at Arrival Check-In</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="idNumber" className="text-xs font-semibold text-slate-300">
                      {idSpec.label} *
                    </Label>
                    <Input
                      id="idNumber"
                      value={idNumber}
                      onChange={handleIdNumberChange}
                      maxLength={idSpec.maxLength}
                      required={idType !== "none"}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs font-mono tracking-wider focus-visible:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-10 px-5 text-xs gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <span>Continue to Contact & Location</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 2: CONTACT & LOCATION
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">Mobile Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={10}
                        required
                        className="h-9 pl-8 bg-slate-950/80 border-slate-700 text-slate-100 text-xs font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="alternativePhone" className="text-xs font-semibold text-slate-400">Alternative Phone</Label>
                    <Input
                      id="alternativePhone"
                      type="tel"
                      value={alternativePhone}
                      onChange={(e) => setAlternativePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-300">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9 pl-8 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Security & Password */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Account Security & Password</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="regPassword" className="text-xs font-semibold text-slate-300">
                      Create Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="regPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 4 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-9 pl-8 pr-8 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regConfirmPassword" className="text-xs font-semibold text-slate-300">
                      Confirm Password *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="regConfirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-9 pl-8 pr-8 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Address & Emergency Contact</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="country" className="text-xs font-semibold text-slate-300">Country of Residence</Label>
                    <select
                      id="country"
                      value={selectedCountry}
                      onChange={(e) => {
                        const c = e.target.value;
                        setSelectedCountry(c);
                        if (c === "Ethiopia") setCityInput("Bole");
                        else if (c === "Eritrea") setCityInput("Asmara");
                        else setCityInput("");
                      }}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-xs font-semibold text-slate-300">City / Sub-City</Label>
                    {selectedCountry === "Ethiopia" ? (
                      <select
                        id="city"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100"
                      >
                        <optgroup label="Addis Ababa Sub-Cities">
                          {ADDIS_ABABA_SUB_CITIES.map((sc) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Major Ethiopian Cities">
                          {ETHIOPIAN_MAJOR_CITIES.map((ec) => (
                            <option key={ec} value={ec}>{ec}</option>
                          ))}
                        </optgroup>
                      </select>
                    ) : selectedCountry === "Eritrea" ? (
                      <select
                        id="city"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100"
                      >
                        {ERITREAN_MAJOR_CITIES.map((ec) => (
                          <option key={ec} value={ec}>{ec}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="city"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="address" className="text-xs font-semibold text-slate-300">Physical Address / Street</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. House No. or Street Name"
                      className="h-8 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="emergencyContactName" className="text-xs font-semibold text-slate-400">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="emergencyContactPhone" className="text-xs font-semibold text-slate-400">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-9 bg-slate-950/80 border-slate-700 text-slate-100 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-10 px-4 text-xs gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-10 px-5 text-xs gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <span>Continue to Preferences & Companions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              STEP 3: PREFERENCES & COMPANIONS
             ══════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Classification & Preferences */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Classification & Preferences</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <Label htmlFor="guestType" className="text-xs font-semibold text-slate-300">
                      Guest Classification Type *
                    </Label>
                    <select
                      id="guestType"
                      value={selectedGuestType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedGuestType(val);
                        if (val !== "couple") {
                          setHasRelationshipDoc(false);
                          setRelationshipDocName("");
                          setRelationshipDocUrl("");
                        }
                        if (val !== "family" && val !== "corporate") {
                          setHasAccompanyingGuests(false);
                          setAccompanyingGuests([]);
                        }
                      }}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-xs text-slate-100 font-medium"
                    >
                      <option value="individual">Individual</option>
                      <option value="couple">Couple</option>
                      <option value="family">Family</option>
                      <option value="corporate">Corporate</option>
                      <option value="travel_agency">Travel Agency</option>
                      <option value="government">Government</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="vipStatus"
                      checked={vipStatus}
                      onChange={(e) => setVipStatus(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <Label htmlFor="vipStatus" className="text-xs font-semibold text-slate-200 cursor-pointer">
                      ⭐ VIP Guest Status / Priority Services
                    </Label>
                  </div>
                </div>
              </div>

              {/* CONDITIONAL COUPLE SECTION (Strictly visible ONLY when selectedGuestType === 'couple') */}
              {selectedGuestType === "couple" && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-4 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="hasRelationshipDoc"
                        checked={hasRelationshipDoc}
                        onChange={(e) => setHasRelationshipDoc(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-rose-500/50 bg-slate-950 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                      <div>
                        <Label htmlFor="hasRelationshipDoc" className="text-xs font-bold text-rose-300 flex items-center gap-1.5 cursor-pointer">
                          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/20" />
                          <span>Traveling as Couple / Marital Status Verification</span>
                        </Label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Attach marriage certificate or relationship indicator card if requested by hotel policy or municipal authority.
                        </p>
                      </div>
                    </div>
                    {hasRelationshipDoc && (
                      <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/40 bg-rose-500/10 shrink-0">
                        Couple Document
                      </Badge>
                    )}
                  </div>

                  {hasRelationshipDoc && (
                    <div className="space-y-4 pt-2 border-t border-rose-500/20 animate-in fade-in-50 duration-200">
                      {/* Partner Details */}
                      <div className="p-3 rounded-lg border border-rose-500/20 bg-slate-950/60 space-y-3">
                        <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Accompanying Partner Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Partner Full Name *</Label>
                            <Input
                              value={partnerFullName}
                              onChange={(e) => setPartnerFullName(e.target.value)}
                              required={hasRelationshipDoc}
                              className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-100"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Relationship Status</Label>
                            <select
                              value={relationshipStatus}
                              onChange={(e) => setRelationshipStatus(e.target.value)}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                            >
                              <option value="married">Legally Married</option>
                              <option value="engaged">Engaged / Traditional Union</option>
                              <option value="civil_partnership">Civil Partnership</option>
                              <option value="other">Other Relationship</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Partner Gender</Label>
                            <select
                              value={partnerGender}
                              onChange={(e) => setPartnerGender(e.target.value)}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                            >
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Partner ID Type</Label>
                            <select
                              value={partnerIdType}
                              onChange={(e) => {
                                setPartnerIdType(e.target.value);
                                setPartnerIdNumber("");
                              }}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
                            >
                              <option value="national_id">Fayda National ID</option>
                              <option value="passport">Passport</option>
                              <option value="driver_license">Driver's License</option>
                              <option value="none">Provide on Arrival</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Partner ID / FAN Number</Label>
                            <Input
                              value={partnerIdNumber}
                              onChange={handlePartnerIdChange}
                              className="h-8 text-xs font-mono bg-slate-950 border-slate-700 text-slate-100"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Certificate Upload & Reference */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="relationshipDocNumber" className="text-[11px] font-semibold text-slate-300">
                            Certificate / Card Reference Number
                          </Label>
                          <Input
                            id="relationshipDocNumber"
                            value={relationshipDocNumber}
                            onChange={(e) => setRelationshipDocNumber(e.target.value)}
                            className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-100"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-300">Relationship Document Card Upload</Label>
                          {relationshipDocName ? (
                            <div className="flex items-center justify-between p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs">
                              <div className="flex items-center gap-2 truncate text-slate-200">
                                <Paperclip className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">{relationshipDocName}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={removeRelationshipFile}
                                className="h-7 w-7 text-slate-400 hover:text-rose-400"
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
                              <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-rose-500/40 bg-slate-950/60 hover:bg-slate-950 transition-colors text-xs text-rose-300 cursor-pointer">
                                <Upload className="w-3.5 h-3.5 text-rose-400" />
                                <span>Click or drag Marriage / Relationship Card</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CONDITIONAL FAMILY & CORPORATE SECTION (Visible when selectedGuestType === 'family' || selectedGuestType === 'corporate') */}
              {(selectedGuestType === "family" || selectedGuestType === "corporate") && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-4 animate-in fade-in-50 duration-200">
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
                            addAccompanyingGuest(
                              selectedGuestType === "corporate" ? "colleague" : "child"
                            );
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-amber-500/50 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <Label htmlFor="hasAccompanyingGuests" className="text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {selectedGuestType === "corporate"
                              ? "Register Accompanying Corporate Delegates / Colleagues"
                              : "Register Accompanying Family Members"}
                          </span>
                        </Label>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {selectedGuestType === "corporate"
                            ? "Register colleagues, corporate team members, or delegates. Primary contact books for all; individual details are recorded for security and check-in."
                            : "Register family members or companions. Primary guest books for all; individual details are recorded for municipal and safety compliance."}
                        </p>
                      </div>
                    </div>
                    {hasAccompanyingGuests && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      addAccompanyingGuest(
                        selectedGuestType === "corporate" ? "colleague" : "child"
                      )
                    }
                    className="h-7 text-xs font-semibold gap-1 px-2.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Plus className="w-3 h-3" />{" "}
                    {selectedGuestType === "corporate"
                      ? "Add Colleague"
                      : "Add Family Member"}
                  </Button>
                )}
              </div>

              {hasAccompanyingGuests && (
                <div className="pt-2 border-t border-amber-500/20 space-y-3 animate-in fade-in-50 duration-200">
                  {accompanyingGuests.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No members added yet. Click &quot;
                      {selectedGuestType === "corporate"
                        ? "Add Colleague"
                        : "Add Family Member"}
                      &quot; above.
                    </div>
                  ) : (
                    accompanyingGuests.map((guest, idx) => (
                      <div
                        key={guest.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-2.5 text-xs text-slate-100"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400">#{idx + 1}</span>
                            <span className="font-semibold">
                              {guest.fullName ||
                                (selectedGuestType === "corporate"
                                  ? "New Colleague / Delegate"
                                  : "New Family Member")}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAccompanyingGuest(guest.id)}
                            className="h-6 w-6 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Full Name *</Label>
                            <Input
                              value={guest.fullName}
                              onChange={(e) => updateAccompanyingGuest(guest.id, { fullName: e.target.value })}
                              required={hasAccompanyingGuests}
                              className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Relationship</Label>
                            <select
                              value={guest.relationship}
                              onChange={(e) => updateAccompanyingGuest(guest.id, { relationship: e.target.value as any })}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100"
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
                            <Label className="text-[11px] font-semibold text-slate-300">Gender</Label>
                            <select
                              value={guest.gender}
                              onChange={(e) => updateAccompanyingGuest(guest.id, { gender: e.target.value as any })}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100"
                            >
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">Age Category</Label>
                            <select
                              value={guest.ageCategory}
                              onChange={(e) => updateAccompanyingGuest(guest.id, { ageCategory: e.target.value as any })}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100"
                            >
                              <option value="adult">Adult</option>
                              <option value="child">Child</option>
                              <option value="infant">Infant</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">ID Type</Label>
                            <select
                              value={guest.idType || "national_id"}
                              onChange={(e) => updateAccompanyingGuest(guest.id, { idType: e.target.value as any })}
                              className="w-full h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100"
                            >
                              <option value="national_id">Fayda National ID</option>
                              <option value="passport">Passport</option>
                              <option value="birth_certificate">Birth Certificate</option>
                              <option value="none">Provide at Arrival</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-300">ID / FAN Number</Label>
                            <Input
                              value={guest.idNumber || ""}
                              onChange={(e) => updateAccompanyingGuest(guest.id, { idNumber: e.target.value })}
                              className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-slate-100"
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

              {/* Step 3 Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-10 px-4 text-xs gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Button>

                <Button
                  type="submit"
                  disabled={loading || phone.length !== 10 || !firstName.trim() || !lastName.trim()}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold h-11 px-6 text-sm shadow-lg shadow-amber-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering Complete Profile...
                    </>
                  ) : (
                    <>
                      Complete Registration & Unlock Portal <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="text-center pt-3 border-t border-white/10">
            <p className="text-xs text-slate-400">
              Already registered in our guest directory?{" "}
              <Link href="/guest-portal/login" className="text-amber-400 hover:text-amber-300 hover:underline font-semibold transition-colors">
                Sign in with Phone & Name &rarr;
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const REGISTER_DESTINATIONS = [
  {
    id: "fountain",
    number: "01",
    title: "Grand Resort & Fountains",
    location: "Bellagio • Las Vegas",
    image: "/login-assets/hotel-fountain.jpg",
    highlight: "Majestic dancing fountains & luxury tower",
  },
  {
    id: "ocean-villa",
    number: "02",
    title: "Horizon Oceanfront Villa",
    location: "Overwater Lagoon • Maldives",
    image: "/login-assets/hotel-ocean-villa.jpg",
    highlight: "Open-air teak terrace with ocean panorama",
  },
  {
    id: "palace",
    number: "03",
    title: "Royal Palace Courtyard",
    location: "Emirates Heritage • Abu Dhabi",
    image: "/login-assets/hotel-palace.png",
    highlight: "Illuminated star fountain & grand domes",
  },
  {
    id: "suite-round",
    number: "04",
    title: "Signature Botanical Suite",
    location: "Modern Penthouse • Milan",
    image: "/login-assets/hotel-suite-round.png",
    highlight: "Bespoke circular bed & botanical wall mural",
  },
];

export default function GuestRegisterPage() {
  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#030614] text-slate-100 flex flex-col justify-center items-center relative selection:bg-amber-500/30 select-none">
      {/* 4-Quadrant Full-Viewport Luxury Architectural Background Gallery - Interactive Hover View */}
      <div className="fixed inset-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 w-screen h-screen z-0 pointer-events-auto select-none">
        {REGISTER_DESTINATIONS.map((dest) => (
          <div
            key={dest.id}
            className="group relative overflow-hidden border-white/5 border-[0.5px] cursor-pointer"
          >
            {/* Background Hotel Image with Smooth Zoom and Brightness on Hover */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out transform scale-100 brightness-[0.50] contrast-[1.02] group-hover:scale-110 group-hover:brightness-[1.15] group-hover:contrast-[1.10]"
              style={{ backgroundImage: `url('${dest.image}')` }}
            />
            {/* Deep dark gradient overlay that fades away on hover to reveal the neat, bright hotel photo */}
            <div className="absolute inset-0 transition-all duration-700 ease-out bg-gradient-to-t from-[#020512]/90 via-[#030718]/65 to-[#020512]/75 group-hover:opacity-15 group-hover:bg-gradient-to-t group-hover:from-black/40 group-hover:via-transparent group-hover:to-black/30" />

            {/* Subtle destination badge revealing cleanly on hover in the corner of the quadrant */}
            <div className="absolute bottom-5 left-5 z-10 transition-all duration-500 ease-out transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 pointer-events-none">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-medium text-amber-300 shadow-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-serif tracking-wide">{dest.title}</span>
                <span className="text-white/30">•</span>
                <span className="text-slate-300 text-[11px] font-sans">{dest.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Atmospheric Vignette for Center Contrast */}
      <div
        className="fixed inset-0 pointer-events-none z-1"
        style={{
          background: "radial-gradient(circle at center, rgba(3, 7, 24, 0.72) 0%, rgba(3, 7, 24, 0.35) 45%, rgba(2, 5, 18, 0.35) 100%)",
        }}
      />

      {/* Minimal Top-Left Back Arrow Navigation Only (No text, no other elements) */}
      <div className="absolute top-5 left-5 sm:top-6 sm:left-6 z-30">
        <Link
          href="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-black/60 backdrop-blur-md text-amber-400 hover:text-white hover:bg-white/15 hover:border-amber-500/60 transition-all shadow-lg group cursor-pointer"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Main Registration Form Container - Static, Centered, Shifted slightly upward, Non-scrollable page */}
      <main className="w-full h-full flex items-center justify-center p-3 sm:p-5 z-10 relative pointer-events-none -translate-y-2 sm:-translate-y-4">
        <div className="w-full max-w-3xl pointer-events-auto max-h-[92vh] overflow-y-auto pr-0.5 custom-scrollbar">
          <Suspense
            fallback={
              <div className="text-center py-12 text-slate-400 bg-[#10121a]/95 border border-white/10 rounded-2xl p-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
                <p className="text-xs font-light">Initializing luxury guest registration...</p>
              </div>
            }
          >
            <RegisterForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

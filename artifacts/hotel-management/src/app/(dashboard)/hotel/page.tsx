"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Sliders,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Edit,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Save,
  X,
  Star,
  Clock,
  Coins,
  FileText,
  BedDouble,
  Coffee,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "@/components/setup/StatusPill";

type HotelSettings = {
  // Front Desk & Operations
  earlyCheckInAllowedTime?: string;
  lateCheckOutGracePeriod?: number;
  lateCheckOutHalfDayCutoff?: string;
  nightAuditMode?: "auto" | "manual";
  nightAuditTime?: string;
  noShowReleaseWindow?: string;
  overbookingThreshold?: number;

  // Housekeeping & Dining
  checkoutTriggerState?: "dirty" | "cleaning";
  linenChangeFrequency?: number;
  turndownServiceEnabled?: boolean;
  defaultBoardBasis?: "ro" | "bb" | "hb" | "fb";
  breakfastServiceHours?: string;
  breakfastPriceAdult?: number;
  breakfastPriceChild?: number;
  extraBedDailyFee?: number;
  maxExtraBedsPerRoom?: number;

  // Revenue & Payment
  invoicePrefix?: string;
  receiptPrefix?: string;
  proformaPrefix?: string;
  defaultGuaranteePolicy?: "credit_card" | "first_night_deposit" | "non_guaranteed";
  ageTierInfantMax?: number;
  ageTierChildMax?: number;
  ageTierAdultMin?: number;
  enabledGateways?: string[];

  // Legal & Policy
  folioTermsFooter?: string;
  registrationCardDisclaimer?: string;
};

type Hotel = {
  id: string;
  hotelName: string;
  legalName?: string;
  hotelCode: string;
  currencyCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  timezone?: string;
  starRating?: number;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  taxNumber?: string;
  licenseNumber?: string;
  description?: string;
  logo?: string;
  settings?: HotelSettings;
};

const DEFAULT_SETTINGS: HotelSettings = {
  earlyCheckInAllowedTime: "10:00",
  lateCheckOutGracePeriod: 30,
  lateCheckOutHalfDayCutoff: "15:00",
  nightAuditMode: "auto",
  nightAuditTime: "02:00",
  noShowReleaseWindow: "18:00",
  overbookingThreshold: 2,

  checkoutTriggerState: "dirty",
  linenChangeFrequency: 3,
  turndownServiceEnabled: true,
  defaultBoardBasis: "bb",
  breakfastServiceHours: "06:30 - 10:00",
  breakfastPriceAdult: 450,
  breakfastPriceChild: 250,
  extraBedDailyFee: 800,
  maxExtraBedsPerRoom: 1,

  invoicePrefix: "NGH-INV-",
  receiptPrefix: "NGH-REC-",
  proformaPrefix: "NGH-PRO-",
  defaultGuaranteePolicy: "credit_card",
  ageTierInfantMax: 2,
  ageTierChildMax: 12,
  ageTierAdultMin: 13,
  enabledGateways: ["telebirr", "cbe_birr", "visa_mastercard", "cash"],

  folioTermsFooter:
    "Safe deposit boxes are provided at reception for valuables. The hotel is not responsible for money, jewelry, or documents left in guest rooms. Guests are liable for any damages caused to hotel property during their stay.",
  registrationCardDisclaimer:
    "I agree to the hotel rules and policies. I agree that my liability for this bill is not waived and I agree to be held personally liable in the event that the indicated person or company fails to pay the full amount.",
};

type TabKey = "identity" | "operations" | "revenue" | "housekeeping" | "legal";

export default function HotelPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [isEditing, setIsEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawHotel, isLoading, isError, refetch } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel"),
  });

  const hotel: Hotel | undefined = Array.isArray(rawHotel)
    ? rawHotel[0]
    : (rawHotel?.data?.[0] ?? rawHotel);

  const mergedSettings: HotelSettings = {
    ...DEFAULT_SETTINGS,
    ...(hotel?.settings || {}),
  };

  const [gateways, setGateways] = useState<string[]>(
    mergedSettings.enabledGateways || DEFAULT_SETTINGS.enabledGateways || []
  );

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Hotel>) =>
      hotel?.id
        ? apiFetch(`/hotel/${hotel.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/hotel", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel"] });
      toast({ title: "Hotel configuration updated successfully" });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = (text: string, key: string) => {
    if (!text || typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleGateway = (gw: string) => {
    if (!isEditing) return;
    setGateways((prev) =>
      prev.includes(gw) ? prev.filter((g) => g !== gw) : [...prev, gw]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const formObj = Object.fromEntries(fd);

    const updatedSettings: HotelSettings = {
      earlyCheckInAllowedTime: String(formObj.earlyCheckInAllowedTime || mergedSettings.earlyCheckInAllowedTime),
      lateCheckOutGracePeriod: Number(formObj.lateCheckOutGracePeriod) || mergedSettings.lateCheckOutGracePeriod,
      lateCheckOutHalfDayCutoff: String(formObj.lateCheckOutHalfDayCutoff || mergedSettings.lateCheckOutHalfDayCutoff),
      nightAuditMode: formObj.nightAuditMode === "manual" ? "manual" : "auto",
      nightAuditTime: String(formObj.nightAuditTime || mergedSettings.nightAuditTime),
      noShowReleaseWindow: String(formObj.noShowReleaseWindow || mergedSettings.noShowReleaseWindow),
      overbookingThreshold: Number(formObj.overbookingThreshold) || 0,

      checkoutTriggerState: formObj.checkoutTriggerState === "cleaning" ? "cleaning" : "dirty",
      linenChangeFrequency: Number(formObj.linenChangeFrequency) || 3,
      turndownServiceEnabled: formObj.turndownServiceEnabled === "on",
      defaultBoardBasis: (formObj.defaultBoardBasis as any) || "bb",
      breakfastServiceHours: String(formObj.breakfastServiceHours || mergedSettings.breakfastServiceHours),
      breakfastPriceAdult: Number(formObj.breakfastPriceAdult) || 0,
      breakfastPriceChild: Number(formObj.breakfastPriceChild) || 0,
      extraBedDailyFee: Number(formObj.extraBedDailyFee) || 0,
      maxExtraBedsPerRoom: Number(formObj.maxExtraBedsPerRoom) || 1,

      invoicePrefix: String(formObj.invoicePrefix || mergedSettings.invoicePrefix),
      receiptPrefix: String(formObj.receiptPrefix || mergedSettings.receiptPrefix),
      proformaPrefix: String(formObj.proformaPrefix || mergedSettings.proformaPrefix),
      defaultGuaranteePolicy: (formObj.defaultGuaranteePolicy as any) || "credit_card",
      ageTierInfantMax: Number(formObj.ageTierInfantMax) || 2,
      ageTierChildMax: Number(formObj.ageTierChildMax) || 12,
      ageTierAdultMin: Number(formObj.ageTierAdultMin) || 13,
      enabledGateways: gateways,

      folioTermsFooter: String(formObj.folioTermsFooter || mergedSettings.folioTermsFooter),
      registrationCardDisclaimer: String(formObj.registrationCardDisclaimer || mergedSettings.registrationCardDisclaimer),
    };

    saveMutation.mutate({
      hotelName: String(formObj.hotelName || hotel?.hotelName),
      legalName: String(formObj.legalName || hotel?.legalName),
      hotelCode: String(formObj.hotelCode || hotel?.hotelCode),
      starRating: Number(formObj.starRating) || 5,
      email: String(formObj.email || hotel?.email),
      phone: String(formObj.phone || hotel?.phone),
      website: String(formObj.website || hotel?.website),
      address: String(formObj.address || hotel?.address),
      city: String(formObj.city || hotel?.city),
      country: String(formObj.country || hotel?.country),
      timezone: String(formObj.timezone || hotel?.timezone),
      currencyCode: String(formObj.currencyCode || hotel?.currencyCode),
      checkInTime: String(formObj.checkInTime || hotel?.checkInTime),
      checkOutTime: String(formObj.checkOutTime || hotel?.checkOutTime),
      taxNumber: String(formObj.taxNumber || hotel?.taxNumber),
      licenseNumber: String(formObj.licenseNumber || hotel?.licenseNumber),
      settings: updatedSettings,
    } as Partial<Hotel>);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-28 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
        <div className="space-y-6 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
        <Building2 className="w-12 h-12 text-blue-700 dark:text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Unable to Load Hotel Configuration
        </h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-600 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const starsCount = hotel?.starRating || 5;

  return (
    <div className="max-w-6xl mx-auto pb-20 pt-2 space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Hotel Configuration
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Configuration</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-xs cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Configuration</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Luxury Identity Banner */}
        <div className="mt-4 p-6 rounded-2xl bg-gradient-to-r from-blue-700/10 via-blue-600/5 to-transparent dark:from-blue-900/30 dark:via-blue-950/10 dark:to-transparent border border-blue-600/20 dark:border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm border border-blue-400/30">
              {hotel?.hotelName?.charAt(0) || "N"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl text-[var(--text-primary)]">
                  {hotel?.hotelName || "Nexus Grand Hotel"}
                </span>
                <StatusPill status={hotel?.status || "active"} />
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono mt-1">
                <span className="font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  {hotel?.hotelCode || "NGH-001"}
                </span>
                <span>&bull;</span>
                <div className="flex items-center text-amber-500 gap-0.5" title={`${starsCount} Star Luxury`}>
                  {Array.from({ length: starsCount }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)] border-t md:border-t-0 md:border-l border-[var(--border)] pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Currency</span>
              <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{hotel?.currencyCode || "ETB"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Timezone</span>
              <span className="font-mono font-medium text-[var(--text-primary)]">{hotel?.timezone || "Africa/Addis_Ababa"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Check-In / Out</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{hotel?.checkInTime || "14:00"} / {hotel?.checkOutTime || "12:00"}</span>
            </div>
          </div>
        </div>

        {/* Luxury Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] mt-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "identity"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Property & Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "operations"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Operations & Timers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "revenue"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Revenue & Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("housekeeping")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "housekeeping"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Housekeeping & Dining</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("legal")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "legal"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Policies & Legal</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-6">
          {/* TAB 1: IDENTITY & PROPERTY */}
          {activeTab === "identity" && (
            <div className="space-y-8">
              {/* Brand & Corporate */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Brand & Corporate Entity
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Hotel Brand Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hotelName"
                        defaultValue={hotel?.hotelName}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.hotelName || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Legal Entity Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="legalName"
                        defaultValue={hotel?.legalName}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.legalName || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Property Code</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hotelCode"
                        defaultValue={hotel?.hotelCode}
                        required
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.hotelCode || "—"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Star Rating</span>
                    {isEditing ? (
                      <select
                        name="starRating"
                        defaultValue={hotel?.starRating || 5}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <option key={s} value={s}>{s} Stars</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{starsCount} Stars Luxury</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Location & Contact
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Official Email</span>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        defaultValue={hotel?.email}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.email || "—"}</span>
                        {hotel?.email && (
                          <button
                            type="button"
                            onClick={() => handleCopy(hotel.email!, "email")}
                            className="text-[var(--text-secondary)] hover:text-blue-700 p-1 cursor-pointer"
                          >
                            {copiedKey === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Phone Number</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="phone"
                        defaultValue={hotel?.phone}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{hotel?.phone || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Official Website</span>
                    {isEditing ? (
                      <input
                        type="url"
                        name="website"
                        defaultValue={hotel?.website}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.website || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Address</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        defaultValue={hotel?.address}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.address || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">City & Country</span>
                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          name="city"
                          defaultValue={hotel?.city}
                          required
                          placeholder="City"
                          className="h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <input
                          type="text"
                          name="country"
                          defaultValue={hotel?.country || "Ethiopia"}
                          required
                          placeholder="Country"
                          className="h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.city || "Addis Ababa"}, {hotel?.country || "Ethiopia"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax & Legal Licensing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Tax & Licensing
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Tax Number (TIN)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="taxNumber"
                        defaultValue={hotel?.taxNumber || "TIN-ET-001234567"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.taxNumber || "TIN-ET-001234567"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Business License</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="licenseNumber"
                        defaultValue={hotel?.licenseNumber || "ETH-HTL-2020-00142"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.licenseNumber || "ETH-HTL-2020-00142"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">VAT Standard</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">15% Standard VAT</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATIONS & TIMERS */}
          {activeTab === "operations" && (
            <div className="space-y-8">
              {/* Check-In / Check-Out Triggers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Check-In & Check-Out Triggers
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-In</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="checkInTime"
                        defaultValue={hotel?.checkInTime || "14:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{hotel?.checkInTime || "14:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-Out</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="checkOutTime"
                        defaultValue={hotel?.checkOutTime || "12:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{hotel?.checkOutTime || "12:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Early Check-In Allowed</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="earlyCheckInAllowedTime"
                        defaultValue={mergedSettings.earlyCheckInAllowedTime || "10:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.earlyCheckInAllowedTime || "10:00"} (Complimentary)</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Check-Out Grace</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="lateCheckOutGracePeriod"
                          defaultValue={mergedSettings.lateCheckOutGracePeriod || 30}
                          min={0}
                          max={120}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Minutes past 12:00</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.lateCheckOutGracePeriod || 30} minutes</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Half-Day Charge Cutoff</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="lateCheckOutHalfDayCutoff"
                        defaultValue={mergedSettings.lateCheckOutHalfDayCutoff || "15:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.lateCheckOutHalfDayCutoff || "15:00"} (Full night billed past cutoff)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Night Audit & Operational Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Night Audit & Safeguards
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Night Audit Model</span>
                    {isEditing ? (
                      <select
                        name="nightAuditMode"
                        defaultValue={mergedSettings.nightAuditMode || "auto"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="auto">Scheduled Automatic Roll</option>
                        <option value="manual">Manual Front Desk Execution</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                        {mergedSettings.nightAuditMode === "auto" ? "Scheduled Automatic Roll" : "Manual Execution"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Scheduled Audit Time</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="nightAuditTime"
                        defaultValue={mergedSettings.nightAuditTime || "02:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{mergedSettings.nightAuditTime || "02:00"} AM</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">No-Show Release Window</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="noShowReleaseWindow"
                        defaultValue={mergedSettings.noShowReleaseWindow || "18:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.noShowReleaseWindow || "18:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Overbooking Buffer</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="overbookingThreshold"
                          defaultValue={mergedSettings.overbookingThreshold || 2}
                          min={0}
                          max={15}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">% overbooking allowed</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.overbookingThreshold || 2}%</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE & PAYMENTS */}
          {activeTab === "revenue" && (
            <div className="space-y-8">
              {/* Document Sequencing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Financial Document Sequences
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Invoice Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="invoicePrefix"
                        defaultValue={mergedSettings.invoicePrefix || "NGH-INV-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {mergedSettings.invoicePrefix || "NGH-INV-"}00001
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Receipt Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="receiptPrefix"
                        defaultValue={mergedSettings.receiptPrefix || "NGH-REC-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {mergedSettings.receiptPrefix || "NGH-REC-"}00001
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Proforma Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="proformaPrefix"
                        defaultValue={mergedSettings.proformaPrefix || "NGH-PRO-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {mergedSettings.proformaPrefix || "NGH-PRO-"}00001
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Gateways */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Active Payment Channels
                  </h3>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "telebirr", label: "Telebirr (Ethio Telecom)", tag: "Mobile Money" },
                      { id: "cbe_birr", label: "CBE Birr (Commercial Bank)", tag: "Direct Banking" },
                      { id: "chapa", label: "Chapa Payment Gateway", tag: "Local & Card Gateway" },
                      { id: "visa_mastercard", label: "Visa / Mastercard / Amex", tag: "International POS" },
                      { id: "cash", label: "Cash & Direct Deposit", tag: "Front Desk Cashier" },
                    ].map((gw) => {
                      const isEnabled = gateways.includes(gw.id);
                      return (
                        <div
                          key={gw.id}
                          onClick={() => handleToggleGateway(gw.id)}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isEditing ? "cursor-pointer" : ""
                          } ${
                            isEnabled
                              ? "border-blue-700/40 bg-blue-700/5 dark:bg-blue-900/20"
                              : "border-[var(--border)] bg-[var(--surface)] opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{gw.label}</span>
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isEnabled ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-slate-300 dark:bg-slate-700"
                              }`}
                            />
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)] font-mono block mt-1">{gw.tag}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Guest Classification & Guarantees */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Guarantee & Age Tiers
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Default Guarantee Policy</span>
                    {isEditing ? (
                      <select
                        name="defaultGuaranteePolicy"
                        defaultValue={mergedSettings.defaultGuaranteePolicy || "credit_card"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="credit_card">Credit Card Pre-Authorization</option>
                        <option value="first_night_deposit">First Night Deposit Required</option>
                        <option value="non_guaranteed">Non-Guaranteed (6 PM Release)</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {mergedSettings.defaultGuaranteePolicy === "first_night_deposit"
                          ? "First Night Deposit Required"
                          : mergedSettings.defaultGuaranteePolicy === "non_guaranteed"
                          ? "Non-Guaranteed"
                          : "Credit Card Pre-Authorization"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Age Classifications</span>
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Infant (Max Age)</label>
                          <input
                            type="number"
                            name="ageTierInfantMax"
                            defaultValue={mergedSettings.ageTierInfantMax || 2}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Child (Max Age)</label>
                          <input
                            type="number"
                            name="ageTierChildMax"
                            defaultValue={mergedSettings.ageTierChildMax || 12}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Adult (Min Age)</label>
                          <input
                            type="number"
                            name="ageTierAdultMin"
                            defaultValue={mergedSettings.ageTierAdultMin || 13}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                        Infant: 0–{mergedSettings.ageTierInfantMax || 2} &bull; Child: {(mergedSettings.ageTierInfantMax || 2) + 1}–{mergedSettings.ageTierChildMax || 12} &bull; Adult: {mergedSettings.ageTierAdultMin || 13}+
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HOUSEKEEPING & DINING */}
          {activeTab === "housekeeping" && (
            <div className="space-y-8">
              {/* Housekeeping Operations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Housekeeping Operations
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Checkout Trigger State</span>
                    {isEditing ? (
                      <select
                        name="checkoutTriggerState"
                        defaultValue={mergedSettings.checkoutTriggerState || "dirty"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="dirty">Dirty (Requires Deep Cleaning)</option>
                        <option value="cleaning">Cleaning In Progress</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                        {mergedSettings.checkoutTriggerState || "dirty"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Linen Change Frequency</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="linenChangeFrequency"
                          defaultValue={mergedSettings.linenChangeFrequency || 3}
                          min={1}
                          max={7}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Days between full sheet change</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Every {mergedSettings.linenChangeFrequency || 3} days</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Turndown Service</span>
                    {isEditing ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="turndownServiceEnabled"
                          defaultChecked={mergedSettings.turndownServiceEnabled !== false}
                          className="w-4 h-4 rounded text-blue-700 focus:ring-blue-700 border-[var(--border)]"
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Enable evening turndown service</span>
                      </label>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {mergedSettings.turndownServiceEnabled !== false ? "Active for Executive Rooms" : "Disabled"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Breakfast & Dining */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Dining & Meal Plans
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Default Board Basis</span>
                    {isEditing ? (
                      <select
                        name="defaultBoardBasis"
                        defaultValue={mergedSettings.defaultBoardBasis || "bb"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="ro">Room Only (RO)</option>
                        <option value="bb">Bed & Breakfast (BB)</option>
                        <option value="hb">Half Board (HB)</option>
                        <option value="fb">Full Board (FB)</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {mergedSettings.defaultBoardBasis === "ro"
                          ? "Room Only (RO)"
                          : mergedSettings.defaultBoardBasis === "hb"
                          ? "Half Board (HB)"
                          : mergedSettings.defaultBoardBasis === "fb"
                          ? "Full Board (FB)"
                          : "Bed & Breakfast (BB)"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Breakfast Operational Hours</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="breakfastServiceHours"
                        defaultValue={mergedSettings.breakfastServiceHours || "06:30 - 10:00"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.breakfastServiceHours || "06:30 - 10:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Breakfast Pricing</span>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Adult (ETB)</label>
                          <input
                            type="number"
                            name="breakfastPriceAdult"
                            defaultValue={mergedSettings.breakfastPriceAdult || 450}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Child (ETB)</label>
                          <input
                            type="number"
                            name="breakfastPriceChild"
                            defaultValue={mergedSettings.breakfastPriceChild || 250}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        Adult: {mergedSettings.breakfastPriceAdult || 450} ETB &bull; Child: {mergedSettings.breakfastPriceChild || 250} ETB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra Bed & Crib Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Cribs & Extra Beds
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Extra Bed Daily Fee</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="extraBedDailyFee"
                          defaultValue={mergedSettings.extraBedDailyFee || 800}
                          className="w-32 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">ETB per night</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.extraBedDailyFee || 800} ETB / night</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Max Extra Beds / Room</span>
                    {isEditing ? (
                      <input
                        type="number"
                        name="maxExtraBedsPerRoom"
                        defaultValue={mergedSettings.maxExtraBedsPerRoom || 1}
                        min={0}
                        max={3}
                        className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.maxExtraBedsPerRoom || 1} Rollaway Bed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POLICIES & LEGAL */}
          {activeTab === "legal" && (
            <div className="space-y-8">
              {/* Folio T&C Footer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Guest Folio T&C Footer
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-2">
                  {isEditing ? (
                    <textarea
                      name="folioTermsFooter"
                      rows={4}
                      defaultValue={mergedSettings.folioTermsFooter}
                      className="w-full p-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  ) : (
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] leading-relaxed">
                      {mergedSettings.folioTermsFooter}
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Card Agreement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Registration Card Agreement
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-2">
                  {isEditing ? (
                    <textarea
                      name="registrationCardDisclaimer"
                      rows={4}
                      defaultValue={mergedSettings.registrationCardDisclaimer}
                      className="w-full p-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  ) : (
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] leading-relaxed">
                      {mergedSettings.registrationCardDisclaimer}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save Action Bar when Editing */}
        {isEditing && (
          <div className="sticky bottom-4 mt-8 py-3.5 px-6 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between z-30 border border-slate-700/50">
            <span className="text-sm font-medium text-slate-300">
              Unsaved configuration changes pending
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saveMutation.isPending}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

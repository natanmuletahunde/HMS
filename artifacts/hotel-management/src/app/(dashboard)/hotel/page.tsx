"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  Coins,
  ShieldCheck,
  Star,
  Edit,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "@/components/setup/StatusPill";

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
  logoUrl?: string;
};

export default function HotelPage() {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd);
    saveMutation.mutate({
      ...data,
      starRating: Number(data.starRating) || 5,
    } as Partial<Hotel>);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
        <div className="space-y-8 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <Building2 className="w-12 h-12 text-blue-700 dark:text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Unable to Load Hotel Configuration
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Could not communicate with the hotel service.
        </p>
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
    <div className="max-w-5xl mx-auto pb-16 pt-2">
      <form onSubmit={handleSubmit}>
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-xs cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Configuration</span>
              </button>
            )}
          </div>
        </div>

        {/* Hotel Identity Banner Strip with Fading Away Blue Gradient */}
        <div className="my-5 p-5 rounded-xl bg-gradient-to-r from-blue-700/15 via-blue-600/5 to-transparent dark:from-blue-900/35 dark:via-blue-950/15 dark:to-transparent border border-blue-500/20 dark:border-blue-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              {hotel?.hotelName?.charAt(0) || "N"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-lg text-[var(--text-primary)]">
                  {hotel?.hotelName || "Nexus Grand Hotel"}
                </span>
                <StatusPill status={hotel?.status || "active"} />
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                <span className="font-semibold">{hotel?.hotelCode || "NGH-001"}</span>
                <span>&bull;</span>
                <div className="flex items-center text-amber-500 dark:text-amber-400 gap-0.5">
                  {Array.from({ length: starsCount }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--text-secondary)]">
            <div>
              <span className="text-[var(--text-muted)] block uppercase tracking-wider text-[10px]">Base Currency</span>
              <span className="font-semibold text-[var(--text-primary)] font-mono">{hotel?.currencyCode || "ETB"}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block uppercase tracking-wider text-[10px]">Timezone</span>
              <span className="font-semibold text-[var(--text-primary)] font-mono">{hotel?.timezone || "Africa/Addis_Ababa"}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block uppercase tracking-wider text-[10px]">Check-In / Out</span>
              <span className="font-semibold text-[var(--text-primary)] font-mono">{hotel?.checkInTime || "14:00"} / {hotel?.checkOutTime || "12:00"}</span>
            </div>
          </div>
        </div>

        {/* Flat Two-Column Divided Layout (No cards) */}
        <div>
          {/* SECTION 1: IDENTITY & LEGAL */}
          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Identity & Legal
              </h3>
            </div>

            <div className="md:col-span-2 space-y-3.5">
              {/* Hotel Name */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Hotel Brand Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="hotelName"
                    defaultValue={hotel?.hotelName}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {hotel?.hotelName || "—"}
                  </span>
                )}
              </div>

              {/* Legal Entity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Legal Entity</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="legalName"
                    defaultValue={hotel?.legalName}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {hotel?.legalName || "—"}
                  </span>
                )}
              </div>

              {/* Property Code */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Property Code</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="hotelCode"
                    defaultValue={hotel?.hotelCode}
                    required
                    className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--blue-50)] text-blue-700 dark:text-blue-300 border border-[var(--border)]">
                    {hotel?.hotelCode || "—"}
                  </span>
                )}
              </div>

              {/* Star Rating */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Star Rating</span>
                {isEditing ? (
                  <select
                    name="starRating"
                    defaultValue={hotel?.starRating || 5}
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        {s} Stars
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {starsCount} Stars Luxury
                  </span>
                )}
              </div>

              {/* Brand Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Status</span>
                <StatusPill status={hotel?.status || "active"} />
              </div>
            </div>
          </div>

          {/* Fading Away Blue Divider */}
          <div className="h-[1px] bg-gradient-to-r from-blue-600/30 via-blue-500/10 to-transparent my-2" />

          {/* SECTION 2: CONTACT & LOCATION */}
          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Contact & Location
              </h3>
            </div>

            <div className="md:col-span-2 space-y-3.5">
              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Email</span>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    defaultValue={hotel?.email}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {hotel?.email || "—"}
                    </span>
                    {hotel?.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(hotel.email!, "email")}
                        className="text-[var(--text-secondary)] hover:text-blue-700 p-1 cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedKey === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Phone Number</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="phone"
                    defaultValue={hotel?.phone}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)] font-mono">
                      {hotel?.phone || "—"}
                    </span>
                    {hotel?.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(hotel.phone!, "phone")}
                        className="text-[var(--text-secondary)] hover:text-blue-700 p-1 cursor-pointer"
                        title="Copy Phone"
                      >
                        {copiedKey === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Website */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Website</span>
                {isEditing ? (
                  <input
                    type="url"
                    name="website"
                    defaultValue={hotel?.website}
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {hotel?.website || "—"}
                  </span>
                )}
              </div>

              {/* Physical Address */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Physical Address</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="address"
                    defaultValue={hotel?.address}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {hotel?.address || "—"}
                  </span>
                )}
              </div>

              {/* City & Country */}
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
                      className="h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                    />
                    <input
                      type="text"
                      name="country"
                      defaultValue={hotel?.country || "Ethiopia"}
                      required
                      placeholder="Country"
                      className="h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {hotel?.city || "Addis Ababa"}, {hotel?.country || "Ethiopia"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fading Away Blue Divider */}
          <div className="h-[1px] bg-gradient-to-r from-blue-600/30 via-blue-500/10 to-transparent my-2" />

          {/* SECTION 3: OPERATING RULES */}
          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Operating Rules
              </h3>
            </div>

            <div className="md:col-span-2 space-y-3.5">
              {/* Check-In Time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-In</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="checkInTime"
                    defaultValue={hotel?.checkInTime || "14:00"}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                    {hotel?.checkInTime || "14:00"}
                  </span>
                )}
              </div>

              {/* Check-Out Time */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-Out</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="checkOutTime"
                    defaultValue={hotel?.checkOutTime || "12:00"}
                    required
                    className="flex-1 h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                    {hotel?.checkOutTime || "12:00"}
                  </span>
                )}
              </div>

              {/* Base Currency */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Base Currency</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="currencyCode"
                    defaultValue={hotel?.currencyCode || "ETB"}
                    required
                    className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--blue-50)] text-blue-700 dark:text-blue-300 border border-[var(--border)]">
                    {hotel?.currencyCode || "ETB"}
                  </span>
                )}
              </div>

              {/* Timezone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Timezone</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="timezone"
                    defaultValue={hotel?.timezone || "Africa/Addis_Ababa"}
                    required
                    className="flex-1 h-9 px-3 text-sm font-mono rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold font-mono text-[var(--text-primary)]">
                    {hotel?.timezone || "Africa/Addis_Ababa"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fading Away Blue Divider */}
          <div className="h-[1px] bg-gradient-to-r from-blue-600/30 via-blue-500/10 to-transparent my-2" />

          {/* SECTION 4: TAX & LICENCE */}
          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Tax & Licence
              </h3>
            </div>

            <div className="md:col-span-2 space-y-3.5">
              {/* TIN */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Tax Number (TIN)</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="taxNumber"
                    defaultValue={hotel?.taxNumber || "TIN-ET-001234567"}
                    className="flex-1 h-9 px-3 text-sm font-mono rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--blue-50)] text-blue-700 dark:text-blue-300 border border-[var(--border)]">
                    {hotel?.taxNumber || "TIN-ET-001234567"}
                  </span>
                )}
              </div>

              {/* Business Licence */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Business Licence</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="licenseNumber"
                    defaultValue={hotel?.licenseNumber || "ETH-HTL-2020-00142"}
                    className="flex-1 h-9 px-3 text-sm font-mono rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-none"
                  />
                ) : (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--blue-50)] text-blue-700 dark:text-blue-300 border border-[var(--border)]">
                    {hotel?.licenseNumber || "ETH-HTL-2020-00142"}
                  </span>
                )}
              </div>

              {/* Standard Tax Rate */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Tax Rate Standard</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  15% VAT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar when Editing */}
        {isEditing && (
          <div className="sticky bottom-4 mt-8 py-3 px-5 rounded-lg bg-slate-900 text-white shadow-xl flex items-center justify-between z-30">
            <span className="text-sm font-medium text-slate-300">
              You have unsaved changes
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saveMutation.isPending}
                className="px-3.5 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Building,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Edit2,
  Save,
  RotateCcw,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const BRANCH_AMENITIES = [
  { id: "wifi", label: "High-Speed Campus WiFi", category: "Connectivity" },
  { id: "parking", label: "Secured On-Site Parking", category: "Parking" },
  { id: "gym", label: "24/7 Fitness Gym", category: "Wellness" },
  { id: "pool", label: "Swimming Pool", category: "Wellness" },
  { id: "restaurant", label: "Dining & Restaurant", category: "F&B" },
  { id: "shuttle", label: "Airport Transfer Shuttle", category: "Transport" },
  { id: "conference", label: "Conference & Meeting Hall", category: "Business" },
  { id: "room_service", label: "24/7 In-Room Service", category: "Guest Care" },
];

export function BranchConfigView() {
  const { user, activeBranch, branches } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const branchId = activeBranch?.id || user?.primaryBranchId || branches[0]?.id;

  // Fetch target branch data
  const {
    data: branchData,
    isLoading: isBranchLoading,
    refetch,
  } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => (branchId ? apiFetch<any>(`/branches/${branchId}`) : null),
    enabled: !!branchId,
  });

  // Fetch Chain HQ hotel for inheritance defaults
  const { data: rawHotel } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel"),
  });
  const chainHotel = Array.isArray(rawHotel) ? rawHotel[0] : (rawHotel?.data?.[0] ?? rawHotel);

  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [branchName, setBranchName] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [starRating, setStarRating] = useState<number>(4);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Synchronize form when data arrives
  useEffect(() => {
    if (branchData) {
      setBranchName(branchData.branchName || "");
      setManager(branchData.manager || "");
      setPhone(branchData.phone || "");
      setEmail(branchData.email || "");
      setAddress(branchData.address || "");
      setDescription(branchData.description || "");
      setCheckInTime(branchData.checkInTime || "");
      setCheckOutTime(branchData.checkOutTime || "");
      setStarRating(branchData.starRating ? Number(branchData.starRating) : 4);
      const settings = branchData.settings || {};
      setSelectedAmenities(Array.isArray(settings.amenities) ? settings.amenities : ["wifi", "parking", "restaurant"]);
    }
  }, [branchData]);

  // Mutation to update branch
  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/branches/${branchId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({
        title: "Branch Configuration Saved",
        description: "Your local operational settings and property details have been updated.",
      });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      branchName,
      manager,
      phone,
      email,
      address,
      description,
      checkInTime: checkInTime.trim() || null,
      checkOutTime: checkOutTime.trim() || null,
      starRating: Number(starRating) || null,
      settings: {
        ...(branchData?.settings || {}),
        amenities: selectedAmenities,
      },
    });
  };

  const handleToggleAmenity = (id: string) => {
    if (!isEditing) return;
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  if (isBranchLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--blue-700)]" />
        <span className="text-sm text-[var(--text-secondary)] mt-2">Loading branch configuration...</span>
      </div>
    );
  }

  const hqCheckIn = chainHotel?.checkInTime || "02:00 PM";
  const hqCheckOut = chainHotel?.checkOutTime || "12:00 PM";
  const effectiveCheckIn = checkInTime || `${hqCheckIn} (HQ Default)`;
  const effectiveCheckOut = checkOutTime || `${hqCheckOut} (HQ Default)`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Profile Card */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--blue-50)] text-[var(--blue-700)] dark:bg-[rgba(46,93,230,0.15)] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {branchData?.branchName || activeBranch?.branchName || "Branch Configuration"}
                </h1>
                <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
                  {branchData?.branchCode || "BRANCH"}
                </Badge>
                <Badge className="bg-[var(--blue-700)] text-white text-[10px] font-medium">
                  {user?.roleName || "Branch Manager"}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {branchData?.address || "Addis Ababa, Ethiopia"}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {branchData?.phone || "No phone listed"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="gap-2 bg-[var(--blue-700)] hover:bg-[var(--navy-800)] text-white">
                <Edit2 className="w-4 h-4" /> Edit Branch Settings
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(false)} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Quick Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Effective Check-In
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)] font-mono">
              {effectiveCheckIn}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Effective Check-Out
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)] font-mono">
              {effectiveCheckOut}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Star Rating
            </span>
            <div className="flex items-center gap-1 text-sm font-bold text-amber-500">
              {Array.from({ length: starRating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Branch Status
            </span>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Active Operational
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Property Profile & Contacts */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--blue-700)] dark:text-blue-400" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Property Profile & Direct Contacts</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Branch Name</Label>
              <Input
                disabled={!isEditing}
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Nexus Main Branch – Bole"
                className="bg-transparent"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Branch Code (Identifier)</Label>
              <Input
                disabled
                value={branchData?.branchCode || ""}
                className="bg-muted/40 font-mono text-xs cursor-not-allowed"
                title="Branch code is fixed across hotel databases"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Assigned Branch Manager</Label>
              <Input
                disabled={!isEditing}
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="e.g. Abebe Kebede"
                className="bg-transparent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Front Desk Direct Phone</Label>
              <Input
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 11 661 2345"
                className="bg-transparent font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Front Desk Email</Label>
              <Input
                disabled={!isEditing}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bole.frontdesk@nexushms.com"
                className="bg-transparent"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Physical Street Address</Label>
              <Input
                disabled={!isEditing}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Airport Road, Bole Sub-City, Addis Ababa"
                className="bg-transparent"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Property Overview & Location Highlights</Label>
              <textarea
                disabled={!isEditing}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your branch location, proximity to landmarks, and unique selling points..."
                className="w-full text-sm rounded-lg border border-[var(--border)] p-3 bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-700)]/20 disabled:opacity-70"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Operational Overrides (Check-in/Out) */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--blue-700)] dark:text-blue-400" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Branch Operational Timers & Overrides</h2>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              HQ Defaults: {hqCheckIn} Check-in / {hqCheckOut} Check-out
            </Badge>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            Configure custom departure and arrival deadlines if this property operates on specific schedules (e.g. airport transit turnaround or resort late departures). Leave empty to inherit HQ defaults.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[var(--text-secondary)]">Local Check-In Time Override</Label>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">HQ Default: {hqCheckIn}</span>
              </div>
              <Input
                disabled={!isEditing}
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder={`Inherit HQ (${hqCheckIn})`}
                className="bg-transparent font-mono"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                e.g., <strong>12:00 PM</strong> for early flight arrivals.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[var(--text-secondary)]">Local Check-Out Time Override</Label>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">HQ Default: {hqCheckOut}</span>
              </div>
              <Input
                disabled={!isEditing}
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder={`Inherit HQ (${hqCheckOut})`}
                className="bg-transparent font-mono"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                e.g., <strong>10:00 AM</strong> for rapid housekeeping turnover.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Branch Physical Infrastructure */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--blue-700)] dark:text-blue-400" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Physical Buildings & Floors</h2>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            Manage the physical towers, wings, and floor structures assigned to this branch location.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Link
              href="/branches?tab=buildings"
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--blue-700)] transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--blue-50)] text-[var(--blue-700)] dark:bg-[rgba(46,93,230,0.2)] dark:text-blue-400 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Branch Buildings</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Configure towers, blocks & wings</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--blue-700)] transition-colors" />
            </Link>

            <Link
              href="/branches?tab=floors"
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--blue-700)] transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--blue-50)] text-[var(--blue-700)] dark:bg-[rgba(46,93,230,0.2)] dark:text-blue-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Branch Floors</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Configure levels, room spans & keys</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--blue-700)] transition-colors" />
            </Link>
          </div>
        </div>

        {/* Section 4: On-Site Amenities & Facilities */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--blue-700)] dark:text-blue-400" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">On-Site Amenities & Services</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {BRANCH_AMENITIES.map((item) => {
              const isChecked = selectedAmenities.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isEditing}
                  onClick={() => handleToggleAmenity(item.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex flex-col justify-between ${
                    isChecked
                      ? "border-[var(--blue-700)] bg-[var(--blue-50)] text-[var(--blue-900)] dark:bg-[rgba(46,93,230,0.15)] dark:text-blue-200 dark:border-blue-500 font-semibold"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-gray-400"
                  } ${!isEditing ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{item.category}</span>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--blue-700)] dark:text-blue-400" />}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bottom Bar */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="gap-2 bg-[var(--blue-700)] hover:bg-[var(--navy-800)] text-white"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Branch Configuration
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

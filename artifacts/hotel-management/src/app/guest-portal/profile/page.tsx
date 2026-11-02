"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  Hotel,
  ArrowLeft,
  Sparkles,
  LogOut,
  Calendar,
  Layers,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isPasswordChangePrompt =
    searchParams.get("changePassword") === "true" || searchParams.get("reset") === "true";

  const [session, setSession] = useState<any | null>(null);
  const [token, setToken] = useState<string>("");
  const [loadingMe, setLoadingMe] = useState(true);

  // Password update form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load session from storage or API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedToken =
      sessionStorage.getItem("nexus_guest_token") || localStorage.getItem("nexus_guest_token") || "";
    const savedSessionStr =
      sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");

    if (savedToken) setToken(savedToken);

    if (savedSessionStr) {
      try {
        const parsed = JSON.parse(savedSessionStr);
        setSession(parsed);
      } catch {
        // ignore
      }
    }

    // Verify token with backend /me endpoint
    if (savedToken) {
      fetch("/api/guest-portal/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.valid) {
            setSession((prev: any) => ({
              ...(prev || {}),
              guest: data.guest || prev?.guest,
              room: data.room || prev?.room,
              reservation: data.reservation || prev?.reservation,
              isStayActive: data.isStayActive,
            }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMe(false));
    } else {
      setLoadingMe(false);
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmed = newPassword.trim();
    if (!trimmed || trimmed.length < 4) {
      setErrorMsg("Password must be at least 4 characters in length.");
      return;
    }

    if (trimmed !== confirmPassword.trim()) {
      setErrorMsg("New Password and Confirm Password do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/guest-portal/update-password", {
        method: "POST",
        headers,
        body: JSON.stringify({
          password: trimmed,
          guestId: session?.guest?.id,
          phone: session?.guest?.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update password");
      }

      setSuccessMsg("Your password has been securely updated! You can use it for all future sign-ins.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("nexus_guest_session");
      sessionStorage.removeItem("nexus_guest_token");
      localStorage.removeItem("nexus_guest_session");
      localStorage.removeItem("nexus_guest_token");
      document.cookie = "nexus_guest_token=; path=/; max-age=0";
    }
    router.push("/guest-portal/login");
  };

  const guest = session?.guest;
  const room = session?.room;
  const reservation = session?.reservation;

  return (
    <div className="min-h-screen bg-[#030614] text-slate-100 flex flex-col relative selection:bg-amber-500/30">
      {/* Subtle Ambient Background Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-10 border-b border-white/10 bg-[#070a18]/80 backdrop-blur-xl sticky top-0 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/5 text-amber-400 hover:text-white hover:bg-white/10 hover:border-amber-500/50 transition-all cursor-pointer"
            title="Return to Hotel Landing"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0a0d18] border border-amber-400/40 p-0.5 flex items-center justify-center overflow-hidden">
              <img src="/hotel-logo.png" alt="Hotel Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white font-serif">Nexus Luxury Hotel</h1>
              <p className="text-[10px] text-amber-400/80 font-mono uppercase tracking-wider">Guest Account & Security</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/guest-portal/services")}
            className="hidden sm:inline-flex border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs h-8 rounded-lg"
          >
            Hotel Services &rarr;
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-slate-400 hover:text-white hover:bg-white/10 text-xs h-8 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Verification / Reset Welcome Notice */}
        {isPasswordChangePrompt && (
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-transparent backdrop-blur-xl flex items-start gap-3.5 shadow-xl shadow-amber-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-1 text-xs">
              <h2 className="font-semibold text-amber-300 text-sm flex items-center gap-2">
                <span>Identity Verified via AfroMessage SMS OTP</span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                  Verified
                </Badge>
              </h2>
              <p className="text-slate-300 leading-relaxed">
                Welcome back{guest?.fullName ? `, ${guest.fullName}` : ""}! Please establish your new permanent password below so you can sign in directly on any device.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Guest Identity Card */}
          <div className="md:col-span-5 space-y-4">
            <Card className="border border-white/10 bg-[#0d101c]/90 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Guest Profile
                  </span>
                  {guest?.guestCode && (
                    <Badge className="bg-white/5 border-white/10 text-slate-300 text-[10px] font-mono">
                      {guest.guestCode}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base text-white font-serif pt-1">
                  {guest?.fullName || "Distinguished Guest"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Registered Hotel Account
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Phone className="w-4 h-4 text-amber-400/80 shrink-0" />
                  <span className="font-mono text-slate-200">{guest?.phone || "Phone not provided"}</span>
                </div>

                {guest?.email && (
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Mail className="w-4 h-4 text-amber-400/80 shrink-0" />
                    <span className="truncate text-slate-200">{guest.email}</span>
                  </div>
                )}

                {/* Stay & Room Details */}
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Hotel className="w-3.5 h-3.5 text-emerald-400" />
                      Assigned Room
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-[11px]">
                      Room {room?.number || "101"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Reservation
                    </span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      {reservation?.reservationNumber || "RES-ACTIVE"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Stay Status
                    </span>
                    <span className="capitalize text-emerald-400 font-medium">
                      {session?.isStayActive ? "In-House Guest" : "Confirmed"}
                    </span>
                  </div>
                </div>

                {/* Fast Action to In-Room Services */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => router.push("/guest-portal/services")}
                    className="w-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs h-9 rounded-xl font-medium"
                  >
                    <span>Open Room Services & Dining</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected Guest Account</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your guest account is secured with end-to-end encryption. All dining orders, housekeeping requests, and valet services are associated with this profile.
              </p>
            </div>
          </div>

          {/* Right Column: Password Management Form */}
          <div className="md:col-span-7">
            <Card className="border border-amber-500/30 bg-[#0f121e]/95 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
                  <KeyRound className="w-4 h-4" />
                  <span>Security & Password</span>
                </div>
                <CardTitle className="text-lg text-white font-serif pt-1">
                  {isPasswordChangePrompt ? "Create New Password" : "Update Account Password"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Set a secure password for swift sign-in to the guest portal on mobile or laptop.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                {errorMsg && (
                  <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span className="leading-relaxed">{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPasswordInput" className="text-xs font-medium text-slate-300">
                      New Password <span className="text-amber-400">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="newPasswordInput"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 4 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 pr-10 text-sm h-11 rounded-xl"
                        autoFocus={isPasswordChangePrompt}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPasswordInput" className="text-xs font-medium text-slate-300">
                      Confirm New Password <span className="text-amber-400">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="confirmPasswordInput"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 pr-10 text-sm h-11 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirement Hint */}
                  <div className="text-[11px] text-slate-400 space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          newPassword.length >= 4 ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                      <span>Minimum 4 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          newPassword && newPassword === confirmPassword ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                      <span>Passwords match</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || newPassword.length < 4 || newPassword !== confirmPassword}
                    className="w-full bg-gradient-to-r from-[#d97736] via-[#ea833f] to-[#b85e24] hover:brightness-110 active:scale-[0.99] text-white font-semibold h-11 text-xs shadow-lg shadow-amber-500/20 transition-all rounded-xl"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                        Saving New Password...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function GuestProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030614] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

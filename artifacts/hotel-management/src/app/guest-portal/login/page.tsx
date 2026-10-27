"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Hotel,
  AlertCircle,
  Loader2,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
  Lock,
  UserCheck,
  Phone,
  User,
  QrCode,
  Sparkles,
  ChevronLeft,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaydaScanner } from "@/components/fayda-scanner";
import type { ParsedFaydaGuest } from "@/lib/fayda";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryName = searchParams.get("name") || "";
  const queryPhone = searchParams.get("phone") || "";
  const isJustRegistered = searchParams.get("registered") === "true";

  const [fullName, setFullName] = useState(queryName);
  const [phone, setPhone] = useState(queryPhone);
  const [nationalId, setNationalId] = useState("");

  const [showScanner, setShowScanner] = useState(false);
  const [faydaScanned, setFaydaScanned] = useState<ParsedFaydaGuest | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingSession, setExistingSession] = useState<any | null>(null);

  // Phone: strictly numeric, max 10 digits (e.g. 0911318622)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    if (error && raw.length === 10) setError("");
  };

  // Check if session already exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.guest) {
            setExistingSession(parsed);
          }
        } catch {
          // ignore corrupted session
        }
      }
    }
  }, []);

  const handleFaydaDecoded = (data: ParsedFaydaGuest) => {
    setFaydaScanned(data);
    setError("");

    const name = data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim();
    if (name) setFullName(name);

    if (data.fan || data.nationalId) {
      const cleanFan = (data.fan || data.nationalId || "").replace(/\D/g, "").slice(0, 16);
      if (cleanFan) setNationalId(cleanFan);
    }

    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, "");
      const formatted = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      if (formatted.length === 10) {
        setPhone(formatted);
      }
    }
  };

  const handleLogin = async (overrideName?: string, overridePhone?: string, overrideNid?: string) => {
    setError("");
    const targetName = (overrideName !== undefined ? overrideName : fullName).trim();
    const targetPhone = (overridePhone !== undefined ? overridePhone : phone).trim();
    const targetNid = (overrideNid !== undefined ? overrideNid : nationalId).trim();

    if (!targetName) {
      setError("Please enter your full name.");
      return;
    }

    if (!targetPhone && !targetNid) {
      setError("Please enter your 10-digit mobile phone number or scan Fayda National ID.");
      return;
    }

    if (targetPhone && targetPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number (e.g. 0911318622).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/guest-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: targetName,
          phone: targetPhone || undefined,
          nationalId: targetNid || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Authentication failed. Please verify your name and phone number.");
      }

      // Persist JWT token and verified session in storage & cookie
      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
          // Set cookie for middleware route protection
          document.cookie = `nexus_guest_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }

      // Navigate to the luxury hotel landing page
      router.push("/");
    } catch (err: any) {
      setError(err.message || "No registered guest account found for this name and phone number.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueExisting = () => {
    router.push("/");
  };

  const handleClearExisting = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("nexus_guest_session");
      sessionStorage.removeItem("nexus_guest_token");
      localStorage.removeItem("nexus_guest_session");
      localStorage.removeItem("nexus_guest_token");
      document.cookie = "nexus_guest_token=; path=/; max-age=0";
    }
    setExistingSession(null);
  };

  return (
    <div className="space-y-4">
      {/* Just Registered Welcome Callout */}
      {isJustRegistered && (
        <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 backdrop-blur-xl flex items-start gap-3.5 shadow-lg shadow-emerald-950/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-emerald-300 text-sm">
              Registration Complete{queryName ? `, ${queryName}` : ""}!
            </p>
            <p className="text-slate-300 leading-relaxed">
              Your guest identity has been verified in the hotel registry. Sign in below using your name and phone number to access your reservation suite and in-room amenities.
            </p>
          </div>
        </div>
      )}

      {/* Existing Session Prompt Card */}
      {existingSession && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-[#12141f]/95 backdrop-blur-xl space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ACTIVE GUEST SESSION</span>
            </div>
            {existingSession.room?.number && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 font-mono">
                Room {existingSession.room?.number}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome back, <strong className="text-white">{existingSession.guest?.fullName}</strong>. You are currently recognized in our hospitality system.
          </p>
          <div className="flex gap-2.5 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-[#d97736] to-[#b85e24] hover:from-[#e08342] hover:to-[#c4682c] text-white font-semibold text-xs h-10 shadow-lg shadow-amber-500/15"
              onClick={handleContinueExisting}
            >
              Continue to Portal &rarr;
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 text-xs h-10"
              onClick={handleClearExisting}
            >
              Switch Account
            </Button>
          </div>
        </div>
      )}

      <Card className="border-white/10 bg-[#10121a]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pb-4 pt-7 px-6 border-b border-white/5">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-serif font-bold text-white tracking-wide">
            Guest Portal Sign In
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1 font-light">
            Enter your reservation credentials to manage your stay and room service orders.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-5 px-6 pb-6">
          {/* Fayda Scanner Section */}
          <div className="space-y-2.5 p-3 rounded-xl border border-white/5 bg-black/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fast-Track with Fayda ID</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowScanner(!showScanner)}
                className="text-[11px] h-7 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
              >
                {showScanner ? "Hide Scanner" : "Scan / Upload Fayda"}
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
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Fayda ID: <strong className="text-white">{faydaScanned.fullName}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  type="button"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[11px] h-7 px-3 rounded-lg"
                  onClick={() =>
                    handleLogin(
                      faydaScanned.fullName,
                      faydaScanned.phone?.replace(/\D/g, "").slice(-10),
                      faydaScanned.fan?.replace(/\D/g, "").slice(0, 16)
                    )
                  }
                >
                  Instant Sign In &rarr;
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            {/* 1. Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="loginFullName" className="text-xs font-medium text-slate-300">
                Full Name <span className="text-amber-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <Input
                  id="loginFullName"
                  type="text"
                  placeholder="e.g. Almaz Bekele"
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 text-sm h-11 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            {/* 2. Phone Number (10 digits) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="loginPhone" className="text-xs font-medium text-slate-300">
                  Mobile Phone Number <span className="text-amber-400">*</span>
                </Label>
                <span className="text-[10px] text-slate-400 font-mono">10 digits</span>
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <Input
                  id="loginPhone"
                  type="tel"
                  placeholder="0911318622"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 text-sm font-mono tracking-wider h-11 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !fullName.trim() || (phone.length !== 10 && !nationalId)}
              className="w-full bg-gradient-to-r from-[#d97736] via-[#d97736] to-[#b85e24] hover:from-[#e08342] hover:to-[#c4682c] text-white font-semibold h-11 text-sm shadow-lg shadow-amber-500/20 transition-all rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Verifying Guest Credentials...
                </>
              ) : (
                <>
                  <span>Sign In to Guest Portal</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Registration Callout */}
          <div className="pt-3 border-t border-white/10 text-center">
            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/50 h-10 text-xs font-medium rounded-xl"
              onClick={() => router.push("/guest-portal/register")}
            >
              First Time Guest? Pre-Register Profile &rarr;
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GuestPortalLoginPage() {
  return (
    <div className="min-h-screen bg-[#090a10] text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative selection:bg-amber-500/30">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,54,0.12),_transparent_70%)] pointer-events-none" />

      {/* Hotel Top Banner */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pt-2 z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-500 transition-colors">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg tracking-[0.2em] font-semibold text-white">
                AURA
              </span>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[9px] px-1.5 py-0">
                5-STAR LUXURY
              </Badge>
            </div>
            <p className="text-[10px] text-amber-400/80 font-mono tracking-widest uppercase">
              Guest Portal Authentication
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Hotel Home</span>
          </Link>
          <div className="text-right hidden md:flex items-center gap-2.5 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-xl text-xs">
            <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-light">Front Desk Concierge</span>
              <span className="text-xs font-semibold text-amber-300 font-mono">Ext. 000 | (011) 555-0199</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="max-w-md mx-auto w-full my-auto py-8 z-10">
        <Suspense
          fallback={
            <Card className="border-white/10 bg-[#10121a]/95 p-8 text-center rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            </Card>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 pt-6 border-t border-white/5 max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        <span>&copy; {new Date().getFullYear()} AURA Luxury Hotel & Suites. Powered by Nexus HMS.</span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <Link href="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <span>&bull;</span>
          <Link href="/guest-portal/register" className="hover:text-amber-400 transition-colors">Register</Link>
          <span>&bull;</span>
          <span>Concierge Ext. 000</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Hotel,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  PhoneCall,
  Utensils,
  Sparkles,
  Car,
  CheckCircle2,
  Lock,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryRoom = searchParams.get("room") || "";
  const queryName = searchParams.get("name") || "";
  const isJustRegistered = searchParams.get("registered") === "true";

  const [roomNumber, setRoomNumber] = useState(queryRoom);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingSession, setExistingSession] = useState<any | null>(null);

  // Sync room from query param if changed
  useEffect(() => {
    if (queryRoom) {
      setRoomNumber(queryRoom);
    }
  }, [queryRoom]);

  // Check if session already exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.room && parsed.guest) {
            setExistingSession(parsed);
          }
        } catch {
          // ignore corrupted session
        }
      }
    }
  }, []);

  const handleLogin = async (overrideRoom?: string, overrideCode?: string) => {
    setError("");
    const targetRoom = (overrideRoom || roomNumber).trim();
    const targetCode = (overrideCode !== undefined ? overrideCode : accessCode).trim();

    if (!targetRoom) {
      setError("Please enter your assigned room number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/guest-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: targetRoom,
          accessCode: targetCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Room authentication failed");
      }

      // Persist JWT token and verified session
      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }

      // Navigate to the in-room guest experience portal
      router.push("/guest-portal");
    } catch (err: any) {
      setError(err.message || "No active checked-in guest found for this room.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueExisting = () => {
    router.push("/guest-portal");
  };

  const handleClearExisting = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("nexus_guest_session");
      sessionStorage.removeItem("nexus_guest_token");
      localStorage.removeItem("nexus_guest_session");
      localStorage.removeItem("nexus_guest_token");
    }
    setExistingSession(null);
  };

  return (
    <div className="space-y-4">
      {/* Just Registered Welcome Callout */}
      {isJustRegistered && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 backdrop-blur-md flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-emerald-300">
              Registration Complete{queryName ? `, ${queryName}` : ""}!
            </p>
            <p className="text-slate-300">
              Your details have been recorded in the hotel system. Enter your last name or click <strong>Unlock</strong> to open Room {queryRoom || roomNumber}.
            </p>
          </div>
        </div>
      )}

      {/* Existing Session Prompt Card */}
      {existingSession && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Active Stay Found</span>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
              Room {existingSession.room?.number}
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            Welcome back, <strong>{existingSession.guest?.fullName}</strong>! You already have an active JWT session for Room {existingSession.room?.number}.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9"
              onClick={handleContinueExisting}
            >
              Continue to Portal &rarr;
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white text-xs h-9"
              onClick={handleClearExisting}
            >
              Sign In to Another Room
            </Button>
          </div>
        </div>
      )}

      <Card className="border-amber-500/20 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center pb-4 pt-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-white tracking-tight">
            Guest Room Authentication
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs px-2">
            Enter your room number and verification credential to unlock in-room dining, housekeeping amenities, VIP transport, and your stay bill.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="roomNum" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Room Number *</span>
                <span className="text-[10px] text-amber-400/80 font-normal">Assigned on check-in</span>
              </Label>
              <Input
                id="roomNum"
                type="text"
                placeholder="e.g. 101, 102, 204"
                value={roomNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomNumber(e.target.value)}
                className="bg-slate-950/90 border-slate-700 focus-visible:border-amber-500 text-white font-mono text-xl h-12 text-center tracking-widest"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accessCode" className="text-xs font-medium text-slate-300 flex justify-between">
                <span>Last Name, Reservation # or PIN</span>
                <span className="text-[10px] text-slate-400">Security Check</span>
              </Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="e.g. Grimes, RES-XXXX, or GST-XXXX"
                value={accessCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccessCode(e.target.value)}
                className="bg-slate-950/90 border-slate-700 focus-visible:border-amber-500 text-white text-sm h-10"
              />
              <p className="text-[11px] text-slate-500">
                Optional: If leave blank, the system verifies your active room check-in automatically.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !roomNumber.trim()}
              className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold h-11 text-sm shadow-lg shadow-amber-500/25 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying In-House Guest...
                </>
              ) : (
                <>
                  Unlock In-Room Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Self-Registration Callout */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">First time here or scanning a room QR code?</p>
            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400 h-10 text-xs font-semibold"
              onClick={() => router.push("/guest-portal/register" + (roomNumber ? `?room=${roomNumber}` : ""))}
            >
              Scan or Self-Register for Your Room
            </Button>
          </div>

          {/* Quick Demo Access Pills */}
          <div className="pt-3 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block text-center mb-2 font-medium">
              Quick Test Rooms (Active In-House)
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {["101", "102", "103", "201"].map((rm) => (
                <Button
                  key={rm}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px] font-mono border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300"
                  onClick={() => {
                    setRoomNumber(rm);
                    handleLogin(rm);
                  }}
                >
                  Room {rm}
                </Button>
              ))}
            </div>
          </div>

          {/* Security Guarantee Notice */}
          <div className="pt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 border-t border-slate-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted guest session • Authorizes verified in-room orders</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GuestPortalLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Hotel Top Banner */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pt-2">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Hotel className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>NEXUS GRAND HOTEL & SUITES</span>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] hidden sm:inline-flex">
                5-Star Luxury
              </Badge>
            </h1>
            <p className="text-[11px] text-amber-400/80 font-medium tracking-widest uppercase">
              In-Room Guest Experience Portal
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <PhoneCall className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block">Front Desk / Concierge</span>
            <span className="text-xs font-semibold text-amber-300">Ext. 000 | (011) 555-0199</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <Suspense
          fallback={
            <Card className="border-slate-800 bg-slate-900/85 p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            </Card>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <Utensils className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-300 font-medium block">Room Service</span>
            <span className="text-[9px] text-slate-500">24/7 Dining</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-300 font-medium block">Housekeeping</span>
            <span className="text-[9px] text-slate-500">Instant Request</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60">
            <Car className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-300 font-medium block">VIP Transport</span>
            <span className="text-[9px] text-slate-500">Airport & City</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 pt-4 border-t border-slate-900 max-w-xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Nexus Luxury Hospitality Systems</span>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Concierge Ext. 000</span>
          <span>•</span>
          <span>Luggage & Valet Ext. 001</span>
        </div>
      </footer>
    </div>
  );
}

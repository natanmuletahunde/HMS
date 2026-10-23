"use client";

import { useState, Suspense } from "react";
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
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredGuestName, setRegisteredGuestName] = useState("");

  // Phone: strictly numeric, max 10 digits (e.g. 0911318622)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    if (error && raw.length === 10) setError("");
  };

  // National / Fayda ID: strictly numeric, max 16 digits
  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    setNationalId(raw);
    if (error && raw.length === 16) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!phone || phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile phone number (e.g. 0911318622).");
      return;
    }

    if (!nationalId || nationalId.length !== 16) {
      setError("Please enter your 16-digit Fayda / National ID number.");
      return;
    }

    setLoading(true);

    try {
      const parts = trimmedName.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "Guest";

      const res = await fetch("/api/guest-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          fullName: trimmedName,
          phone: phone.trim(),
          email: email.trim() || undefined,
          nationalId: nationalId.trim(),
          idNumber: nationalId.trim(),
          idType: "fayida_id",
          nationality: "Ethiopian",
          country: "Ethiopia",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to register guest.");
      }

      // Store signed JWT token & verified session
      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }

      setRegisteredGuestName(trimmedName);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please verify your details or contact front desk.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-amber-500/40 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md max-w-lg mx-auto">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome, {registeredGuestName}!</h2>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            Your guest identity is registered in Nexus HMS with a verified JWT token. You can now explore suites, book online, and complete payments.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 gap-1.5"
              onClick={() => router.push("/")}
            >
              <Sparkles className="w-4 h-4" /> Go to Luxury Hotel Page &rarr;
            </Button>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-200 hover:text-white text-xs h-10"
              onClick={() => router.push("/guest-portal")}
            >
              In-Room Portal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md max-w-lg mx-auto">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 flex items-center justify-center mb-1 text-amber-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          Guest Online Registration
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs sm:text-sm">
          Quick 4-step registration. Fast-tracks your hotel reservation & front desk check-in.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs sm:text-sm text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Full Name *</span>
              <span className="text-[10px] text-slate-500 font-normal">First & Last Name</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="Abebe Tadesse"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-700 text-slate-100 pl-9 h-10 text-sm"
              />
            </div>
          </div>

          {/* 2. Phone Number (10 digits) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">
                Phone Number *
              </Label>
              <span className="text-[11px] font-mono text-slate-400">
                {phone.length}/10 digits
              </span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="0911318622"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                required
                className="bg-slate-950/80 border-slate-700 text-slate-100 pl-9 h-10 text-sm font-mono tracking-wider"
              />
            </div>
            {phone.length > 0 && phone.length < 10 && (
              <p className="text-[11px] text-amber-400">Must be exactly 10 digits (e.g. 0911318622)</p>
            )}
          </div>

          {/* 3. Email (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-[10px] text-slate-500 font-normal">Optional</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="abebe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/80 border-slate-700 text-slate-100 pl-9 h-10 text-sm"
              />
            </div>
          </div>

          {/* 4. National ID / Fayda (16 digits) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="nationalId" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Fayda / National ID *</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  🇪🇹 Ethiopian FAN
                </span>
              </Label>
              <span className="text-[11px] font-mono text-slate-400">
                {nationalId.length}/16 digits
              </span>
            </div>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="nationalId"
                type="text"
                placeholder="1234567890123456"
                value={nationalId}
                onChange={handleNationalIdChange}
                maxLength={16}
                required
                className="bg-slate-950/80 border-slate-700 text-slate-100 pl-9 h-10 text-sm font-mono tracking-widest"
              />
            </div>
            {nationalId.length > 0 && nationalId.length < 16 && (
              <p className="text-[11px] text-amber-400">Fayda National ID must be 16 digits</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || phone.length !== 10 || nationalId.length !== 16 || !fullName.trim()}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold h-11 text-sm shadow-lg shadow-amber-500/20 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering Profile...
              </>
            ) : (
              <>
                Complete Registration & Unlock Portal <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Already have a room reserved?{" "}
              <Link href="/guest-portal/login" className="text-amber-400 hover:underline font-medium">
                Sign in with Room Number
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function GuestRegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        <Suspense
          fallback={
            <div className="text-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
              <p className="text-xs">Loading registration...</p>
            </div>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}

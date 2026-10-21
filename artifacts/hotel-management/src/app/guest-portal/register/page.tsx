"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Hotel,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Utensils,
  Bed,
  Phone,
  Mail,
  User,
  MapPin,
  Clock,
  Wifi,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryRoom = searchParams.get("room") || "";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    roomNumber: queryRoom,
    nationality: "",
    foodPreference: "none",
    bedPreference: "king",
    smokingPreference: "non_smoking",
    specialRequests: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredGuestName, setRegisteredGuestName] = useState("");

  // Sync room from query param if changed
  useEffect(() => {
    if (queryRoom) {
      setFormData((prev) => ({ ...prev, roomNumber: queryRoom }));
    }
  }, [queryRoom]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    if (!formData.roomNumber.trim()) {
      setError("Please enter your assigned room number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/guest-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          roomNumber: formData.roomNumber.trim(),
          nationality: formData.nationality.trim() || undefined,
          foodPreference: formData.foodPreference,
          bedPreference: formData.bedPreference,
          smokingPreference: formData.smokingPreference,
          specialRequests: formData.specialRequests.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to register guest.");
      }

      // Store in session storage and local storage for smooth mobile navigation
      if (typeof window !== "undefined") {
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }

      setRegisteredGuestName(data.guest?.fullName || `${formData.firstName} ${formData.lastName}`);
      setSuccess(true);

      // Smooth transition into guest portal
      setTimeout(() => {
        router.push("/guest-portal");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please verify your room number or contact front desk.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-emerald-500/30 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome, {registeredGuestName}!</h2>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            You are now registered for <strong>Room {formData.roomNumber}</strong>. Opening your digital room portal...
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting to your room services...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/85 text-slate-100 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 gap-1.5 px-3 py-1">
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Smart Check-in</span>
          </Badge>
          {queryRoom && (
            <Badge className="bg-emerald-600/80 text-white font-semibold">
              Room {queryRoom}
            </Badge>
          )}
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          Guest Self-Registration
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs sm:text-sm">
          Register to access complimentary Wi-Fi, order 24/7 room service, request amenities, and manage your stay.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs sm:text-sm text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Number */}
          <div className="space-y-1.5">
            <Label htmlFor="roomNumber" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Assigned Room Number *
            </Label>
            <div className="relative">
              <Input
                id="roomNumber"
                name="roomNumber"
                type="text"
                placeholder="e.g. 101, 204"
                value={formData.roomNumber}
                onChange={handleChange}
                required
                className="bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-3 h-11 text-base font-medium"
              />
            </div>
            {queryRoom && (
              <p className="text-[11px] text-emerald-400 font-medium">
                ✓ Auto-detected from your room QR code
              </p>
            )}
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                First Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Last Name *
              </Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500 h-11"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mobile Phone
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className="bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-9 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-slate-950/70 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-9 h-11"
                />
              </div>
            </div>
          </div>

          {/* Dining / Dietary Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="foodPreference" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Dietary Preference
              </Label>
              <select
                id="foodPreference"
                name="foodPreference"
                value={formData.foodPreference}
                onChange={handleChange}
                className="flex h-11 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="none">No Dietary Restriction</option>
                <option value="halal">Halal</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten_free">Gluten-Free</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bedPreference" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Bed Preference
              </Label>
              <select
                id="bedPreference"
                name="bedPreference"
                value={formData.bedPreference}
                onChange={handleChange}
                className="flex h-11 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="king">King Bed</option>
                <option value="queen">Queen Bed</option>
                <option value="twin">Twin Beds</option>
                <option value="single">Single Bed</option>
              </select>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="specialRequests" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Special Requests & Notes (Optional)
            </Label>
            <textarea
              id="specialRequests"
              name="specialRequests"
              rows={2}
              placeholder="e.g. Extra pillows, late arrival, quiet corner..."
              value={formData.specialRequests}
              onChange={handleChange}
              className="flex w-full rounded-md border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registering & Connecting...</span>
              </>
            ) : (
              <>
                <span>Register & Open Room Portal</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          Already registered for this room?{" "}
          <Link
            href="/guest-portal/login"
            className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            Enter with Room Number
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GuestPortalRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shadow-inner">
            <Hotel className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wide text-white">NEXUS HMS</h1>
            <p className="text-[11px] text-amber-400/90 font-medium tracking-wider uppercase">Luxury Hospitality</p>
          </div>
        </div>

        <Link
          href="/guest-portal/login"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 rounded-full px-3 py-1 bg-slate-900/60"
        >
          Sign In
        </Link>
      </header>

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full my-auto">
        <Suspense
          fallback={
            <Card className="border-slate-800 bg-slate-900/85 p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            </Card>
          }
        >
          <RegisterForm />
        </Suspense>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <Utensils className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <span>Room Dining</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <Sparkles className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <span>Housekeeping</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <Wifi className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <span>Fast Wi-Fi</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full pt-8 text-center text-xs text-slate-500 flex flex-col gap-1">
        <div className="flex items-center justify-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Nexus Secure Guest Service Platform</span>
        </div>
        <p className="text-[11px]">© {new Date().getFullYear()} Nexus HMS. All rights reserved.</p>
      </footer>
    </div>
  );
}

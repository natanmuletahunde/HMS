"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Hotel,
  QrCode,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Utensils,
  Phone,
  Mail,
  User,
  MapPin,
  Wifi,
  Sparkles,
  CreditCard,
  KeyRound,
  FileText,
  UserCheck,
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
    middleName: "",
    lastName: "",
    phone: "",
    alternativePhone: "",
    email: "",
    roomNumber: queryRoom || "101",
    country: "Ethiopia",
    city: "Addis Ababa",
    address: "",
    nationality: "Ethiopian",
    idType: "fayida_id",
    idNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
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
      setError("Please enter your room number (e.g. 101, 102).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/guest-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          middleName: formData.middleName.trim() || undefined,
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || undefined,
          alternativePhone: formData.alternativePhone.trim() || undefined,
          email: formData.email.trim() || undefined,
          roomNumber: formData.roomNumber.trim(),
          country: formData.country.trim() || undefined,
          city: formData.city.trim() || undefined,
          address: formData.address.trim() || undefined,
          nationality: formData.nationality.trim() || undefined,
          idType: formData.idType,
          idNumber: formData.idNumber.trim() || undefined,
          emergencyContactName: formData.emergencyContactName.trim() || undefined,
          emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
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

      // Store signed JWT token & verified session
      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }

      const fullName = data.guest?.fullName || `${formData.firstName} ${formData.lastName}`;
      setRegisteredGuestName(fullName);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please verify your details or contact front desk.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-emerald-500/40 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome, {registeredGuestName}!</h2>
          <p className="text-sm text-slate-300 max-w-sm mx-auto">
            Your contact details have been successfully registered in the hotel system for <strong>Room {formData.roomNumber}</strong> with a secure JWT authentication token.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10"
              onClick={() => router.push("/guest-portal")}
            >
              Unlock In-Room Portal Now &rarr;
            </Button>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-200 hover:text-white text-xs h-10"
              onClick={() =>
                router.push(
                  `/guest-portal/login?room=${encodeURIComponent(formData.roomNumber)}&name=${encodeURIComponent(
                    formData.firstName
                  )}&registered=true`
                )
              }
            >
              Guest Room Authentication (Sign In)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 gap-1.5 px-3 py-1">
            <QrCode className="w-3.5 h-3.5" />
            <span>Online Guest Registration</span>
          </Badge>
          <Link
            href="/guest-portal/login"
            className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium"
          >
            <span>Already have a room? Sign In</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          Guest Self-Registration & Portal Access
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs sm:text-sm">
          Register with your contact details to record your profile in Nexus HMS, receive a secure JWT token, and unlock your digital in-room experience.
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
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
            <Label htmlFor="roomNumber" className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center justify-between">
              <span>Assigned / Target Room Number *</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">Active in-house room</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="roomNumber"
                name="roomNumber"
                type="text"
                placeholder="e.g. 101, 102, 204"
                value={formData.roomNumber}
                onChange={handleChange}
                required
                className="bg-slate-950/90 border-slate-700 text-white font-mono text-lg h-10 tracking-widest"
              />
              <div className="flex gap-1">
                {["101", "102", "103"].map((rm) => (
                  <button
                    key={rm}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, roomNumber: rm }))}
                    className="px-2.5 text-xs font-mono rounded border border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-500/60 hover:text-amber-300"
                  >
                    #{rm}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guest Name Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-xs font-semibold text-slate-300">
                First Name *
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="bg-slate-950/70 border-slate-700 text-slate-100 pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="middleName" className="text-xs font-semibold text-slate-300">
                Middle Name
              </Label>
              <Input
                id="middleName"
                name="middleName"
                placeholder="Optional"
                value={formData.middleName}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-xs font-semibold text-slate-300">
                Last Name *
              </Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">
                Mobile Phone *
              </Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="0911318622"
                  value={formData.phone}
                  onChange={handleChange}
                  className="bg-slate-950/70 border-slate-700 text-slate-100 pl-8 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-slate-950/70 border-slate-700 text-slate-100 pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="country" className="text-xs font-semibold text-slate-300">
                Country
              </Label>
              <Input
                id="country"
                name="country"
                placeholder="Ethiopia"
                value={formData.country}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs font-semibold text-slate-300">
                City / Region
              </Label>
              <Input
                id="city"
                name="city"
                placeholder="Addis Ababa / Bole"
                value={formData.city}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="nationality" className="text-xs font-semibold text-slate-300">
                Nationality
              </Label>
              <Input
                id="nationality"
                name="nationality"
                placeholder="Ethiopian"
                value={formData.nationality}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>
          </div>

          {/* Identity Verification Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="idType" className="text-xs font-semibold text-slate-300">
                Identity Document Type
              </Label>
              <select
                id="idType"
                name="idType"
                value={formData.idType}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="fayida_id">🇪🇹 Fayda National ID (FAN)</option>
                <option value="passport">🛂 Passport</option>
                <option value="national_id">🪪 National ID Card</option>
                <option value="driver_license">🚗 Driver's License</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="idNumber" className="text-xs font-semibold text-slate-300">
                Document Number / FAN
              </Label>
              <Input
                id="idNumber"
                name="idNumber"
                placeholder="e.g. 16-digit FAN or Passport #"
                value={formData.idNumber}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="emergencyContactName" className="text-xs font-semibold text-slate-300">
                Emergency Contact Name
              </Label>
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                placeholder="Next of kin / contact name"
                value={formData.emergencyContactName}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="emergencyContactPhone" className="text-xs font-semibold text-slate-300">
                Emergency Contact Phone
              </Label>
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                placeholder="Emergency phone number"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                className="bg-slate-950/70 border-slate-700 text-slate-100 h-9 text-xs"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="space-y-1">
              <Label htmlFor="foodPreference" className="text-xs font-semibold text-slate-300">
                Dietary Preference
              </Label>
              <select
                id="foodPreference"
                name="foodPreference"
                value={formData.foodPreference}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="none">No Dietary Restriction</option>
                <option value="halal">Halal</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten_free">Gluten-Free</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bedPreference" className="text-xs font-semibold text-slate-300">
                Bed Preference
              </Label>
              <select
                id="bedPreference"
                name="bedPreference"
                value={formData.bedPreference}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="king">King Bed</option>
                <option value="queen">Queen Bed</option>
                <option value="twin">Twin Beds</option>
                <option value="single">Single Bed</option>
              </select>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-1 pt-1">
            <Label htmlFor="specialRequests" className="text-xs font-semibold text-slate-300">
              Special Requests & In-Room Notes (Optional)
            </Label>
            <textarea
              id="specialRequests"
              name="specialRequests"
              rows={2}
              placeholder="e.g. Extra pillows, airport pickup, late arrival..."
              value={formData.specialRequests}
              onChange={handleChange}
              className="flex w-full rounded-md border border-slate-700 bg-slate-950/70 p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Details & Generating JWT Token...</span>
              </>
            ) : (
              <>
                <span>Register Contact Details & Generate JWT Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link
            href={`/guest-portal/login${formData.roomNumber ? `?room=${formData.roomNumber}` : ""}`}
            className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            Go to Guest Room Authentication (Sign In)
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
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shadow-inner">
            <Hotel className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg tracking-wide text-white">NEXUS GRAND HOTEL & SUITES</h1>
            <p className="text-[11px] text-amber-400/90 font-medium tracking-wider uppercase">Online Guest Portal Registration</p>
          </div>
        </div>

        <Link
          href="/guest-portal/login"
          className="text-xs text-slate-300 hover:text-white transition-colors border border-slate-800 rounded-full px-3 py-1.5 bg-slate-900/60"
        >
          Sign In
        </Link>
      </header>

      {/* Main Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-2">
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
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <Utensils className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <span>Room Dining</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <Sparkles className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <span>Housekeeping</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/80">
            <Wifi className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <span>Fast Wi-Fi</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full pt-4 text-center text-xs text-slate-500 flex flex-col gap-1">
        <div className="flex items-center justify-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted JWT Guest Authentication • Nexus HMS</span>
        </div>
        <p className="text-[11px]">© {new Date().getFullYear()} Nexus Luxury Hospitality Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}

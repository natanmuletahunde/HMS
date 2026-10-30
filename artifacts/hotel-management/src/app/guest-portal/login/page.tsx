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
  ArrowLeft,
  Shield,
  MessageSquare,
  KeyRound,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaydaScanner } from "@/components/fayda-scanner";
import type { ParsedFaydaGuest } from "@/lib/fayda";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryName = searchParams.get("name") || "";
  const queryPhone = searchParams.get("phone") || "";
  const isJustRegistered = searchParams.get("registered") === "true";

  // Login form states
  const [identifier, setIdentifier] = useState(queryPhone || queryName || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fayda scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [faydaScanned, setFaydaScanned] = useState<ParsedFaydaGuest | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingSession, setExistingSession] = useState<any | null>(null);

  // Dual auth mode: standard (password / identifier) vs. direct SMS OTP
  const [loginMode, setLoginMode] = useState<"standard" | "otp">("standard");

  // Direct SMS OTP states
  const [guestOtpPhone, setGuestOtpPhone] = useState(queryPhone || "");
  const [guestOtpStep, setGuestOtpStep] = useState<"request" | "verify">("request");
  const [guestOtpCode, setGuestOtpCode] = useState("");
  const [guestOtpMasked, setGuestOtpMasked] = useState("");
  const [guestOtpDevCode, setGuestOtpDevCode] = useState("");
  const [guestOtpCooldown, setGuestOtpCooldown] = useState(0);
  const [guestOtpLoading, setGuestOtpLoading] = useState(false);
  const [guestOtpError, setGuestOtpError] = useState("");

  // Forgot Password via SMS OTP modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"phone" | "verify">("phone");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotMasked, setForgotMasked] = useState("");
  const [forgotDevCode, setForgotDevCode] = useState("");
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

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

  // Cooldown countdown for direct SMS OTP
  useEffect(() => {
    if (guestOtpCooldown <= 0) return;
    const interval = setInterval(() => {
      setGuestOtpCooldown((c) => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [guestOtpCooldown]);

  // Cooldown countdown for Forgot Password SMS OTP
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setForgotCooldown((c) => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotCooldown]);

  const handleRequestGuestOtp = async () => {
    const raw = guestOtpPhone.replace(/\D/g, "");
    if (raw.length < 9) {
      setGuestOtpError("Please enter a valid Ethiopian mobile phone number (e.g. 0911318622)");
      return;
    }
    setGuestOtpLoading(true);
    setGuestOtpError("");
    setGuestOtpDevCode("");
    try {
      const res = await fetch("/api/guest-portal/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to send verification SMS");
      setGuestOtpMasked(data.maskedPhone || raw);
      setGuestOtpCooldown(data.cooldownSeconds || 60);
      if (data.devCode) setGuestOtpDevCode(data.devCode);
      setGuestOtpStep("verify");
    } catch (err: any) {
      setGuestOtpError(err.message || "Failed to dispatch SMS code");
    } finally {
      setGuestOtpLoading(false);
    }
  };

  const handleVerifyGuestOtp = async () => {
    if (guestOtpCode.trim().length !== 6) {
      setGuestOtpError("Please enter the 6-digit verification code");
      return;
    }
    setGuestOtpLoading(true);
    setGuestOtpError("");
    try {
      const res = await fetch("/api/guest-portal/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: guestOtpPhone, code: guestOtpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Invalid or expired verification code");

      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
          document.cookie = `nexus_guest_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }
      router.push("/");
    } catch (err: any) {
      setGuestOtpError(err.message || "Invalid verification code");
    } finally {
      setGuestOtpLoading(false);
    }
  };

  // Forgot Password SMS OTP handlers
  const openForgotPasswordModal = () => {
    const rawDigits = identifier.replace(/\D/g, "");
    setForgotPhone(rawDigits.length >= 9 ? identifier : "");
    setForgotStep("phone");
    setForgotCode("");
    setForgotError("");
    setForgotDevCode("");
    setShowForgotModal(true);
  };

  const handleRequestForgotOtp = async () => {
    const raw = forgotPhone.replace(/\D/g, "");
    if (raw.length < 9) {
      setForgotError("Please enter a valid Ethiopian mobile phone number (e.g. 0911318622)");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setForgotDevCode("");
    try {
      const res = await fetch("/api/guest-portal/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to dispatch reset code");
      setForgotMasked(data.maskedPhone || raw);
      setForgotCooldown(data.cooldownSeconds || 60);
      if (data.devCode) setForgotDevCode(data.devCode);
      setForgotStep("verify");
    } catch (err: any) {
      setForgotError(err.message || "Failed to dispatch reset code via SMS");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    if (forgotCode.trim().length !== 6) {
      setForgotError("Please enter the 6-digit verification code");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await fetch("/api/guest-portal/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: forgotPhone,
          code: forgotCode.trim(),
          isReset: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Invalid or expired verification code");

      if (typeof window !== "undefined") {
        if (data.token) {
          sessionStorage.setItem("nexus_guest_token", data.token);
          localStorage.setItem("nexus_guest_token", data.token);
          document.cookie = `nexus_guest_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        }
        sessionStorage.setItem("nexus_guest_session", JSON.stringify(data));
        localStorage.setItem("nexus_guest_session", JSON.stringify(data));
      }
      setShowForgotModal(false);
      router.push("/guest-portal/profile?changePassword=true");
    } catch (err: any) {
      setForgotError(err.message || "Invalid verification code");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFaydaDecoded = (data: ParsedFaydaGuest) => {
    setFaydaScanned(data);
    setError("");

    const phoneClean = data.phone ? data.phone.replace(/\D/g, "") : "";
    const name = data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim();
    if (phoneClean.length >= 9) {
      setIdentifier(phoneClean.length > 10 ? phoneClean.slice(-10) : phoneClean);
    } else if (name) {
      setIdentifier(name);
    }
  };

  const handleLogin = async (overrideIdentifier?: string, overridePass?: string) => {
    setError("");
    const targetId = (overrideIdentifier !== undefined ? overrideIdentifier : identifier).trim();
    const targetPass = overridePass !== undefined ? overridePass : password;

    if (!targetId) {
      setError("Please enter your registered mobile phone number or full name.");
      return;
    }

    setLoading(true);
    try {
      const isDigitsOrPhone = /^[+0-9\s\-()]+$/.test(targetId) && targetId.replace(/\D/g, "").length >= 4;

      const res = await fetch("/api/guest-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: targetId,
          phone: isDigitsOrPhone ? targetId.replace(/\D/g, "") : undefined,
          fullName: !isDigitsOrPhone ? targetId : undefined,
          password: targetPass || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Authentication failed. Please verify your credentials.");
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

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "No registered guest account found for this name or phone number.");
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
              Your guest identity has been verified in the hotel registry. Sign in below using your registered phone or full name and password.
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

      <Card className="border-amber-500/20 bg-[#10121a]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(217,119,54,0.06)] backdrop-blur-2xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pb-4 pt-6 px-6 sm:px-8 border-b border-white/5 relative flex flex-col items-center justify-center">
          {/* Centered Luxury Hotel Crest Logo */}
          <div className="relative flex items-center justify-center">
            {/* Outer Subtle Ambient Gold Glow */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-amber-600/30 blur-md opacity-75" />
            
            {/* Circular Luxury Emblem Badge */}
            <div className="relative w-20 h-20 rounded-full bg-[#0a0d18] border-2 border-amber-400/50 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(217,119,54,0.35)] overflow-hidden">
              <img
                src="/hotel-logo.png"
                alt="Hotel Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6 px-6 sm:px-8 pb-7">
          {loginMode === "standard" ? (
            <>
              {/* Fayda Scanner Section */}
              <div className="space-y-2.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-sm">
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
                          faydaScanned.phone?.replace(/\D/g, "").slice(-10) || faydaScanned.fullName
                        )
                      }
                    >
                      Fill Identifier &rarr;
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
                {/* 1. Identifier Field (Registered Phone Number or Full Name) */}
                <div className="space-y-1.5">
                  <Label htmlFor="loginIdentifier" className="text-xs font-medium text-slate-300">
                    Registered Phone Number or Full Name <span className="text-amber-400">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="loginIdentifier"
                      type="text"
                      placeholder="e.g. 0911318622 or Almaz Bekele"
                      value={identifier}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                      className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 text-sm h-11 rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. Password Field with "Forgot Password?" placed cleanly right above */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loginPassword" className="text-xs font-medium text-slate-300">
                      Password <span className="text-amber-400">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={openForgotPasswordModal}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium hover:underline focus:outline-none"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="loginPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 pr-10 text-sm h-11 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full bg-gradient-to-r from-[#d97736] via-[#ea833f] to-[#b85e24] hover:brightness-110 active:scale-[0.99] text-white font-semibold h-12 text-sm shadow-[0_10px_25px_-5px_rgba(217,119,54,0.35)] transition-all rounded-xl"
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
            </>
          ) : (
            /* AfroMessage Direct SMS OTP Flow */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AfroMessage Ethiopian SMS Gateway</span>
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono">EthioTel &bull; Safaricom</span>
              </div>

              {guestOtpError && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed">{guestOtpError}</span>
                </div>
              )}

              {guestOtpStep === "request" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="guestOtpPhoneInput" className="text-xs font-medium text-slate-300">
                      Mobile Phone Number <span className="text-amber-400">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="guestOtpPhoneInput"
                        type="tel"
                        placeholder="0911318622 or 07..."
                        value={guestOtpPhone}
                        onChange={(e) => setGuestOtpPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-500 pl-10 text-sm font-mono tracking-wider h-11 rounded-xl"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Enter the Ethiopian phone number linked to your hotel reservation or guest profile.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleRequestGuestOtp}
                    disabled={guestOtpLoading || guestOtpPhone.length < 9}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:brightness-110 active:scale-[0.99] text-slate-950 font-bold h-12 text-sm shadow-[0_10px_25px_-5px_rgba(217,119,54,0.35)] transition-all rounded-xl"
                  >
                    {guestOtpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                        Dispatching SMS via AfroMessage...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Send 6-Digit SMS Code</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                    <p className="text-xs text-slate-300">
                      Verification code dispatched to:
                    </p>
                    <p className="text-sm font-mono font-bold text-amber-300">
                      {guestOtpMasked || guestOtpPhone}
                    </p>
                  </div>

                  {guestOtpDevCode && (
                    <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs">
                      <span className="text-amber-300 font-medium">Sandbox SMS OTP:</span>
                      <code className="font-mono font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded text-sm tracking-widest">
                        {guestOtpDevCode}
                      </code>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="guestOtpCodeInput" className="text-xs font-medium text-slate-300">
                      Enter 6-Digit Code <span className="text-amber-400">*</span>
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="guestOtpCodeInput"
                        type="text"
                        placeholder="••••••"
                        value={guestOtpCode}
                        onChange={(e) => setGuestOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="bg-black/40 border-white/10 focus-visible:border-amber-500 focus-visible:ring-1 focus-visible:ring-amber-500/30 text-white placeholder:text-slate-600 pl-10 text-center text-lg font-mono tracking-[0.3em] font-bold h-12 rounded-xl"
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleVerifyGuestOtp}
                    disabled={guestOtpLoading || guestOtpCode.trim().length !== 6}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 active:scale-[0.99] text-slate-950 font-bold h-12 text-sm shadow-[0_10px_25px_-5px_rgba(16,185,129,0.35)] transition-all rounded-xl"
                  >
                    {guestOtpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-slate-950" />
                        <span>Verify & Enter Guest Portal &rarr;</span>
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={guestOtpCooldown > 0 || guestOtpLoading}
                      onClick={handleRequestGuestOtp}
                      className="text-amber-400 hover:text-amber-300 disabled:text-slate-500 font-medium transition-colors"
                    >
                      {guestOtpCooldown > 0 ? `Resend code in ${guestOtpCooldown}s` : "Resend SMS code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGuestOtpStep("request");
                        setGuestOtpCode("");
                        setGuestOtpError("");
                      }}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      Change Phone Number
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registration Callout */}
          <div className="pt-3 border-t border-white/10 text-center">
            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/50 h-10 text-xs font-medium rounded-xl transition-all"
              onClick={() => router.push("/guest-portal/register")}
            >
              First Time Guest? Pre-Register Profile &rarr;
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* Forgot Password via SMS OTP Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0f121d] border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-6">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Reset Password via SMS OTP</span>
              </div>
            </div>

            {forgotError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === "phone" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-300">
                    Registered Mobile Phone Number <span className="text-amber-400">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="tel"
                      placeholder="0911318622 or 07..."
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      maxLength={10}
                      className="bg-black/40 border-white/10 focus-visible:border-amber-500 text-white pl-10 text-sm font-mono tracking-wider h-11 rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleRequestForgotOtp}
                  disabled={forgotLoading || forgotPhone.replace(/\D/g, "").length < 9}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:brightness-110 text-slate-950 font-bold h-11 text-xs rounded-xl shadow-lg"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Sending SMS OTP...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Send 6-Digit SMS Code</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {forgotDevCode && (
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium">Sandbox SMS OTP:</span>
                    <code className="font-mono font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded text-sm tracking-widest">
                      {forgotDevCode}
                    </code>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-300">
                    Enter 6-Digit Code <span className="text-amber-400">*</span>
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="••••••"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="bg-black/40 border-white/10 focus-visible:border-amber-500 text-white pl-10 text-center text-lg font-mono tracking-[0.3em] font-bold h-12 rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleVerifyForgotOtp}
                  disabled={forgotLoading || forgotCode.trim().length !== 6}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-slate-950 font-bold h-11 text-xs rounded-xl shadow-lg"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-slate-950" />
                      <span>Verify & Set New Password &rarr;</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    disabled={forgotCooldown > 0 || forgotLoading}
                    onClick={handleRequestForgotOtp}
                    className="text-amber-400 hover:text-amber-300 disabled:text-slate-500 font-medium transition-colors"
                  >
                    {forgotCooldown > 0 ? `Resend code in ${forgotCooldown}s` : "Resend SMS code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("phone");
                      setForgotCode("");
                      setForgotError("");
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Change Phone Number
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const GUEST_DESTINATIONS = [
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

export default function GuestPortalLoginPage() {
  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-[#030614] text-slate-100 flex flex-col justify-center items-center relative selection:bg-amber-500/30 select-none">
      {/* 4-Quadrant Full-Viewport Luxury Architectural Background Gallery - Interactive Hover View */}
      <div className="fixed inset-0 grid grid-cols-1 md:grid-cols-2 grid-rows-2 w-screen h-screen z-0 pointer-events-auto select-none">
        {GUEST_DESTINATIONS.map((dest) => (
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

      {/* Main Authentication Section - Static, Centered, Shifted slightly upward, Non-scrollable */}
      <main className="w-full h-full flex items-center justify-center p-4 sm:p-6 z-10 relative -translate-y-4 sm:-translate-y-6 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <Suspense
            fallback={
              <Card className="border-white/10 bg-[#10121a]/95 p-8 text-center rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
              </Card>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

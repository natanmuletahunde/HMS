"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Phone,
  MessageSquare,
  KeyRound,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginStep = "credentials" | "mfa";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // SMS OTP & Forgot Password Dialog states
  const [otpStep, setOtpStep] = useState<"request" | "verify" | "reset">("request");
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpMaskedPhone, setOtpMaskedPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpDevCode, setOtpDevCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const isValidMfaCode = /^\d{6}$|^[A-Z2-9]{8}$/.test(totpCode);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "receptionist@nexushms.com",
      password: "Nexus@1234",
    },
  });

  // Pre-fill remembered email if available
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("nexus_remembered_staff_email");
      if (savedEmail) {
        setValue("email", savedEmail);
      }
    } catch {}
  }, [setValue]);

  // Submit email + password
  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setError("");
      const res = await apiFetch<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (rememberMe) {
        try {
          localStorage.setItem("nexus_remembered_staff_email", data.email);
        } catch {}
      } else {
        try {
          localStorage.removeItem("nexus_remembered_staff_email");
        } catch {}
      }

      if (res.mfaRequired && res.mfaToken) {
        setMfaToken(res.mfaToken);
        setStep("mfa");
      } else {
        login(res.accessToken, res.user, res.refreshToken);
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    }
  };

  // Submit MFA TOTP code
  const onMfaSubmit = async () => {
    if (!isValidMfaCode) return;
    setMfaSubmitting(true);
    setError("");
    try {
      const res = await apiFetch<any>("/auth/mfa-verify", {
        method: "POST",
        body: JSON.stringify({ mfaToken, totpCode }),
      });
      login(res.accessToken, res.user, res.refreshToken);
    } catch (err: any) {
      setError(err.message || "Invalid code — please try again");
    } finally {
      setMfaSubmitting(false);
    }
  };

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((c) => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const handleOpenForgotPassword = () => {
    setOtpStep("request");
    setOtpIdentifier("");
    setOtpCode("");
    setOtpDevCode("");
    setOtpError("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowForgotPassword(true);
  };

  const handleRequestOtp = async () => {
    if (!otpIdentifier.trim()) {
      setOtpError("Please enter your work email or mobile phone number");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await apiFetch<any>("/auth/forgot-password/request-otp", {
        method: "POST",
        body: JSON.stringify({ identifier: otpIdentifier.trim() }),
      });
      setOtpPhone(res.phone);
      setOtpMaskedPhone(res.maskedPhone);
      setOtpCooldown(res.cooldownSeconds || 60);
      if (res.devCode) setOtpDevCode(res.devCode);
      setOtpStep("verify");
    } catch (err: any) {
      setOtpError(err.message || "Failed to send verification SMS");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyForReset = async () => {
    if (otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await apiFetch<any>("/auth/forgot-password/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: otpPhone, code: otpCode.trim() }),
      });
      setResetToken(res.resetToken);
      setOtpStep("reset");
    } catch (err: any) {
      setOtpError(err.message || "Invalid verification code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleInstantOtpLogin = async () => {
    if (otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await apiFetch<any>("/auth/otp-login", {
        method: "POST",
        body: JSON.stringify({ phone: otpPhone, code: otpCode.trim() }),
      });
      login(res.accessToken, res.user, res.refreshToken);
      setShowForgotPassword(false);
    } catch (err: any) {
      setOtpError(err.message || "Invalid verification code");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    if (newPassword.length < 6) {
      setOtpError("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError("Passwords do not match");
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await apiFetch<any>("/auth/forgot-password/reset-password", {
        method: "POST",
        body: JSON.stringify({ resetToken, newPassword }),
      });
      login(res.accessToken, res.user, res.refreshToken);
      setShowForgotPassword(false);
    } catch (err: any) {
      setOtpError(err.message || "Failed to reset password");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 bg-[#030612] selection:bg-amber-500/30 select-none overflow-hidden font-sans">
      {/* ─── LUXURY ARCHITECTURAL AMBIENCE (BLACK BACKGROUND WITH AMBER DEPTH) ─── */}
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none z-0 transform scale-105 filter blur-[3px] opacity-25 brightness-50 contrast-125 transition-all duration-1000"
        style={{ backgroundImage: `url('/login-assets/hotel-palace.png')` }}
      />

      {/* Atmospheric Vignette & Deep Radial Gradients */}
      <div
        className="fixed inset-0 pointer-events-none z-1"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(217, 119, 54, 0.12) 0%, rgba(3, 6, 18, 0.82) 55%, rgba(2, 4, 12, 0.98) 100%)",
        }}
      />

      {/* Ambient Lighting Accents */}
      <div className="fixed -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none z-1" />
      <div className="fixed -bottom-40 right-10 w-[500px] h-[350px] bg-amber-600/10 blur-[130px] rounded-full pointer-events-none z-1" />

      {/* ─── CENTERED STAFF SIGN-IN CARD ─── */}
      <main className="w-full max-w-[430px] z-10 relative my-auto">
        <div className="relative rounded-[32px] p-8 sm:p-10 bg-[#0b0e1b]/95 backdrop-blur-2xl border border-amber-500/25 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(217,119,54,0.08)] transition-all overflow-hidden">
          {/* Top Delicate Golden Rim Light */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          {/* Hotel Management System Logo Emblem */}
          <div className="flex flex-col items-center justify-center mb-6 text-center relative">
            <div className="relative flex items-center justify-center">
              {/* Outer Golden Ambient Halo */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-amber-600/30 blur-md opacity-80" />

              {/* Circular Emblem */}
              <div className="relative w-20 h-20 rounded-full bg-[#080b16] border-2 border-amber-400/60 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(217,119,54,0.4)] overflow-hidden">
                <img
                  src="/hotel-logo.png"
                  alt="Hotel Management System"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight font-serif mt-4">
              Welcome Back!
            </h1>
            <p className="text-xs text-amber-400/90 font-medium tracking-wide mt-1">
              Staff & Management Operations Suite
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {step === "credentials" ? (
            /* ─── CREDENTIALS FORM ────────────────────────────────────────── */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Input (Pill Shaped Dark Input with Mail Icon) */}
              <div className="space-y-1">
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Work email address"
                    {...register("email")}
                    className="w-full h-12 rounded-full pl-5 pr-12 bg-black/50 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:border-amber-400 focus:bg-[#070914] focus:ring-4 focus:ring-amber-500/15 outline-none transition-all font-medium autofill:bg-black/50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-400 pointer-events-none transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password Input (Pill Shaped Dark Input with Eye Toggle) */}
              <div className="space-y-1">
                <div className="relative group">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Password"
                    {...register("password")}
                    className="w-full h-12 rounded-full pl-5 pr-12 bg-black/50 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:border-amber-400 focus:bg-[#070914] focus:ring-4 focus:ring-amber-500/15 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-300 transition-colors cursor-pointer p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between px-2 pt-1 text-xs">
                <label
                  htmlFor="rememberMe"
                  className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none font-medium transition-colors"
                >
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 border-white/20 bg-black/50 focus:ring-amber-500/30 accent-amber-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Golden Pill Login Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-bold text-sm tracking-wide shadow-[0_10px_30px_-5px_rgba(217,119,54,0.45),0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* ─── TWO-FACTOR AUTHENTICATION (MFA) ────────────────────────── */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-lg shadow-amber-500/10">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight font-serif">
                  Two-Factor Verification
                </h2>
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="space-y-2">
                <input
                  id="totp"
                  type="text"
                  inputMode="text"
                  maxLength={8}
                  placeholder="000000"
                  className="w-full h-12 rounded-full text-center text-xl font-mono tracking-[0.4em] bg-black/60 border border-white/10 text-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/15 outline-none font-bold"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))
                  }
                  onKeyDown={(e) => e.key === "Enter" && onMfaSubmit()}
                  autoFocus
                />
              </div>

              <Button
                className="w-full h-12 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-[0_10px_25px_-5px_rgba(217,119,54,0.45)] transition-all cursor-pointer"
                disabled={!isValidMfaCode || mfaSubmitting}
                onClick={onMfaSubmit}
              >
                {mfaSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying Code...</span>
                  </div>
                ) : (
                  <span>Verify & Access Dashboard</span>
                )}
              </Button>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                  onClick={() => {
                    setStep("credentials");
                    setError("");
                    setTotpCode("");
                    setMfaToken("");
                  }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── INTERACTIVE AFROMESSAGE SMS OTP & FORGOT PASSWORD MODAL (DARK LUXURY) ─── */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-w-md bg-[#0d101d] border border-amber-500/30 text-white rounded-[28px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <DialogHeader className="text-center sm:text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-sm">
              {otpStep === "request" && <Phone className="w-5 h-5" />}
              {otpStep === "verify" && <MessageSquare className="w-5 h-5" />}
              {otpStep === "reset" && <KeyRound className="w-5 h-5" />}
            </div>
            <DialogTitle className="text-lg font-bold text-white font-serif">
              {otpStep === "request" && "SMS OTP & Password Recovery"}
              {otpStep === "verify" && "Verify SMS Security Code"}
              {otpStep === "reset" && "Create New Password"}
            </DialogTitle>
            <DialogDescription
              className={`text-xs text-slate-400 mt-1 leading-relaxed ${
                otpStep === "request" ? "hidden" : ""
              }`}
            >
              {otpStep === "verify" && (
                <span>
                  A 6-digit code was dispatched to{" "}
                  <strong className="text-amber-300 font-mono">{otpMaskedPhone}</strong> via AfroMessage.
                  Enter it below to proceed.
                </span>
              )}
              {otpStep === "reset" &&
                "Identity verified. Enter your new password below to update your account and sign in."}
            </DialogDescription>
          </DialogHeader>

          {/* Error Message */}
          {otpError && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{otpError}</span>
            </div>
          )}

          {/* Dev Mode Code Helper */}
          {otpDevCode && otpStep === "verify" && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
              <span className="font-medium">Sandbox Mode SMS OTP:</span>
              <span className="font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded tracking-widest">
                {otpDevCode}
              </span>
            </div>
          )}

          {/* ─── STEP 1: REQUEST OTP ─── */}
          {otpStep === "request" && (
            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Work Email or Registered Phone Number
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={otpIdentifier}
                    placeholder="e.g. receptionist@nexushms.com or 0911318622"
                    onChange={(e) => {
                      setOtpIdentifier(e.target.value);
                      if (otpError) setOtpError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    className="h-11 rounded-xl pl-10 text-xs bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                    autoFocus
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpLoading}
                className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 gap-2 cursor-pointer"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Sending SMS via AfroMessage...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>Send Verification SMS</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ─── STEP 2: VERIFY OTP ─── */}
          {otpStep === "verify" && (
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block text-center">
                  6-Digit SMS Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(raw);
                    if (otpError) setOtpError("");
                  }}
                  autoFocus
                  className="w-full h-12 rounded-xl text-center text-xl font-mono tracking-[0.5em] bg-black/60 border border-white/10 text-amber-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/15 outline-none font-bold"
                />
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("request");
                    setOtpCode("");
                    setOtpError("");
                  }}
                  className="text-slate-400 hover:text-white text-[11px] font-medium transition-colors"
                >
                  &larr; Change number
                </button>

                {otpCooldown > 0 ? (
                  <span className="text-[11px] text-slate-400 font-medium font-mono">
                    Resend in {otpCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpLoading}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Resend SMS
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={handleVerifyForReset}
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 gap-2 cursor-pointer"
                >
                  {otpLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Verify & Reset Password</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleInstantOtpLogin}
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full h-10 rounded-full border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant Sign In via OTP</span>
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: CREATE NEW PASSWORD ─── */}
          {otpStep === "reset" && (
            <div className="space-y-3.5 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (otpError) setOtpError("");
                    }}
                    className="h-11 rounded-xl pl-10 pr-10 text-xs bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-400"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (otpError) setOtpError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCompleteReset()}
                    className="h-11 rounded-xl pl-10 pr-10 text-xs bg-black/50 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-400"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleCompleteReset}
                disabled={otpLoading || newPassword.length < 6 || !confirmPassword}
                className="w-full h-11 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 gap-2 cursor-pointer mt-2"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Password & Sign In</span>
                  </>
                )}
              </Button>
            </div>
          )}

          <DialogFooter className="sm:justify-center pt-2">
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

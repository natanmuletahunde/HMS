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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#EDF2F7] selection:bg-blue-500/20 select-none">
      {/* Centered Sign-In Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_0_1px_1px_rgba(0,0,0,0.04)] border border-slate-100/80 transition-all">
        {/* Round Hotel Management System Logo (Matches Card Background) */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <div className="w-20 h-20 rounded-full bg-white border border-slate-200/70 p-1 flex items-center justify-center shadow-xs overflow-hidden">
            <img
              src="/hotel-logo.png"
              alt="Hotel Management System"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-3">
            Welcome Back!
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            We Are Happy To See You Again
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {step === "credentials" ? (
          /* ─── CREDENTIALS FORM ────────────────────────────────────────── */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Input (Pill Shaped with Mail Icon on Right) */}
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                {...register("email")}
                className="w-full h-12 rounded-full pl-5 pr-12 bg-[#F8FAFC] border border-slate-200/90 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:border-[#3B82F6] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
            </div>

            {/* Password Input (Pill Shaped with Eye Icon on Right) */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                {...register("password")}
                className="w-full h-12 rounded-full pl-5 pr-12 bg-[#F8FAFC] border border-slate-200/90 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:border-[#3B82F6] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Options Row: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between px-1 pt-1 text-xs">
              <label
                htmlFor="rememberMe"
                className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 select-none font-medium"
              >
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-full text-[#3B82F6] border-slate-300 focus:ring-[#3B82F6] cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleOpenForgotPassword}
                className="text-[#3B82F6] hover:text-[#2563EB] font-semibold transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Solid Blue Pill Login Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span>Login</span>
                )}
              </Button>
            </div>

            {/* Direct SMS OTP Login Option */}
            <div className="pt-1 text-center">
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                    Or Sign In With
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleOpenForgotPassword}
                className="w-full h-11 rounded-full border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Phone className="w-4 h-4 text-[#3B82F6]" />
                <span>Phone SMS OTP (AfroMessage)</span>
              </Button>
            </div>
          </form>
        ) : (
          /* ─── TWO-FACTOR AUTHENTICATION (MFA) ────────────────────────── */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3B82F6] mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Two-Factor Verification
              </h2>
              <p className="text-xs text-slate-500">
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
                className="w-full h-12 rounded-full text-center text-xl font-mono tracking-[0.4em] bg-[#F8FAFC] border border-slate-200 text-slate-900 focus:bg-white focus:border-[#3B82F6] focus:ring-4 focus:ring-blue-500/10 outline-none"
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))
                }
                onKeyDown={(e) => e.key === "Enter" && onMfaSubmit()}
                autoFocus
              />
            </div>

            <Button
              className="w-full h-12 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              disabled={!isValidMfaCode || mfaSubmitting}
              onClick={onMfaSubmit}
            >
              {mfaSubmitting ? "Verifying..." : "Verify & Sign In"}
            </Button>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
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

      {/* ─── INTERACTIVE AFROMESSAGE SMS OTP & FORGOT PASSWORD MODAL ─── */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-8">
          <DialogHeader className="text-center sm:text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#3B82F6] mb-2 shadow-xs">
              {otpStep === "request" && <Phone className="w-5 h-5" />}
              {otpStep === "verify" && <MessageSquare className="w-5 h-5" />}
              {otpStep === "reset" && <KeyRound className="w-5 h-5" />}
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {otpStep === "request" && "SMS OTP & Password Recovery"}
              {otpStep === "verify" && "Verify SMS Security Code"}
              {otpStep === "reset" && "Create New Password"}
            </DialogTitle>
            <DialogDescription className={`text-xs text-slate-500 mt-1 leading-relaxed ${otpStep === "request" ? "hidden" : ""}`}>
              {otpStep === "verify" && (
                <span>
                  A 6-digit code was sent to <strong className="text-slate-900 font-mono">{otpMaskedPhone}</strong>. Enter it below to proceed.
                </span>
              )}
              {otpStep === "reset" &&
                "Identity verified. Enter your new password below to update your account and sign in."}
            </DialogDescription>
          </DialogHeader>

          {/* Error Message */}
          {otpError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{otpError}</span>
            </div>
          )}

          {/* Dev Mode Code Helper */}
          {otpDevCode && otpStep === "verify" && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
              <span className="font-medium">Sandbox Mode Dev Code:</span>
              <span className="font-mono font-bold text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded">{otpDevCode}</span>
            </div>
          )}

          {/* ─── STEP 1: REQUEST OTP ─── */}
          {otpStep === "request" && (
            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Work Email or Phone Number</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={otpIdentifier}
                    onChange={(e) => {
                      setOtpIdentifier(e.target.value);
                      if (otpError) setOtpError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                    className="h-11 rounded-2xl pl-10 text-xs border-slate-200 focus:border-[#3B82F6]"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpLoading}
                className="w-full h-11 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs shadow-md shadow-blue-500/20 gap-2 cursor-pointer"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending SMS...</span>
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
                <label className="text-xs font-semibold text-slate-700 block text-center">6-Digit SMS Verification Code</label>
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
                  className="w-full h-12 rounded-2xl text-center text-xl font-mono tracking-[0.5em] bg-[#F8FAFC] border border-slate-200 text-slate-900 focus:bg-white focus:border-[#3B82F6] focus:ring-4 focus:ring-blue-500/10 outline-none"
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
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-medium"
                >
                  ← Change number
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
                    className="text-[11px] font-semibold text-[#3B82F6] hover:text-[#2563EB]"
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
                  className="w-full h-11 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs shadow-md shadow-blue-500/20 gap-2 cursor-pointer"
                >
                  {otpLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
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
                  className="w-full h-10 rounded-full border-emerald-500/30 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 hover:text-emerald-800 font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant Sign In via OTP</span>
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: CREATE NEW PASSWORD ─── */}
          {otpStep === "reset" && (
            <div className="space-y-3.5 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (otpError) setOtpError("");
                    }}
                    className="h-11 rounded-2xl pl-10 pr-10 text-xs border-slate-200 focus:border-[#3B82F6]"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
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
                    className="h-11 rounded-2xl pl-10 pr-10 text-xs border-slate-200 focus:border-[#3B82F6]"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleCompleteReset}
                disabled={otpLoading || newPassword.length < 6 || !confirmPassword}
                className="w-full h-11 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs shadow-md shadow-blue-500/20 gap-2 cursor-pointer mt-2"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

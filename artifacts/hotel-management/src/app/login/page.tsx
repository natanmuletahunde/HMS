"use client";

import { useState, useEffect } from "react";
import { BedDouble, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

type LoginStep = "credentials" | "mfa";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [isDeactivatedNotice, setIsDeactivatedNotice] = useState(false);

  useEffect(() => {
    // Read query parameter safely after hydration on client
    const params = new URLSearchParams(window.location.search);
    if (params.get("deactivated") === "1") {
      setIsDeactivatedNotice(true);
      // Clean up URL so query parameter doesn't persist across login/refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("deactivated");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const isValidMfaCode = /^\d{6}$|^[A-Z2-9]{8}$/.test(totpCode);
  const { login } = useAuth();

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "receptionist@nexushms.com",
      password: "Nexus@1234",
    }
  });

  const quickRoles = [
    {
      title: "Front Desk Receptionist",
      role: "Front Desk",
      email: "receptionist@nexushms.com",
      pass: "Nexus@1234",
      icon: "👩‍💼",
      scope: "Check-In, Walk-Ins, Guests, Rooms & Folios",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Hotel General Manager",
      role: "Manager",
      email: "manager@nexushms.com",
      pass: "Nexus@1234",
      icon: "👔",
      scope: "Occupancy KPIs, Financials & Approvals",
      badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    },
    {
      title: "Housekeeping Staff",
      role: "Housekeeping",
      email: "housekeeper@nexushms.com",
      pass: "Nexus@1234",
      icon: "🧹",
      scope: "Room Turnaround, Cleaning & Inspection",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    },
    {
      title: "Maintenance Engineer",
      role: "Maintenance",
      email: "maintenance@nexushms.com",
      pass: "Nexus@1234",
      icon: "🔧",
      scope: "Repair Work Orders & Facility Tickets",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    },
    {
      title: "POS Cashier & F&B",
      role: "Cashier",
      email: "cashier@nexushms.com",
      pass: "Nexus@1234",
      icon: "💳",
      scope: "Dining Register, Table Orders & Billing",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    },
    {
      title: "System Administrator",
      role: "Admin",
      email: "admin@nexushms.com",
      pass: "Admin@1234",
      icon: "🛡️",
      scope: "Multi-Tenant SaaS, Security & Settings",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    },
  ];

  const handleQuickRole = async (r: typeof quickRoles[0]) => {
    setIsDeactivatedNotice(false);
    setValue("email", r.email);
    setValue("password", r.pass);
    await onSubmit({ email: r.email, password: r.pass });
  };

  // Step 1: submit email + password
  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setError("");
      setIsDeactivatedNotice(false);
      const res = await apiFetch<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res.mfaRequired && res.mfaToken) {
        // MFA is enabled — move to second factor step
        setMfaToken(res.mfaToken);
        setStep("mfa");
      } else {
        // No MFA — login immediately
        login(res.accessToken, res.user, res.refreshToken);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    }
  };

  // Step 2: submit a six-digit TOTP or an eight-character backup code
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-bg mb-4 shadow-lg shadow-primary/20">
            <BedDouble className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Nexus HMS</h1>
          <p className="text-text-muted text-sm mt-1">Role-Based Hotel Management & Operations Platform</p>
        </div>

        {isDeactivatedNotice && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Your account has been deactivated by an administrator. Access has been locked.</span>
          </div>
        )}

        {/* Quick Role Selection Cards */}
        <div className="bg-surface border border-border p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-text uppercase tracking-wider">Select Staff Role To Sign In</h2>
              <p className="text-xs text-text-muted mt-0.5">Click any staff role below to instantly load their dedicated dashboard & features</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickRoles.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => handleQuickRole(r)}
                disabled={isSubmitting}
                className="flex flex-col text-left p-3.5 rounded-lg border border-border bg-bg/60 hover:bg-muted/80 hover:border-primary/40 transition-all group relative cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{r.icon}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.badgeClass}`}>
                    {r.role}
                  </span>
                </div>
                <div className="font-semibold text-xs text-text group-hover:text-primary transition-colors">
                  {r.title}
                </div>
                <div className="text-[11px] text-text-muted mt-1 leading-snug line-clamp-2">
                  {r.scope}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-xl shadow-xl">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Or Sign In With Custom Account Credentials
          </div>

          {step === "credentials" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-danger/10 text-danger text-sm p-3 rounded-md border border-danger/20">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Staff Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="receptionist@nexushms.com"
                    {...register("email")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full mt-2" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In to Staff Portal"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
                <p className="text-sm text-text-muted mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              {error && (
                <div className="bg-danger/10 text-danger text-sm p-3 rounded-md border border-danger/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="totp">Authenticator or Backup Code</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="text"
                  maxLength={8}
                  placeholder="000000 or ABCD2345"
                  className="text-center text-2xl font-mono tracking-[0.5em]"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))}
                  onKeyDown={e => e.key === "Enter" && onMfaSubmit()}
                  autoFocus
                />
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={!isValidMfaCode || mfaSubmitting}
                onClick={onMfaSubmit}
              >
                {mfaSubmitting ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-text-muted hover:text-text underline"
                onClick={() => { setStep("credentials"); setError(""); setTotpCode(""); setMfaToken(""); }}
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

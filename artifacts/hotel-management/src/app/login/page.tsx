"use client";

import { useState } from "react";
import { BedDouble } from "lucide-react";
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
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const isValidMfaCode = /^\d{6}$|^[A-Z2-9]{8}$/.test(totpCode);
  const { login } = useAuth();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@nexushms.com",
      password: "Admin@1234",
    }
  });

  // Step 1: submit email + password
  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setError("");
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
        login(res.accessToken, res.user);
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
      login(res.accessToken, res.user);
    } catch (err: any) {
      setError(err.message || "Invalid code — please try again");
    } finally {
      setMfaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-bg mb-6">
            <BedDouble className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Nexus HMS</h1>
          <p className="text-text-muted mt-2">Enterprise Operations Hub</p>
        </div>

        <div className="bg-surface border border-border p-8 rounded-xl shadow-2xl">
          {step === "credentials" ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="bg-danger/10 text-danger text-sm p-3 rounded-md border border-danger/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@nexushms.com"
                  {...register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
              <p className="text-center text-xs text-text-muted">
                Pre-fill hint: admin@nexushms.com / Admin@1234
              </p>
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

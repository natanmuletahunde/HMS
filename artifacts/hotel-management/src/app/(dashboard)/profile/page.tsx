"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { 
  User, Shield, Building2, KeyRound, Check, RotateCw, Copy, 
  Loader2, Globe, Phone, Mail, Award, CheckCircle2, AlertCircle, Eye, EyeOff 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function generateSecurePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*";
  const all = upper + lower + nums + syms;
  
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    syms[Math.floor(Math.random() * syms.length)],
  ];
  for (let i = 0; i < 8; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join("");
}

export default function ProfilePage() {
  const { user, branches, activeBranch, toggleOnDuty, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCurrentPwdFocused, setIsCurrentPwdFocused] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCopyPassword = (pwd: string) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPassword.trim()) {
      setErrorMsg("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      setErrorMsg("Please enter or generate a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: currentPassword.trim() || undefined,
          newPassword: newPassword.trim(),
        }),
      });

      setSuccessMsg("Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change password. Please check your current password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOnDuty = user?.isOnDuty !== false;
  const isGlobal = user?.roleName === "Admin" || user?.roleName === "System Admin" || user?.roleScope === "global";
  const permissions = user?.permissions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header — Strictly NO subtitles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          My Staff Profile
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleOnDuty}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase border transition-all cursor-pointer ${
              isOnDuty
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOnDuty ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
            {isOnDuty ? "Status: ON DUTY" : "Status: OFF DUTY"}
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop): Identity & Assigned Branch Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Card */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--blue-700)] text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {user?.name || "Staff Member"}
                  </h2>
                  <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="font-semibold text-xs px-2.5 py-0.5 rounded-md">
                      {user?.roleName || user?.role || "Staff"}
                    </Badge>
                    {isGlobal ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue-700)] bg-[var(--blue-50)] border border-[var(--blue-200)] px-2 py-0.5 rounded-md">
                        <Globe className="w-3 h-3 text-[var(--blue-600)]" />
                        Global Scope
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        Branch-Bound
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
              <div className="p-3 rounded-lg bg-[var(--blue-50)]/30 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--blue-600)]" /> Official Email
                </span>
                <p className="text-xs font-semibold font-mono text-[var(--text-primary)] truncate">
                  {user?.email || "—"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--blue-50)]/30 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--blue-600)]" /> Phone Number (Ethiopian Format)
                </span>
                <p className="text-xs font-semibold font-mono text-[var(--text-primary)]">
                  {user?.phone ? user.phone : <span className="text-[var(--text-secondary)] italic">Not provided</span>}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--blue-50)]/30 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[var(--blue-600)]" /> Fayda National ID (FAN)
                </span>
                <p className="text-xs font-semibold font-mono text-[var(--text-primary)]">
                  {user?.faydaId ? (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs">
                      {user.faydaId}
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)] italic">Not registered</span>
                  )}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--blue-50)]/30 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--blue-600)]" /> Active Working Property
                </span>
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {activeBranch?.branchName || "None assigned"}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Branches Card */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--blue-600)]" />
                Assigned Hotel Properties
              </h3>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {branches.length} {branches.length === 1 ? "branch" : "branches"}
              </span>
            </div>

            {isGlobal ? (
              <div className="p-4 rounded-lg bg-[var(--blue-50)]/50 border border-[var(--blue-200)] flex items-center gap-3">
                <Globe className="w-5 h-5 text-[var(--blue-600)] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[var(--blue-900)]">Chain-Wide Multi-Branch Access</h4>
                  <p className="text-xs text-[var(--blue-800)] mt-0.5">
                    Your account has global administrative scope with unrestricted access across all current and future hotel branches.
                  </p>
                </div>
              </div>
            ) : branches.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic py-2">
                No specific branches currently assigned. Please contact your system administrator.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.map((b) => {
                  const isCurrent = b.id === activeBranch?.id;
                  const isHome = b.isPrimary || b.id === user?.primaryBranchId;

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? "bg-[var(--blue-50)]/60 border-[var(--blue-300)] shadow-xs"
                          : "bg-[var(--surface)] border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--text-primary)]">{b.branchName}</span>
                        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{b.branchCode}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {isHome && (
                          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[var(--blue-100)] text-[var(--blue-800)]">
                            Home Branch
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Active Session
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Role Permissions Card */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--blue-600)]" />
                Role Permissions & Capabilities
              </h3>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {permissions.includes("*") ? "Unrestricted (*)" : `${permissions.length} modules`}
              </span>
            </div>

            {permissions.includes("*") ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Full System Super Administrator privileges granted across all hotel modules and properties.
              </div>
            ) : permissions.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic py-2">
                Standard baseline access. No module-specific overrides assigned.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-[var(--blue-50)] text-[var(--blue-800)] border border-[var(--blue-200)]"
                  >
                    <Check className="w-3 h-3 text-[var(--blue-600)]" />
                    {perm}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Password Change Form */}
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="pb-4 border-b border-[var(--border)] mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[var(--blue-600)]" />
                Change Password
              </h3>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4" autoComplete="off">
              {/* Fake fields to absorb aggressive browser autofill */}
              <input type="text" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
              <input type="password" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Current Password *</Label>
                  <span className="text-[10px] text-[var(--text-secondary)]">Fill in your current password</span>
                </div>
                <div className="relative flex items-center">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    name="hms_cur_pwd_manual"
                    readOnly={!isCurrentPwdFocused}
                    onFocus={() => setIsCurrentPwdFocused(true)}
                    onMouseDown={() => setIsCurrentPwdFocused(true)}
                    className="h-9 text-xs rounded-md pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                    title={showCurrentPassword ? "Hide password" : "View password"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">New Password *</Label>
                  <span className="text-[10px] text-[var(--text-secondary)]">Min 8 chars, 1 uppercase, 1 symbol</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter or generate"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      name="hms_new_pwd_manual"
                      className="h-9 text-xs rounded-md font-mono pr-10 w-full"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                      title={showNewPassword ? "Hide password" : "View password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateSecurePassword();
                      setNewPassword(generated);
                      setConfirmPassword(generated);
                      setShowNewPassword(true);
                      setShowConfirmPassword(true);
                    }}
                    title="Generate Password"
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--blue-50)] hover:bg-[var(--blue-100)] text-[var(--blue-600)] border border-[var(--blue-200)] transition-colors shrink-0 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(newPassword)}
                    title="Copy Password"
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--blue-50)] hover:bg-[var(--blue-100)] text-[var(--blue-600)] border border-[var(--blue-200)] transition-colors shrink-0 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Confirm New Password *</Label>
                <div className="relative flex items-center">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    name="hms_confirm_pwd_manual"
                    className="h-9 text-xs rounded-md font-mono pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                    title={showConfirmPassword ? "Hide password" : "View password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 text-xs font-semibold rounded-lg bg-[var(--blue-700)] text-white hover:bg-[var(--navy-800)] transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

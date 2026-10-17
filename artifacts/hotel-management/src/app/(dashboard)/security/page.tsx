"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Shield, Smartphone, Lock, Globe, QrCode, CheckCircle, XCircle, Plus, Trash2, Eye, EyeOff } from "lucide-react";

function MfaTab() {
  const qc = useQueryClient();
  const [token, setToken] = useState("");
  const [showBackup, setShowBackup] = useState(false);

  const { data: status } = useQuery<any>({ queryKey: ["mfa-status"], queryFn: () => apiFetch("/security/mfa/status") as Promise<any> });
  const setup = useMutation({
    mutationFn: () => apiFetch("/security/mfa/setup", { method: "POST" }) as Promise<any>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa-setup"] }),
  });
  const { data: setupData } = useQuery<any>({
    queryKey: ["mfa-setup"],
    queryFn: () => null,
    enabled: false,
  });
  const verify = useMutation({
    mutationFn: () => apiFetch("/security/mfa/verify", { method: "POST", body: JSON.stringify({ token }) }) as Promise<any>,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mfa-status"] }); setToken(""); },
  });
  const [disableToken, setDisableToken] = useState("");
  const [showDisablePrompt, setShowDisablePrompt] = useState(false);

  const disable = useMutation({
    mutationFn: (totpToken: string) =>
      apiFetch("/security/mfa/disable", {
        method: "DELETE",
        body: JSON.stringify({ token: totpToken }),
      }) as Promise<any>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mfa-status"] });
      setShowDisablePrompt(false);
      setDisableToken("");
    },
  });

  const [mfaSetup, setMfaSetup] = useState<any>(null);

  const handleSetup = async () => {
    const data = await setup.mutateAsync();
    setMfaSetup(data);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Multi-Factor Authentication</h3>
            <p className="text-sm text-text-muted mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status?.isEnabled ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
            {status?.isEnabled ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {status?.isEnabled ? "Enabled" : "Not Enabled"}
          </div>
        </div>

        {!status?.isEnabled && !mfaSetup && (
          <button onClick={handleSetup} disabled={setup.isPending}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            {setup.isPending ? "Generating..." : "Set Up MFA"}
          </button>
        )}

        {mfaSetup && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">1. Scan this QR code with your authenticator app</p>
                {mfaSetup.qrCode && (
                  <img src={mfaSetup.qrCode} alt="MFA QR Code" className="w-48 h-48 rounded-lg border border-border bg-white p-2" />
                )}
                <p className="text-xs text-text-muted mt-2">Or enter this secret manually:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono block mt-1 break-all">{mfaSetup.secret}</code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">2. Enter the 6-digit code</p>
                <div className="flex gap-2">
                  <input type="text" maxLength={6} placeholder="000000"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono w-32 text-center tracking-widest"
                    value={token} onChange={e => setToken(e.target.value.replace(/\D/g, ""))} />
                  <button onClick={() => verify.mutate()} disabled={token.length !== 6 || verify.isPending}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                    Verify
                  </button>
                </div>
                {verify.isSuccess && <p className="text-green-400 text-sm mt-2">✓ MFA enabled successfully!</p>}
                {verify.isError && <p className="text-red-400 text-sm mt-2">Invalid code. Please try again.</p>}

                <div className="mt-4">
                  <button onClick={() => setShowBackup(!showBackup)} className="flex items-center gap-1 text-sm text-text-muted hover:text-text">
                    {showBackup ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showBackup ? "Hide" : "Show"} backup codes
                  </button>
                  {showBackup && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {(mfaSetup.backupCodes as string[]).map((code, i) => (
                        <code key={i} className="text-xs bg-muted px-2 py-1 rounded font-mono text-center">{code}</code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {status?.isEnabled && !showDisablePrompt && (
          <button onClick={() => setShowDisablePrompt(true)}
            className="border border-red-400/30 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-400/10">
            Disable MFA
          </button>
        )}

        {status?.isEnabled && showDisablePrompt && (
          <div className="mt-4 p-4 border border-red-400/20 rounded-lg bg-red-400/5 space-y-3">
            <p className="text-sm font-medium text-red-400">Confirm MFA Disable</p>
            <p className="text-xs text-text-muted">Enter your current 6-digit authenticator code to disable MFA.</p>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono w-32 text-center tracking-widest"
                value={disableToken}
                onChange={e => setDisableToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <button
                onClick={() => disable.mutate(disableToken)}
                disabled={disableToken.length !== 6 || disable.isPending}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {disable.isPending ? "Disabling..." : "Confirm Disable"}
              </button>
              <button
                onClick={() => { setShowDisablePrompt(false); setDisableToken(""); }}
                className="px-4 py-2 rounded-lg text-sm border border-border text-text-muted hover:text-text">
                Cancel
              </button>
            </div>
            {disable.isError && (
              <p className="text-red-400 text-xs">Invalid code. Please try again.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordPolicyTab() {
  const qc = useQueryClient();
  const { data: policy } = useQuery<any>({ queryKey: ["password-policy"], queryFn: () => apiFetch("/security/password-policy") as Promise<any> });
  const [form, setForm] = useState<any>(null);

  const update = useMutation({
    mutationFn: (body: any) => apiFetch("/security/password-policy", { method: "PUT", body: JSON.stringify(body) }) as Promise<any>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["password-policy"] }),
  });

  const effective = form ?? policy ?? {};

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="font-semibold mb-4">Password Policy</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { key: "minLength", label: "Minimum Length", type: "number" },
          { key: "expiryDays", label: "Expiry (days)", type: "number" },
          { key: "preventReuse", label: "Prevent Reuse (last N)", type: "number" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-xs text-text-muted mb-1">{label}</label>
            <input type={type}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={effective[key] ?? ""}
              onChange={e => setForm({ ...effective, [key]: Number(e.target.value) })} />
          </div>
        ))}
        {["requireUppercase", "requireNumbers", "requireSymbols"].map(key => (
          <div key={key} className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
            <span className="text-sm">{key.replace(/([A-Z])/g, " $1").replace("require", "Require")}</span>
            <button onClick={() => setForm({ ...effective, [key]: !effective[key] })}
              className={`relative w-10 h-5 rounded-full transition-colors ${effective[key] ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${effective[key] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => form && update.mutate(form)} disabled={!form || update.isPending}
        className="mt-4 bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
        {update.isPending ? "Saving..." : "Save Policy"}
      </button>
      {update.isSuccess && <span className="ml-3 text-green-400 text-sm">✓ Saved</span>}
    </div>
  );
}

function IpRestrictionsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ipAddress: "", type: "allowlist", label: "" });
  const { data: restrictions = [] } = useQuery<any[]>({ queryKey: ["ip-restrictions"], queryFn: () => apiFetch("/security/ip-restrictions") as Promise<any[]> });

  const add = useMutation({
    mutationFn: () => apiFetch("/security/ip-restrictions", { method: "POST", body: JSON.stringify(form) }) as Promise<any>,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ip-restrictions"] }); setForm({ ipAddress: "", type: "allowlist", label: "" }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/security/ip-restrictions/${id}`, { method: "DELETE" }) as Promise<any>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ip-restrictions"] }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Add IP Restriction</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-text-muted mb-1">IP Address / CIDR</label>
            <input placeholder="192.168.1.0/24" className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-48"
              value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Type</label>
            <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="allowlist">Allowlist</option>
              <option value="blocklist">Blocklist</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Label</label>
            <input placeholder="Office network" className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-40"
              value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          </div>
          <button onClick={() => add.mutate()} disabled={!form.ipAddress || add.isPending}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            <Plus className="h-4 w-4 inline mr-1" />Add
          </button>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>{["IP / CIDR", "Type", "Label", "Action"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(restrictions as any[]).filter((r: any) => r.isActive).map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{r.ipAddress}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.type === "allowlist" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{r.label || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove.mutate(r.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!(restrictions as any[]).filter((r: any) => r.isActive).length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">No IP restrictions configured</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevicesTab() {
  const qc = useQueryClient();
  const { data: devices = [] } = useQuery<any[]>({ queryKey: ["devices"], queryFn: () => apiFetch("/security/devices") as Promise<any[]> });
  const revoke = useMutation({
    mutationFn: (id: string) => apiFetch(`/security/devices/${id}`, { method: "DELETE" }) as Promise<any>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {(devices as any[]).length === 0 ? (
        <div className="px-4 py-12 text-center text-text-muted">
          <Smartphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No registered mobile devices</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>{["Device", "Platform", "Last Seen", "Action"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(devices as any[]).map((d: any) => (
              <tr key={d.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{d.deviceName || "Unknown Device"}</p>
                  <p className="text-xs text-text-muted font-mono">{d.deviceId}</p>
                </td>
                <td className="px-4 py-3 capitalize text-text-muted">{d.platform || "—"}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => revoke.mutate(d.id)} className="text-red-400 hover:text-red-300 text-xs border border-red-400/30 px-2 py-1 rounded">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function SecurityPage() {
  const [tab, setTab] = useState<"mfa" | "policy" | "ip" | "devices">("mfa");

  const TABS = [
    { id: "mfa", label: "MFA Setup", icon: QrCode },
    { id: "policy", label: "Password Policy", icon: Lock },
    { id: "ip", label: "IP Restrictions", icon: Globe },
    { id: "devices", label: "Active Devices", icon: Smartphone },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-text-muted text-sm mt-1">MFA, password policy, IP restrictions, and device management</p>
      </div>

      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-surface shadow text-primary" : "text-text-muted hover:text-text"}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "mfa" && <MfaTab />}
      {tab === "policy" && <PasswordPolicyTab />}
      {tab === "ip" && <IpRestrictionsTab />}
      {tab === "devices" && <DevicesTab />}
    </div>
  );
}

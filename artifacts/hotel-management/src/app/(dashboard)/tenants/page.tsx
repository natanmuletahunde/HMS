"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Building2, Globe, Edit2, ToggleLeft, ToggleRight, Palette } from "lucide-react";

function TenantDialog({ tenant, onClose }: { tenant?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: tenant?.name ?? "",
    slug: tenant?.slug ?? "",
    domain: tenant?.domain ?? "",
    country: tenant?.country ?? "",
    timezone: tenant?.timezone ?? "UTC",
    currency: tenant?.currency ?? "USD",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (tenant) {
        return apiFetch(`/tenants/${tenant.id}`, { method: "PATCH", body: JSON.stringify(form) });
      }
      return apiFetch("/tenants", { method: "POST", body: JSON.stringify(form) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">{tenant ? "Edit Tenant" : "New Tenant"}</h2>
        <div className="space-y-3">
          {(["name", "slug", "domain", "country"] as const).map((f) => (
            <div key={f}>
              <label className="block text-xs text-text-muted mb-1 capitalize">{f}</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Timezone</label>
              <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                {["UTC","Africa/Addis_Ababa","America/New_York","Europe/London","Asia/Dubai"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Currency</label>
              <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {["USD","EUR","GBP","ETB","AED"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 bg-primary text-white rounded-lg py-2 text-sm disabled:opacity-50">
            {mutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [dialog, setDialog] = useState<{ open: boolean; tenant?: any }>({ open: false });
  const qc = useQueryClient();
  const { data: tenants = [], isLoading } = useQuery<any[]>({
    queryKey: ["tenants"],
    queryFn: () => apiFetch("/tenants") as Promise<any[]>,
  });

  const toggle = useMutation({
    mutationFn: (t: any) => apiFetch(`/tenants/${t.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !t.isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-text-muted text-sm mt-1">Manage hotel groups and organizations on this platform</p>
        </div>
        <button onClick={() => setDialog({ open: true })}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm">
          <Plus className="h-4 w-4" /> New Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tenants", value: tenants.length, icon: Building2 },
          { label: "Active", value: tenants.filter((t: any) => t.isActive).length, icon: ToggleRight },
          { label: "Inactive", value: tenants.filter((t: any) => !t.isActive).length, icon: ToggleLeft },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              {["Name", "Slug", "Domain", "Country", "Currency", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No tenants yet. Create your first tenant.</td></tr>
            ) : tenants.map((t: any) => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3 text-text-muted">{t.domain || "—"}</td>
                <td className="px-4 py-3 text-text-muted">{t.country || "—"}</td>
                <td className="px-4 py-3 text-text-muted">{t.currency}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDialog({ open: true, tenant: t })}
                      className="p-1.5 hover:bg-muted rounded-lg" title="Edit">
                      <Edit2 className="h-4 w-4 text-text-muted" />
                    </button>
                    <button onClick={() => toggle.mutate(t)}
                      className="p-1.5 hover:bg-muted rounded-lg" title="Toggle">
                      {t.isActive ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4 text-text-muted" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog.open && <TenantDialog tenant={dialog.tenant} onClose={() => setDialog({ open: false })} />}
    </div>
  );
}

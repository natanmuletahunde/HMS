"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Building2, Globe, Edit2, Users } from "lucide-react";

function OrgDialog({ org, tenants, onClose }: { org?: any; tenants: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: org?.name ?? "", code: org?.code ?? "", type: org?.type ?? "hotel_group",
    description: org?.description ?? "", country: org?.country ?? "",
    city: org?.city ?? "", phone: org?.phone ?? "", email: org?.email ?? "",
    website: org?.website ?? "", tenantId: org?.tenantId ?? "",
  });

  const mutation = useMutation({
    mutationFn: () => org
      ? apiFetch(`/organizations/${org.id}`, { method: "PATCH", body: JSON.stringify(form) })
      : apiFetch("/organizations", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); onClose(); },
  });

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "name", label: "Organization Name" }, { key: "code", label: "Code" },
    { key: "country", label: "Country" }, { key: "city", label: "City" },
    { key: "phone", label: "Phone" }, { key: "email", label: "Email" },
    { key: "website", label: "Website" }, { key: "description", label: "Description" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{org ? "Edit Organization" : "New Organization"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Tenant</label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
              <option value="">No Tenant</option>
              {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Type</label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["hotel_group","chain","independent","resort_group","boutique_collection"].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-text-muted mb-1">{label}</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
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

export default function OrganizationsPage() {
  const [dialog, setDialog] = useState<{ open: boolean; org?: any }>({ open: false });
  const { data: orgs = [], isLoading } = useQuery<any[]>({ queryKey: ["organizations"], queryFn: () => apiFetch("/organizations") as Promise<any[]> });
  const { data: tenants = [] } = useQuery<any[]>({ queryKey: ["tenants"], queryFn: () => apiFetch("/tenants") as Promise<any[]> });

  const typeColors: Record<string, string> = {
    hotel_group: "bg-blue-500/15 text-blue-400",
    chain: "bg-purple-500/15 text-purple-400",
    independent: "bg-green-500/15 text-green-400",
    resort_group: "bg-amber-500/15 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-text-muted text-sm mt-1">Hotel groups and chains on the platform</p>
        </div>
        <button onClick={() => setDialog({ open: true })}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm">
          <Plus className="h-4 w-4" /> New Organization
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: orgs.length, color: "text-primary" },
          { label: "Hotel Groups", value: orgs.filter((o: any) => o.type === "hotel_group").length, color: "text-blue-400" },
          { label: "Active", value: orgs.filter((o: any) => o.isActive).length, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center py-10 text-text-muted">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="col-span-3 text-center py-10 text-text-muted">No organizations yet.</div>
        ) : orgs.map((org: any) => {
          const tenant = tenants.find((t: any) => t.id === org.tenantId);
          return (
            <div key={org.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[org.type] ?? "bg-muted text-text-muted"}`}>
                  {org.type?.replace(/_/g, " ")}
                </span>
              </div>
              <h3 className="font-semibold text-sm">{org.name}</h3>
              {org.code && <p className="text-xs text-text-muted font-mono">{org.code}</p>}
              {org.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{org.description}</p>}
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                {tenant && <p className="text-xs text-text-muted flex items-center gap-1"><Users className="h-3 w-3" /> {tenant.name}</p>}
                {org.country && <p className="text-xs text-text-muted flex items-center gap-1"><Globe className="h-3 w-3" /> {org.city ? `${org.city}, ` : ""}{org.country}</p>}
              </div>
              <button onClick={() => setDialog({ open: true, org })}
                className="mt-3 w-full text-xs text-primary hover:underline flex items-center justify-center gap-1">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
            </div>
          );
        })}
      </div>

      {dialog.open && <OrgDialog org={dialog.org} tenants={tenants} onClose={() => setDialog({ open: false })} />}
    </div>
  );
}

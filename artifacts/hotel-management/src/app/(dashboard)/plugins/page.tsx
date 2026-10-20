"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, Puzzle, Code2, ToggleRight, ToggleLeft, ChevronDown, ChevronUp } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400",
  disabled: "bg-muted text-text-muted",
  pending: "bg-amber-500/15 text-amber-400",
  error: "bg-red-500/15 text-red-400",
};

function RegisterDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    pluginCode: "", pluginName: "", version: "1.0.0",
    author: "", description: "", homepage: "",
  });
  const mutation = useMutation({
    mutationFn: () => apiFetch("/plugins", { method: "POST", body: JSON.stringify({ ...form, hooks: [], permissions: [] }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plugins"] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Register Plugin</h2>
        <div className="space-y-3">
          {[
            { k: "pluginCode", l: "Plugin Code (e.g. spa-management)" },
            { k: "pluginName", l: "Plugin Name" },
            { k: "version", l: "Version" },
            { k: "author", l: "Author" },
            { k: "homepage", l: "Homepage URL" },
            { k: "description", l: "Description" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="block text-xs text-text-muted mb-1">{l}</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 bg-primary text-white rounded-lg py-2 text-sm disabled:opacity-50">
            {mutation.isPending ? "Registering..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SdkSpecViewer() {
  const [open, setOpen] = useState(false);
  const { data: spec } = useQuery<any>({ queryKey: ["plugin-sdk"], queryFn: () => apiFetch("/plugins/sdk-spec") as Promise<any>, enabled: open });
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Plugin SDK Specification</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary">v{spec?.version ?? "1.0.0"}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
      </button>
      {open && spec && (
        <div className="border-t border-border p-5 space-y-4">
          <p className="text-sm text-text-muted">{spec.description}</p>

          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Available Hooks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {spec.hooks?.map((h: any) => (
                <div key={h.name} className="bg-background border border-border rounded-lg p-3">
                  <p className="text-sm font-mono text-primary">{h.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{h.description}</p>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">payload: {h.payload}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Available Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {spec.permissions?.map((p: string) => (
                <span key={p} className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{p}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Registration Example</h3>
            <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-auto text-text-muted">
              {JSON.stringify(spec.registration?.example, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PluginsPage() {
  const [dialog, setDialog] = useState(false);
  const qc = useQueryClient();
  const { data: plugins = [], isLoading } = useQuery<any[]>({ queryKey: ["plugins"], queryFn: () => apiFetch("/plugins") as Promise<any[]> });
  const pagination = usePagination(plugins, 5);

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/plugins/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plugin Registry</h1>
          <p className="text-text-muted text-sm mt-1">Extend Nexus HMS with third-party and custom plugins</p>
        </div>
        <button onClick={() => setDialog(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm">
          <Plus className="h-4 w-4" /> Register Plugin
        </button>
      </div>

      <SdkSpecViewer />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Plugins", value: plugins.length },
          { label: "Active", value: plugins.filter((p: any) => p.status === "active").length },
          { label: "Disabled", value: plugins.filter((p: any) => p.status === "disabled").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-text-muted">Loading...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-16 text-text-muted bg-surface border border-border rounded-xl">
          <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No plugins registered</p>
          <p className="text-sm">Register your first plugin or browse the SDK spec above</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>{["Plugin", "Version", "Author", "Hooks", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagination.paginatedItems.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Puzzle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{p.pluginName}</p>
                        <p className="text-xs text-text-muted font-mono">{p.pluginCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">v{p.version}</td>
                  <td className="px-4 py-3 text-text-muted">{p.author || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{(p.hooks as any[])?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status] ?? "bg-muted text-text-muted"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle.mutate({ id: p.id, status: p.status === "active" ? "disabled" : "active" })}
                      className="p-1.5 hover:bg-muted rounded-lg">
                      {p.status === "active"
                        ? <ToggleRight className="h-5 w-5 text-green-400" />
                        : <ToggleLeft className="h-5 w-5 text-text-muted" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination {...pagination} pageSize={5} />
        </div>
      )}

      {dialog && <RegisterDialog onClose={() => setDialog(false)} />}
    </div>
  );
}

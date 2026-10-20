"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Plus, GitMerge, Play, CheckCircle, XCircle, Clock, ChevronRight, Trash2, ArrowRight } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
  cancelled: "bg-muted text-text-muted",
  escalated: "bg-orange-500/15 text-orange-400",
};

function WorkflowDefDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", entityType: "purchase_request", description: "" });
  const [steps, setSteps] = useState([{ name: "", approverRole: "", escalationHours: 48 }]);

  const mutation = useMutation({
    mutationFn: async () => {
      const def = await apiFetch("/workflows", { method: "POST", body: JSON.stringify(form) }) as any;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].name.trim()) {
          await apiFetch(`/workflows/${def.id}/steps`, {
            method: "POST",
            body: JSON.stringify({ ...steps[i], stepOrder: i + 1 }),
          });
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflows"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">New Workflow Definition</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Name</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Code</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Entity Type</label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}>
              {["purchase_request","leave_request","complaint","expense","refund","maintenance","custom"].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none"
              rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Approval Steps</label>
              <button onClick={() => setSteps([...steps, { name: "", approverRole: "", escalationHours: 48 }])}
                className="text-xs text-primary hover:underline">+ Add Step</button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 mb-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold mt-2">{i + 1}</div>
                <div className="flex-1 space-y-2">
                  <input placeholder="Step name (e.g., Department Head Approval)"
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                    value={step.name} onChange={(e) => { const s = [...steps]; s[i].name = e.target.value; setSteps(s); }} />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Approver Role"
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                      value={step.approverRole} onChange={(e) => { const s = [...steps]; s[i].approverRole = e.target.value; setSteps(s); }} />
                    <input type="number" placeholder="Escalate after (hrs)"
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                      value={step.escalationHours} onChange={(e) => { const s = [...steps]; s[i].escalationHours = Number(e.target.value); setSteps(s); }} />
                  </div>
                </div>
                {steps.length > 1 && (
                  <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="mt-2 text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 bg-primary text-white rounded-lg py-2 text-sm disabled:opacity-50">
            {mutation.isPending ? "Creating..." : "Create Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StartInstanceDialog({ workflows, onClose }: { workflows: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ workflowId: workflows[0]?.id ?? "", entityType: "purchase_request", entityId: "", entityLabel: "", notes: "" });
  const mutation = useMutation({
    mutationFn: () => apiFetch("/workflows/instances/start", { method: "POST", body: JSON.stringify({ ...form, startedBy: "current-user" }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow-instances"] }); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Start Workflow Instance</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Workflow</label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              value={form.workflowId} onChange={(e) => setForm({ ...form, workflowId: e.target.value })}>
              {workflows.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {[{ k: "entityId", l: "Entity ID" }, { k: "entityLabel", l: "Entity Label" }, { k: "notes", l: "Notes" }].map(({ k, l }) => (
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
            {mutation.isPending ? "Starting..." : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [tab, setTab] = useState<"definitions" | "instances">("definitions");
  const [defDialog, setDefDialog] = useState(false);
  const [instDialog, setInstDialog] = useState(false);
  const qc = useQueryClient();

  const { data: workflows = [], isLoading: wfLoading } = useQuery<any[]>({ queryKey: ["workflows"], queryFn: () => apiFetch("/workflows") as Promise<any[]> });
  const { data: instances = [], isLoading: instLoading } = useQuery<any[]>({ queryKey: ["workflow-instances"], queryFn: () => apiFetch("/workflows/instances") as Promise<any[]> });
  const instPagination = usePagination(instances, 5);

  const advance = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/workflows/instances/${id}/advance`, { method: "PATCH", body: JSON.stringify({ action, approverName: "Admin User" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-instances"] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/workflows/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Engine</h1>
          <p className="text-text-muted text-sm mt-1">Configurable multi-step approval processes</p>
        </div>
        <button
          onClick={() => tab === "definitions" ? setDefDialog(true) : setInstDialog(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm">
          <Plus className="h-4 w-4" />
          {tab === "definitions" ? "New Workflow" : "Start Instance"}
        </button>
      </div>

      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {(["definitions", "instances"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? "bg-surface shadow text-primary" : "text-text-muted hover:text-text"}`}>
            {t} {t === "definitions" ? `(${workflows.length})` : `(${instances.length})`}
          </button>
        ))}
      </div>

      {tab === "definitions" && (
        <div className="space-y-4">
          {wfLoading ? <div className="text-center py-10 text-text-muted">Loading...</div>
            : workflows.length === 0 ? (
              <div className="text-center py-16 text-text-muted">
                <GitMerge className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No workflows yet</p>
                <p className="text-sm">Create your first approval workflow</p>
              </div>
            ) : workflows.map((wf: any) => (
              <div key={wf.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{wf.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${wf.isActive ? "bg-green-500/15 text-green-400" : "bg-muted text-text-muted"}`}>
                        {wf.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 font-mono">{wf.code} · {wf.entityType}</p>
                    {wf.description && <p className="text-sm text-text-muted mt-1">{wf.description}</p>}
                  </div>
                  <button onClick={() => toggleActive.mutate({ id: wf.id, isActive: !wf.isActive })}
                    className="text-xs border border-border px-3 py-1 rounded-lg hover:bg-muted">
                    {wf.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
                {wf.steps && wf.steps.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {wf.steps.map((step: any, i: number) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div className="bg-muted/50 border border-border rounded-lg px-3 py-1.5">
                          <p className="text-xs font-medium">{step.name}</p>
                          {step.approverRole && <p className="text-xs text-text-muted">{step.approverRole}</p>}
                        </div>
                        {i < wf.steps.length - 1 && <ArrowRight className="h-4 w-4 text-text-muted" />}
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
                        <p className="text-xs font-medium text-green-400">Approved</p>
                      </div>
                    </div>
                  </div>
                )}
                {(!wf.steps || wf.steps.length === 0) && (
                  <p className="text-xs text-text-muted italic">No steps configured</p>
                )}
              </div>
            ))}
        </div>
      )}

      {tab === "instances" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>{["Entity", "Workflow", "Step", "Status", "Started", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {instLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
              ) : instances.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No workflow instances yet.</td></tr>
              ) : instPagination.paginatedItems.map((inst: any) => (
                <tr key={inst.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{inst.entityLabel || inst.entityId}</p>
                    <p className="text-xs text-text-muted">{inst.entityType}</p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{inst.workflowId}</td>
                  <td className="px-4 py-3 text-text-muted">{inst.currentStep + 1} / {inst.totalSteps}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inst.status] ?? "bg-muted text-text-muted"}`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {inst.status === "in_progress" && (
                      <div className="flex gap-2">
                        <button onClick={() => advance.mutate({ id: inst.id, action: "approved" })}
                          className="p-1 hover:bg-green-500/10 rounded" title="Approve">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        </button>
                        <button onClick={() => advance.mutate({ id: inst.id, action: "rejected" })}
                          className="p-1 hover:bg-red-500/10 rounded" title="Reject">
                          <XCircle className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination {...instPagination} pageSize={5} />
        </div>
      )}

      {defDialog && <WorkflowDefDialog onClose={() => setDefDialog(false)} />}
      {instDialog && <StartInstanceDialog workflows={workflows} onClose={() => setInstDialog(false)} />}
    </div>
  );
}

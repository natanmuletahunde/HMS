"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { CreditCard, Check, Zap, Building2, Users, BedDouble, HardDrive } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";

const PLAN_ICONS: Record<string, string> = { trial: "🧪", basic: "⭐", professional: "🚀", enterprise: "🏢" };
const PLAN_COLORS: Record<string, string> = {
  trial: "border-amber-500/40",
  basic: "border-blue-500/40",
  professional: "border-purple-500/40 ring-1 ring-purple-500/20",
  enterprise: "border-primary/40",
};

function UsageMeter({ label, used, max, icon: Icon }: { label: string; used: number; max: number | null; icon: any }) {
  const pct = max ? Math.min((used / max) * 100, 100) : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-text-muted"><Icon className="h-3.5 w-3.5" />{label}</span>
        <span className="font-medium">{used} / {max ?? "∞"}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        {max && <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />}
        {!max && <div className="h-full bg-primary/30 rounded-full w-full" />}
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery<any[]>({ queryKey: ["subscription-plans"], queryFn: () => apiFetch("/subscriptions/plans") as Promise<any[]> });
  const { data: current } = useQuery<any>({ queryKey: ["subscription-current"], queryFn: () => apiFetch("/subscriptions/current") as Promise<any> });
  const { data: history = [] } = useQuery<any[]>({ queryKey: ["subscription-history"], queryFn: () => apiFetch("/subscriptions/history") as Promise<any[]> });
  const pagination = usePagination(history, 5);

  const activate = useMutation({
    mutationFn: (planCode: string) => apiFetch("/subscriptions/activate", {
      method: "POST",
      body: JSON.stringify({ tenantId: "default", planCode, billingCycle: "monthly" }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscription-current"] }); qc.invalidateQueries({ queryKey: ["subscription-history"] }); },
  });

  const usage = current?.usage;
  const activePlan = current?.plan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription & Licensing</h1>
        <p className="text-text-muted text-sm mt-1">Manage your plan, usage, and billing</p>
      </div>

      {/* Current Plan Card */}
      {activePlan && (
        <div className="bg-surface border border-primary/30 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{PLAN_ICONS[activePlan.code] ?? "📋"}</span>
                <h2 className="text-xl font-bold">{activePlan.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  current?.subscription?.status === "active" ? "bg-green-500/15 text-green-400" :
                  current?.subscription?.status === "trial" ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"
                }`}>{current?.subscription?.status}</span>
              </div>
              <p className="text-text-muted text-sm">{activePlan.description}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${parseFloat(activePlan.monthlyPrice ?? "0").toFixed(0)}</p>
              <p className="text-xs text-text-muted">per month</p>
            </div>
          </div>

          {usage && (
            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-4">
              <UsageMeter label="Hotels" used={usage.hotels} max={activePlan.maxHotels} icon={Building2} />
              <UsageMeter label="Users" used={usage.users} max={activePlan.maxUsers} icon={Users} />
              <UsageMeter label="Rooms" used={usage.rooms} max={activePlan.maxRooms} icon={BedDouble} />
              <UsageMeter label="Storage (GB)" used={0} max={activePlan.storageLimitGb} icon={HardDrive} />
            </div>
          )}
        </div>
      )}

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan: any) => (
            <div key={plan.id} className={`bg-surface border rounded-xl p-5 flex flex-col ${PLAN_COLORS[plan.code] ?? "border-border"}`}>
              <div className="text-2xl mb-2">{PLAN_ICONS[plan.code] ?? "📋"}</div>
              <h3 className="font-bold">{plan.name}</h3>
              <p className="text-text-muted text-xs mt-1 mb-3">{plan.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold">${parseFloat(plan.monthlyPrice ?? "0").toFixed(0)}</span>
                <span className="text-text-muted text-xs">/mo</span>
              </div>
              <ul className="space-y-1.5 mb-4 flex-1">
                {((plan.features as string[]) ?? []).map((f: string) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-text-muted">
                    <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-1 text-xs text-text-muted border-t border-border pt-3 mb-4">
                <span>Hotels: {plan.maxHotels ?? "∞"}</span>
                <span>Users: {plan.maxUsers ?? "∞"}</span>
                <span>Rooms: {plan.maxRooms ?? "∞"}</span>
                <span>Storage: {plan.storageLimitGb ?? "∞"}GB</span>
              </div>
              <button
                onClick={() => activate.mutate(plan.code)}
                disabled={activePlan?.id === plan.id || activate.isPending}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePlan?.id === plan.id
                    ? "bg-primary/20 text-primary cursor-default"
                    : "bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                }`}>
                {activePlan?.id === plan.id ? "Current Plan" : activate.isPending ? "Activating..." : "Select Plan"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Subscription History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>{["Plan","Status","Billing Cycle","Started","Expires"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagination.paginatedItems.map((h: any) => (
                <tr key={h.subscription?.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{h.plan?.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary">{h.subscription?.status}</span></td>
                  <td className="px-4 py-3 text-text-muted">{h.subscription?.billingCycle}</td>
                  <td className="px-4 py-3 text-text-muted">{h.subscription?.startsAt ? new Date(h.subscription.startsAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{h.subscription?.expiresAt ? new Date(h.subscription.expiresAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination {...pagination} pageSize={5} />
        </div>
      )}
    </div>
  );
}

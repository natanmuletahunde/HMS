"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ToggleLeft, ToggleRight, Settings, Package, ShoppingCart, UtensilsCrossed, Wrench, Sparkles, DollarSign, Building2, Car, Users2, MessageSquare, BarChart2, FolderOpen, CalendarCheck, BedDouble, Users, Shield } from "lucide-react";

const ICON_MAP: Record<string, any> = {
  CalendarCheck, BedDouble, Users, LayoutDashboard: Shield,
  Sparkles, Wrench, UtensilsCrossed, ShoppingCart,
  ConciergeBell: Package, Package, ShoppingBag: Package,
  DollarSign, Building2, Car, Users2, MessageSquare, BarChart2, FolderOpen,
};

const CATEGORY_COLORS: Record<string, string> = {
  core: "text-primary",
  operations: "text-blue-400",
  business: "text-purple-400",
  enterprise: "text-amber-400",
};

const CATEGORY_BG: Record<string, string> = {
  core: "bg-primary/10 border-primary/20",
  operations: "bg-blue-500/10 border-blue-500/20",
  business: "bg-purple-500/10 border-purple-500/20",
  enterprise: "bg-amber-500/10 border-amber-500/20",
};

export default function ModuleConfigPage() {
  const qc = useQueryClient();
  const { data: modules = [], isLoading } = useQuery<any[]>({
    queryKey: ["modules"],
    queryFn: () => apiFetch("/modules") as Promise<any[]>,
  });
  const { data: stats } = useQuery<any>({
    queryKey: ["modules-stats"],
    queryFn: () => apiFetch("/modules/stats") as Promise<any>,
  });

  const toggle = useMutation({
    mutationFn: ({ code, isEnabled }: { code: string; isEnabled: boolean }) =>
      apiFetch(`/modules/${code}`, { method: "PATCH", body: JSON.stringify({ isEnabled }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modules"] }); qc.invalidateQueries({ queryKey: ["modules-stats"] }); },
  });

  const categories = ["core", "operations", "business", "enterprise"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Module Management</h1>
        <p className="text-text-muted text-sm mt-1">Enable or disable feature modules for your property</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Modules", value: stats.total, color: "text-text" },
            { label: "Enabled", value: stats.enabled, color: "text-green-400" },
            { label: "Disabled", value: stats.disabled, color: "text-red-400" },
            { label: "Categories", value: stats.byCategory?.length ?? 4, color: "text-primary" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modules by category */}
      {categories.map((cat) => {
        const catModules = modules.filter((m: any) => m.category === cat);
        if (!catModules.length) return null;
        return (
          <div key={cat}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${CATEGORY_COLORS[cat]}`}>
              {cat} modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catModules.map((mod: any) => {
                const IconComp = ICON_MAP[mod.icon] ?? Package;
                return (
                  <div key={mod.moduleCode}
                    className={`bg-surface border rounded-xl p-4 transition-all ${mod.isEnabled ? "border-border" : "border-border opacity-60"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${CATEGORY_BG[cat] ?? "bg-muted border-border"}`}>
                          <IconComp className={`h-5 w-5 ${CATEGORY_COLORS[cat]}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{mod.moduleName}</h3>
                          <p className="text-xs text-text-muted font-mono">{mod.moduleCode}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => !mod.isCore && toggle.mutate({ code: mod.moduleCode, isEnabled: !mod.isEnabled })}
                        disabled={mod.isCore || toggle.isPending}
                        className={`relative ${mod.isCore ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                        title={mod.isCore ? "Core module — cannot be disabled" : mod.isEnabled ? "Click to disable" : "Click to enable"}>
                        {mod.isEnabled
                          ? <ToggleRight className="h-7 w-7 text-primary" />
                          : <ToggleLeft className="h-7 w-7 text-text-muted" />}
                      </button>
                    </div>
                    {mod.description && <p className="text-xs text-text-muted mt-2">{mod.description}</p>}
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${mod.isEnabled ? "bg-green-500/15 text-green-400" : "bg-muted text-text-muted"}`}>
                          {mod.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                        {mod.isCore && <span className="px-1.5 py-0.5 rounded text-xs bg-primary/15 text-primary">Core</span>}
                      </div>
                      <span className="text-xs text-text-muted">v{mod.version}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {isLoading && <div className="text-center py-10 text-text-muted">Loading modules...</div>}
    </div>
  );
}

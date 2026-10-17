"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, DollarSign, BedDouble, AlertCircle } from "lucide-react";

const CHART_STYLE = {
  contentStyle: { backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" },
  axisStyle: { stroke: "#8b8b9a", fontSize: 11 },
};

function KpiCard({ label, value, unit, change }: { label: string; value: number; unit: string; change?: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {unit === "USD" ? "$" : ""}{typeof value === "number" ? value.toLocaleString() : value}
        {unit === "%" ? "%" : unit === "USD" ? "" : ` ${unit}`}
      </p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}% vs prior period
        </div>
      )}
    </div>
  );
}

export default function BiPage() {
  const [tab, setTab] = useState<"kpis" | "revenue" | "occupancy" | "drilldown">("kpis");
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [forecastDays, setForecastDays] = useState(30);
  const [drillMetric, setDrillMetric] = useState<"occupancy" | "revenue">("occupancy");

  const { data: kpis } = useQuery<any>({
    queryKey: ["bi-kpis", period],
    queryFn: () => apiFetch(`/bi/kpis?period=${period}`) as Promise<any>,
  });

  const { data: occupancyForecast, isLoading: occLoading } = useQuery<any>({
    queryKey: ["bi-forecast-occ", forecastDays],
    queryFn: () => apiFetch(`/bi/forecast/occupancy?days=${forecastDays}`) as Promise<any>,
    enabled: tab === "occupancy",
  });

  const { data: revenueForecast, isLoading: revLoading } = useQuery<any>({
    queryKey: ["bi-forecast-rev", forecastDays],
    queryFn: () => apiFetch(`/bi/forecast/revenue?days=${forecastDays}`) as Promise<any>,
    enabled: tab === "revenue",
  });

  const { data: drillDown } = useQuery<any>({
    queryKey: ["bi-drill", drillMetric],
    queryFn: () => apiFetch(`/bi/drill-down/${drillMetric}?groupBy=branch`) as Promise<any>,
    enabled: tab === "drilldown",
  });

  const k = kpis?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Intelligence</h1>
          <p className="text-text-muted text-sm mt-1">Executive KPIs, forecasting, and drill-down analytics</p>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["day", "week", "month"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm capitalize ${period === p ? "bg-surface shadow text-primary" : "text-text-muted"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {[
          { id: "kpis", label: "KPIs" },
          { id: "revenue", label: "Revenue Forecast" },
          { id: "occupancy", label: "Occupancy Forecast" },
          { id: "drilldown", label: "Drill-Down" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-surface shadow text-primary" : "text-text-muted hover:text-text"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* KPIs Tab */}
      {tab === "kpis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {k && <>
              <KpiCard label="Occupancy Rate" value={k.occupancyRate.value} unit="%" />
              <KpiCard label="ADR" value={k.adr.value} unit="USD" />
              <KpiCard label="RevPAR" value={k.revpar.value} unit="USD" />
              <KpiCard label="Revenue" value={k.revenue.value} unit="USD" change={k.revenue.change} />
              <KpiCard label="Complaint Resolution" value={k.complaintResolution.value} unit="%" />
              <KpiCard label="Occupied Rooms" value={k.occupiedRooms.value} unit="rooms" />
            </>}
            {!k && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse">
                <div className="h-3 bg-muted rounded w-20 mb-3" />
                <div className="h-7 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-1">Period Summary</h3>
            <p className="text-sm text-text-muted">
              Showing KPIs for the last {period === "day" ? "24 hours" : period === "week" ? "7 days" : "30 days"}.
              ADR (Average Daily Rate) and RevPAR (Revenue per Available Room) are calculated from payment and room data.
            </p>
          </div>
        </div>
      )}

      {/* Revenue Forecast Tab */}
      {tab === "revenue" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-muted">Forecast horizon:</label>
            {[30, 60, 90].map(d => (
              <button key={d} onClick={() => setForecastDays(d)}
                className={`px-3 py-1 rounded text-sm ${forecastDays === d ? "bg-primary/20 text-primary" : "text-text-muted hover:bg-muted"}`}>
                {d} days
              </button>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Revenue Forecast — Next {forecastDays} Days</h3>
            {revLoading ? <div className="h-72 flex items-center justify-center text-text-muted">Calculating forecast...</div>
              : revenueForecast?.forecast?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueForecast.forecast}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00c5c8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00c5c8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" vertical={false} />
                    <XAxis dataKey="date" {...CHART_STYLE.axisStyle} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis {...CHART_STYLE.axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Predicted"]} />
                    <Area type="monotone" dataKey="predicted" stroke="#00c5c8" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-72 flex items-center justify-center text-text-muted">No historical data for forecasting</div>}
            {revenueForecast?.model && (
              <p className="text-xs text-text-muted mt-3">
                Linear regression model — slope: {revenueForecast.model.slope}, intercept: {revenueForecast.model.intercept}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Occupancy Forecast Tab */}
      {tab === "occupancy" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-muted">Forecast horizon:</label>
            {[30, 60, 90].map(d => (
              <button key={d} onClick={() => setForecastDays(d)}
                className={`px-3 py-1 rounded text-sm ${forecastDays === d ? "bg-primary/20 text-primary" : "text-text-muted hover:bg-muted"}`}>
                {d} days
              </button>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Occupancy Forecast — Next {forecastDays} Days</h3>
            {occLoading ? <div className="h-72 flex items-center justify-center text-text-muted">Calculating forecast...</div>
              : occupancyForecast?.forecast?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={occupancyForecast.forecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={v => `${v} bk`} />
                    <Tooltip contentStyle={CHART_STYLE.contentStyle} />
                    <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} dot={false} name="Predicted Bookings" />
                    <Line type="monotone" dataKey="confidence" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Confidence %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-72 flex items-center justify-center text-text-muted">No historical reservation data for forecasting</div>}
          </div>
        </div>
      )}

      {/* Drill-Down Tab */}
      {tab === "drilldown" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-muted">Metric:</label>
            <button onClick={() => setDrillMetric("occupancy")}
              className={`px-3 py-1 rounded text-sm ${drillMetric === "occupancy" ? "bg-primary/20 text-primary" : "text-text-muted hover:bg-muted"}`}>
              Occupancy
            </button>
            <button onClick={() => setDrillMetric("revenue")}
              className={`px-3 py-1 rounded text-sm ${drillMetric === "revenue" ? "bg-primary/20 text-primary" : "text-text-muted hover:bg-muted"}`}>
              Revenue
            </button>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">{drillMetric === "occupancy" ? "Occupancy" : "Revenue"} Breakdown</h3>
            {drillDown?.data?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={drillDown.data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }}
                    tickFormatter={drillMetric === "revenue" ? (v) => `$${v}` : undefined} />
                  <YAxis type="category" dataKey="group_name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={CHART_STYLE.contentStyle}
                    formatter={drillMetric === "revenue" ? (v: any) => [`$${Number(v).toFixed(2)}`, "Value"] : undefined} />
                  <Bar dataKey="value" fill="#00c5c8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-text-muted">No data available for this breakdown</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type AuditLog = {
  id: string;
  user?: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  status?: string;
  createdAt?: string;
};

type AuditStats = {
  todayEvents?: number;
  securityEvents?: number;
  failedLogins?: number;
};

const ACTION_BADGE: Record<string, string> = {
  login: "info",
  logout: "secondary",
  create: "success",
  update: "warning",
  delete: "danger",
  failed_login: "danger",
};

const PAGE_SIZE = 5;

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (actionFilter !== "all") params.set("action", actionFilter);
  if (resourceFilter) params.set("resource", resourceFilter);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", actionFilter, resourceFilter, startDate, endDate],
    queryFn: () => apiFetch<AuditLog[]>(`/audit-logs?${params}`),
  });

  const { data: stats } = useQuery<AuditStats>({
    queryKey: ["audit-logs-stats"],
    queryFn: () => apiFetch<AuditStats>("/audit-logs/stats"),
  });

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginated = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today's Events", value: stats?.todayEvents, color: "text-primary" },
          { label: "Security Events", value: stats?.securityEvents, color: "text-warning" },
          { label: "Failed Logins", value: stats?.failedLogins, color: "text-danger" },
        ].map((s) => (
          <Card key={s.label} className="bg-surface/50 border border-border rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-text-muted">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="grid gap-1">
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="failed_login">Failed Login</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Resource</Label>
          <Input placeholder="Filter by resource..." value={resourceFilter} onChange={(e) => { setResourceFilter(e.target.value); setPage(0); }} className="w-[180px]" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} className="w-[150px]" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} className="w-[150px]" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>{[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-text-muted">No logs found.</TableCell></TableRow>
            ) : paginated.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/30">
                <TableCell className="font-medium text-sm">{log.user ?? log.userId ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={(ACTION_BADGE[log.action] ?? "secondary") as any} className="text-[10px] capitalize">{log.action?.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-sm">{log.resource ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-text-muted">{log.resourceId ?? "—"}</TableCell>
                <TableCell className="text-xs text-text-muted">{log.ipAddress ?? "—"}</TableCell>
                <TableCell>
                  {log.status && (
                    <Badge variant={(log.status === "success" ? "success" : "danger") as any} className="text-[10px] capitalize">{log.status}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-text-muted whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={logs.length}
        pageSize={PAGE_SIZE}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
}

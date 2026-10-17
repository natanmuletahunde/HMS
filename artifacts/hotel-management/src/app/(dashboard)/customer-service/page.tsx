"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6'];

type CSDashboard = {
  total?: number;
  newCount?: number;
  inProgress?: number;
  resolved?: number;
  escalated?: number;
  satisfactionScore?: number;
  recentOpen?: Complaint[];
  categoryBreakdown?: Array<{ category: string; count: number }>;
};

type Complaint = {
  id: string;
  complaintNumber?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  category?: string;
  priority?: string;
  subject?: string;
  description?: string;
  status: string;
  assignedTo?: string;
  resolutionNotes?: string;
  escalationReason?: string;
  createdAt?: string;
  comments?: Comment[];
};

type Comment = {
  id: string;
  content?: string;
  isInternal?: boolean;
  authorName?: string;
  createdAt?: string;
};

type CSStats = {
  byCategory?: Array<{ category: string; count: number }>;
  byStatus?: Array<{ status: string; count: number }>;
  byPriority?: Array<{ priority: string; count: number }>;
};

const STATUS_BADGE: Record<string, string> = {
  new: "info",
  assigned: "warning",
  in_progress: "warning",
  resolved: "success",
  closed: "secondary",
  escalated: "danger",
  rejected: "danger",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "secondary",
};

type TabType = "dashboard" | "complaints" | "analytics";

export default function CustomerServicePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Dialogs
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [viewComplaint, setViewComplaint] = useState<Complaint | null>(null);
  const [assignComplaint, setAssignComplaint] = useState<Complaint | null>(null);
  const [resolveComplaint, setResolveComplaint] = useState<Complaint | null>(null);
  const [escalateComplaint, setEscalateComplaint] = useState<Complaint | null>(null);
  const [addCommentTo, setAddCommentTo] = useState<Complaint | null>(null);

  const [assignedTo, setAssignedTo] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  // Analytics dates
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(today.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(fmt(thirtyAgo));
  const [endDate, setEndDate] = useState(fmt(today));

  const { data: dashboard, isLoading: dashLoading } = useQuery<CSDashboard>({
    queryKey: ["cs-dashboard"],
    queryFn: () => apiFetch<CSDashboard>("/customer-service/dashboard"),
    enabled: tab === "dashboard",
  });

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (categoryFilter !== "all") params.set("category", categoryFilter);
  if (priorityFilter !== "all") params.set("priority", priorityFilter);
  if (searchFilter) params.set("search", searchFilter);

  const { data: complaints = [], isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["cs-complaints", statusFilter, categoryFilter, priorityFilter, searchFilter],
    queryFn: () => apiFetch<Complaint[]>(`/customer-service?${params}`),
    enabled: tab === "complaints",
  });

  const { data: stats } = useQuery<CSStats>({
    queryKey: ["cs-stats", startDate, endDate],
    queryFn: () => apiFetch<CSStats>(`/customer-service/stats?startDate=${startDate}&endDate=${endDate}`),
    enabled: tab === "analytics",
  });

  const { data: complaintDetail } = useQuery<Complaint>({
    queryKey: ["cs-complaint-detail", viewComplaint?.id],
    queryFn: () => apiFetch<Complaint>(`/customer-service/${viewComplaint!.id}`),
    enabled: !!viewComplaint?.id,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["cs-complaints"] });
    queryClient.invalidateQueries({ queryKey: ["cs-dashboard"] });
  }

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/customer-service", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsNewOpen(false); toast({ title: "Complaint created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/customer-service/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      setAssignComplaint(null);
      setResolveComplaint(null);
      setEscalateComplaint(null);
      toast({ title: "Complaint updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/customer-service/${id}/comments`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cs-complaint-detail", addCommentTo?.id] });
      queryClient.invalidateQueries({ queryKey: ["cs-complaint-detail", viewComplaint?.id] });
      setAddCommentTo(null);
      setCommentText("");
      toast({ title: "Comment added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const TABS: { key: TabType; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "complaints", label: "Complaints" },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Customer Service</h1>
        {tab === "complaints" && (
          <Button onClick={() => setIsNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Complaint
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total", value: dashboard?.total, color: "text-primary" },
              { label: "New", value: dashboard?.newCount, color: "text-info" },
              { label: "In Progress", value: dashboard?.inProgress, color: "text-warning" },
              { label: "Resolved", value: dashboard?.resolved, color: "text-success" },
              { label: "Escalated", value: dashboard?.escalated, color: "text-danger" },
              { label: "Satisfaction", value: dashboard?.satisfactionScore != null ? `${dashboard.satisfactionScore}%` : undefined, color: "text-primary" },
            ].map((s) => (
              <Card key={s.label} className="bg-surface/50 border border-border rounded-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-text-muted">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Open Complaints</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CMP#</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashLoading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>{[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : (dashboard?.recentOpen ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-16 text-center text-text-muted">No open complaints</TableCell></TableRow>
                  ) : (dashboard?.recentOpen ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.complaintNumber ?? c.id.slice(0, 8)}</TableCell>
                      <TableCell>{c.guestName ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.subject ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={(PRIORITY_BADGE[c.priority ?? ""] ?? "secondary") as any} className="text-[10px] capitalize">{c.priority ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(STATUS_BADGE[c.status] ?? "secondary") as any} className="text-[10px] capitalize">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(dashboard?.categoryBreakdown ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Category Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dashboard?.categoryBreakdown ?? []).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{c.category?.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right font-bold">{c.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* COMPLAINTS TAB */}
      {tab === "complaints" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Search..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-[200px]" />
          </div>

          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CMP#</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaintsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : complaints.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-text-muted">No complaints found.</TableCell></TableRow>
                ) : complaints.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{c.complaintNumber ?? c.id.slice(0, 8)}</TableCell>
                    <TableCell>{c.guestName ?? "—"}</TableCell>
                    <TableCell className="capitalize text-xs">{c.category?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(PRIORITY_BADGE[c.priority ?? ""] ?? "secondary") as any} className="text-[10px] capitalize">{c.priority ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{c.subject ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(STATUS_BADGE[c.status] ?? "secondary") as any} className="text-[10px] capitalize">{c.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.assignedTo ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewComplaint(c)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setAssignComplaint(c); setAssignedTo(c.assignedTo ?? ""); }}>Assign</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setResolveComplaint(c); setResolutionNotes(""); }}>Resolve</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEscalateComplaint(c); setEscalationReason(""); }}>Escalate</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setAddCommentTo(c); setCommentText(""); setIsInternal(false); }}>Add Comment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="grid gap-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-surface/50 border border-border rounded-lg p-6">
              <CardTitle className="text-sm mb-4">By Category</CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.byCategory ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                  <XAxis dataKey="category" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-surface/50 border border-border rounded-lg p-6">
              <CardTitle className="text-sm mb-4">By Status</CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats?.byStatus ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                    {(stats?.byStatus ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-surface/50 border border-border rounded-lg p-6">
              <CardTitle className="text-sm mb-4">By Priority</CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.byPriority ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" vertical={false} />
                  <XAxis dataKey="priority" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#141417", borderColor: "#1e1e24", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* New Complaint Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Complaint</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            createMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Guest Name *</Label>
                <Input name="guestName" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Guest Email</Label>
                <Input name="guestEmail" type="email" />
              </div>
              <div className="grid gap-1.5">
                <Label>Guest Phone</Label>
                <Input name="guestPhone" />
              </div>
              <div className="grid gap-1.5">
                <Label>Category *</Label>
                <select name="category" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select category</option>
                  <option value="room">Room</option>
                  <option value="service">Service</option>
                  <option value="food">Food</option>
                  <option value="billing">Billing</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Priority</Label>
                <select name="priority" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Subject *</Label>
                <Input name="subject" required />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Description *</Label>
                <textarea name="description" required rows={3} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Complaint
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewComplaint} onOpenChange={(o) => !o && setViewComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complaint Details</DialogTitle></DialogHeader>
          {viewComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-muted">Number:</span> <span className="font-mono">{viewComplaint.complaintNumber ?? viewComplaint.id.slice(0, 8)}</span></div>
                <div><span className="text-text-muted">Guest:</span> {viewComplaint.guestName}</div>
                <div><span className="text-text-muted">Category:</span> <span className="capitalize">{viewComplaint.category}</span></div>
                <div><span className="text-text-muted">Priority:</span> <Badge variant={(PRIORITY_BADGE[viewComplaint.priority ?? ""] ?? "secondary") as any} className="text-[10px] capitalize">{viewComplaint.priority}</Badge></div>
                <div><span className="text-text-muted">Status:</span> <Badge variant={(STATUS_BADGE[viewComplaint.status] ?? "secondary") as any} className="text-[10px] capitalize">{viewComplaint.status}</Badge></div>
                <div><span className="text-text-muted">Assigned To:</span> {viewComplaint.assignedTo ?? "—"}</div>
                <div className="col-span-2"><span className="text-text-muted">Subject:</span> {viewComplaint.subject}</div>
                <div className="col-span-2"><span className="text-text-muted">Description:</span> {viewComplaint.description}</div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Comments</h3>
                {(complaintDetail?.comments ?? viewComplaint.comments ?? []).length === 0 ? (
                  <p className="text-text-muted text-sm">No comments yet.</p>
                ) : (
                  (complaintDetail?.comments ?? viewComplaint.comments ?? []).map((c) => (
                    <div key={c.id} className={`rounded-md p-3 text-sm ${c.isInternal ? "bg-yellow-50/10 border border-yellow-500/20" : "bg-muted/30"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {c.isInternal && <Lock className="h-3 w-3 text-yellow-500" />}
                        <span className="font-medium text-xs">{c.authorName ?? "Staff"}</span>
                        <span className="text-text-muted text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</span>
                      </div>
                      <p>{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold text-sm">Add Comment</h3>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  placeholder="Write a comment..."
                  className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                    Internal Note
                  </label>
                  <Button size="sm" disabled={!commentText || addCommentMutation.isPending} onClick={() => {
                    if (!commentText) return;
                    addCommentMutation.mutate({ id: viewComplaint.id, body: { content: commentText, isInternal } });
                  }}>
                    {addCommentMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignComplaint} onOpenChange={(o) => !o && setAssignComplaint(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Assign To</Label>
              <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Staff name or ID" />
            </div>
            <Button className="w-full" disabled={patchMutation.isPending} onClick={() => {
              if (assignComplaint) patchMutation.mutate({ id: assignComplaint.id, body: { assignedTo, status: "assigned" } });
            }}>
              {patchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveComplaint} onOpenChange={(o) => !o && setResolveComplaint(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resolve Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Resolution Notes</Label>
              <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={3} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" placeholder="Describe the resolution..." />
            </div>
            <Button className="w-full" disabled={patchMutation.isPending} onClick={() => {
              if (resolveComplaint) patchMutation.mutate({ id: resolveComplaint.id, body: { resolutionNotes, status: "resolved" } });
            }}>
              {patchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Resolved
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={!!escalateComplaint} onOpenChange={(o) => !o && setEscalateComplaint(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Escalate Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Escalation Reason</Label>
              <textarea value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} rows={3} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" placeholder="Reason for escalation..." />
            </div>
            <Button className="w-full" disabled={patchMutation.isPending} onClick={() => {
              if (escalateComplaint) patchMutation.mutate({ id: escalateComplaint.id, body: { escalationReason, status: "escalated" } });
            }}>
              {patchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Escalate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog (from dropdown) */}
      <Dialog open={!!addCommentTo} onOpenChange={(o) => !o && setAddCommentTo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Comment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Comment</Label>
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" placeholder="Write a comment..." />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal Note
            </label>
            <Button className="w-full" disabled={addCommentMutation.isPending || !commentText} onClick={() => {
              if (addCommentTo) addCommentMutation.mutate({ id: addCommentTo.id, body: { content: commentText, isInternal } });
            }}>
              {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Comment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

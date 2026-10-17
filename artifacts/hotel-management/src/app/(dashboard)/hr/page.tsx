"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal } from "lucide-react";
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

type HRDashboard = {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  pendingApprovals: number;
  departmentBreakdown?: Array<{ department: string; count: number; manager?: string }>;
};

type Department = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  employeeCount?: number;
  manager?: string;
};

type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName?: string;
  date?: string;
  clockIn?: string;
  clockOut?: string;
  workedHours?: number;
  overtime?: number;
  status: string;
};

type LeaveRequest = {
  id: string;
  leaveNumber?: string;
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  status: string;
  reason?: string;
};

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  workedHours?: number;
  breakMinutes?: number;
  isNightShift?: boolean;
};

type ShiftAssignment = {
  id: string;
  employeeId: string;
  employeeName?: string;
  shiftId: string;
  shiftName?: string;
  assignedDate?: string;
};

type PerformanceReview = {
  id: string;
  employeeId: string;
  employeeName?: string;
  reviewPeriod?: string;
  reviewDate?: string;
  overallScore?: number;
  status: string;
  strengths?: string;
  improvements?: string;
  goals?: string;
};

type Employee = {
  id: string;
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  department?: string;
};

const LEAVE_STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const ATTENDANCE_STATUS_BADGE: Record<string, string> = {
  present: "success",
  absent: "danger",
  late: "warning",
  on_leave: "info",
};

type TabType = "dashboard" | "employees" | "attendance" | "leaves" | "shifts" | "departments" | "performance";

export default function HRPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("dashboard");

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [isClockInOpen, setIsClockInOpen] = useState(false);

  // Leaves
  const [leaveStatusTab, setLeaveStatusTab] = useState("all");
  const [isNewLeaveOpen, setIsNewLeaveOpen] = useState(false);
  const [rejectLeave, setRejectLeave] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Shifts
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [isAssignShiftOpen, setIsAssignShiftOpen] = useState(false);
  const [shiftAssignDate, setShiftAssignDate] = useState("");

  // Departments
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);

  // Performance
  const [isNewReviewOpen, setIsNewReviewOpen] = useState(false);

  // Queries
  const { data: dashboard, isLoading: dashLoading } = useQuery<HRDashboard>({
    queryKey: ["hr-dashboard"],
    queryFn: () => apiFetch<HRDashboard>("/hr/dashboard"),
    enabled: tab === "dashboard",
  });

  const { data: departments = [], isLoading: deptLoading } = useQuery<Department[]>({
    queryKey: ["hr-departments"],
    queryFn: () => apiFetch<Department[]>("/hr/departments"),
    enabled: tab === "departments" || tab === "dashboard",
  });

  const attendanceParams = new URLSearchParams();
  if (attendanceDate) attendanceParams.set("date", attendanceDate);
  if (attendanceSearch) attendanceParams.set("search", attendanceSearch);

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["hr-attendance", attendanceDate, attendanceSearch],
    queryFn: () => apiFetch<AttendanceRecord[]>(`/hr/attendance?${attendanceParams}`),
    enabled: tab === "attendance",
  });

  const leaveParams = new URLSearchParams();
  if (leaveStatusTab !== "all") leaveParams.set("status", leaveStatusTab);

  const { data: leaves = [], isLoading: leavesLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["hr-leaves", leaveStatusTab],
    queryFn: () => apiFetch<LeaveRequest[]>(`/hr/leaves?${leaveParams}`),
    enabled: tab === "leaves",
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["hr-shifts"],
    queryFn: () => apiFetch<Shift[]>("/hr/shifts"),
    enabled: tab === "shifts",
  });

  const shiftAssignParams = new URLSearchParams();
  if (shiftAssignDate) shiftAssignParams.set("date", shiftAssignDate);

  const { data: shiftAssignments = [], isLoading: saLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ["hr-shift-assignments", shiftAssignDate],
    queryFn: () => apiFetch<ShiftAssignment[]>(`/hr/shift-assignments?${shiftAssignParams}`),
    enabled: tab === "shifts",
  });

  const { data: performanceReviews = [], isLoading: prLoading } = useQuery<PerformanceReview[]>({
    queryKey: ["hr-performance"],
    queryFn: () => apiFetch<PerformanceReview[]>("/hr/performance-reviews"),
    enabled: tab === "performance",
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-list"],
    queryFn: () => apiFetch<Employee[]>("/employees"),
  });

  function getEmployeeName(e: Employee) {
    return e.name ?? (`${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || (e.employeeCode ?? e.id));
  }

  function invalidate(keys: string[]) {
    keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  }

  const addDeptMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/hr/departments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-departments"]); setIsAddDeptOpen(false); toast({ title: "Department added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clockInMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/hr/attendance/clock-in", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-attendance"]); setIsClockInOpen(false); toast({ title: "Clocked in" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clockOutMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/hr/attendance/${id}/clock-out`, { method: "PATCH", body: JSON.stringify({}) }),
    onSuccess: () => { invalidate(["hr-attendance"]); toast({ title: "Clocked out" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createLeaveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/hr/leaves", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-leaves", "hr-dashboard"]); setIsNewLeaveOpen(false); toast({ title: "Leave request created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const patchLeaveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/hr/leaves/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-leaves", "hr-dashboard"]); toast({ title: "Leave updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addShiftMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/hr/shifts", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-shifts"]); setIsAddShiftOpen(false); toast({ title: "Shift added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignShiftMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/hr/shift-assignments", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-shift-assignments"]); setIsAssignShiftOpen(false); toast({ title: "Shift assigned" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createReviewMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/hr/performance-reviews", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(["hr-performance"]); setIsNewReviewOpen(false); toast({ title: "Review created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const TABS: { key: TabType; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "employees", label: "Employees" },
    { key: "attendance", label: "Attendance" },
    { key: "leaves", label: "Leaves" },
    { key: "shifts", label: "Shifts" },
    { key: "departments", label: "Departments" },
    { key: "performance", label: "Performance" },
  ];

  const LEAVE_STATUS_TABS = ["all", "pending", "approved", "rejected"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">HR Management</h1>
        {tab === "attendance" && (
          <Button onClick={() => setIsClockInOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Clock In
          </Button>
        )}
        {tab === "leaves" && (
          <Button onClick={() => setIsNewLeaveOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Leave Request
          </Button>
        )}
        {tab === "departments" && (
          <Button onClick={() => setIsAddDeptOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </Button>
        )}
        {tab === "performance" && (
          <Button onClick={() => setIsNewReviewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Review
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Employees", value: dashboard?.totalEmployees, color: "text-primary" },
              { label: "Active", value: dashboard?.activeEmployees, color: "text-success" },
              { label: "On Leave", value: dashboard?.onLeave, color: "text-warning" },
              { label: "Pending Approvals", value: dashboard?.pendingApprovals, color: "text-danger" },
            ].map((s) => (
              <Card key={s.label} className="bg-surface/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Department Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.departmentBreakdown ?? departments.map(d => ({ department: d.name, count: d.employeeCount ?? 0, manager: d.manager }))).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.department}</TableCell>
                      <TableCell className="text-right">{d.count}</TableCell>
                      <TableCell className="text-text-muted">{d.manager ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EMPLOYEES TAB */}
      {tab === "employees" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-sm">View and manage all employees from the dedicated Employees section.</p>
            <Button variant="outline" onClick={() => window.location.href = "/employees"}>Go to Employees</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {departments.slice(0, 8).map((dept) => (
              <Card key={dept.id} className="bg-surface/50 border-border">
                <CardContent className="p-4 space-y-1">
                  <div className="font-semibold text-sm">{dept.name}</div>
                  {dept.code && <div className="text-xs text-text-muted">Code: {dept.code}</div>}
                  <div className="text-2xl font-bold text-primary">{dept.employeeCount ?? 0}</div>
                  <div className="text-xs text-text-muted">employees</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-[160px]" />
            <Input placeholder="Search employee..." value={attendanceSearch} onChange={(e) => setAttendanceSearch(e.target.value)} className="w-[200px]" />
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Worked Hrs</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : attendance.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-text-muted">No attendance records found.</TableCell></TableRow>
                ) : attendance.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{rec.employeeName ?? rec.employeeId}</TableCell>
                    <TableCell className="text-xs text-text-muted">{rec.date ? new Date(rec.date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-xs">{rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell className="text-xs">{rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell className="text-right">{rec.workedHours != null ? `${Number(rec.workedHours).toFixed(1)}h` : "—"}</TableCell>
                    <TableCell className="text-right">{rec.overtime != null ? `${Number(rec.overtime).toFixed(1)}h` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(ATTENDANCE_STATUS_BADGE[rec.status] ?? "muted") as any} className="text-[10px] capitalize">
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!rec.clockOut && rec.clockIn && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => clockOutMutation.mutate(rec.id)}>
                          Clock Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* LEAVES TAB */}
      {tab === "leaves" && (
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto">
            {LEAVE_STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setLeaveStatusTab(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                  leaveStatusTab === s ? "bg-primary text-primary-foreground" : "bg-muted text-text-muted hover:bg-muted/70"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leavesLoading ? (
                  [...Array(4)].map((_, i) => (
                    <TableRow key={i}>{[...Array(8)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : leaves.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-text-muted">No leave requests found.</TableCell></TableRow>
                ) : leaves.map((leave) => (
                  <TableRow key={leave.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{leave.leaveNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{leave.employeeName ?? leave.employeeId}</TableCell>
                    <TableCell className="capitalize">{leave.leaveType?.replace(/_/g, " ") ?? "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">{leave.startDate ? new Date(leave.startDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-xs text-text-muted">{leave.endDate ? new Date(leave.endDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">{leave.days ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(LEAVE_STATUS_BADGE[leave.status] ?? "muted") as any} className="text-[10px] capitalize">
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.status === "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => patchLeaveMutation.mutate({ id: leave.id, body: { status: "approved" } })}>Approve</DropdownMenuItem>
                            <DropdownMenuItem className="text-danger" onClick={() => { setRejectLeave({ id: leave.id }); setRejectReason(""); }}>Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SHIFTS TAB */}
      {tab === "shifts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Shift Definitions</h2>
            <Button size="sm" onClick={() => setIsAddShiftOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Add Shift
            </Button>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead className="text-right">Worked Hrs</TableHead>
                  <TableHead className="text-right">Break (min)</TableHead>
                  <TableHead>Night Shift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>{[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : shifts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-text-muted">No shifts defined.</TableCell></TableRow>
                ) : shifts.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.startTime}</TableCell>
                    <TableCell>{s.endTime}</TableCell>
                    <TableCell className="text-right">{s.workedHours != null ? `${s.workedHours}h` : "—"}</TableCell>
                    <TableCell className="text-right">{s.breakMinutes ?? "—"}</TableCell>
                    <TableCell>
                      {s.isNightShift ? <Badge variant={"info" as any} className="text-[10px]">Night</Badge> : <span className="text-text-muted text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">Shift Assignments</h2>
              <Input type="date" value={shiftAssignDate} onChange={(e) => setShiftAssignDate(e.target.value)} className="w-[160px]" />
            </div>
            <Button size="sm" onClick={() => setIsAssignShiftOpen(true)}>
              <Plus className="mr-1 h-3 w-3" /> Assign Shift
            </Button>
          </div>
          <div className="rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>{[...Array(3)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : shiftAssignments.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-16 text-center text-text-muted">No assignments found.</TableCell></TableRow>
                ) : shiftAssignments.map((sa) => (
                  <TableRow key={sa.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{sa.employeeName ?? sa.employeeId}</TableCell>
                    <TableCell>{sa.shiftName ?? sa.shiftId}</TableCell>
                    <TableCell className="text-xs text-text-muted">{sa.assignedDate ? new Date(sa.assignedDate).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* DEPARTMENTS TAB */}
      {tab === "departments" && (
        <div className="space-y-4">
          {deptLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
            </div>
          ) : departments.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted">No departments found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {departments.map((dept) => (
                <Card key={dept.id} className="bg-surface/50 border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="font-semibold">{dept.name}</div>
                    {dept.code && <div className="text-xs text-text-muted">Code: {dept.code}</div>}
                    <div className="text-2xl font-bold text-primary">{dept.employeeCount ?? 0}</div>
                    <div className="text-xs text-text-muted">employees</div>
                    {dept.manager && <div className="text-xs text-text-muted">Manager: {dept.manager}</div>}
                    {dept.description && <div className="text-xs text-text-muted">{dept.description}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {tab === "performance" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Review Date</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>{[...Array(5)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : performanceReviews.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-text-muted">No reviews found.</TableCell></TableRow>
              ) : performanceReviews.map((rev) => (
                <TableRow key={rev.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{rev.employeeName ?? rev.employeeId}</TableCell>
                  <TableCell>{rev.reviewPeriod ?? "—"}</TableCell>
                  <TableCell className="text-xs text-text-muted">{rev.reviewDate ? new Date(rev.reviewDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    {rev.overallScore != null ? <span className="font-bold">{rev.overallScore}/5</span> : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(rev.status === "completed" ? "success" : rev.status === "in_progress" ? "warning" : "muted") as any} className="text-[10px] capitalize">
                      {rev.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Clock In Dialog */}
      <Dialog open={isClockInOpen} onOpenChange={setIsClockInOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Clock In</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            clockInMutation.mutate(body);
          }}>
            <div className="grid gap-1.5">
              <Label>Employee *</Label>
              <select name="employeeId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{getEmployeeName(e)}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Input name="notes" placeholder="Optional notes" />
            </div>
            <Button type="submit" className="w-full" disabled={clockInMutation.isPending}>
              {clockInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clock In
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Leave Request Dialog */}
      <Dialog open={isNewLeaveOpen} onOpenChange={setIsNewLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            createLeaveMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Employee *</Label>
                <select name="employeeId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{getEmployeeName(e)}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Leave Type *</Label>
                <select name="leaveType" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Start Date *</Label>
                <Input name="startDate" type="date" required />
              </div>
              <div className="grid gap-1.5">
                <Label>End Date *</Label>
                <Input name="endDate" type="date" required />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Reason</Label>
                <textarea name="reason" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createLeaveMutation.isPending}>
              {createLeaveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Leave Dialog */}
      <Dialog open={!!rejectLeave} onOpenChange={(o) => !o && setRejectLeave(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectLeave(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => {
                if (!rejectLeave) return;
                patchLeaveMutation.mutate({ id: rejectLeave.id, body: { status: "rejected", rejectionReason: rejectReason } });
                setRejectLeave(null);
              }}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Shift Dialog */}
      <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => {
              if (k === "isNightShift") body[k] = true;
              else if (v !== "") body[k] = v;
            });
            if (!fd.has("isNightShift")) body["isNightShift"] = false;
            if (body.breakMinutes) body.breakMinutes = Number(body.breakMinutes);
            addShiftMutation.mutate(body);
          }}>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Shift Name *</Label>
                <Input name="name" required placeholder="e.g. Morning Shift" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Start Time *</Label>
                  <Input name="startTime" type="time" required />
                </div>
                <div className="grid gap-1.5">
                  <Label>End Time *</Label>
                  <Input name="endTime" type="time" required />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Break (minutes)</Label>
                <Input name="breakMinutes" type="number" min="0" defaultValue="30" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isNightShift" name="isNightShift" className="h-4 w-4" />
                <label htmlFor="isNightShift" className="text-sm">Night Shift</label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addShiftMutation.isPending}>
              {addShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Shift
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={isAssignShiftOpen} onOpenChange={setIsAssignShiftOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Shift</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            assignShiftMutation.mutate(body);
          }}>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Employee *</Label>
                <select name="employeeId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{getEmployeeName(e)}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Shift *</Label>
                <select name="shiftId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select shift</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Assigned Date *</Label>
                <Input name="assignedDate" type="date" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={assignShiftMutation.isPending}>
              {assignShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Shift
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            addDeptMutation.mutate(body);
          }}>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name *</Label>
                <Input name="name" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Code</Label>
                <Input name="code" placeholder="e.g. FD, HK, RD" />
              </div>
              <div className="grid gap-1.5">
                <Label>Description</Label>
                <textarea name="description" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addDeptMutation.isPending}>
              {addDeptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Department
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Performance Review Dialog */}
      <Dialog open={isNewReviewOpen} onOpenChange={setIsNewReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Performance Review</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {};
            fd.forEach((v, k) => { if (v !== "") body[k] = v; });
            if (body.overallScore) body.overallScore = Number(body.overallScore);
            createReviewMutation.mutate(body);
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>Employee *</Label>
                <select name="employeeId" required className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{getEmployeeName(e)}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Review Period</Label>
                <Input name="reviewPeriod" placeholder="e.g. Q1 2024" />
              </div>
              <div className="grid gap-1.5">
                <Label>Review Date *</Label>
                <Input name="reviewDate" type="date" required />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Strengths</Label>
                <textarea name="strengths" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Areas for Improvement</Label>
                <textarea name="improvements" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Goals</Label>
                <textarea name="goals" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createReviewMutation.isPending}>
              {createReviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Review
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

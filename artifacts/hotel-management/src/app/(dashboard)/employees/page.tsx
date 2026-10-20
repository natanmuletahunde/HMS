"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, MoreHorizontal } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type Employee = {
  id: string;
  employeeCode?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  nationalId?: string;
  department?: string;
  departmentId?: string;
  position?: string;
  employmentType?: string;
  salary?: number;
  salaryGrade?: string;
  hiredAt?: string;
  status?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
};

type EmployeeStats = {
  total: number;
  active: number;
  onLeave: number;
  byDepartment?: Array<{ department: string; count: number }>;
};

const EMP_STATUS_BADGE: Record<string, string> = {
  active: "success",
  on_leave: "warning",
  terminated: "danger",
  inactive: "muted",
};

const DEPARTMENTS = [
  "Front Desk", "Housekeeping", "Restaurant", "Kitchen", "Bar",
  "Maintenance", "Security", "Finance", "HR", "IT", "Management",
  "Transport", "Concierge", "Spa", "Pool", "Procurement"
];

export default function EmployeesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [empTypeFilter, setEmpTypeFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<EmployeeStats>({
    queryKey: ["employee-stats"],
    queryFn: () => apiFetch<EmployeeStats>("/employees/stats"),
  });

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (deptFilter !== "all") params.set("department", deptFilter);
  if (empTypeFilter !== "all") params.set("employmentType", empTypeFilter);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees", search, deptFilter, empTypeFilter],
    queryFn: () => apiFetch<Employee[]>(`/employees?${params}`),
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedEmployees,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(employees, 5);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deptFilter, empTypeFilter, setCurrentPage]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["employee-stats"] });
  }

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/employees", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setIsAddOpen(false); toast({ title: "Employee added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); setEditEmployee(null); toast({ title: "Employee updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/employees/${id}`, { method: "PATCH", body: JSON.stringify({ status: "inactive" }) }),
    onSuccess: () => { invalidate(); toast({ title: "Employee deactivated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function getFullName(e: Employee) {
    if (e.name) return e.name;
    return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ") || "—";
  }

  function parseFormData(form: HTMLFormElement) {
    const fd = new FormData(form);
    const body: Record<string, unknown> = {};
    fd.forEach((v, k) => { if (v !== "") body[k] = v; });
    if (body.salary) body.salary = Number(body.salary);
    return body;
  }

  const EmployeeForm = ({ defaultValues, onSubmit, isPending }: {
    defaultValues?: Employee;
    onSubmit: (body: Record<string, unknown>) => void;
    isPending: boolean;
  }) => (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(parseFormData(e.currentTarget)); }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>First Name *</Label>
          <Input name="firstName" required defaultValue={defaultValues?.firstName ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Middle Name</Label>
          <Input name="middleName" defaultValue={defaultValues?.middleName ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Last Name *</Label>
          <Input name="lastName" required defaultValue={defaultValues?.lastName ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Email *</Label>
          <Input name="email" type="email" required defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={defaultValues?.phone ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Gender</Label>
          <select name="gender" defaultValue={defaultValues?.gender ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Date of Birth</Label>
          <Input name="dateOfBirth" type="date" defaultValue={defaultValues?.dateOfBirth ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>National ID</Label>
          <Input name="nationalId" defaultValue={defaultValues?.nationalId ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Department *</Label>
          <select name="department" required defaultValue={defaultValues?.department ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Select department</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Position *</Label>
          <Input name="position" required defaultValue={defaultValues?.position ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Employment Type *</Label>
          <select name="employmentType" required defaultValue={defaultValues?.employmentType ?? "full_time"} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Salary</Label>
          <Input name="salary" type="number" step="0.01" min="0" defaultValue={defaultValues?.salary ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Salary Grade</Label>
          <Input name="salaryGrade" defaultValue={defaultValues?.salaryGrade ?? ""} placeholder="e.g. G1, G2" />
        </div>
        <div className="grid gap-1.5">
          <Label>Hire Date</Label>
          <Input name="hiredAt" type="date" defaultValue={defaultValues?.hiredAt ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Emergency Contact Name</Label>
          <Input name="emergencyContactName" defaultValue={defaultValues?.emergencyContactName ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Emergency Contact Phone</Label>
          <Input name="emergencyContactPhone" defaultValue={defaultValues?.emergencyContactPhone ?? ""} />
        </div>
        <div className="grid gap-1.5 col-span-2">
          <Label>Address</Label>
          <Input name="address" defaultValue={defaultValues?.address ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>City</Label>
          <Input name="city" defaultValue={defaultValues?.city ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label>Country</Label>
          <Input name="country" defaultValue={defaultValues?.country ?? ""} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {defaultValues ? "Save Changes" : "Add Employee"}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats?.total, color: "text-primary" },
          { label: "Active", value: stats?.active, color: "text-success" },
          { label: "On Leave", value: stats?.onLeave, color: "text-warning" },
          { label: "Departments", value: stats?.byDepartment?.length, color: "text-info" },
        ].map((s) => (
          <Card key={s.label} className="bg-surface/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[220px]"
        />
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={empTypeFilter} onValueChange={setEmpTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Employment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full_time">Full Time</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="intern">Intern</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Hire Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-text-muted">No employees found.</TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{emp.employeeCode ?? "—"}</TableCell>
                  <TableCell className="font-medium">{getFullName(emp)}</TableCell>
                  <TableCell>{emp.department ?? "—"}</TableCell>
                  <TableCell>{emp.position ?? "—"}</TableCell>
                  <TableCell className="capitalize text-xs">{emp.employmentType?.replace(/_/g, " ") ?? "—"}</TableCell>
                  <TableCell>{emp.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {emp.hiredAt ? new Date(emp.hiredAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(EMP_STATUS_BADGE[emp.status ?? ""] ?? "muted") as any} className="text-[10px] uppercase">
                      {(emp.status ?? "—").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditEmployee(emp)}>Edit</DropdownMenuItem>
                        {emp.status !== "inactive" && (
                          <DropdownMenuItem className="text-danger" onClick={() => deactivateMutation.mutate(emp.id)}>Deactivate</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <EmployeeForm onSubmit={(body) => addMutation.mutate(body)} isPending={addMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(o) => !o && setEditEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          {editEmployee && (
            <EmployeeForm
              defaultValues={editEmployee}
              onSubmit={(body) => editMutation.mutate({ id: editEmployee.id, body })}
              isPending={editMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

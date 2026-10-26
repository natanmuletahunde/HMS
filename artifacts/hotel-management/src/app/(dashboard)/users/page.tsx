"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, MoreHorizontal, Loader2, UserPlus, Building2, Check, Shield, Edit2, 
  Users as UsersIcon, ShieldCheck, Globe, Trash2, Edit 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination 
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AssignedBranch = {
  id: string;
  branchName: string;
  branchCode: string;
  isPrimary?: boolean;
};

type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string | null;
  roleId?: string;
  role?: string;
  roleName?: string | null;
  roleScope?: string | null;
  primaryBranchId?: string | null;
  branches?: AssignedBranch[];
  isActive: boolean;
  isOnDuty?: boolean;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
  scope?: string;
  permissions?: string[];
  permissionsCount?: number;
  isActive: boolean;
};

type Branch = {
  id: string;
  branchName: string;
  branchCode: string;
  isActive?: boolean;
};

const AVAILABLE_PERMISSIONS = [
  { id: "*", label: "Full System Access (*)", desc: "Unrestricted access across all modules" },
  { id: "hotel:*", label: "Hotel & Branches (hotel:*)", desc: "Profile, settings, buildings, and floors" },
  { id: "rooms:*", label: "Rooms & Pricing (rooms:*)", desc: "Room catalog, categories, and rate plans" },
  { id: "reservations:*", label: "Reservations (reservations:*)", desc: "Bookings, calendars, and guest stays" },
  { id: "guests:*", label: "Guest Profiles (guests:*)", desc: "Guest records and history" },
  { id: "front-office:*", label: "Front Office (front-office:*)", desc: "Check-in, check-out, and room allocation" },
  { id: "housekeeping:*", label: "Housekeeping (housekeeping:*)", desc: "Cleaning assignments and room inspections" },
  { id: "maintenance:*", label: "Maintenance (maintenance:*)", desc: "Repair tickets and equipment orders" },
  { id: "restaurant:*", label: "Restaurant & Dining (restaurant:*)", desc: "Table layout, menu, and kitchen orders" },
  { id: "pos:*", label: "POS Orders (pos:*)", desc: "Point of sale cashiers and orders" },
  { id: "room-service:*", label: "Room Service (room-service:*)", desc: "In-room food and amenities delivery" },
  { id: "inventory:*", label: "Inventory (inventory:*)", desc: "Stock management, intake, and movements" },
  { id: "procurement:*", label: "Procurement (procurement:*)", desc: "Suppliers, POs, and goods receipt" },
  { id: "financial:*", label: "Financial Management (financial:*)", desc: "Cash shifts, registers, and transactions" },
  { id: "invoices:*", label: "Invoices & Folios (invoices:*)", desc: "Guest folios and billing statements" },
  { id: "payments:*", label: "Payments (payments:*)", desc: "Payment records and settlements" },
  { id: "conference:*", label: "Conference & Events (conference:*)", desc: "Hall bookings and event equipment" },
  { id: "transport:*", label: "Transport & Fleet (transport:*)", desc: "Vehicle dispatch, drivers, and trips" },
  { id: "hr:*", label: "HR & Attendance (hr:*)", desc: "Departments, shifts, and clock-in records" },
  { id: "employees:*", label: "Employees (employees:*)", desc: "Staff directory and records" },
  { id: "customer-service:*", label: "Customer Service (customer-service:*)", desc: "Complaints and guest feedback" },
  { id: "documents:*", label: "Documents (documents:*)", desc: "Document attachments and repository" },
  { id: "reports:*", label: "Reports (reports:*)", desc: "Occupancy, revenue, and departmental reports" },
  { id: "bi:*", label: "Business Intelligence (bi:*)", desc: "Analytics, forecasting, and KPIs" },
  { id: "users:*", label: "User Management (users:*)", desc: "Staff accounts and password resets" },
  { id: "roles:*", label: "Roles & Security (roles:*)", desc: "Role creation and permission matrix" },
];

function UsersAndRolesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"users" | "roles">(tabParam === "roles" ? "roles" : "users");

  useEffect(() => {
    if (tabParam === "roles" && activeTab !== "roles") setActiveTab("roles");
    if (tabParam !== "roles" && activeTab !== "users" && !tabParam) setActiveTab("users");
  }, [tabParam, activeTab]);

  const handleTabChange = (newTab: "users" | "roles") => {
    setActiveTab(newTab);
    const url = newTab === "roles" ? "/users?tab=roles" : "/users";
    router.replace(url, { scroll: false });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // USERS STATE & LOGIC
  // ─────────────────────────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userErrorMsg, setUserErrorMsg] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState("");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editPrimaryBranchId, setEditPrimaryBranchId] = useState("");
  const [editUserErrorMsg, setEditUserErrorMsg] = useState("");

  const { data: rawUsers, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<any>("/users"),
  });
  const users: User[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data ?? []);

  const { data: rawRoles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<any>("/roles"),
  });
  const roles: Role[] = Array.isArray(rawRoles) ? rawRoles : (rawRoles?.data ?? []);

  const { data: rawBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<any>("/branches"),
  });
  const branches: Branch[] = Array.isArray(rawBranches) ? rawBranches : (rawBranches?.data ?? []);

  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch("/users", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeAddUserDialog();
    },
    onError: (err: any) => {
      setUserErrorMsg(err.message || "Failed to create user");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    },
    onError: (err: any) => {
      setEditUserErrorMsg(err.message || "Failed to update user");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, isOnDuty }: { id: string; isActive?: boolean; isOnDuty?: boolean }) => {
      const body: any = {};
      if (isActive !== undefined) body.isActive = isActive;
      if (isOnDuty !== undefined) body.isOnDuty = isOnDuty;
      return apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const openAddUserDialog = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRoleId(roles[0]?.id || "");
    const allBranchIds = branches.map((b) => b.id);
    const firstBranch = branches[0]?.id || "";
    setSelectedBranchIds(allBranchIds.length > 0 ? [firstBranch] : []);
    setPrimaryBranchId(firstBranch);
    setUserErrorMsg("");
    setIsAddUserOpen(true);
  };

  const closeAddUserDialog = () => {
    setIsAddUserOpen(false);
    setUserErrorMsg("");
  };

  const openEditUserDialog = (u: User) => {
    setEditingUser(u);
    setEditFirstName(u.firstName || "");
    setEditLastName(u.lastName || "");
    setEditPhone(u.phone || "");
    setEditRoleId(u.roleId || "");
    const existingIds = (u.branches || []).map((b) => b.id);
    const initialBranches = existingIds.length > 0 ? existingIds : branches.map((b) => b.id);
    setEditBranchIds(initialBranches);
    setEditPrimaryBranchId(u.primaryBranchId || initialBranches[0] || branches[0]?.id || "");
    setEditUserErrorMsg("");
  };

  const handleBranchToggle = (branchId: string, isEdit = false) => {
    if (isEdit) {
      setEditBranchIds((prev) => {
        const next = prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId];
        if (!next.includes(editPrimaryBranchId)) {
          setEditPrimaryBranchId(next[0] || "");
        }
        return next;
      });
    } else {
      setSelectedBranchIds((prev) => {
        const next = prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId];
        if (!next.includes(primaryBranchId)) {
          setPrimaryBranchId(next[0] || "");
        }
        return next;
      });
    }
  };

  const handleSelectAllBranches = (isEdit = false) => {
    const allIds = branches.map((b) => b.id);
    if (isEdit) {
      if (editBranchIds.length === allIds.length) {
        setEditBranchIds(branches[0] ? [branches[0].id] : []);
        setEditPrimaryBranchId(branches[0]?.id || "");
      } else {
        setEditBranchIds(allIds);
        if (!editPrimaryBranchId) setEditPrimaryBranchId(allIds[0]);
      }
    } else {
      if (selectedBranchIds.length === allIds.length) {
        setSelectedBranchIds(branches[0] ? [branches[0].id] : []);
        setPrimaryBranchId(branches[0]?.id || "");
      } else {
        setSelectedBranchIds(allIds);
        if (!primaryBranchId) setPrimaryBranchId(allIds[0]);
      }
    }
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !roleId) {
      setUserErrorMsg("Please fill in all required fields.");
      return;
    }

    if (selectedBranchIds.length === 0) {
      setUserErrorMsg("Please select at least one assigned branch.");
      return;
    }

    createUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      password,
      roleId,
      branchIds: selectedBranchIds,
      primaryBranchId: primaryBranchId || selectedBranchIds[0] || null,
    });
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editBranchIds.length === 0) {
      setEditUserErrorMsg("Please select at least one assigned branch.");
      return;
    }

    updateUserMutation.mutate({
      id: editingUser.id,
      payload: {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || null,
        roleId: editRoleId,
        branchIds: editBranchIds,
        primaryBranchId: editPrimaryBranchId || editBranchIds[0] || null,
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    const displayName = u.name ?? fullName;
    const matchesSearch =
      displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (branchFilter === "all") return true;

    const isGlobal = u.roleName === "Admin" || u.roleScope === "global";
    if (isGlobal) return true;
    return (u.branches || []).some((b) => b.id === branchFilter);
  });

  const {
    currentPage: userPage,
    totalPages: userTotalPages,
    totalItems: userTotalItems,
    paginatedItems: paginatedUsers,
    onPrev: onUserPrev,
    onNext: onUserNext,
    setCurrentPage: setUserPage,
  } = usePagination(filteredUsers, 8);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, branchFilter, setUserPage]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLES STATE & LOGIC
  // ─────────────────────────────────────────────────────────────────────────────
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleScope, setRoleScope] = useState("branch");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleErrorMsg, setRoleErrorMsg] = useState("");

  const {
    currentPage: rolePage,
    totalPages: roleTotalPages,
    totalItems: roleTotalItems,
    paginatedItems: paginatedRoles,
    onPrev: onRolePrev,
    onNext: onRoleNext,
  } = usePagination(roles, 8);

  const saveRoleMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingRole) {
        return apiFetch(`/roles/${editingRole.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      return apiFetch("/roles", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      closeRoleDialog();
    },
    onError: (err: any) => {
      setRoleErrorMsg(err.message || "Failed to save role");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/roles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const openCreateRoleDialog = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setRoleScope("branch");
    setSelectedPermissions(["hotel:*", "rooms:*", "reservations:*", "guests:*"]);
    setRoleErrorMsg("");
    setIsRoleModalOpen(true);
  };

  const openEditRoleDialog = (r: Role) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDesc(r.description || "");
    setRoleScope(r.scope || "branch");
    setSelectedPermissions(r.permissions || []);
    setRoleErrorMsg("");
    setIsRoleModalOpen(true);
  };

  const closeRoleDialog = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
    setRoleErrorMsg("");
  };

  const togglePermission = (permId: string) => {
    if (permId === "*") {
      setSelectedPermissions((prev) => (prev.includes("*") ? [] : ["*"]));
      return;
    }
    setSelectedPermissions((prev) => {
      const filtered = prev.filter((p) => p !== "*");
      if (filtered.includes(permId)) {
        return filtered.filter((p) => p !== permId);
      }
      return [...filtered, permId];
    });
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setRoleErrorMsg("Role name is required");
      return;
    }
    saveRoleMutation.mutate({
      name: roleName.trim(),
      description: roleDesc.trim(),
      scope: roleScope,
      permissions: selectedPermissions,
    });
  };

  const selectedRoleObj = roles.find((r) => r.id === roleId);
  const isCreateGlobalRole = selectedRoleObj?.name === "Admin" || selectedRoleObj?.scope === "global";

  const editRoleObj = roles.find((r) => r.id === editRoleId);
  const isEditGlobalRole = editRoleObj?.name === "Admin" || editRoleObj?.scope === "global";

  return (
    <div className="space-y-5">
      {/* Unified Top Header & Tab Navigation — Strictly NO subtitles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">User & Role MS</h1>
          
          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[var(--blue-50)]/60 border border-[var(--border)] rounded-lg">
            <button
              type="button"
              onClick={() => handleTabChange("users")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                activeTab === "users"
                  ? "bg-[var(--surface)] text-[var(--blue-700)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Staff Accounts</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--blue-100)] text-[var(--blue-800)]">
                {users.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("roles")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                activeTab === "roles"
                  ? "bg-[var(--surface)] text-[var(--blue-700)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Roles & Permissions</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--blue-100)] text-[var(--blue-800)]">
                {roles.length}
              </span>
            </button>
          </div>
        </div>

        {/* Action Controls for Active Tab */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "users" ? (
            <>
              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>

              <Input 
                placeholder="Search staff..." 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-[180px] h-9 text-xs rounded-lg"
              />
              <Button onClick={openAddUserDialog} className="h-9 text-xs font-semibold rounded-lg">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add User
              </Button>
            </>
          ) : (
            <Button onClick={openCreateRoleDialog} className="h-9 text-xs font-semibold rounded-lg">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Role
            </Button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: STAFF ACCOUNTS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border)] bg-[var(--blue-50)]/40 hover:bg-[var(--blue-50)]/40">
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Staff Member</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Role & Scope</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Assigned Branch(es)</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Duty Status</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Account</TableHead>
                <TableHead className="w-[80px] text-right font-semibold text-xs text-[var(--text-primary)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isUsersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--text-secondary)]" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-[var(--text-secondary)]">
                    No staff accounts found. Click "Add User" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => {
                  const displayName = user.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
                  const displayRole = user.roleName || user.role || "Staff";
                  const isGlobal = user.roleName === "Admin" || user.roleScope === "global";
                  const isOnDuty = user.isOnDuty !== false;
                  const userBranches = user.branches || [];
                  const primaryBranch = userBranches.find((b) => b.isPrimary) || userBranches[0];
                  const extraBranchCount = Math.max(0, userBranches.length - 1);

                  return (
                    <TableRow key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/20 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">{displayName}</span>
                          <span className="text-[11px] font-mono text-[var(--text-secondary)]">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-semibold text-[11px] rounded-md px-2 py-0.5">
                            {displayRole}
                          </Badge>
                          {isGlobal && (
                            <span className="text-[10px] font-semibold text-[var(--blue-700)] bg-[var(--blue-50)] border border-[var(--blue-200)] px-1.5 py-0.5 rounded">
                              Global
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {isGlobal ? (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]">
                            <Building2 className="w-3.5 h-3.5 text-[var(--blue-600)] flex-shrink-0" />
                            <span className="font-medium">All Branches (Global Access)</span>
                          </div>
                        ) : primaryBranch ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] font-medium">
                              <Building2 className="w-3 h-3 text-[var(--blue-600)]" />
                              <span>{primaryBranch.branchName}</span>
                              <span className="text-[9px] uppercase tracking-wider bg-[var(--blue-50)] text-[var(--blue-700)] font-bold px-1 rounded ml-1">Home</span>
                            </div>
                            {extraBranchCount > 0 && (
                              <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                                +{extraBranchCount} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)] italic">No branch assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatusMutation.mutate({ id: user.id, isOnDuty: !isOnDuty })}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-all ${
                            isOnDuty
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isOnDuty ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
                          {isOnDuty ? "ON DUTY" : "OFF DUTY"}
                        </button>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={user.isActive ? "success" : "muted"} className="uppercase text-[9px] rounded-md px-1.5">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-7 w-7 p-0 rounded-md">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg text-xs">
                            <DropdownMenuItem 
                              onClick={() => openEditUserDialog(user)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                              <span>Edit Role & Branches</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleStatusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                              className={user.isActive ? "text-[var(--red-600,#dc2626)] px-2.5 py-1.5 rounded-md cursor-pointer" : "text-emerald-600 px-2.5 py-1.5 rounded-md cursor-pointer"}
                            >
                              {user.isActive ? "Deactivate User" : "Activate User"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={userPage}
            totalPages={userTotalPages}
            totalItems={userTotalItems}
            pageSize={8}
            onPrev={onUserPrev}
            onNext={onUserNext}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: ROLES & PERMISSIONS
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border)] bg-[var(--blue-50)]/40 hover:bg-[var(--blue-50)]/40">
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Role Name</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Scope</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Description</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Permissions</TableHead>
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Status</TableHead>
                <TableHead className="w-[80px] text-right font-semibold text-xs text-[var(--text-primary)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRolesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--text-secondary)]" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-[var(--text-secondary)]">
                    No roles found. Click "Create Role" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRoles.map((role) => {
                  const count = Array.isArray(role.permissions) 
                    ? role.permissions.length 
                    : (role.permissionsCount ?? 0);
                  const isSuperAdmin = role.permissions?.includes("*");
                  const isGlobal = role.scope === "global" || role.name === "Admin";

                  return (
                    <TableRow key={role.id} className="border-b border-[var(--border)] hover:bg-[var(--blue-50)]/20 transition-colors">
                      <TableCell className="py-3 font-semibold text-xs text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-[var(--blue-600)]" />
                        <span>{role.name}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        {isGlobal ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--blue-700)] bg-[var(--blue-50)] border border-[var(--blue-200)] px-2 py-0.5 rounded-md">
                            <Globe className="w-3 h-3 text-[var(--blue-600)]" />
                            Global Scope
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            Branch-Bound
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-[var(--text-secondary)] text-xs max-w-[260px] truncate">
                        {role.description || "No description provided"}
                      </TableCell>
                      <TableCell className="py-3">
                        {isSuperAdmin ? (
                          <Badge variant="default" className="text-[10px] font-bold rounded-md bg-[var(--blue-50)] text-[var(--blue-700)] border border-[var(--blue-200)]">
                            Full Access (*)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] rounded-md">
                            {count} {count === 1 ? "domain" : "domains"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={role.isActive ? "success" : "muted"} className="uppercase text-[9px] rounded-md px-1.5">
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-7 w-7 p-0 rounded-md">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg text-xs">
                            <DropdownMenuItem 
                              onClick={() => openEditRoleDialog(role)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                              <span>Edit Role</span>
                            </DropdownMenuItem>
                            {role.name !== "Admin" && (
                              <DropdownMenuItem 
                                onClick={() => deleteRoleMutation.mutate(role.id)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-[var(--red-600,#dc2626)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Deactivate</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={rolePage}
            totalPages={roleTotalPages}
            totalItems={roleTotalItems}
            pageSize={8}
            onPrev={onRolePrev}
            onNext={onRoleNext}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODALS & DIALOGS
      ───────────────────────────────────────────────────────────────────────────── */}
      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <UserPlus className="h-4 w-4 text-[var(--blue-600)]" />
              Add System User
            </DialogTitle>
          </DialogHeader>

          {userErrorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {userErrorMsg}
            </div>
          )}

          <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input 
                  placeholder="e.g. Bethlehem" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9 text-xs rounded-md"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name *</Label>
                <Input 
                  placeholder="e.g. Assefa" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9 text-xs rounded-md"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address *</Label>
              <Input 
                type="email"
                placeholder="e.g. bethlehem@nexusgrand.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs rounded-md"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input 
                  placeholder="+251-911-223344" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Role *</Label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none"
                  required
                >
                  <option value="" disabled>Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.scope === "global" ? "(Global Access)" : "(Branch-Bound)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branch Assignment Section — ALWAYS VISIBLE & INTERACTIVE */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--blue-600)]" />
                  <span>Assign Branches *</span>
                </Label>
                <button
                  type="button"
                  onClick={() => handleSelectAllBranches(false)}
                  className="text-[11px] font-semibold text-[var(--blue-700)] hover:underline cursor-pointer"
                >
                  {selectedBranchIds.length === branches.length ? "Deselect All" : "Select All Branches"}
                </button>
              </div>

              {isCreateGlobalRole && (
                <div className="p-2 rounded-md bg-[var(--blue-50)] text-[11px] text-[var(--blue-800)] border border-[var(--blue-200)] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--blue-600)] flex-shrink-0" />
                  <span>The <strong>Admin</strong> role has chain-wide scope. Check assigned branches and pick their primary home base below:</span>
                </div>
              )}

              {/* Branch Checkboxes List */}
              <div className="rounded-md border border-[var(--border)] p-1.5 space-y-1 max-h-36 overflow-y-auto bg-[var(--surface)]">
                {branches.map((b) => {
                  const isChecked = selectedBranchIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors",
                        isChecked ? "bg-[var(--blue-50)]/70 text-[var(--blue-900)] font-medium" : "hover:bg-[var(--surface-hover,#f8fafc)] text-[var(--text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBranchToggle(b.id, false)}
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--blue-600)] focus:ring-[var(--blue-500)]"
                        />
                        <span>{b.branchName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{b.branchCode}</span>
                    </label>
                  );
                })}
              </div>

              {/* Primary / Home Branch Selector */}
              {selectedBranchIds.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-[var(--text-secondary)]">
                      Primary / Home Branch *
                    </Label>
                    <span className="text-[10px] text-[var(--blue-700)] font-semibold bg-[var(--blue-50)] px-1.5 rounded">Default Login Branch</span>
                  </div>
                  <select
                    value={primaryBranchId}
                    onChange={(e) => setPrimaryBranchId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--blue-600)]"
                    required
                  >
                    {selectedBranchIds.map((bId) => {
                      const branch = branches.find((b) => b.id === bId);
                      return (
                        <option key={bId} value={bId}>
                          {branch?.branchName || bId}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Password *</Label>
              <Input 
                type="password"
                placeholder="Min 8 chars, uppercase, number & symbol" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs rounded-md"
                required
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeAddUserDialog} className="h-8 text-xs rounded-md">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createUserMutation.isPending}
                className="h-8 text-xs font-semibold rounded-md"
              >
                {createUserMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog — ALWAYS VISIBLE & INTERACTIVE */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Edit2 className="h-4 w-4 text-[var(--blue-600)]" />
              Edit User & Branch Access
            </DialogTitle>
          </DialogHeader>

          {editUserErrorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {editUserErrorMsg}
            </div>
          )}

          <form onSubmit={handleEditUserSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name</Label>
                <Input 
                  value={editFirstName} 
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="h-9 text-xs rounded-md"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input 
                  value={editLastName} 
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="h-9 text-xs rounded-md"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-9 text-xs rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Role</Label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.scope === "global" ? "(Global Access)" : "(Branch-Bound)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branch Assignment Section — ALWAYS VISIBLE & INTERACTIVE */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--blue-600)]" />
                  <span>Assign Branches *</span>
                </Label>
                <button
                  type="button"
                  onClick={() => handleSelectAllBranches(true)}
                  className="text-[11px] font-semibold text-[var(--blue-700)] hover:underline cursor-pointer"
                >
                  {editBranchIds.length === branches.length ? "Deselect All" : "Select All Branches"}
                </button>
              </div>

              {isEditGlobalRole && (
                <div className="p-2 rounded-md bg-[var(--blue-50)] text-[11px] text-[var(--blue-800)] border border-[var(--blue-200)] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--blue-600)] flex-shrink-0" />
                  <span>The <strong>Admin</strong> role has chain-wide scope. Check assigned branches and pick their primary home base below:</span>
                </div>
              )}

              {/* Branch Checkboxes List */}
              <div className="rounded-md border border-[var(--border)] p-1.5 space-y-1 max-h-36 overflow-y-auto bg-[var(--surface)]">
                {branches.map((b) => {
                  const isChecked = editBranchIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors",
                        isChecked ? "bg-[var(--blue-50)]/70 text-[var(--blue-900)] font-medium" : "hover:bg-[var(--surface-hover,#f8fafc)] text-[var(--text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBranchToggle(b.id, true)}
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--blue-600)] focus:ring-[var(--blue-500)]"
                        />
                        <span>{b.branchName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{b.branchCode}</span>
                    </label>
                  );
                })}
              </div>

              {/* Primary / Home Branch Selector */}
              {editBranchIds.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-[var(--text-secondary)]">
                      Primary / Home Branch *
                    </Label>
                    <span className="text-[10px] text-[var(--blue-700)] font-semibold bg-[var(--blue-50)] px-1.5 rounded">Default Login Branch</span>
                  </div>
                  <select
                    value={editPrimaryBranchId}
                    onChange={(e) => setEditPrimaryBranchId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--blue-600)]"
                    required
                  >
                    {editBranchIds.map((bId) => {
                      const branch = branches.find((b) => b.id === bId);
                      return (
                        <option key={bId} value={bId}>
                          {branch?.branchName || bId}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setEditingUser(null)} className="h-8 text-xs rounded-md">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
                className="h-8 text-xs font-semibold rounded-md"
              >
                {updateUserMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--blue-600)]" />
              {editingRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
          </DialogHeader>

          {roleErrorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {roleErrorMsg}
            </div>
          )}

          <form onSubmit={handleRoleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-3.5 pt-2">
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Role Name *</Label>
                  <Input 
                    placeholder="e.g. VIP Concierge Supervisor" 
                    value={roleName} 
                    onChange={(e) => setRoleName(e.target.value)}
                    className="h-9 text-xs rounded-md"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Access Scope *</Label>
                  <select
                    value={roleScope}
                    onChange={(e) => setRoleScope(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none"
                  >
                    <option value="branch">Branch-Bound (Property Scope)</option>
                    <option value="global">Global (All Branches / Chain Scope)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Input 
                  placeholder="Summary of operational duties" 
                  value={roleDesc} 
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="h-9 text-xs rounded-md"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Permissions Matrix</Label>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    {selectedPermissions.includes("*") ? "All permissions granted" : `${selectedPermissions.length} selected`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 max-h-[260px] overflow-y-auto border border-[var(--border)] rounded-md p-2 bg-[var(--surface)]">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes("*") 
                      ? (perm.id === "*" || true)
                      : selectedPermissions.includes(perm.id);

                    return (
                      <label 
                        key={perm.id} 
                        className={`flex items-start gap-2 p-1.5 rounded cursor-pointer border transition-colors ${
                          isChecked 
                            ? "bg-[var(--blue-50)] border-[var(--blue-200)] text-[var(--text-primary)]" 
                            : "border-transparent hover:bg-[var(--blue-50)]/40 text-[var(--text-secondary)]"
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--blue-600)]"
                        />
                        <div className="text-xs leading-tight">
                          <div className="font-semibold text-[var(--text-primary)]">{perm.label}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{perm.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeRoleDialog} className="h-8 text-xs rounded-md">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveRoleMutation.isPending}
                className="h-8 text-xs font-semibold rounded-md"
              >
                {saveRoleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" /></div>}>
      <UsersAndRolesContent />
    </Suspense>
  );
}

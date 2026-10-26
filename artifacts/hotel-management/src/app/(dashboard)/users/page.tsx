"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, UserPlus, Building2, Check, Shield, Edit2 } from "lucide-react";
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
  scope?: string;
};

type Branch = {
  id: string;
  branchName: string;
  branchCode: string;
  isActive?: boolean;
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  // Add User Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState("");

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editPrimaryBranchId, setEditPrimaryBranchId] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<any>("/users"),
  });
  const users: User[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data ?? []);

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("/roles"),
  });

  const { data: rawBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<any>("/branches"),
  });
  const branches: Branch[] = Array.isArray(rawBranches) ? rawBranches : (rawBranches?.data ?? []);

  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create user");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    },
    onError: (err: any) => {
      setEditErrorMsg(err.message || "Failed to update user");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, isOnDuty }: { id: string; isActive?: boolean; isOnDuty?: boolean }) => {
      const body: any = {};
      if (isActive !== undefined) body.isActive = isActive;
      if (isOnDuty !== undefined) body.isOnDuty = isOnDuty;
      return apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const openCreateDialog = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRoleId(roles[0]?.id || "");
    const firstBranch = branches[0]?.id || "";
    setSelectedBranchIds(firstBranch ? [firstBranch] : []);
    setPrimaryBranchId(firstBranch);
    setErrorMsg("");
    setIsAddOpen(true);
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    setErrorMsg("");
  };

  const openEditDialog = (u: User) => {
    setEditingUser(u);
    setEditFirstName(u.firstName || "");
    setEditLastName(u.lastName || "");
    setEditPhone(u.phone || "");
    setEditRoleId(u.roleId || "");
    const existingIds = (u.branches || []).map((b) => b.id);
    setEditBranchIds(existingIds.length > 0 ? existingIds : branches[0]?.id ? [branches[0].id] : []);
    setEditPrimaryBranchId(u.primaryBranchId || existingIds[0] || branches[0]?.id || "");
    setEditErrorMsg("");
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !roleId) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    const selectedRole = roles.find((r) => r.id === roleId);
    const isGlobal = selectedRole?.name === "Admin" || selectedRole?.scope === "global";

    if (!isGlobal && selectedBranchIds.length === 0) {
      setErrorMsg("Please select at least one branch for this staff account.");
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const selectedRole = roles.find((r) => r.id === editRoleId);
    const isGlobal = selectedRole?.name === "Admin" || selectedRole?.scope === "global";

    if (!isGlobal && editBranchIds.length === 0) {
      setEditErrorMsg("Please select at least one branch.");
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

  const filtered = users.filter((u) => {
    const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    const displayName = u.name ?? fullName;
    const matchesSearch =
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (branchFilter === "all") return true;

    // Filter by branch
    const isGlobal = u.roleName === "Admin" || u.roleScope === "global";
    if (isGlobal) return true; // Global admins belong to all branches
    return (u.branches || []).some((b) => b.id === branchFilter);
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedUsers,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(filtered, 8);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, branchFilter, setCurrentPage]);

  const selectedRoleObj = roles.find((r) => r.id === roleId);
  const isCreateGlobalRole = selectedRoleObj?.name === "Admin" || selectedRoleObj?.scope === "global";

  const editRoleObj = roles.find((r) => r.id === editRoleId);
  const isEditGlobalRole = editRoleObj?.name === "Admin" || editRoleObj?.scope === "global";

  return (
    <div className="space-y-6">
      {/* Top Header Row — Strictly NO subtitles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">System Users</h1>
        <div className="flex flex-wrap items-center gap-2">
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
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[200px] h-9 text-xs rounded-lg"
          />
          <Button onClick={openCreateDialog} className="h-9 text-xs font-semibold rounded-lg">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--text-secondary)]" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
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
                            onClick={() => openEditDialog(user)}
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
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={8}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <UserPlus className="h-4 w-4 text-[var(--blue-600)]" />
              Add System User
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {errorMsg}
            </div>
          )}

          <form id="user-form" onSubmit={handleCreateSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="first-name" className="text-xs font-semibold">First Name *</Label>
                <Input 
                  id="first-name"
                  placeholder="e.g. Bethlehem" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9 text-xs rounded-md"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last-name" className="text-xs font-semibold">Last Name *</Label>
                <Input 
                  id="last-name"
                  placeholder="e.g. Assefa" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9 text-xs rounded-md"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="user-email" className="text-xs font-semibold">Email Address *</Label>
              <Input 
                id="user-email"
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
                <Label htmlFor="user-phone" className="text-xs font-semibold">Phone Number</Label>
                <Input 
                  id="user-phone"
                  placeholder="+251-911-223344" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-role" className="text-xs font-semibold">Role *</Label>
                <select
                  id="user-role"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none"
                  required
                >
                  <option value="" disabled>Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.scope === "global" ? "(Global)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branch Assignment Section */}
            <div className="space-y-1.5 pt-1 border-t border-[var(--border)]">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">
                Branch Assignments {isCreateGlobalRole ? "(Global Scope)" : "*"}
              </Label>
              {isCreateGlobalRole ? (
                <div className="p-2.5 rounded-md bg-[var(--blue-50)] text-xs text-[var(--blue-800)] border border-[var(--blue-200)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--blue-600)] flex-shrink-0" />
                  <span>The <strong>Admin</strong> role automatically inherits access across all hotel branches.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md border border-[var(--border)] p-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {branches.map((b) => {
                      const isChecked = selectedBranchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--blue-50)] cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBranchToggle(b.id, false)}
                              className="rounded border-[var(--border)] text-[var(--blue-600)]"
                            />
                            <span className="font-medium text-[var(--text-primary)]">{b.branchName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-secondary)]">{b.branchCode}</span>
                        </label>
                      );
                    })}
                  </div>

                  {selectedBranchIds.length > 1 && (
                    <div className="space-y-1">
                      <Label htmlFor="primary-branch" className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        Primary / Home Branch
                      </Label>
                      <select
                        id="primary-branch"
                        value={primaryBranchId}
                        onChange={(e) => setPrimaryBranchId(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs focus:outline-none"
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
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="user-password" className="text-xs font-semibold">Password *</Label>
              <Input 
                id="user-password"
                type="password"
                placeholder="Min 8 chars, uppercase, number & symbol" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs rounded-md"
                required
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeDialog} className="h-8 text-xs rounded-md">
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

      {/* Edit User / Branch Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Edit2 className="h-4 w-4 text-[var(--blue-600)]" />
              Edit User & Branch Access
            </DialogTitle>
          </DialogHeader>

          {editErrorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {editErrorMsg}
            </div>
          )}

          <form id="edit-user-form" onSubmit={handleEditSubmit} className="space-y-3.5 pt-2">
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
                      {r.name} {r.scope === "global" ? "(Global)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branch Assignment Section */}
            <div className="space-y-1.5 pt-1 border-t border-[var(--border)]">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">
                Assigned Branches {isEditGlobalRole ? "(Global Scope)" : "*"}
              </Label>
              {isEditGlobalRole ? (
                <div className="p-2.5 rounded-md bg-[var(--blue-50)] text-xs text-[var(--blue-800)] border border-[var(--blue-200)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--blue-600)] flex-shrink-0" />
                  <span>The <strong>Admin</strong> role automatically has access to all branches.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md border border-[var(--border)] p-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {branches.map((b) => {
                      const isChecked = editBranchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--blue-50)] cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBranchToggle(b.id, true)}
                              className="rounded border-[var(--border)] text-[var(--blue-600)]"
                            />
                            <span className="font-medium text-[var(--text-primary)]">{b.branchName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--text-secondary)]">{b.branchCode}</span>
                        </label>
                      );
                    })}
                  </div>

                  {editBranchIds.length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        Primary / Home Branch
                      </Label>
                      <select
                        value={editPrimaryBranchId}
                        onChange={(e) => setEditPrimaryBranchId(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs focus:outline-none"
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
    </div>
  );
}

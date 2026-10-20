"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, UserPlus, KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination 
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

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
  isActive: boolean;
  isOnDuty?: boolean;
};

type Role = {
  id: string;
  name: string;
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<any>("/users"),
  });
  const users: User[] = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data ?? []);

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("/roles"),
  });

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

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
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
    setErrorMsg("");
    setIsAddOpen(true);
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    setErrorMsg("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !roleId) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    createUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      password: password,
      roleId: roleId,
    });
  };

  const filtered = users.filter(u => {
    const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    const displayName = u.name ?? fullName;
    return (
      displayName.toLowerCase().includes(search.toLowerCase()) || 
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedUsers,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(filtered, 5);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, setCurrentPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Users</h1>
          <p className="text-sm text-text-muted mt-1">Manage staff accounts, credentials, and role associations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px]"
          />
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Duty Status</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-text-muted">
                  No users found. Click "Add User" to create one.
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => {
                const displayName = user.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
                const displayRole = user.roleName || user.role || "Staff";
                const isOnDuty = user.isOnDuty !== false;

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {displayRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleStatusMutation.mutate({ id: user.id, isActive: user.isActive, ...({ isOnDuty: !isOnDuty } as any) })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                          isOnDuty
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {isOnDuty ? "ON DUTY" : "OFF DUTY"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'muted'} className="uppercase text-[10px]">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => toggleStatusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                            className={user.isActive ? "text-danger" : "text-success"}
                          >
                            {user.isActive ? 'Deactivate User' : 'Activate User'}
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
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-primary" />
              Add System User
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 text-sm rounded bg-danger/10 text-danger border border-danger/30">
              {errorMsg}
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name">First Name *</Label>
                <Input 
                  id="first-name"
                  placeholder="e.g. Bethlehem" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-name">Last Name *</Label>
                <Input 
                  id="last-name"
                  placeholder="e.g. Assefa" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email Address *</Label>
              <Input 
                id="user-email"
                type="email"
                placeholder="e.g. bethlehem@nexusgrand.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input 
                id="user-phone"
                placeholder="e.g. +251-911-223344" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role">Role *</Label>
              <select
                id="user-role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>Select a role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password">Password *</Label>
              <Input 
                id="user-password"
                type="password"
                placeholder="Min 8 chars, uppercase, number & symbol" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-[11px] text-text-muted">
                Must include at least 1 uppercase letter, 1 number, and 1 symbol (e.g. Concierge@2026).
              </p>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

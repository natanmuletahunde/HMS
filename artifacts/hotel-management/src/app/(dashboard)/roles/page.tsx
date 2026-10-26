"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, ShieldCheck, Check, Trash2, Edit, Globe, Building2 } from "lucide-react";
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

type Role = {
  id: string;
  name: string;
  description: string | null;
  scope?: string;
  permissions?: string[];
  permissionsCount?: number;
  isActive: boolean;
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

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("branch");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: rawRoles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<any>("/roles"),
  });
  const roles: Role[] = Array.isArray(rawRoles) ? rawRoles : (rawRoles?.data ?? []);

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedRoles,
    onPrev,
    onNext,
  } = usePagination(roles, 8);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editRole) {
        return apiFetch(`/roles/${editRole.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      closeDialog();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to save role");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/roles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const openCreateDialog = () => {
    setEditRole(null);
    setName("");
    setDescription("");
    setScope("branch");
    setSelectedPermissions(["hotel:*", "rooms:*", "reservations:*", "guests:*"]);
    setErrorMsg("");
    setIsOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditRole(role);
    setName(role.name);
    setDescription(role.description || "");
    setScope(role.scope || "branch");
    setSelectedPermissions(role.permissions || []);
    setErrorMsg("");
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setEditRole(null);
    setErrorMsg("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Role name is required");
      return;
    }
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      scope,
      permissions: selectedPermissions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header — Strictly NO subtitles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Roles & Permissions</h1>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} className="h-9 text-xs font-semibold rounded-lg">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Role
          </Button>
        </div>
      </div>

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
            {isLoading ? (
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
                            onClick={() => openEditDialog(role)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                            <span>Edit Role</span>
                          </DropdownMenuItem>
                          {role.name !== "Admin" && (
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(role.id)}
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
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={8}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Role Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--blue-600)]" />
              {editRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-3.5 pt-2">
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="role-name" className="text-xs font-semibold">Role Name *</Label>
                  <Input 
                    id="role-name"
                    placeholder="e.g. VIP Concierge Supervisor" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-xs rounded-md"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="role-scope" className="text-xs font-semibold">Access Scope *</Label>
                  <select
                    id="role-scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none"
                  >
                    <option value="branch">Branch-Bound (Property Scope)</option>
                    <option value="global">Global (All Branches / Chain Scope)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="role-description" className="text-xs font-semibold">Description</Label>
                <Input 
                  id="role-description"
                  placeholder="Summary of operational duties" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
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
              <Button variant="outline" type="button" onClick={closeDialog} className="h-8 text-xs rounded-md">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
                className="h-8 text-xs font-semibold rounded-md"
              >
                {saveMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Loader2, ShieldCheck, Check, Trash2, Edit } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";

type Role = {
  id: string;
  name: string;
  description: string | null;
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
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("/roles"),
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedRoles,
    onPrev,
    onNext,
  } = usePagination(roles, 5);

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string; permissions: string[] }) => {
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
    setSelectedPermissions(["hotel:*", "rooms:*", "reservations:*", "guests:*"]);
    setErrorMsg("");
    setIsOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditRole(role);
    setName(role.name);
    setDescription(role.description || "");
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
      setSelectedPermissions(prev => prev.includes("*") ? [] : ["*"]);
      return;
    }
    setSelectedPermissions(prev => {
      const filtered = prev.filter(p => p !== "*");
      if (filtered.includes(permId)) {
        return filtered.filter(p => p !== permId);
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
      permissions: selectedPermissions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-text-muted mt-1">Configure user roles and granular system access permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Create Role
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-text-muted">
                  No roles found. Click "Create Role" to add one.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRoles.map((role) => {
                const count = Array.isArray(role.permissions) 
                  ? role.permissions.length 
                  : (role.permissionsCount ?? 0);
                const isSuperAdmin = role.permissions?.includes("*");

                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-semibold capitalize flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {role.name}
                    </TableCell>
                    <TableCell className="text-text-muted text-sm max-w-[280px] truncate">
                      {role.description || "No description provided"}
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin ? (
                        <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                          Full Access (*)
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {count} {count === 1 ? "permission" : "permissions"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? 'success' : 'muted'} className="uppercase text-[10px]">
                        {role.isActive ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => openEditDialog(role)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Role
                          </DropdownMenuItem>
                          {role.name.toLowerCase() !== "admin" && (
                            <DropdownMenuItem 
                              className="text-danger focus:text-danger" 
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete role "${role.name}"?`)) {
                                  deleteMutation.mutate(role.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Role
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
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Create / Edit Role Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 text-sm rounded bg-danger/10 text-danger border border-danger/30">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name *</Label>
                <Input 
                  id="role-name"
                  placeholder="e.g. VIP Services Supervisor" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Input 
                  id="role-description"
                  placeholder="Brief summary of duties and responsibilities" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Permissions Matrix</Label>
                  <div className="text-xs text-text-muted">
                    {selectedPermissions.includes("*") ? "All permissions granted" : `${selectedPermissions.length} selected`}
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  Select the functional domains this role has permission to access and manage:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 max-h-[300px] overflow-y-auto border border-border rounded-md p-3 bg-surface-muted/30">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes("*") 
                      ? (perm.id === "*" || true)
                      : selectedPermissions.includes(perm.id);

                    return (
                      <label 
                        key={perm.id} 
                        className={`flex items-start gap-2 p-2 rounded cursor-pointer border transition-colors ${
                          isChecked 
                            ? "bg-primary/10 border-primary/40 text-text" 
                            : "border-transparent hover:bg-surface-muted text-text-muted"
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="text-xs leading-tight">
                          <div className="font-semibold text-text">{perm.label}</div>
                          <div className="text-[11px] text-text-muted mt-0.5">{perm.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

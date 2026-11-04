"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building, Layers } from "lucide-react";
import { BuildingsTab } from "@/components/setup/BuildingsTab";
import { FloorsTab } from "@/components/setup/FloorsTab";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  MoreHorizontal,
  Loader2,
  GitBranch,
  Search,
  Building2,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PageHeader,
  DataTable,
  StatusPill,
  SideDrawer,
  FormField,
  LuxuryInput,
  type Column,
} from "@/components/setup";

type Branch = {
  id: string;
  hotelId: string;
  hotelName?: string;
  branchName: string;
  branchCode: string;
  manager?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  isActive?: boolean;
};

function BranchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: "branches" | "buildings" | "floors" = 
    tabParam === "buildings" ? "buildings" : tabParam === "floors" ? "floors" : "branches";

  const handleTabChange = (tab: "branches" | "buildings" | "floors") => {
    const url = tab === "branches" ? "/branches" : `/branches?tab=${tab}`;
    router.replace(url, { scroll: false });
  };
  const { user, hasPermission } = useAuth();
  const isGlobal =
    user?.roleName === "Admin" ||
    user?.roleName === "System Admin" ||
    user?.roleScope === "global";

  const canManageBranches =
    isGlobal &&
    (user?.roleName === "Admin" ||
      user?.roleName === "System Admin" ||
      hasPermission("*") ||
      hasPermission("hotel:*"));

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: rawBranches, isLoading, isError, refetch } = useQuery({
    queryKey: ["branches", debouncedSearch],
    queryFn: () => apiFetch<any>(`/branches?search=${encodeURIComponent(debouncedSearch)}`),
  });

  const allBranches: Branch[] = Array.isArray(rawBranches)
    ? rawBranches
    : (rawBranches?.data ?? []);

  const allowedBranchIds = isGlobal
    ? null
    : new Set(
        user?.branches?.map((b) => b.id) ||
        [user?.activeBranchId, user?.primaryBranchId].filter(Boolean)
      );

  const branches: Branch[] = isGlobal
    ? allBranches
    : allBranches.filter((b) => allowedBranchIds?.has(b.id));

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedBranches,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(branches, 5);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, setCurrentPage]);

  // Fetch hotels for parent link
  const { data: rawHotels = [] } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel").then((h) => (Array.isArray(h) ? h : h?.id ? [h] : [])),
  });
  const hotels = Array.isArray(rawHotels) ? rawHotels : [];
  const primaryHotel = hotels[0];
  const isSingleHotel = hotels.length <= 1;

  // Save mutation (Add or Update)
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editItem
        ? apiFetch(`/branches/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/branches", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: editItem ? "Branch updated successfully" : "New branch added" });
      setIsDrawerOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => {
      toast({ title: "Operation Failed", description: err.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenAdd = () => {
    setEditItem(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditItem(branch);
    setIsDrawerOpen(true);
  };

  const handleDrawerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd);
    
    // Ensure hotelId is populated
    if (!data.hotelId && primaryHotel?.id) {
      data.hotelId = primaryHotel.id;
    }
    
    saveMutation.mutate(data);
  };

  // Helper for manager initials avatar
  const getInitials = (name?: string) => {
    if (!name) return "MG";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Table Columns
  const columns: Column<Branch>[] = [
    {
      key: "branchName",
      header: "Branch Property",
      render: (branch) => (
        <div>
          <div className="font-semibold text-[var(--navy-950)] dark:text-[var(--text-primary)] text-sm">
            {branch.branchName}
          </div>
          <div className="font-mono text-xs text-[var(--text-secondary)] mt-0.5">
            {branch.branchCode}
          </div>
        </div>
      ),
    },
    {
      key: "manager",
      header: "Branch Manager",
      render: (branch) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--blue-50)] text-[var(--blue-700)] dark:bg-[rgba(46,93,230,0.2)] dark:text-[var(--blue-400)] font-bold text-xs flex items-center justify-center shrink-0">
            {getInitials(branch.manager)}
          </div>
          <span className="font-medium text-sm text-[var(--text-primary)]">
            {branch.manager || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact Details",
      render: (branch) => (
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
            {branch.email || "—"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-mono">
            {branch.phone || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (branch) => (
        <StatusPill status={branch.status || (branch.isActive !== false ? "active" : "inactive")} />
      ),
    },
    ...(canManageBranches
      ? [
          {
            key: "actions",
            header: "",
            className: "w-12 text-right",
            render: (branch: Branch) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--blue-50)] dark:hover:bg-[var(--navy-950)] transition-colors cursor-pointer"
                    title="Branch Actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
                  <DropdownMenuItem
                    onClick={() => handleOpenEdit(branch)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--blue-50)] text-sm text-[var(--text-primary)]"
                  >
                    <Edit className="w-4 h-4 text-[var(--blue-700)] dark:text-[var(--blue-400)]" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteMutation.mutate(branch.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--status-danger-bg)] text-sm text-[var(--danger-text,#B42318)]"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as Column<Branch>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Branches & Properties
        </h1>
      </div>

      {/* Main Tabs: Branches | Buildings | Floors */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => handleTabChange("branches")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "branches"
              ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <GitBranch className="h-4 w-4" />
          <span>Branches</span>
        </button>
        <button
          onClick={() => handleTabChange("buildings")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "buildings"
              ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Buildings</span>
        </button>
        <button
          onClick={() => handleTabChange("floors")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "floors"
              ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Floors</span>
        </button>
      </div>

      {activeTab === "buildings" && <BuildingsTab />}
      {activeTab === "floors" && <FloorsTab />}

      {activeTab === "branches" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search branches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3.5 py-2 text-sm bg-[var(--surface)] text-[var(--text-primary)] rounded-lg border border-[var(--border)] focus:border-[var(--blue-700)] focus:ring-2 focus:ring-[var(--blue-700)]/15 transition-all outline-none"
              />
            </div>

            {canManageBranches && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--blue-700)] text-white hover:bg-[var(--navy-800)] transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Branch</span>
              </button>
            )}
          </div>

          <DataTable
            columns={columns}
            data={paginatedBranches}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={5}
            onPrev={onPrev}
            onNext={onNext}
            emptyTitle="No branches registered"
            emptyDescription="Create your first property branch to begin assigning buildings, floors, and rooms."
            emptyAction={
              canManageBranches ? (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--blue-700)] text-white hover:bg-[var(--navy-800)] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Branch
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* 3. Add / Edit Branch 480px Right-Side Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditItem(null);
        }}
        title={editItem ? "Edit Branch" : "Add Branch"}
        isSaving={saveMutation.isPending}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditItem(null);
              }}
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="branch-drawer-form"
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--blue-700)] text-white hover:bg-[var(--navy-800)] transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? "Save Changes" : "Create Branch"}
            </button>
          </div>
        }
      >
        <form id="branch-drawer-form" onSubmit={handleDrawerSubmit} className="space-y-6">
          {/* Group 1: Basics */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--blue-700)] dark:text-[var(--blue-400)] pb-1.5 border-b border-[var(--border)]">
              Property Basics
            </h4>

            {/* Hidden Hotel ID */}
            <input type="hidden" name="hotelId" value={editItem?.hotelId || primaryHotel?.id || ""} />

            <FormField label="Branch Property Name" required>
              <LuxuryInput
                name="branchName"
                defaultValue={editItem?.branchName}
                required
                placeholder="e.g. Nexus Main Branch – Bole"
              />
            </FormField>

            <FormField
              label="Branch Code"
              required
            >
              <LuxuryInput
                name="branchCode"
                defaultValue={editItem?.branchCode}
                required
                placeholder="BRN-..."
                className="font-mono text-xs uppercase"
              />
            </FormField>
          </div>

          {/* Group 2: Contact */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--blue-700)] dark:text-[var(--blue-400)] pb-1.5 border-b border-[var(--border)]">
              Branch Management
            </h4>

            <FormField label="General Manager / Supervisor">
              <LuxuryInput
                name="manager"
                defaultValue={editItem?.manager}
                placeholder="e.g. Alemayehu Tadesse"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contact Phone">
                <LuxuryInput
                  name="phone"
                  defaultValue={editItem?.phone}
                  placeholder="+251-11-..."
                />
              </FormField>
              <FormField label="Branch Email">
                <LuxuryInput
                  name="email"
                  type="email"
                  defaultValue={editItem?.email}
                  placeholder="branch@nexusgrand.com"
                />
              </FormField>
            </div>
          </div>

          {/* Group 3: Location */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--blue-700)] dark:text-[var(--blue-400)] pb-1.5 border-b border-[var(--border)]">
              Physical Location
            </h4>

            <FormField label="Physical Address" required>
              <LuxuryInput
                name="address"
                defaultValue={editItem?.address}
                required
                placeholder="Bole Road, Near Bole International Airport"
              />
            </FormField>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}


export default function BranchesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-secondary)]">Loading branches...</div>}>
      <BranchesContent />
    </Suspense>
  );
}

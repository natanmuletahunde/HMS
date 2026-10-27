"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, MoreHorizontal, Loader2, UserPlus, Building2, Check, Shield, Edit2, 
  Users as UsersIcon, ShieldCheck, Globe, Trash2, Edit, RotateCw, Copy,
  CalendarDays, Sparkles, UtensilsCrossed, CreditCard, Package, CheckSquare, Square, Search, Eye, EyeOff
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
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
  faydaId?: string | null;
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

function generateSecurePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*";
  const all = upper + lower + nums + syms;
  
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    syms[Math.floor(Math.random() * syms.length)],
  ];
  for (let i = 0; i < 8; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join("");
}


const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  "System Admin": ["*"],
  "Admin": ["*"],
  "General Manager": [
    "hotel:*", "rooms:*", "reservations:*", "guests:*", "front-office:*",
    "housekeeping:*", "maintenance:*", "restaurant:*", "pos:*", "room-service:*",
    "inventory:*", "procurement:*", "financial:*", "invoices:*", "payments:*",
    "conference:*", "transport:*", "hr:*", "employees:*", "customer-service:*",
    "documents:*", "reports:*", "bi:*"
  ],
  "Front Office Officer": [
    "rooms:*", "reservations:*", "guests:*", "front-office:*",
    "invoices:*", "payments:*", "customer-service:*", "transport:*",
    "documents:*", "reports:*"
  ],
  "Front Desk": [
    "rooms:*", "reservations:*", "guests:*", "front-office:*",
    "invoices:*", "payments:*"
  ],
  "Reservation Agent": [
    "rooms:*", "reservations:*", "guests:*", "front-office:*",
    "customer-service:*", "documents:*"
  ],
  "Night Auditor": [
    "reservations:*", "front-office:*", "invoices:*", "payments:*",
    "financial:*", "reports:*", "rooms:*", "guests:*"
  ],
  "Housekeeping": [
    "housekeeping:*", "rooms:*"
  ],
  "Maintenance": [
    "maintenance:*", "rooms:*", "inventory:*"
  ],
  "Cashier": [
    "pos:*", "restaurant:*", "room-service:*", "invoices:*", "payments:*"
  ],
  "Accountant": [
    "financial:*", "invoices:*", "payments:*", "procurement:*", "reports:*"
  ],
  "Storekeeper": [
    "inventory:*", "procurement:*"
  ],
  "Manager": [
    "reports:*", "staff:*", "reservations:*", "rooms:*", "guests:*", "front-office:*"
  ]
};

function getDefaultPermissionsForRole(name: string): string[] {
  const trimmed = (name || "").trim().toLowerCase();
  for (const [key, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    if (key.toLowerCase() === trimmed) {
      return perms;
    }
  }
  if (trimmed.includes("admin") || trimmed.includes("super")) return ROLE_DEFAULT_PERMISSIONS["System Admin"];
  if (trimmed.includes("general manager") || trimmed.includes("gm")) return ROLE_DEFAULT_PERMISSIONS["General Manager"];
  if (trimmed.includes("front office") || trimmed.includes("reception")) return ROLE_DEFAULT_PERMISSIONS["Front Office Officer"];
  if (trimmed.includes("reservation")) return ROLE_DEFAULT_PERMISSIONS["Reservation Agent"];
  if (trimmed.includes("auditor") || trimmed.includes("night")) return ROLE_DEFAULT_PERMISSIONS["Night Auditor"];
  if (trimmed.includes("housekeep")) return ROLE_DEFAULT_PERMISSIONS["Housekeeping"];
  if (trimmed.includes("maint")) return ROLE_DEFAULT_PERMISSIONS["Maintenance"];
  if (trimmed.includes("cashier") || trimmed.includes("pos")) return ROLE_DEFAULT_PERMISSIONS["Cashier"];
  if (trimmed.includes("account")) return ROLE_DEFAULT_PERMISSIONS["Accountant"];
  if (trimmed.includes("store") || trimmed.includes("inventory")) return ROLE_DEFAULT_PERMISSIONS["Storekeeper"];
  if (trimmed.includes("manager")) return ROLE_DEFAULT_PERMISSIONS["Manager"];

  return ["rooms:*", "reservations:*", "guests:*", "reports:*"];
}

const PERMISSION_GROUPS = [
  {
    id: "front_desk",
    title: "Front Desk & Guest Services",
    icon: CalendarDays,
    items: [
      { id: "reservations:*", label: "Reservations & Bookings", desc: "Manage room bookings, calendar grid, stay dates, and guest allocations." },
      { id: "front-office:*", label: "Front Office Operations", desc: "Arrival processing, keycard issuance, mid-stay room moves, and check-outs." },
      { id: "guests:*", label: "Guest Profiles & Fayda ID", desc: "Access guest directory, past stay histories, and national ID records." },
      { id: "customer-service:*", label: "Guest Service & Requests", desc: "Handle special guest amenities, concierge requests, and customer complaints." },
    ]
  },
  {
    id: "hotel",
    title: "Hotel Infrastructure & Setup",
    icon: Building2,
    items: [
      { id: "hotel:*", label: "Hotel Profile & Branches", desc: "Manage property configurations, branch locations, buildings, and floors." },
      { id: "rooms:*", label: "Rooms, Types & Pricing", desc: "Configure physical room units, room categories, base rates, and seasonal pricing." },
      { id: "conference:*", label: "Conference & Hall Bookings", desc: "Manage event halls, meeting space reservations, and AV equipment." },
    ]
  },
  {
    id: "operations",
    title: "Housekeeping & Facility Maintenance",
    icon: Sparkles,
    items: [
      { id: "housekeeping:*", label: "Housekeeping & Turnaround", desc: "Room cleaning status (clean/dirty), staff cleaning rosters, and inspections." },
      { id: "maintenance:*", label: "Engineering & Maintenance", desc: "Facility repair work orders, asset issues (HVAC, plumbing), and technician logs." },
      { id: "transport:*", label: "Transport & Airport Shuttles", desc: "Chauffeur schedules, vehicle fleet management, and guest airport transfers." },
    ]
  },
  {
    id: "dining",
    title: "Food & Beverage (F&B)",
    icon: UtensilsCrossed,
    items: [
      { id: "restaurant:*", label: "Restaurant & Table Layout", desc: "Table configurations, dining menu items, and kitchen display routing." },
      { id: "pos:*", label: "POS Registers & Waiter Orders", desc: "Point-of-sale cashier terminals, order processing, and takeaway sales." },
      { id: "room-service:*", label: "In-Room Dining Service", desc: "Room service meal orders, delivery tracking, and room folio charges." },
    ]
  },
  {
    id: "finance",
    title: "Billing, Invoices & Financials",
    icon: CreditCard,
    items: [
      { id: "invoices:*", label: "Guest Folios & Invoices", desc: "Generate billing statements, consolidate stay charges, and tax receipts." },
      { id: "payments:*", label: "Payments & Settlements", desc: "Process Cash, Card, Telebirr, and CBE Birr payments and deposit refunds." },
      { id: "financial:*", label: "Accounting & Cash Shifts", desc: "Cashier drawer balance sign-off, accounts receivable, and general ledger." },
      { id: "reports:*", label: "Operational & Revenue Reports", desc: "Occupancy metrics, RevPAR, average daily rates (ADR), and shift summaries." },
      { id: "bi:*", label: "Business Intelligence & KPIs", desc: "Executive dashboards, financial forecasting, and property performance trends." },
    ]
  },
  {
    id: "inventory",
    title: "Supply Chain & Inventory",
    icon: Package,
    items: [
      { id: "inventory:*", label: "Stock Inventory Management", desc: "Monitor stock quantities across departments, movements, and minimum stock alerts." },
      { id: "procurement:*", label: "Procurement & Purchase Orders", desc: "Create supplier purchase orders (PO) and goods received notes (GRN)." },
    ]
  },
  {
    id: "hr",
    title: "Human Resources & Administration",
    icon: UsersIcon,
    items: [
      { id: "employees:*", label: "Staff Directory & Records", desc: "Manage employee profiles, job titles, contacts, and employment records." },
      { id: "hr:*", label: "HR Shifts & Attendance", desc: "Department shifts, staff clock-in/out schedules, and work duty logs." },
      { id: "users:*", label: "User Accounts & Credentials", desc: "Create staff logins, reset passwords, and bind staff to hotel branches." },
      { id: "roles:*", label: "Role Definitions & Security", desc: "Configure staff roles, access permissions, and security scope." },
      { id: "documents:*", label: "Document Management Archive", desc: "Attach, archive, and manage uploaded business and operational files." },
    ]
  },
  {
    id: "admin",
    title: "Administrative Control",
    icon: ShieldCheck,
    items: [
      { id: "*", label: "Full System Access (*)", desc: "Super-admin unrestricted access to all properties, configurations, and data." },
    ]
  }
];

const ALL_PERMISSION_ITEMS = PERMISSION_GROUPS.flatMap(g => g.items);


function UsersAndRolesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser, logout, refreshUser } = useAuth();

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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userErrorMsg, setUserErrorMsg] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [faydaId, setFaydaId] = useState("");
  const [password, setPassword] = useState("");
  const [copiedPass, setCopiedPass] = useState(false);
  const [showUserPass, setShowUserPass] = useState(true);
  const [roleId, setRoleId] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState("");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFaydaId, setEditFaydaId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editCopiedPass, setEditCopiedPass] = useState(false);
  const [showEditUserPass, setShowEditUserPass] = useState(true);
  const [editRoleId, setEditRoleId] = useState("");
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editPrimaryBranchId, setEditPrimaryBranchId] = useState("");
  const [editUserErrorMsg, setEditUserErrorMsg] = useState("");
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

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
      if (isActive !== undefined) {
        body.isActive = isActive;
        if (isActive === false) body.isOnDuty = false;
      }
      if (isOnDuty !== undefined) body.isOnDuty = isOnDuty;
      return apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    },
    onMutate: async ({ id, isActive, isOnDuty }) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previousUsers = queryClient.getQueryData(["users"]);

      queryClient.setQueryData(["users"], (old: any) => {
        if (!old) return old;
        const updateItem = (u: User) => {
          if (u.id !== id) return u;
          return {
            ...u,
            ...(isActive !== undefined ? { isActive, ...(isActive === false ? { isOnDuty: false } : {}) } : {}),
            ...(isOnDuty !== undefined ? { isOnDuty } : {}),
          };
        };

        if (Array.isArray(old)) {
          return old.map(updateItem);
        }
        if (old.data && Array.isArray(old.data)) {
          return { ...old, data: old.data.map(updateItem) };
        }
        return old;
      });

      return { previousUsers };
    },
    onError: (err: any, _, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(["users"], context.previousUsers);
      }
      toast({
        title: "Action failed",
        description: err?.message || "Failed to update user status",
        variant: "destructive",
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (vars.isActive !== undefined) {
        // Broadcast across tabs to immediately kick out the deactivated user
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("hms_user_events");
          bc.postMessage({ type: "USER_DEACTIVATED", userId: vars.id });
          bc.close();
        }

        if (currentUser?.id === vars.id && vars.isActive === false) {
          logout();
          return;
        }

        toast({
          title: vars.isActive ? "Staff Member Activated" : "Staff Member Deactivated",
          description: vars.isActive
            ? "Account is now active and can access the system."
            : "Account has been deactivated and marked off-duty.",
        });
      } else if (vars.isOnDuty !== undefined) {
        toast({
          title: vars.isOnDuty ? "Staff Marked On Duty" : "Staff Marked Off Duty",
        });
      }
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<{ message: string }>(`/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserToDelete(null);
      toast({
        title: "Staff Account Removed",
        description: data?.message || "User account was successfully deleted.",
      });
      if (typeof window !== "undefined") {
        const bc = new BroadcastChannel("hms_user_events");
        bc.postMessage({ type: "user_deleted", userId: deletedId });
        bc.close();
      }
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err?.message || "Failed to delete user account.",
        variant: "destructive",
      });
    },
  });

  const handleCopyPassword = (text: string, isEdit = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isEdit) {
      setEditCopiedPass(true);
      setTimeout(() => setEditCopiedPass(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const openAddUserDialog = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setFaydaId("");
    setPassword("");
    setCopiedPass(false);
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
    setEditFaydaId(u.faydaId || "");
    setEditPassword("");
    setEditCopiedPass(false);
    setEditRoleId(u.roleId || "");
    const existingIds = (u.branches || []).map((b) => b.id);
    const initialBranches = existingIds.length > 0 ? existingIds : (branches[0] ? [branches[0].id] : []);
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

    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();
      if (!/^0[79]\d{8}$/.test(cleanPhone) && !/^0\d{9}$/.test(cleanPhone)) {
        setUserErrorMsg("Phone number must be a valid 10-digit Ethiopian number starting with 09 or 07 (e.g. 0911223344).");
        return;
      }
    }

    createUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      faydaId: faydaId.trim() || undefined,
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

    if (editPhone && editPhone.trim()) {
      const cleanPhone = editPhone.trim();
      if (!/^0[79]\d{8}$/.test(cleanPhone) && !/^0\d{9}$/.test(cleanPhone)) {
        setEditUserErrorMsg("Phone number must be a valid 10-digit Ethiopian number starting with 09 or 07 (e.g. 0911223344).");
        return;
      }
    }

    const payload: any = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim() || null,
      faydaId: editFaydaId.trim() || null,
      roleId: editRoleId,
      branchIds: editBranchIds,
      primaryBranchId: editPrimaryBranchId || editBranchIds[0] || null,
    };

    if (editPassword && editPassword.trim()) {
      payload.password = editPassword.trim();
    }

    updateUserMutation.mutate({
      id: editingUser.id,
      payload,
    });
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    const displayName = u.name ?? fullName;
    const matchesSearch =
      displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;

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
  }, [userSearch, branchFilter, statusFilter, setUserPage]);

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
  const [useDefaultPerms, setUseDefaultPerms] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");

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
    setPermissionSearch("");
    setIsRoleModalOpen(true);
  };

  const openEditRoleDialog = (r: Role) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDesc(r.description || "");
    setRoleScope(r.scope || "branch");
    const currentPerms = r.permissions || [];
    setSelectedPermissions(currentPerms);
    const defaults = getDefaultPermissionsForRole(r.name);
    const isMatching = defaults.length === currentPerms.length && defaults.every((p) => currentPerms.includes(p));
    setUseDefaultPerms(isMatching);
    setRoleErrorMsg("");
    setPermissionSearch("");
    setIsRoleModalOpen(true);
  };

  const handleToggleDefaultPermissions = (checked: boolean) => {
    setUseDefaultPerms(checked);
    if (checked) {
      const defaults = getDefaultPermissionsForRole(roleName);
      setSelectedPermissions(defaults);
    }
  };

  const closeRoleDialog = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
    setRoleErrorMsg("");
  };

  const togglePermission = (permId: string) => {
    setUseDefaultPerms(false);
    if (permId === "*") {
      setSelectedPermissions((prev) => (prev.includes("*") ? [] : ["*"]));
      return;
    }
    if (selectedPermissions.includes("*")) {
      const allExceptCurrent = AVAILABLE_PERMISSIONS
        .filter((p) => p.id !== "*" && p.id !== permId)
        .map((p) => p.id);
      setSelectedPermissions(allExceptCurrent);
      return;
    }
    setSelectedPermissions((prev) => {
      if (prev.includes(permId)) {
        return prev.filter((p) => p !== permId);
      }
      return [...prev, permId];
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
        {/* Segmented Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--blue-50)]/60 border border-[var(--border)] rounded-lg">
          <button
            type="button"
            onClick={() => handleTabChange("users")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === "users"
                ? "bg-[var(--surface)] text-[var(--blue-700)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>Staff Accounts</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("roles")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === "roles"
                ? "bg-[var(--surface)] text-[var(--blue-700)] shadow-sm border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Roles & Permissions</span>
          </button>
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

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Staff</option>
                <option value="inactive">Inactive / Deactivated</option>
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
                <TableHead className="font-semibold text-xs text-[var(--text-primary)]">Role</TableHead>
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
                    <TableRow 
                      key={user.id} 
                      className={cn(
                        "border-b border-[var(--border)] transition-colors",
                        user.isActive 
                          ? "hover:bg-[var(--blue-50)]/20" 
                          : "bg-slate-50/70 dark:bg-slate-900/40 opacity-70 hover:bg-slate-100/50"
                      )}
                    >
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-[var(--text-primary)]">{displayName}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-mono text-[var(--text-secondary)]">{user.email}</span>
                            {user.faydaId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Fayda National ID">
                                FAN: {user.faydaId}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {displayRole}
                        </span>
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
                        {user.isActive ? (
                          <button
                            type="button"
                            onClick={() => toggleStatusMutation.mutate({ id: user.id, isOnDuty: !isOnDuty })}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                              isOnDuty
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isOnDuty ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
                            {isOnDuty ? "ON DUTY" : "OFF DUTY"}
                          </button>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border border-slate-200 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 cursor-not-allowed"
                            title="Deactivated users are suspended and cannot be on duty"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            DISABLED
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border",
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", user.isActive ? "bg-emerald-500" : "bg-rose-500")} />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
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
                            {user.id !== currentUser?.id && user.email !== "admin@nexushms.com" && (
                              <>
                                <div className="my-1 border-t border-[var(--border)]" />
                                <DropdownMenuItem
                                  onClick={() => setUserToDelete(user)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-xs text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 dark:hover:bg-red-950/40"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                  <span>Delete User</span>
                                </DropdownMenuItem>
                              </>
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
          MODALS & DIALOGS (WIDE 2-COLUMN LAYOUT)
      ───────────────────────────────────────────────────────────────────────────── */}
      {/* Add User Dialog — Wide 2-Column Executive Layout */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-3xl p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <UserPlus className="h-5 w-5 text-[var(--blue-600)] shrink-0" />
              Add System User
            </DialogTitle>
          </DialogHeader>

          {userErrorMsg && (
            <div className="p-2.5 text-xs rounded-md bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)]">
              {userErrorMsg}
            </div>
          )}

          <form onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2">
            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Staff Information */}
              <div className="space-y-3">
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Phone Number</Label>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">{phone.length}/10</span>
                    </div>
                    <Input 
                      placeholder="0911223344" 
                      value={phone} 
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      className="h-9 text-xs rounded-md font-mono"
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
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Fayda ID</Label>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      {faydaId.length}/16
                    </span>
                  </div>
                  <Input 
                    placeholder="1234567890123456" 
                    value={faydaId} 
                    maxLength={16}
                    onChange={(e) => setFaydaId(e.target.value.replace(/[^0-9]/g, "").slice(0, 16))}
                    className="h-9 text-xs rounded-md font-mono"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold">Password *</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <Input 
                        type={showUserPass ? "text" : "password"}
                        placeholder="Enter or generate" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-9 text-xs rounded-lg font-mono pr-10 w-full"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPass(!showUserPass)}
                        className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                        title={showUserPass ? "Hide password" : "View password"}
                      >
                        {showUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPassword(generateSecurePassword())}
                      title="Generate Password"
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--blue-50)] hover:bg-[var(--blue-100)] text-[var(--blue-600)] border border-[var(--blue-200)] transition-colors shrink-0 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(password, false)}
                      title="Copy Password"
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--blue-50)] hover:bg-[var(--blue-100)] text-[var(--blue-600)] border border-[var(--blue-200)] transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Branch & Property Assignments */}
              <div className="space-y-3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] md:pl-6 pt-3 md:pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[var(--blue-600)]" />
                      <span>Assign Branches *</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleSelectAllBranches(false)}
                      className="text-xs font-bold text-[var(--blue-700)] hover:text-[var(--blue-800)] hover:underline cursor-pointer px-2 py-0.5 rounded hover:bg-[var(--blue-50)] transition-colors"
                    >
                      {selectedBranchIds.length === branches.length ? "Deselect All" : "Select All Branches"}
                    </button>
                  </div>

                  {/* Branch Checkboxes List */}
                  <div className="rounded-md border border-[var(--border)] p-1.5 space-y-1 max-h-48 overflow-y-auto bg-[var(--surface)]">
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
                </div>

                {/* Primary / Home Branch Selector */}
                {selectedBranchIds.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[var(--border)]">
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
            </div>

            <DialogFooter className="pt-4 border-t border-[var(--border)] flex justify-end gap-2">
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

      {/* Edit User Dialog — Wide 2-Column Executive Layout */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-3xl p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
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

          <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-2">
            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Staff Information */}
              <div className="space-y-3">
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

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{editPhone.length}/10</span>
                  </div>
                  <Input 
                    placeholder="0911223344" 
                    value={editPhone} 
                    maxLength={10}
                    onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    className="h-9 text-xs rounded-md font-mono"
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
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Fayda ID</Label>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      {editFaydaId.length}/16
                    </span>
                  </div>
                  <Input 
                    placeholder="1234567890123456" 
                    value={editFaydaId} 
                    maxLength={16}
                    onChange={(e) => setEditFaydaId(e.target.value.replace(/[^0-9]/g, "").slice(0, 16))}
                    className="h-9 text-xs rounded-md font-mono"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Password</Label>
                    <span className="text-[10px] text-[var(--text-secondary)]">Leave empty to keep current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <Input 
                        type={showEditUserPass ? "text" : "password"}
                        placeholder="Enter or generate" 
                        value={editPassword} 
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="h-9 text-xs rounded-lg font-mono pr-10 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditUserPass(!showEditUserPass)}
                        className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                        title={showEditUserPass ? "Hide password" : "View password"}
                      >
                        {showEditUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditPassword(generateSecurePassword())}
                      title="Generate Password"
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--blue-50)] hover:bg-[var(--blue-100)] text-[var(--blue-600)] border border-[var(--blue-200)] transition-colors shrink-0 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(editPassword, true)}
                      title="Copy Password"
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--blue-50)] hover:bg-[var(--blue-100)] text-[var(--blue-600)] border border-[var(--blue-200)] transition-colors shrink-0 cursor-pointer"
                    >
                      {editCopiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Branch & Property Assignments */}
              <div className="space-y-3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] md:pl-6 pt-3 md:pt-0">
                <div className="space-y-2">
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

                  {/* Branch Checkboxes List */}
                  <div className="rounded-md border border-[var(--border)] p-1.5 space-y-1 max-h-48 overflow-y-auto bg-[var(--surface)]">
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
                </div>

                {/* Primary / Home Branch Selector */}
                {editBranchIds.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[var(--border)]">
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
            </div>

            <DialogFooter className="pt-4 border-t border-[var(--border)] flex justify-end gap-2">
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          DELETE USER CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
        <DialogContent className="sm:max-w-[440px] p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader className="pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-[var(--text-primary)]">
              Delete Staff Member
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[var(--text-secondary)] mt-1">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {userToDelete?.firstName} {userToDelete?.lastName}
              </span>{" "}
              ({userToDelete?.email})?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Irreversible Action</span>
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              This will revoke login credentials, unlink branch assignments, terminate active sessions, and remove this user from the staff directory.
            </p>
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUserToDelete(null)}
              disabled={deleteUserMutation.isPending}
              className="text-xs h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate(userToDelete.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
              className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white gap-1.5 rounded-lg shadow-sm"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog - Descriptive, Spacious, Categorized UI */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-[var(--text-primary)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--blue-50)] flex items-center justify-center text-[var(--blue-700)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span>Access Permissions</span>
              </DialogTitle>
              {roleName && (
                <span className="text-xs px-2.5 py-1 rounded-md font-mono bg-[var(--blue-50)] text-[var(--blue-700)] font-semibold border border-[var(--blue-200)]">
                  {roleName}
                </span>
              )}
            </div>
            <DialogDescription className="sr-only">Access Permissions</DialogDescription>
          </DialogHeader>

          {roleErrorMsg && (
            <div className="p-3 text-xs rounded-lg bg-[var(--red-50,#fef2f2)] text-[var(--red-600,#dc2626)] border border-[var(--red-200,#fecaca)] font-medium">
              {roleErrorMsg}
            </div>
          )}

          <form onSubmit={handleRoleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4 pt-1">
            <div className="space-y-4 overflow-y-auto flex-1 pr-1.5">
              {/* Role Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page,#f8fafc)]/60">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Role Name *</Label>
                  <Input 
                    placeholder="e.g. Front Office Manager" 
                    value={roleName} 
                    onChange={(e) => setRoleName(e.target.value)}
                    className="h-9 text-xs rounded-md bg-[var(--surface)]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[var(--text-primary)]">Access Scope *</Label>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                      {roleScope === "global" ? "🌐 All Properties" : "📌 Bound Branch"}
                    </span>
                  </div>
                  <select
                    value={roleScope}
                    onChange={(e) => setRoleScope(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--blue-600)]"
                  >
                    <option value="branch">Branch-Bound (Property Scope)</option>
                    <option value="global">Global (Chain-Wide / Multi-Branch)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Description</Label>
                  <Input 
                    placeholder="Operational responsibilities and duties" 
                    value={roleDesc} 
                    onChange={(e) => setRoleDesc(e.target.value)}
                    className="h-9 text-xs rounded-md bg-[var(--surface)]"
                  />
                </div>
              </div>

              {/* Permissions Action Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-[var(--blue-200,#bfdbfe)] bg-[var(--blue-50,#eff6ff)]/70">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-[var(--blue-950)] select-none">
                      <input 
                        type="checkbox"
                        checked={useDefaultPerms}
                        onChange={(e) => handleToggleDefaultPermissions(e.target.checked)}
                        className="h-5 w-5 rounded border-2 border-[var(--border)] text-[var(--blue-600)] focus:ring-[var(--blue-500)] cursor-pointer"
                      />
                      <span>Use Default Permissions for {roleName ? `"${roleName}"` : "this role"}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleToggleDefaultPermissions(true)}
                      className="text-xs font-bold text-[var(--blue-700)] hover:text-[var(--blue-800)] hover:underline flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1 rounded-md border border-[var(--blue-200)] shadow-xs"
                      title="Reset all permissions to the recommended default preset for this role"
                    >
                      <RotateCw className="h-3 w-3" /> Reset Defaults
                    </button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPermissions(["*"]);
                        setUseDefaultPerms(false);
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-[var(--border)] text-[var(--text-primary)] transition-colors cursor-pointer shadow-xs"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPermissions([]);
                        setUseDefaultPerms(false);
                      }}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-[var(--border)] text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                    <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-[var(--blue-600)] text-white">
                      {selectedPermissions.includes("*") ? "All 26 Enabled" : `${selectedPermissions.length} / ${ALL_PERMISSION_ITEMS.length} Enabled`}
                    </span>
                  </div>
                </div>

                {/* Filter Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search permissions by module name or keyword (e.g. housekeeping, invoices, pos)..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm bg-[var(--surface)] text-[var(--text-primary)] rounded-lg border border-[var(--border)] focus:border-[var(--blue-600)] focus:ring-1 focus:ring-[var(--blue-600)] outline-none"
                  />
                </div>
              </div>

              {/* Categorized Permissions Container */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map((group) => {
                  const filteredItems = group.items.filter((item) => {
                    if (!permissionSearch.trim()) return true;
                    const q = permissionSearch.toLowerCase();
                    return (
                      item.label.toLowerCase().includes(q) ||
                      item.desc.toLowerCase().includes(q) ||
                      item.id.toLowerCase().includes(q)
                    );
                  });

                  if (filteredItems.length === 0) return null;

                  const groupItemIds = group.items.map((i) => i.id);
                  const isAllGroupSelected = groupItemIds.every(
                    (id) => selectedPermissions.includes(id) || selectedPermissions.includes("*")
                  );

                  const defaultPerms = getDefaultPermissionsForRole(roleName);

                  return (
                    <div key={group.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2.5">
                      {/* Category Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <group.icon className="h-4 w-4 text-[var(--blue-600)]" />
                          <h4 className="text-sm font-bold text-[var(--text-primary)] tracking-wide uppercase">
                            {group.title}
                          </h4>
                          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                            ({filteredItems.length} {filteredItems.length === 1 ? "module" : "modules"})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isAllGroupSelected) {
                              if (selectedPermissions.includes("*")) {
                                const remaining = ALL_PERMISSION_ITEMS
                                  .filter((p) => !groupItemIds.includes(p.id) && p.id !== "*")
                                  .map((p) => p.id);
                                setSelectedPermissions(remaining);
                              } else {
                                setSelectedPermissions((prev) => prev.filter((id) => !groupItemIds.includes(id)));
                              }
                            } else {
                              setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupItemIds])));
                            }
                            setUseDefaultPerms(false);
                          }}
                          className="text-[11px] font-semibold text-[var(--blue-700)] hover:underline cursor-pointer"
                        >
                          {isAllGroupSelected ? "Deselect Group" : "Select Group"}
                        </button>
                      </div>

                      {/* Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filteredItems.map((perm) => {
                          const isChecked = selectedPermissions.includes("*") 
                            ? true 
                            : selectedPermissions.includes(perm.id);
                          const isDefault = defaultPerms.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-[var(--blue-50,#eff6ff)]/80 border-[var(--blue-300,#93c5fd)] shadow-xs text-[var(--text-primary)]"
                                  : "border-[var(--border)] hover:bg-[var(--bg-page,#f8fafc)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(perm.id)}
                                className="mt-0.5 h-5 w-5 rounded border-2 border-slate-300 text-[var(--blue-600)] focus:ring-[var(--blue-500)] cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                                    {perm.label}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isDefault && (
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--blue-100,#dbeafe)] text-[var(--blue-700,#1d4ed8)] border border-[var(--blue-200)]">
                                        Default
                                      </span>
                                    )}
                                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      {perm.id}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                                  {perm.desc}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[var(--border)] flex justify-between items-center sm:justify-between">
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {selectedPermissions.includes("*")
                  ? "⚠️ Full Super Admin Access Granted"
                  : `${selectedPermissions.length} operational permission(s) assigned`}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={closeRoleDialog} className="h-8 text-xs rounded-md">
                  Cancel
                </Button>
                <button 
                  type="submit" 
                  disabled={saveRoleMutation.isPending}
                  className="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white !text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:pointer-events-none"
                >
                  {saveRoleMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" />}
                  {editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
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

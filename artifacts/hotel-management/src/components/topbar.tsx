"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { apiFetch } from "@/lib/api";
import { Button } from "./ui/button";
import {
  LogOut,
  User,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  Sparkles,
  UtensilsCrossed,
  CreditCard,
  CalendarCheck,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type?: string;
  isRead?: boolean;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
};

const ROUTE_BREADCRUMBS: Record<string, string> = {
  "/dashboard": "Front Desk / Dashboard",
  "/guests": "Front Desk / Guests",
  "/room-types": "Room Setup / Room Types",
  "/room-categories": "Room Setup / Room Categories",
  "/bed-types": "Room Setup / Bed Types",
  "/room-amenities": "Room Setup / Amenities",
  "/room-pricing": "Room Setup / Pricing",
  "/rooms": "Front Desk / Rooms",
  "/reservations": "Front Desk / Reservations",
  "/housekeeping": "Operations / Housekeeping",
  "/maintenance": "Operations / Maintenance",
  "/restaurant": "Operations / Restaurant",
  "/pos": "Operations / POS",
  "/invoices": "Finance / Invoices",
  "/payments": "Finance / Payments",
  "/hr": "Admin / HR Management",
  "/users": "System / Staff & Users",
  "/roles": "System / Roles & Permissions",
  "/audit-logs": "System / Audit Logs",
};

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("housekeep") || t.includes("clean") || t.includes("room_ready")) {
    return <Sparkles className="w-3.5 h-3.5 text-cyan-600" />;
  }
  if (t.includes("restaurant") || t.includes("food") || t.includes("kitchen") || t.includes("order")) {
    return <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />;
  }
  if (t.includes("payment") || t.includes("invoice") || t.includes("cash") || t.includes("bill")) {
    return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
  }
  if (t.includes("reserv") || t.includes("checkin") || t.includes("checkout") || t.includes("guest")) {
    return <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />;
  }
  if (t.includes("alert") || t.includes("warn") || t.includes("urgent")) {
    return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  }
  return <Info className="w-3.5 h-3.5 text-[var(--blue-600)]" />;
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, activeBranch, branches, switchBranch, logout } = useAuth();

  const currentRole = (user?.role || (user as any)?.roleName || "Staff").toLowerCase();
  const isAdminOrManager = currentRole.includes("admin") || currentRole.includes("manager") || currentRole.includes("director");

  // Fetch notifications with automatic refetching every 20 seconds
  const { data: rawNotifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["navbar-notifications"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications/history"),
    refetchInterval: 20000,
  });

  // Filter notifications by target user and role relevance
  const filteredNotifications = useMemo(() => {
    return rawNotifications.filter((item) => {
      // 1. Direct recipient
      if (item.userId && user?.id && item.userId === user.id) return true;

      // 2. Broadcast / system messages
      if (item.userId === "system" || !item.userId) {
        // Admins and Managers receive all broadcast messages
        if (isAdminOrManager) return true;

        const notifType = (item.type || "").toLowerCase();
        // Role-targeted broadcast routing
        if (currentRole.includes("housekeep")) {
          return notifType.includes("housekeep") || notifType.includes("room");
        }
        if (currentRole.includes("cashier")) {
          return notifType.includes("payment") || notifType.includes("cash") || notifType.includes("invoice");
        }
        if (currentRole.includes("restaurant") || currentRole.includes("waiter") || currentRole.includes("kitchen")) {
          return notifType.includes("restaurant") || notifType.includes("food") || notifType.includes("order");
        }
        if (currentRole.includes("reception") || currentRole.includes("front")) {
          return notifType.includes("reserv") || notifType.includes("guest") || notifType.includes("check");
        }
        return false;
      }

      // Default: if admin/manager, show all notifications
      return isAdminOrManager;
    });
  }, [rawNotifications, user?.id, currentRole, isAdminOrManager]);

  const unreadCount = useMemo(() => {
    return filteredNotifications.filter((n) => !n.isRead).length;
  }, [filteredNotifications]);

  // Mark single notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navbar-notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () =>
      apiFetch("/notifications/mark-all-read", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["navbar-notifications"] });
    },
  });

  const currentBreadcrumb = (
    pathname === "/dashboard" ||
    pathname === "/hotel" ||
    pathname === "/branches" ||
    pathname === "/rooms" ||
    pathname === "/room-configs" ||
    pathname.startsWith("/rooms/") ||
    pathname === "/buildings" ||
    pathname === "/floors" ||
    pathname === "/users" ||
    pathname === "/roles" ||
    pathname === "/check-out" ||
    pathname === "/check-in" ||
    pathname === "/restaurant" ||
    pathname.startsWith("/stay")
  ) ? "" : (ROUTE_BREADCRUMBS[pathname] || "");

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10 transition-colors select-none">
      {/* Left: Breadcrumbs & Branch Switcher */}
      <div className="flex items-center gap-4">
        {/* Branch Switcher Dropdown */}
        {branches.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--blue-50)] transition-all text-xs font-semibold text-[var(--text-primary)] shadow-sm cursor-pointer"
                title="Switch Active Hotel Branch"
              >
                <Building2 className="w-3.5 h-3.5 text-[var(--blue-600)] flex-shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">
                  {activeBranch?.branchName || "Select Branch"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-70 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl">
              <DropdownMenuLabel className="text-[11px] font-semibold text-[var(--text-secondary)] px-2 py-1 uppercase tracking-wider">
                Assigned Branches ({branches.length})
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[var(--border)] my-1" />
              {branches.map((b) => {
                const isSelected = b.id === activeBranch?.id;
                return (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => switchBranch(b.id)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer text-xs transition-colors",
                      isSelected
                        ? "bg-[var(--blue-50)] text-[var(--blue-700)] font-semibold"
                        : "text-[var(--text-primary)] hover:bg-[var(--blue-50)]"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{b.branchName}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">{b.branchCode}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--blue-600)] flex-shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {currentBreadcrumb && (
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] hidden md:flex items-center gap-2">
            <span>{currentBreadcrumb}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Dynamic Role-Based Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--blue-50)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 stroke-[1.75]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl overflow-hidden"
          >
            {/* Popover Header */}
            <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[var(--text-primary)]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--blue-600)] hover:text-[var(--blue-700)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border)]">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--blue-50)] text-[var(--blue-600)] flex items-center justify-center mx-auto mb-2">
                    <Bell className="w-5 h-5 opacity-60" />
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">No notifications</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">You're all caught up!</p>
                </div>
              ) : (
                filteredNotifications.slice(0, 30).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n.id);
                    }}
                    className={cn(
                      "p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-[var(--blue-50)]",
                      !n.isRead && "bg-[var(--blue-50)]/50"
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)] shrink-0 font-mono">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[var(--blue-600)] shrink-0 mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Avatar / Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--blue-50)] transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--blue-700)] text-white font-bold text-xs flex items-center justify-center">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || "A"}
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] hidden sm:inline">
                {user?.name || "Admin"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="font-semibold text-sm text-[var(--text-primary)]">
                {user?.name || "Administrator"}
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono truncate">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--border)] my-1" />
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--blue-50)] text-sm text-[var(--text-primary)]"
            >
              <User className="w-4 h-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--border)] my-1" />
            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--red-50,#fef2f2)] text-sm text-[var(--red-600,#dc2626)]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

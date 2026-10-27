"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import {
  LogOut,
  User,
  Bell,
  Building2,
  Check,
  ChevronDown,
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

const ROUTE_BREADCRUMBS: Record<string, string> = {
  "/dashboard": "Front Desk / Dashboard",
  "/guests": "Front Desk / Guests",
  "/reservations": "Front Desk / Reservations",
  "/stay": "Front Office / Stay Management",
  "/check-out": "Front Office / Check-out",
  "/housekeeping": "Operations / Housekeeping",
  "/maintenance": "Operations / Maintenance",
  "/restaurant": "Operations / Restaurant",
  "/pos": "Operations / POS",
  "/invoices": "Finance / Invoices",
  "/payments": "Finance / Payments",
  "/users": "System / Staff & Users",
  "/roles": "System / Roles & Permissions",
};

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeBranch, branches, switchBranch, logout } = useAuth();
  const [guestAlerts, setGuestAlerts] = useState<any[]>([]);

  const currentBreadcrumb = (pathname === "/hotel" || pathname === "/branches" || pathname === "/rooms" || pathname === "/room-configs" || pathname.startsWith("/rooms/") || pathname === "/buildings" || pathname === "/floors" || pathname === "/users" || pathname === "/roles") ? "" : (ROUTE_BREADCRUMBS[pathname] || "");

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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--blue-50)] transition-all text-xs font-semibold text-[var(--text-primary)] shadow-sm"
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
        {/* Quiet Notifications Icon with subtle Badge */}
        <button
          type="button"
          onClick={() => router.push("/notifications")}
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--blue-50)] border border-transparent hover:border-[var(--border)] transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4 stroke-[1.5]" />
          {guestAlerts.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--blue-600)]" />
          )}
        </button>

        {/* Profile Avatar / Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--blue-50)] transition-all"
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

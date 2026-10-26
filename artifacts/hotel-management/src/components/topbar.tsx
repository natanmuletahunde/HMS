"use client";

import { useState, useEffect, useRef } from "react";
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
import { apiFetch } from "@/lib/api";

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
};

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [guestAlerts, setGuestAlerts] = useState<any[]>([]);

  const currentBreadcrumb = (pathname === "/hotel" || pathname === "/branches" || pathname === "/rooms" || pathname === "/room-configs" || pathname.startsWith("/rooms/") || pathname === "/buildings" || pathname === "/floors") ? "" : (ROUTE_BREADCRUMBS[pathname] || "");

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10 transition-colors select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-3">
        {currentBreadcrumb && (
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] flex items-center gap-2">
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
              <User className="w-4 h-4 text-[var(--text-secondary)]" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/hotel")}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--blue-50)] text-sm text-[var(--text-primary)]"
            >
              <Building2 className="w-4 h-4 text-[var(--text-secondary)]" /> Hotel Setup
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[var(--border)] my-1" />
            <DropdownMenuItem
              onClick={logout}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--status-danger-bg)] text-sm text-[var(--danger-text,#B42318)]"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

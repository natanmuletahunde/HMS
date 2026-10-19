"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import { LogOut, User, Globe, Sun, Moon, Monitor, Palette, Users, Shield, Check, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useLocaleContext, LOCALES, type Locale } from "@/lib/i18n";
import { setTheme, type Theme, getStoredTheme } from "@/lib/theme";
import { getRoleInfo, normalizeRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const THEME_OPTIONS: { value: Theme; label: string; icon: any }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "custom", label: "System", icon: Monitor },
];

const SWITCH_ROLES = [
  { name: "Front Desk Receptionist", email: "receptionist@nexushms.com", role: "Front Desk", pass: "Nexus@1234", desc: "Check-in, guests, folio settlement" },
  { name: "Housekeeping Staff", email: "housekeeper@nexushms.com", role: "Housekeeping", pass: "Nexus@1234", desc: "Room cleaning board & readiness" },
  { name: "Maintenance Engineer", email: "maintenance@nexushms.com", role: "Maintenance", pass: "Nexus@1234", desc: "Engineering tickets & repair orders" },
  { name: "POS Cashier & F&B", email: "cashier@nexushms.com", role: "Cashier", pass: "Nexus@1234", desc: "Dining orders & register sales" },
  { name: "Hotel General Manager", email: "manager@nexushms.com", role: "Manager", pass: "Nexus@1234", desc: "Occupancy, revenue & approvals" },
  { name: "System Administrator", email: "admin@nexushms.com", role: "Admin", pass: "Admin@1234", desc: "Full multi-tenant infrastructure" },
];

export function Topbar() {
  const { user, login, logout, toggleOnDuty } = useAuth();
  const { locale, setLocale } = useLocaleContext();
  const [switching, setSwitching] = useState(false);
  const [currentTheme, setCurrentThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? getStoredTheme() : "dark"
  );

  const currentRole = user?.role || (user as any)?.roleName || "Staff";
  const roleInfo = getRoleInfo(currentRole);

  const handleRoleSwitch = async (roleItem: typeof SWITCH_ROLES[0]) => {
    if (user?.email === roleItem.email) return;
    try {
      setSwitching(true);
      const res = await apiFetch<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: roleItem.email, password: roleItem.pass }),
      });
      if (res.accessToken && res.user) {
        login(res.accessToken, res.user);
      }
    } catch (e: any) {
      console.error("Failed to switch role:", e);
    } finally {
      setSwitching(false);
    }
  };

  const handleTheme = (theme: Theme) => {
    setTheme(theme);
    setCurrentThemeState(theme);
  };

  const currentLocale = LOCALES.find(l => l.code === locale);
  const currentThemeOpt = THEME_OPTIONS.find(t => t.value === currentTheme) ?? THEME_OPTIONS[0];
  const ThemeIcon = currentThemeOpt.icon;
  const isOnDuty = user?.isOnDuty !== false;

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface border-b border-border sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Role Portal Badge */}
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border", roleInfo.badgeClass)}>
          <span className="h-2 w-2 rounded-full bg-current" />
          <span>{roleInfo.badge}</span>
        </div>

        {/* Staff Working Presence ON/OFF Indicator */}
        <button
          type="button"
          onClick={toggleOnDuty}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isOnDuty
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20"
          }`}
          title="Click to toggle staff presence (SRS 3.1.1)"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isOnDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`}
          />
          <span>{isOnDuty ? "ON DUTY" : "OFF DUTY"}</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch Role Quick Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs font-medium border-border/80 h-9" disabled={switching}>
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
              <span className="hidden md:inline">Switch Role</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs text-text-muted">
              Select Staff Role (Role-Based Testing)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SWITCH_ROLES.map((r) => {
              const isCurrent = user?.email === r.email;
              return (
                <DropdownMenuItem
                  key={r.email}
                  onClick={() => handleRoleSwitch(r)}
                  className={cn("flex flex-col items-start py-2 cursor-pointer", isCurrent && "bg-primary/10 text-primary")}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs">{r.name}</span>
                    {isCurrent && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                  </div>
                  <span className="text-[11px] text-text-muted mt-0.5">{r.desc}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-text-muted hover:text-text h-9 px-2">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium hidden sm:inline">{currentLocale?.nativeLabel ?? "EN"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-text-muted">Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LOCALES.map((loc) => (
              <DropdownMenuItem
                key={loc.code}
                onClick={() => setLocale(loc.code as Locale)}
                className={locale === loc.code ? "text-primary bg-primary/10" : ""}
              >
                <span className="flex-1">{loc.nativeLabel}</span>
                <span className="text-xs text-text-muted">{loc.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-text-muted hover:text-text h-9 w-9 p-0">
              <ThemeIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs text-text-muted">Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => handleTheme(value)}
                className={currentTheme === value ? "text-primary bg-primary/10" : ""}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-muted">
              <User className="h-5 w-5 text-text-muted" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || "Admin"}</p>
                <p className="text-xs leading-none text-text-muted">
                  {user?.email || "admin@nexushms.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger focus:bg-danger/10 focus:text-danger cursor-pointer" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

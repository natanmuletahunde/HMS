"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import { LogOut, User, Globe, Sun, Moon, Monitor, Palette } from "lucide-react";
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

const THEME_OPTIONS: { value: Theme; label: string; icon: any }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "custom", label: "System", icon: Monitor },
];

export function Topbar() {
  const { user, logout, toggleOnDuty } = useAuth();
  const { locale, setLocale } = useLocaleContext();
  const [currentTheme, setCurrentThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? getStoredTheme() : "dark"
  );

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
      <div className="flex items-center gap-4">
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

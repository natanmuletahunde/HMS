"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";
import {
  LogOut,
  User,
  Globe,
  Sun,
  Moon,
  Monitor,
  Palette,
  Users,
  Shield,
  Check,
  Bell,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Utensils,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useLocaleContext, LOCALES, type Locale } from "@/lib/i18n";
import { setTheme, type Theme, getStoredTheme } from "@/lib/theme";
import { normalizeRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const THEME_OPTIONS: { value: Theme; label: string; icon: any }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "custom", label: "System", icon: Monitor },
];

export function Topbar() {
  const router = useRouter();
  const { user, logout, toggleOnDuty } = useAuth();
  const { locale, setLocale } = useLocaleContext();
  const [currentTheme, setCurrentThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? getStoredTheme() : "dark"
  );

  // Real-Time Guest Alerts & Notification Audio
  const [guestAlerts, setGuestAlerts] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const prevAlertIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Play Web Audio chime for incoming guest requests
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Poll for active requested room services
  const pollAlerts = async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await apiFetch<any[]>("/room-service?status=requested");
      if (Array.isArray(res)) {
        setGuestAlerts(res);
        const currentIds = new Set(res.map((r) => r.id));
        // Check for new incoming requests
        if (!initialLoadRef.current && soundEnabled) {
          const hasNew = res.some((r) => !prevAlertIdsRef.current.has(r.id));
          if (hasNew) {
            playAlertChime();
          }
        }
        prevAlertIdsRef.current = currentIds;
        initialLoadRef.current = false;
      }
    } catch {
      // Best-effort polling
    }
  };

  useEffect(() => {
    pollAlerts();
    const interval = setInterval(pollAlerts, 15000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleAcceptRequest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcceptingId(id);
    try {
      await apiFetch(`/room-service/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      });
      await pollAlerts();
    } catch (err: any) {
      console.error("Failed to accept order:", err);
    } finally {
      setAcceptingId(null);
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
        {/* Real-time In-House Guest Alerts Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={guestAlerts.length > 0 ? "outline" : "ghost"}
              size="sm"
              className={cn(
                "relative h-9 px-2.5 gap-1.5 transition-all",
                guestAlerts.length > 0
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 shadow-sm"
                  : "text-text-muted hover:text-text"
              )}
              title={`${guestAlerts.length} pending guest requests`}
            >
              <Bell className={cn("h-4 w-4", guestAlerts.length > 0 && "animate-bounce text-amber-400")} />
              {guestAlerts.length > 0 && (
                <>
                  <span className="hidden sm:inline text-xs font-bold text-amber-300">
                    {guestAlerts.length} {guestAlerts.length === 1 ? "Order" : "Orders"}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-border bg-surface">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Utensils className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text">In-House Guest Alerts</h4>
                  <p className="text-[10px] text-text-muted">Live room service & stay requests</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-text-muted hover:text-text"
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  title={soundEnabled ? "Mute alert chime" : "Unmute alert chime"}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-text-muted" />
                  )}
                </Button>
                {guestAlerts.length > 0 && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                    {guestAlerts.length} Pending
                  </Badge>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
              {guestAlerts.length === 0 ? (
                <div className="p-6 text-center text-text-muted space-y-1">
                  <Check className="h-6 w-6 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-xs font-medium text-text">No Pending Guest Requests</p>
                  <p className="text-[11px]">All active in-house room orders are handled.</p>
                </div>
              ) : (
                guestAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 hover:bg-muted/40 transition-colors flex items-start justify-between gap-2.5 cursor-pointer"
                    onClick={() => router.push("/stay?tab=room-service")}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[11px] font-bold">
                          Room {alert.roomNumber}
                        </span>
                        <span className="text-xs font-semibold text-text truncate">
                          {alert.guestName || "Guest"}
                        </span>
                        <span className="text-[10px] text-text-muted ml-auto shrink-0">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-text/90 line-clamp-2">
                        {alert.description || "Room Service Request"}
                      </p>
                      {alert.specialInstructions && (
                        <p className="text-[11px] text-amber-400/90 italic truncate">
                          Note: "{alert.specialInstructions}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 self-center">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={acceptingId === alert.id}
                        onClick={(e) => handleAcceptRequest(alert.id, e)}
                      >
                        {acceptingId === alert.id ? "Accepting..." : "Accept"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-border bg-muted/20 flex flex-col gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs font-medium justify-between border-border/80"
                onClick={() => router.push("/stay?tab=room-service")}
              >
                <span>Open Stay & Room Services Hub</span>
                <ExternalLink className="h-3 w-3 text-text-muted" />
              </Button>
              <Link
                href="/guest-portal"
                target="_blank"
                className="text-[11px] text-center text-primary hover:underline flex items-center justify-center gap-1 py-0.5"
              >
                <span>Open In-Room Guest Portal (`/guest-portal`)</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
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

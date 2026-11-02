"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Circle, Calendar, Bell, Filter, 
  Check, CheckCheck, Clock, ArrowLeft, ArrowRight
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type Notification = {
  id: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  type?: string;
};

type TimeFilter = "today" | "yesterday" | "week" | "all";

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = { TODAY: [], YESTERDAY: [], EARLIER: [] };
  for (const n of notifications) {
    const d = n.createdAt ? new Date(n.createdAt) : new Date();
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups.TODAY.push(n);
    else if (d.getTime() === yesterday.getTime()) groups.YESTERDAY.push(n);
    else groups.EARLIER.push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dropdown time filter: default MUST be "today"
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");

  const userId = "";

  const { data: notificationsRaw = [], isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ["notifications-history", userId],
    queryFn: () => apiFetch<Notification[]>(`/notifications/history${userId ? `?userId=${userId}` : ""}`),
    refetchInterval: 15000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "PATCH", body: JSON.stringify({ userId }) }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] }); 
      toast({ title: "All notifications marked as read" }); 
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications-history"] }); },
  });

  // Calculate counts for each time filter bucket
  const timeCounts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    let todayCount = 0;
    let yesterdayCount = 0;
    let weekCount = 0;

    for (const n of notificationsRaw) {
      if (!n.createdAt) continue;
      const d = new Date(n.createdAt).getTime();
      if (d >= todayStart) todayCount++;
      else if (d >= yesterdayStart && d < todayStart) yesterdayCount++;
      if (d >= weekStart) weekCount++;
    }

    return {
      today: todayCount,
      yesterday: yesterdayCount,
      week: weekCount,
      all: notificationsRaw.length,
    };
  }, [notificationsRaw]);

  // Filter notifications based on selected time filter (default: "today")
  const filteredNotifications = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    return notificationsRaw.filter((n) => {
      if (!n.createdAt) return timeFilter === "all";
      const d = new Date(n.createdAt).getTime();

      if (timeFilter === "today") {
        return d >= todayStart;
      }
      if (timeFilter === "yesterday") {
        return d >= yesterdayStart && d < todayStart;
      }
      if (timeFilter === "week") {
        return d >= weekStart;
      }
      return true; // "all"
    });
  }, [notificationsRaw, timeFilter]);

  // PAGINATION: Strict limit of 5 notifications per page
  const notificationsPagination = usePagination(filteredNotifications, 5);

  // Reset to page 1 whenever the time filter changes
  useEffect(() => {
    notificationsPagination.setCurrentPage(1);
  }, [timeFilter]);

  // Group currently paginated items by date (TODAY, YESTERDAY, EARLIER)
  const paginatedGrouped = useMemo(() => {
    return groupByDate(notificationsPagination.paginatedItems);
  }, [notificationsPagination.paginatedItems]);

  // Helper to render type icons matching the uploaded design
  const getNotificationIcon = (n: Notification) => {
    const text = `${n.type || ""} ${n.title || ""}`.toLowerCase();
    if (text.includes("booking") || text.includes("reservation") || text.includes("online")) {
      return <span className="text-amber-500 text-sm shrink-0">☀️</span>;
    }
    if (text.includes("checkout") || text.includes("inspection") || text.includes("room") || text.includes("stay")) {
      return <span className="text-amber-600 text-sm shrink-0">🛎️</span>;
    }
    if (text.includes("kitchen") || text.includes("food") || text.includes("order") || text.includes("dining")) {
      return <span className="text-red-500 text-sm shrink-0">🍳</span>;
    }
    if (text.includes("payment") || text.includes("invoice") || text.includes("chapa") || text.includes("folio")) {
      return <span className="text-emerald-500 text-sm shrink-0">💳</span>;
    }
    if (text.includes("maintenance") || text.includes("repair")) {
      return <span className="text-blue-500 text-sm shrink-0">🔧</span>;
    }
    if (text.includes("alert") || text.includes("warning") || text.includes("urgent")) {
      return <span className="text-red-500 text-sm shrink-0">⚠️</span>;
    }
    return <span className="text-primary text-sm shrink-0">🔔</span>;
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Title, Date Filter Dropdown (Default: Today), Mark All Read */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Notifications</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Dropdown Input: Time Filter (Default: Today) */}
          <Select value={timeFilter} onValueChange={(val) => setTimeFilter(val as TimeFilter)}>
            <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl border-border bg-surface font-semibold shadow-2xs">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border rounded-xl shadow-lg">
              <SelectItem value="today" className="text-xs font-semibold cursor-pointer">
                Today
              </SelectItem>
              <SelectItem value="yesterday" className="text-xs font-semibold cursor-pointer">
                Yesterday
              </SelectItem>
              <SelectItem value="week" className="text-xs font-semibold cursor-pointer">
                Last 7 Days
              </SelectItem>
              <SelectItem value="all" className="text-xs font-semibold cursor-pointer">
                All Time
              </SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => markAllReadMutation.mutate()} 
            disabled={markAllReadMutation.isPending || notificationsRaw.length === 0}
            className="h-9 text-xs font-semibold gap-1.5 shadow-xs"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-text-muted" />
            )}
            Mark All Read
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. NOTIFICATIONS STREAM (Paginated at 8 limit, Date Filtered)              */}
      {/* ========================================================================= */}
      <div className="space-y-4">

        {notifLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-text-muted font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-border rounded-2xl bg-surface/40 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-text">
              {timeFilter === "today" 
                ? "No notifications received Today yet." 
                : timeFilter === "yesterday" 
                ? "No notifications found for Yesterday." 
                : "No notifications found in this period."}
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {timeFilter === "today" && timeCounts.yesterday > 0
                ? `You have ${timeCounts.yesterday} notifications stored from Yesterday and ${timeCounts.all} overall.`
                : "New reservation alerts, inspection requests, and payment notifications will appear here automatically."}
            </p>
            {timeFilter === "today" && timeCounts.yesterday > 0 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" className="text-xs font-semibold" onClick={() => setTimeFilter("yesterday")}>
                  View Yesterday ({timeCounts.yesterday}) →
                </Button>
                <Button size="sm" variant="ghost" className="text-xs font-semibold" onClick={() => setTimeFilter("all")}>
                  View All ({timeCounts.all})
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
            {/* Grouped by Date (TODAY, YESTERDAY, EARLIER) */}
            <div className="divide-y divide-border">
              {Object.entries(paginatedGrouped).map(([group, items]) =>
                items.length > 0 ? (
                  <div key={group}>
                    <div className="bg-muted/30 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-text-muted border-b border-border">
                      {group}
                    </div>
                    <div className="divide-y divide-border">
                      {items.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            n.isRead ? "hover:bg-muted/30" : "bg-primary/[0.02] hover:bg-primary/[0.05]"
                          }`}
                          onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Dot indicator */}
                            <Circle 
                              className={`h-2.5 w-2.5 shrink-0 fill-current ${
                                n.isRead ? "text-slate-300 dark:text-muted" : "text-primary fill-primary"
                              }`} 
                            />

                            {/* Type Icon */}
                            <div className="shrink-0">
                              {getNotificationIcon(n)}
                            </div>

                            {/* Title ONLY */}
                            <p className={`text-xs sm:text-sm truncate ${n.isRead ? "text-text font-medium" : "font-bold text-text"}`}>
                              {n.title ?? "Notification Alert"}
                            </p>
                          </div>

                          {/* Timestamp */}
                          <span className="text-xs text-text-muted font-mono font-medium shrink-0 ml-4">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {/* PAGINATION CONTROLS inside the SAME container: Only <- and -> icons, no text */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-text-muted select-none">
              <div>
                Showing <span className="font-semibold text-text">{Math.min((notificationsPagination.currentPage - 1) * 8 + 1, filteredNotifications.length)}</span> to{" "}
                <span className="font-semibold text-text">{Math.min(notificationsPagination.currentPage * 8, filteredNotifications.length)}</span> of{" "}
                <span className="font-semibold text-text">{filteredNotifications.length}</span> notifications
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted"
                  onClick={notificationsPagination.onPrev}
                  disabled={!notificationsPagination.hasPrev}
                  title="Previous"
                  aria-label="Previous"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <span className="text-xs font-semibold px-2 text-text font-mono">
                  {notificationsPagination.currentPage} / {notificationsPagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted"
                  onClick={notificationsPagination.onNext}
                  disabled={!notificationsPagination.hasNext}
                  title="Next"
                  aria-label="Next"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

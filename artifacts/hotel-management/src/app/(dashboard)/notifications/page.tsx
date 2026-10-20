"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Circle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

type NotificationTemplate = {
  id: string;
  code?: string;
  name?: string;
  channel?: string;
  type?: string;
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
};

type TabType = "notifications" | "templates" | "broadcast";

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of notifications) {
    const d = n.createdAt ? new Date(n.createdAt) : new Date();
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups.Today.push(n);
    else if (d.getTime() === yesterday.getTime()) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  }
  return groups;
}

const CHANNEL_BADGE: Record<string, string> = {
  in_app: "info",
  email: "success",
  sms: "warning",
  push: "secondary",
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>("notifications");

  // Template state
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<NotificationTemplate | null>(null);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("general");
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);

  const userId = "";

  const { data: notificationsRaw = [], isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ["notifications-history", userId],
    queryFn: () => apiFetch<Notification[]>(`/notifications/history${userId ? `?userId=${userId}` : ""}`),
    enabled: tab === "notifications",
  });

  const { data: templates = [], isLoading: tplLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ["notification-templates"],
    queryFn: () => apiFetch<NotificationTemplate[]>("/notifications/templates"),
    enabled: tab === "templates",
  });

  const templatesPagination = usePagination(templates, 5);

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "PATCH", body: JSON.stringify({ userId }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications-history"] }); toast({ title: "All marked as read" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications-history"] }); },
  });

  const addTemplateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/notifications/templates", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notification-templates"] }); setIsAddTemplateOpen(false); toast({ title: "Template created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editTemplateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/notifications/templates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notification-templates"] }); setEditTemplate(null); toast({ title: "Template updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const broadcastMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/notifications/broadcast", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { setConfirmBroadcast(false); setBroadcastTitle(""); setBroadcastMessage(""); toast({ title: "Broadcast sent" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const grouped = groupByDate(notificationsRaw);

  const TABS: { key: TabType; label: string }[] = [
    { key: "notifications", label: "My Notifications" },
    { key: "templates", label: "Templates" },
    { key: "broadcast", label: "Broadcast" },
  ];

  function TemplateForm({ onSubmit, isPending, defaultValues }: { onSubmit: (data: Record<string, unknown>) => void; isPending: boolean; defaultValues?: NotificationTemplate }) {
    return (
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const body: Record<string, unknown> = {};
        fd.forEach((v, k) => { if (v !== "") body[k] = v; });
        if (body.variables) body.variables = String(body.variables).split(",").map((s: string) => s.trim()).filter(Boolean);
        onSubmit(body);
      }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Code</Label>
            <Input name="code" defaultValue={defaultValues?.code ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input name="name" defaultValue={defaultValues?.name ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label>Channel</Label>
            <select name="channel" defaultValue={defaultValues?.channel ?? "in_app"} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="in_app">In App</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Input name="type" defaultValue={defaultValues?.type ?? ""} placeholder="e.g. reservation_confirmed" />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label>Subject</Label>
            <Input name="subject" defaultValue={defaultValues?.subject ?? ""} />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label>Body</Label>
            <textarea name="body" rows={3} defaultValue={defaultValues?.body ?? ""} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label>Variables (comma-separated)</Label>
            <Input name="variables" defaultValue={defaultValues?.variables?.join(", ") ?? ""} placeholder="guestName, reservationId..." />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Save Changes" : "Create Template"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {tab === "notifications" && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            {markAllReadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark All Read
          </Button>
        )}
        {tab === "templates" && (
          <Button onClick={() => setIsAddTemplateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Template
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* MY NOTIFICATIONS TAB */}
      {tab === "notifications" && (
        <div className="space-y-6">
          {notifLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-text-muted" /></div>
          ) : notificationsRaw.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No notifications found.</div>
          ) : (
            Object.entries(grouped).map(([group, items]) =>
              items.length > 0 ? (
                <div key={group} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{group}</h2>
                  <div className="rounded-lg border border-border bg-surface divide-y divide-border overflow-hidden">
                    {items.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
                      >
                        <Circle className={`h-2.5 w-2.5 mt-1.5 shrink-0 fill-current ${n.isRead ? "text-muted-foreground" : "text-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.isRead ? "text-text-muted" : "font-semibold"}`}>{n.title ?? "Notification"}</p>
                          {n.message && <p className="text-xs text-text-muted mt-0.5">{n.message}</p>}
                        </div>
                        <span className="text-xs text-text-muted shrink-0">{n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )
          )}
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === "templates" && (
        <div className="rounded-md border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tplLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>{[...Array(6)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-text-muted">No templates found.</TableCell></TableRow>
              ) : templatesPagination.paginatedItems.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{t.code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{t.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(CHANNEL_BADGE[t.channel ?? ""] ?? "secondary") as any} className="text-[10px] capitalize">{t.channel?.replace(/_/g, " ") ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{t.type ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={(t.isActive ? "success" : "secondary") as any} className="text-[10px]">{t.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditTemplate(t)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination {...templatesPagination} pageSize={5} />
        </div>
      )}

      {/* BROADCAST TAB */}
      {tab === "broadcast" && (
        <div className="max-w-lg">
          <Card className="bg-surface/50 border border-border rounded-lg p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Send Broadcast</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Input value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)} placeholder="e.g. general, alert, promo" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Title *</Label>
                  <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Broadcast title..." />
                </div>
                <div className="grid gap-1.5">
                  <Label>Message *</Label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={4}
                    className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="Write your broadcast message..."
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!broadcastTitle || !broadcastMessage}
                  onClick={() => setConfirmBroadcast(true)}
                >
                  Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Template Dialog */}
      <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Notification Template</DialogTitle></DialogHeader>
          <TemplateForm onSubmit={addTemplateMutation.mutate} isPending={addTemplateMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          {editTemplate && (
            <TemplateForm
              onSubmit={(body) => editTemplateMutation.mutate({ id: editTemplate.id, body })}
              isPending={editTemplateMutation.isPending}
              defaultValues={editTemplate}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Broadcast Confirm Dialog */}
      <Dialog open={confirmBroadcast} onOpenChange={setConfirmBroadcast}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Broadcast</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-text-muted">Are you sure you want to send this broadcast to all users?</p>
            <div className="bg-muted/30 rounded-md p-3 space-y-1">
              <p className="font-semibold text-sm">{broadcastTitle}</p>
              <p className="text-xs text-text-muted">{broadcastMessage}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmBroadcast(false)}>Cancel</Button>
              <Button className="flex-1" disabled={broadcastMutation.isPending} onClick={() => broadcastMutation.mutate({ type: broadcastType, title: broadcastTitle, message: broadcastMessage })}>
                {broadcastMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

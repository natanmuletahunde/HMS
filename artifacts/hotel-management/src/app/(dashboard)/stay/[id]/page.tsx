"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Bed,
  User,
  History,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StayChangeDetail = {
  id: string;
  reservationId?: string;
  guestId?: string;
  reservationNumber?: string;
  guestName?: string;
  actionType?: string;
  fromRoomNumber?: string;
  toRoomNumber?: string;
  createdAt?: string;
  reason?: string;
  performedBy?: string;
  newCheckOut?: string;
};

const ACTION_META: Record<string, { label: string; variant: "default" | "info" | "warning" | "success" | "muted"; desc: string }> = {
  room_upgrade: { label: "Room Upgrade", variant: "success", desc: "Guest moved to a higher-tier room category" },
  room_downgrade: { label: "Room Downgrade", variant: "warning", desc: "Guest adjusted to a different room category" },
  room_transfer: { label: "Room Transfer", variant: "info", desc: "Guest transferred to another room in the same category" },
  extend_stay: { label: "Extend Stay", variant: "default", desc: "Reservation departure date extended" },
  shorten_stay: { label: "Shorten Stay", variant: "muted", desc: "Reservation departure date moved earlier" },
};

export default function StayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: change, isLoading, error } = useQuery<StayChangeDetail>({
    queryKey: ["stay-change-detail", id],
    queryFn: () => apiFetch<StayChangeDetail>(`/stay-management/${id}`),
  });

  const act = ACTION_META[change?.actionType ?? ""] || {
    label: change?.actionType?.replace(/_/g, " ") ?? "Stay Modification",
    variant: "muted",
    desc: "Stay adjustment record",
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !change) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Button variant="outline" size="icon" onClick={() => router.push("/stay/history")} className="h-9 w-9" title="Back to History" aria-label="Back to History">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold">Record Not Found</h2>
          <p className="text-sm text-text-muted mt-1">The requested stay modification record could not be found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/stay/history")}
            className="h-9 w-9"
            title="Back to Stay History"
            aria-label="Back to Stay History"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Stay Modification Detail
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/stay")}
            className="h-9 text-xs"
          >
            Go to Stay Hub &rarr;
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="rounded-xl overflow-hidden border-border">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-text">Record #{change.id.slice(0, 8)}</span>
                <Badge variant={act.variant} className="text-xs">
                  {act.label}
                </Badge>
              </div>
              <p className="text-xs text-text-muted">{act.desc}</p>
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {change.createdAt
                  ? new Date(change.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Key Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-surface border border-border">
              <div className="text-xs text-text-muted flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span>Reservation Reference</span>
              </div>
              <div className="font-mono text-sm font-bold text-text">
                {change.reservationNumber || "—"}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface border border-border">
              <div className="text-xs text-text-muted flex items-center gap-1.5 mb-1">
                <User className="h-3.5 w-3.5" />
                <span>Guest Name</span>
              </div>
              <div className="text-sm font-semibold text-text">
                {change.guestName || "Registered Guest"}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface border border-border">
              <div className="text-xs text-text-muted flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Requested / Performed By</span>
              </div>
              <div className="text-sm font-semibold text-text">
                {change.performedBy === "Guest Self-Service" ? (
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> In-Room Guest Portal
                  </Badge>
                ) : (
                  <span>{change.performedBy || "Front Desk Staff"}</span>
                )}
              </div>
            </div>
          </div>

          {/* Room Allocation / Date Change Comparison */}
          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Bed className="h-4 w-4" /> Room Allocation & Stay Adjustments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface border border-border">
                <div className="text-xs text-text-muted">Previous Room</div>
                <div className="text-base font-bold mt-0.5">
                  {change.fromRoomNumber ? `Room ${change.fromRoomNumber}` : "Initial Allocation"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-border">
                <div className="text-xs text-text-muted">Assigned New Room</div>
                <div className="text-base font-bold text-primary mt-0.5">
                  {change.toRoomNumber ? `Room ${change.toRoomNumber}` : "Unchanged"}
                </div>
              </div>
            </div>
            {change.newCheckOut && (
              <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-muted">Adjusted Departure Date</div>
                  <div className="text-sm font-bold mt-0.5">
                    {new Date(change.newCheckOut).toLocaleDateString([], {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <Calendar className="h-5 w-5 text-primary opacity-60" />
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reason & Audit Notes
            </h3>
            <div className="p-4 rounded-lg bg-muted/20 border border-border text-sm leading-relaxed text-text">
              {change.reason || "Routine stay adjustment recorded by front desk operations."}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

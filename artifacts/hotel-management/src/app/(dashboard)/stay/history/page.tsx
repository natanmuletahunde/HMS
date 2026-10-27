"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  History,
  Search,
  Bed,
  Calendar,
  Sparkles,
  Eye,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";

type StayChange = {
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

type StayListResponse = {
  data: StayChange[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "info" | "warning" | "success" | "muted" }> = {
  room_upgrade: { label: "Room Upgrade", variant: "success" },
  room_downgrade: { label: "Room Downgrade", variant: "warning" },
  room_transfer: { label: "Room Transfer", variant: "info" },
  extend_stay: { label: "Extend Stay", variant: "default" },
  shorten_stay: { label: "Shorten Stay", variant: "muted" },
};

export default function StayHistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: stayChangesData, isLoading } = useQuery<StayListResponse>({
    queryKey: ["stay-management-history-all"],
    queryFn: () => apiFetch<StayListResponse>("/stay-management?limit=250"),
  });

  const allChanges: StayChange[] = useMemo(() => {
    if (!stayChangesData) return [];
    if (Array.isArray(stayChangesData.data)) return stayChangesData.data;
    if (Array.isArray(stayChangesData)) return stayChangesData;
    return [];
  }, [stayChangesData]);

  const filteredChanges = useMemo(() => {
    return allChanges.filter((item) => {
      if (actionFilter !== "all" && item.actionType !== actionFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const resNum = (item.reservationNumber || "").toLowerCase();
        const gName = (item.guestName || "").toLowerCase();
        const fromR = (item.fromRoomNumber || "").toLowerCase();
        const toR = (item.toRoomNumber || "").toLowerCase();
        const rsn = (item.reason || "").toLowerCase();
        if (
          !resNum.includes(q) &&
          !gName.includes(q) &&
          !fromR.includes(q) &&
          !toR.includes(q) &&
          !rsn.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allChanges, search, actionFilter]);

  const pagination = usePagination<StayChange>(filteredChanges, 10);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/stay")}
            className="h-9 w-9"
            title="Back to Stay Hub"
            aria-label="Back to Stay Hub"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Stay Modifications History
            </h1>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <div className="relative min-w-[240px] flex-1 sm:flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <Input
            placeholder="Search by Res #, guest name, or room..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pagination.setCurrentPage(1);
            }}
            className="pl-8 h-10 text-xs"
          />
        </div>

        <Select
          value={actionFilter}
          onValueChange={(val) => {
            setActionFilter(val);
            pagination.setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] h-10 text-xs">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="room_upgrade">Room Upgrade</SelectItem>
            <SelectItem value="room_downgrade">Room Downgrade</SelectItem>
            <SelectItem value="room_transfer">Room Transfer</SelectItem>
            <SelectItem value="extend_stay">Extend Stay</SelectItem>
            <SelectItem value="shorten_stay">Shorten Stay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main History Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border border-border bg-surface overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Res #</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>From Room</TableHead>
                  <TableHead>To Room</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredChanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-text-muted">
                      No stay modification records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((change) => {
                    const actMeta = ACTION_LABELS[change.actionType ?? ""] || {
                      label: change.actionType?.replace(/_/g, " ") ?? "Modification",
                      variant: "muted",
                    };
                    return (
                      <TableRow key={change.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-semibold">
                          {change.reservationNumber ?? "—"}
                        </TableCell>
                        <TableCell className="font-medium text-xs">
                          {change.guestName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actMeta.variant} className="text-[10px]">
                            {actMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {change.fromRoomNumber ? `Room ${change.fromRoomNumber}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-primary">
                          {change.toRoomNumber ? `Room ${change.toRoomNumber}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted whitespace-nowrap">
                          {change.createdAt
                            ? new Date(change.createdAt).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted max-w-[220px] truncate" title={change.reason}>
                          {change.reason ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {change.performedBy === "Guest Self-Service" ? (
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30 gap-1">
                              <Sparkles className="h-2.5 w-2.5" /> Guest Portal
                            </Badge>
                          ) : (
                            <span className="text-text-muted">{change.performedBy || "Staff"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => router.push(`/stay/${change.id}`)}
                            title="View modification details"
                          >
                            <Eye className="h-4 w-4 text-text-muted hover:text-text" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPrev={pagination.onPrev}
              onNext={pagination.onNext}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

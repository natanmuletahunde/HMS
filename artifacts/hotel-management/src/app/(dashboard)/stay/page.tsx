"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

type InHouseReservation = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  actualCheckIn?: string;
  status: string;
};

type StayChange = {
  id: string;
  reservationNumber?: string;
  guestName?: string;
  actionType?: string;
  fromRoomNumber?: string;
  toRoomNumber?: string;
  createdAt?: string;
  reason?: string;
};

type StayListResponse = {
  data: StayChange[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type Room = { id: string; number: string; status: string; roomTypeName?: string };

const ROOM_ACTIONS = ["room_upgrade", "room_downgrade", "room_transfer"];
const DATE_ACTIONS = ["extend_stay", "shorten_stay"];
const ALL_ACTIONS = [...ROOM_ACTIONS, ...DATE_ACTIONS, "add_note"];

function nightsLeft(checkOut?: string) {
  if (!checkOut) return "—";
  const diff = new Date(checkOut).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days} night${days !== 1 ? "s" : ""}` : "Today";
}

export default function StayManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manageTarget, setManageTarget] = useState<InHouseReservation | null>(null);
  const [actionType, setActionType] = useState("room_upgrade");

  const { data: inHouse = [], isLoading: inHouseLoading } = useQuery<InHouseReservation[]>({
    queryKey: ["in-house"],
    queryFn: () => apiFetch<InHouseReservation[]>("/reservations/in-house"),
  });

  const { data: stayChangesData, isLoading: changesLoading } = useQuery<StayListResponse>({
    queryKey: ["stay-changes"],
    queryFn: () => apiFetch<StayListResponse>("/stay-management?limit=20"),
  });

  const { data: rawRooms } = useQuery<any>({
    queryKey: ["rooms"],
    queryFn: () => apiFetch<any>("/rooms"),
    enabled: !!manageTarget && ROOM_ACTIONS.includes(actionType),
  });
  const rooms: Room[] = Array.isArray(rawRooms) ? rawRooms : (rawRooms?.data ?? []);

  const stayMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/stay-management", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stay-changes"] });
      queryClient.invalidateQueries({ queryKey: ["in-house"] });
      setManageTarget(null);
      toast({ title: "Stay updated successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stayChanges = stayChangesData?.data ?? [];

  const inHousePagination = usePagination(inHouse, 5);
  const stayChangesPagination = usePagination(stayChanges, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Stay Management</h1>
      </div>

      {/* In-House Guests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current In-House Guests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-md border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Res #</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Nights Left</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inHouseLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : inHouse.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-text-muted">No in-house guests.</TableCell>
                  </TableRow>
                ) : inHousePagination.paginatedItems.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.guestName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{res.reservationNumber}</TableCell>
                    <TableCell>{res.roomNumber ?? "—"}</TableCell>
                    <TableCell>{res.actualCheckIn ? new Date(res.actualCheckIn).toLocaleDateString() : res.checkInDate ? new Date(res.checkInDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{res.checkOutDate ? new Date(res.checkOutDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="muted" className="text-xs">{nightsLeft(res.checkOutDate)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setManageTarget(res); setActionType("room_upgrade"); }}>
                        <Settings className="h-3.5 w-3.5" /> Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={inHousePagination.currentPage}
              totalPages={inHousePagination.totalPages}
              totalItems={inHousePagination.totalItems}
              pageSize={5}
              onPrev={inHousePagination.onPrev}
              onNext={inHousePagination.onNext}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Stay Changes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Stay Changes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-md border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Res #</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>From Room</TableHead>
                  <TableHead>To Room</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : stayChanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-text-muted">No recent stay changes.</TableCell>
                  </TableRow>
                ) : stayChangesPagination.paginatedItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.reservationNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{c.guestName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="muted" className="text-xs capitalize">{(c.actionType ?? "").replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{c.fromRoomNumber ?? "—"}</TableCell>
                    <TableCell>{c.toRoomNumber ?? "—"}</TableCell>
                    <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-text-muted">{c.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={stayChangesPagination.currentPage}
              totalPages={stayChangesPagination.totalPages}
              totalItems={stayChangesPagination.totalItems}
              pageSize={5}
              onPrev={stayChangesPagination.onPrev}
              onNext={stayChangesPagination.onNext}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manage Stay Dialog */}
      <Dialog open={!!manageTarget} onOpenChange={(o) => !o && setManageTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Stay — {manageTarget?.guestName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted mb-2">
            Reservation #{manageTarget?.reservationNumber} &bull; Room: {manageTarget?.roomNumber ?? "—"}
          </p>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!manageTarget) return;
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {
              reservationId: manageTarget.id,
              actionType,
              reason: fd.get("reason") || undefined,
              notes: fd.get("notes") || undefined,
            };
            if (ROOM_ACTIONS.includes(actionType)) {
              body.newRoomId = fd.get("newRoomId") || undefined;
            }
            if (DATE_ACTIONS.includes(actionType)) {
              body.newCheckOutDate = fd.get("newCheckOutDate") || undefined;
            }
            stayMutation.mutate(body);
          }}>
            <div className="grid gap-1.5">
              <Label>Action Type</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room_upgrade">Room Upgrade</SelectItem>
                  <SelectItem value="room_downgrade">Room Downgrade</SelectItem>
                  <SelectItem value="room_transfer">Room Transfer</SelectItem>
                  <SelectItem value="extend_stay">Extend Stay</SelectItem>
                  <SelectItem value="shorten_stay">Shorten Stay</SelectItem>
                  <SelectItem value="add_note">Add Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ROOM_ACTIONS.includes(actionType) && (
              <div className="grid gap-1.5">
                <Label htmlFor="newRoomId">New Room</Label>
                <select name="newRoomId" className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">Select a room</option>
                  {rooms.filter(r => r.status === "available").map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} — {r.roomTypeName ?? r.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {DATE_ACTIONS.includes(actionType) && (
              <div className="grid gap-1.5">
                <Label htmlFor="newCheckOutDate">New Check-out Date</Label>
                <Input id="newCheckOutDate" name="newCheckOutDate" type="date" min={manageTarget?.checkInDate?.split("T")[0]} defaultValue={manageTarget?.checkOutDate?.split("T")[0]} />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="reason">Reason *</Label>
              <textarea id="reason" name="reason" rows={2} required className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" name="notes" rows={2} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
            </div>
            <Button type="submit" className="w-full" disabled={stayMutation.isPending}>
              {stayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Change
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

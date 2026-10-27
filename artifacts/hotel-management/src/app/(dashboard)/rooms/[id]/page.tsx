"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Users, Cigarette, Ban, DollarSign, Image as ImageIcon, ChevronDown } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

const STATUSES = [
  "available", "occupied", "reserved", "dirty", 
  "cleaning", "blocked", "under_maintenance", "out_of_service"
];

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    available: "success",
    occupied: "danger",
    reserved: "warning",
    dirty: "warning",
    cleaning: "info",
    ready: "success",
    blocked: "muted",
    under_maintenance: "warning",
    out_of_service: "danger"
  };
  const label = status === "ready" ? "available" : status.replace(/_/g, ' ');
  return <Badge variant={(map[status] || "default") as any} className="uppercase px-3 py-1 text-xs">{label}</Badge>;
};

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const roomId = params.id as string;

  const { data: room, isLoading } = useQuery({
    queryKey: ["rooms", roomId],
    queryFn: () => apiFetch<any>(`/rooms/${roomId}/detail`),
    enabled: !!roomId
  });

  const pricingList = room?.pricing ?? [];
  const pricingPagination = usePagination(pricingList, 5);

  const statusMutation = useMutation({
    mutationFn: (status: string) => apiFetch(`/rooms/${roomId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", roomId] });
      toast({ title: "Status updated" });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold mb-2">Room not found</h2>
        <Button variant="outline" size="icon" onClick={() => router.push("/rooms")} title="Back to Rooms" aria-label="Back to Rooms">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      base: "default", weekend: "info", holiday: "warning",
      seasonal: "success", corporate: "muted", travel_agency: "outline", vip: "danger"
    };
    return <Badge variant={(map[type] || "default") as any} className="uppercase text-[10px]">{type.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/rooms" className="text-text-muted hover:text-text">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Room {room.number}</h1>
          {getStatusBadge(room.status)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Change Status <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUSES.map(s => (
              <DropdownMenuItem key={s} onClick={() => statusMutation.mutate(s)} className="uppercase text-xs">
                {s.replace(/_/g, ' ')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gallery Section */}
      <Card className="bg-transparent border-0 shadow-none">
        <div className="grid grid-cols-4 gap-4 h-[300px]">
          {room.images?.length ? (
            room.images.map((img: string, i: number) => (
              <div key={i} className={`rounded-xl overflow-hidden bg-surface ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                <img src={img} alt={`Room ${room.number} view`} className="w-full h-full object-cover" />
              </div>
            ))
          ) : (
            <div className="col-span-4 rounded-xl border-2 border-dashed border-border bg-surface/50 flex flex-col items-center justify-center text-text-muted h-full">
              <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>No gallery images uploaded for this room.</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Room Information</CardTitle>
            <CardDescription>{room.roomName || 'Standard configuration'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-text-muted mb-1">Type</p>
                <p className="font-medium">{room.roomType?.name || room.type || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Category</p>
                <p className="font-medium">{room.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Bed Type</p>
                <p className="font-medium">{room.bedType?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Base Price</p>
                <p className="font-medium">${room.currentPrice?.toFixed(2) || '0.00'} / night</p>
              </div>
            </div>
            {room.description && (
              <div className="mt-6">
                <p className="text-sm text-text-muted mb-1">Description</p>
                <p className="text-sm leading-relaxed">{room.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Specs Card */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Capacity</p>
                <p className="font-medium">{room.capacityAdults} Adults, {room.capacityChildren} Children</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Location</p>
                <p className="font-medium">
                  {room.branchName ? `${room.branchName} • ` : ''}
                  {room.buildingName || room.building?.buildingName || 'Main Building'} &bull; Floor {room.floorNumber || room.floor}
                  {room.floorName ? ` (${room.floorName})` : room.floorDetails?.floorName ? ` (${room.floorDetails.floorName})` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {room.smokingAllowed ? <Cigarette className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm text-text-muted">Smoking</p>
                <p className="font-medium">{room.smokingAllowed ? "Allowed" : "Non-smoking"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Size / View</p>
                <p className="font-medium">{room.size ? `${room.size} sq.m` : 'Unknown size'} &bull; {room.view || 'Standard View'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amenities Card */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Amenities included in this room type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {room.amenities?.length ? (
                room.amenities.map((am: any) => (
                  <Badge key={am.id} variant="outline" className="px-3 py-1.5 text-sm flex items-center gap-2">
                    <span>{am.icon || '✨'}</span> {am.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-text-muted">No specific amenities configured for this room.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Rules */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Active Pricing Rules</CardTitle>
            <CardDescription>Custom pricing applying specifically to Room {room.number}</CardDescription>
          </CardHeader>
          <CardContent>
            {room.pricing?.length ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead>Modifiers</TableHead>
                      <TableHead>Final Price</TableHead>
                      <TableHead>Valid Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingPagination.paginatedItems.map((rule: any) => {
                      const price = Number(rule.price ?? 0);
                      const discount = Number(rule.discountPercent ?? 0);
                      const tax = Number(rule.taxPercent ?? 0);
                      const finalPrice = price * (1 - discount / 100) * (1 + tax / 100);
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>{getTypeBadge(rule.pricingType)}</TableCell>
                          <TableCell>${price.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-text-muted">
                            {discount > 0 && <span className="text-success block">-{discount}% disc</span>}
                            {tax > 0 && <span className="text-danger block">+{tax}% tax</span>}
                            {!discount && !tax && <span>None</span>}
                          </TableCell>
                          <TableCell className="font-bold">${finalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-sm">
                            {rule.effectiveDate ? new Date(rule.effectiveDate).toLocaleDateString() : '—'} &rarr; {rule.expirationDate ? new Date(rule.expirationDate).toLocaleDateString() : 'Forever'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={pricingPagination.currentPage}
                  totalPages={pricingPagination.totalPages}
                  totalItems={pricingPagination.totalItems}
                  pageSize={5}
                  onPrev={pricingPagination.onPrev}
                  onNext={pricingPagination.onNext}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 border border-dashed rounded-lg bg-surface/50">
                <p className="text-sm text-text-muted">No custom pricing rules applied.</p>
                <p className="text-xs text-text-muted">Falls back to base price: ${room.currentPrice?.toFixed(2)}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* History Placeholder */}
        <Card className="md:col-span-3 bg-surface/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <h3 className="font-semibold mb-2">Reservation History</h3>
            <p className="text-text-muted text-sm max-w-sm">Guest reservation history and stay analytics for this room will be available in Phase 3.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Star, Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Guest = {
  id: string;
  guestCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  passportNumber?: string;
  nationalId?: string;
  visaNumber?: string;
  phone?: string;
  alternativePhone?: string;
  email?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vipStatus?: boolean;
  guestType?: string;
  smokingPreference?: string;
  bedPreference?: string;
  floorPreference?: string;
  foodPreference?: string;
  specialRequests?: string;
  remarks?: string;
  notes?: string;
  totalStays?: number;
  isActive?: boolean;
  createdAt?: string;
};

type GuestStats = {
  total: number;
  vip: number;
  corporate: number;
  individual: number;
  travel_agency: number;
  government: number;
};

type GuestListResponse = {
  data: Guest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function guestTypeBadge(type?: string) {
  if (!type) return <Badge variant="muted">—</Badge>;
  const styles: Record<string, React.CSSProperties> = {
    individual: {},
    corporate: { backgroundColor: "#3b82f6", color: "#fff", border: "none" },
    travel_agency: { backgroundColor: "#8b5cf6", color: "#fff", border: "none" },
    government: { backgroundColor: "#f97316", color: "#fff", border: "none" },
  };
  const labels: Record<string, string> = {
    individual: "Individual",
    corporate: "Corporate",
    travel_agency: "Travel Agency",
    government: "Government",
  };
  return (
    <Badge
      variant={type === "individual" ? "default" : "muted"}
      style={styles[type] ?? {}}
    >
      {labels[type] ?? type}
    </Badge>
  );
}

function GuestFormFields({ defaultValues }: { defaultValues?: Partial<Guest> }) {
  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Personal</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" name="firstName" required defaultValue={defaultValues?.firstName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input id="middleName" name="middleName" defaultValue={defaultValues?.middleName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" name="lastName" required defaultValue={defaultValues?.lastName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gender">Gender</Label>
            <select name="gender" defaultValue={defaultValues?.gender ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={defaultValues?.dateOfBirth?.split('T')[0]} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" defaultValue={defaultValues?.nationality} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="guestType">Guest Type</Label>
            <select name="guestType" defaultValue={defaultValues?.guestType ?? "individual"} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="travel_agency">Travel Agency</option>
              <option value="government">Government</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>VIP Status</Label>
            <div className="flex items-center gap-2 h-10">
              <input type="checkbox" name="vipStatus" id="vipStatus" defaultChecked={defaultValues?.vipStatus} className="h-4 w-4" />
              <label htmlFor="vipStatus" className="text-sm">VIP Guest</label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={defaultValues?.phone} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="alternativePhone">Alt. Phone</Label>
            <Input id="alternativePhone" name="alternativePhone" defaultValue={defaultValues?.alternativePhone} />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={defaultValues?.country} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="region">Region</Label>
            <Input id="region" name="region" defaultValue={defaultValues?.region} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={defaultValues?.city} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={defaultValues?.address} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={defaultValues?.emergencyContactName} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={defaultValues?.emergencyContactPhone} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Identity (Fayida / National ID)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="idType">ID Type</Label>
            <select name="idType" defaultValue={defaultValues?.idType ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Select</option>
              <option value="fayida_id">Fayida ID (Ethiopian National ID)</option>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="driver_license">Driver License</option>
              <option value="visa">Visa</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="idNumber">ID / Document Number</Label>
            <Input id="idNumber" name="idNumber" defaultValue={defaultValues?.idNumber} placeholder="Document ID" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="passportNumber">Passport Number</Label>
            <Input id="passportNumber" name="passportNumber" defaultValue={defaultValues?.passportNumber} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nationalId">National ID / Fayida ID (FIN / FAN)</Label>
            <Input id="nationalId" name="nationalId" defaultValue={defaultValues?.nationalId} placeholder="e.g. FIN-12345678" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="visaNumber">Visa Number</Label>
            <Input id="visaNumber" name="visaNumber" defaultValue={defaultValues?.visaNumber} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Preferences</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="smokingPreference">Smoking</Label>
            <select name="smokingPreference" defaultValue={defaultValues?.smokingPreference ?? ""} className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option value="">No Preference</option>
              <option value="smoking">Smoking</option>
              <option value="non_smoking">Non-Smoking</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bedPreference">Bed Type</Label>
            <Input id="bedPreference" name="bedPreference" defaultValue={defaultValues?.bedPreference} placeholder="e.g. King, Twin" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="floorPreference">Floor Preference</Label>
            <Input id="floorPreference" name="floorPreference" defaultValue={defaultValues?.floorPreference} placeholder="e.g. High floor" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="foodPreference">Food Preference</Label>
            <Input id="foodPreference" name="foodPreference" defaultValue={defaultValues?.foodPreference} placeholder="e.g. Vegetarian" />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <textarea id="specialRequests" name="specialRequests" rows={2} defaultValue={defaultValues?.specialRequests} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <textarea id="remarks" name="remarks" rows={2} defaultValue={defaultValues?.remarks} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5 col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea id="notes" name="notes" rows={2} defaultValue={defaultValues?.notes} className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [guestType, setGuestType] = useState("all");
  const [vipOnly, setVipOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 5;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
    ...(guestType !== "all" ? { guestType } : {}),
    ...(vipOnly ? { vipStatus: "true" } : {}),
  });

  const { data: listData, isLoading } = useQuery<GuestListResponse>({
    queryKey: ["guests", page, search, guestType, vipOnly],
    queryFn: () => apiFetch<GuestListResponse>(`/guests?${queryParams}`),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<GuestStats>({
    queryKey: ["guests-stats"],
    queryFn: () => apiFetch<GuestStats>("/guests/stats"),
  });

  const guests = listData?.data ?? [];
  const meta = listData?.meta;

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<Guest>("/guests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
      setIsAddOpen(false);
      toast({ title: "Guest added successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<Guest>(`/guests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      setEditGuest(null);
      toast({ title: "Guest updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function parseFormData(fd: FormData): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    fd.forEach((val, key) => {
      if (key === "vipStatus") obj[key] = true;
      else if (val !== "") obj[key] = val;
    });
    if (!fd.has("vipStatus")) obj["vipStatus"] = false;
    return obj;
  }

  async function handleDelete() {
    if (!deleteGuest) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/guests/${deleteGuest.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["guests-stats"] });
      toast({ title: "Guest deleted" });
      setDeleteGuest(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }

  const statCards = [
    { label: "Total Guests", value: stats?.total, color: "text-primary" },
    { label: "VIP Guests", value: stats?.vip, color: "text-warning" },
    { label: "Corporate", value: stats?.corporate, color: "text-info" },
    { label: "Government", value: stats?.government, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Guests</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Guest</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add New Guest</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(parseFormData(new FormData(e.currentTarget))); }}>
              <GuestFormFields />
              <div className="mt-4">
                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Guest
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-surface/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text-muted">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Search guests..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={guestType} onValueChange={(v) => { setGuestType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Guest Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="travel_agency">Travel Agency</SelectItem>
            <SelectItem value="government">Government</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={vipOnly ? "default" : "outline"}
          onClick={() => { setVipOnly(!vipOnly); setPage(1); }}
          className="gap-1"
        >
          <Star className="h-4 w-4" /> VIP Only
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest Code</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>VIP</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Stays</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(9)].map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-text-muted">No guests found.</TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <TableRow
                  key={guest.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/guests/${guest.id}`)}
                >
                  <TableCell className="font-mono text-xs">{guest.guestCode}</TableCell>
                  <TableCell className="font-medium">
                    {[guest.firstName, guest.middleName, guest.lastName].filter(Boolean).join(" ")}
                  </TableCell>
                  <TableCell>{guestTypeBadge(guest.guestType)}</TableCell>
                  <TableCell>
                    {guest.vipStatus && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                  </TableCell>
                  <TableCell>{guest.phone ?? "—"}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{guest.email ?? "—"}</TableCell>
                  <TableCell>{guest.nationality ?? "—"}</TableCell>
                  <TableCell>{guest.totalStays ?? 0}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); setEditGuest(guest); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-danger hover:text-danger"
                        onClick={(e) => { e.stopPropagation(); setDeleteGuest(guest); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={page}
        totalPages={meta?.totalPages || 1}
        totalItems={meta?.total}
        pageSize={5}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(meta?.totalPages || 1, p + 1))}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Guest</DialogTitle></DialogHeader>
          {editGuest && (
            <form onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate({ id: editGuest.id, body: parseFormData(new FormData(e.currentTarget)) });
            }}>
              <GuestFormFields defaultValues={editGuest} />
              <div className="mt-4">
                <Button type="submit" className="w-full" disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteGuest} onOpenChange={(o) => !o && setDeleteGuest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Guest</DialogTitle></DialogHeader>
          <p className="text-text-muted">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-text">{deleteGuest?.firstName} {deleteGuest?.lastName}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteGuest(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

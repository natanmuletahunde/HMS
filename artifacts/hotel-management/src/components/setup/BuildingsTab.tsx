"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, MoreHorizontal, Loader2, Search, Phone, Mail, Clock, 
  Sparkles, Check, AlertTriangle, ShieldCheck, Layers, Info
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";

const AVAILABLE_AMENITIES = [
  "Elevator Access",
  "Dedicated Reception Desk",
  "Executive Lounge",
  "Private Pool",
  "Valet Parking",
  "Direct Spa Access",
  "Room Service Kitchen",
  "Conference Hall",
  "24/7 Security Patrol",
  "Luggage Storage",
  "Fitness Center",
  "High-Speed Wi-Fi 6"
];

export function BuildingsTab() {
  const { user, hasPermission } = useAuth();
  const isGlobal =
    user?.roleName === "Admin" ||
    user?.roleName === "System Admin" ||
    user?.roleScope === "global";

  const canManageBuildings =
    isGlobal ||
    hasPermission("*") ||
    hasPermission("hotel:*") ||
    hasPermission("rooms:*");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  // Form State
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [formErrorMsg, setFormErrorMsg] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: rawBuildings, isLoading } = useQuery({
    queryKey: ["buildings", debouncedSearch, statusFilter],
    queryFn: () => apiFetch<any>(`/buildings?search=${debouncedSearch}&status=${statusFilter}`),
  });
  const allBuildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);

  const { data: rawBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<any>("/branches"),
  });
  const allBranches: any[] = Array.isArray(rawBranches) ? rawBranches : (rawBranches?.data ?? []);

  const allowedBranchIds = isGlobal
    ? null
    : new Set(
        user?.branches?.map((b) => b.id) ||
        [user?.activeBranchId, user?.primaryBranchId].filter(Boolean)
      );

  const accessibleBranches: any[] = isGlobal
    ? allBranches
    : allBranches.filter((b: any) => allowedBranchIds?.has(b.id));

  const scopedBuildings = isGlobal
    ? allBuildings
    : allBuildings.filter((b: any) => allowedBranchIds?.has(b.branchId));

  const buildings = branchFilter === "all"
    ? scopedBuildings
    : scopedBuildings.filter((b: any) => b.branchId === branchFilter);

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedBuildings,
    onPrev,
    onNext,
    setCurrentPage,
  } = usePagination(buildings, 6);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, branchFilter, statusFilter, setCurrentPage]);

  const openAddDialog = () => {
    setEditItem(null);
    setSelectedAmenities(["Elevator Access", "Dedicated Reception Desk", "24/7 Security Patrol"]);
    setFormErrorMsg("");
    setIsAddOpen(true);
  };

  const openEditDialog = (b: any) => {
    setEditItem(b);
    setSelectedAmenities(Array.isArray(b.amenities) ? b.amenities : []);
    setFormErrorMsg("");
    setIsAddOpen(true);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/buildings/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/buildings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: editItem ? "Building configuration updated" : "Building facility created" });
      setIsAddOpen(false);
      setEditItem(null);
    },
    onError: (err: Error) => {
      setFormErrorMsg(err.message || "Failed to save building configuration");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/buildings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "Building deleted" });
    },
    onError: (err: Error) => toast({ title: "Cannot Delete Building", description: err.message, variant: "destructive" })
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/buildings/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: vars.isActive ? "Building activated" : "Building deactivated" });
    },
    onError: (err: Error) =>
      toast({ title: "Action Failed", description: err.message, variant: "destructive" }),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(fd);
    
    data.amenities = selectedAmenities;
    if (editItem) {
      data.isActive = fd.get("isActive") === "true";
    }
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Hotel Buildings & Facilities
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure each building as a dedicated hotel unit with its own operating rules, reception desk, and amenities
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input 
            placeholder="Search buildings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[180px] border-[var(--border)] bg-[var(--surface)] h-9 text-xs"
          />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px] border-[var(--border)] bg-[var(--surface)] h-9 text-xs">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
              <SelectItem value="all">All Branches</SelectItem>
              {accessibleBranches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.branchName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] border-[var(--border)] bg-[var(--surface)] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
          {canManageBuildings && accessibleBranches.length > 0 && (
            <button
              type="button"
              onClick={openAddDialog}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <span>Add Building</span>
            </button>
          )}
        </div>
      </div>

      {/* Buildings Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Building / Hotel Facility</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Governing Branch</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Lobby Contact</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Stay Schedule</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Floors</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Operating Status</TableHead>
              {canManageBuildings && <TableHead className="w-[80px] text-right"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={canManageBuildings ? 7 : 6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : buildings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageBuildings ? 7 : 6} className="h-48 text-center text-[var(--text-secondary)]">
                  <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs">No hotel buildings found in this branch.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBuildings.map((bldg) => {
                const branch = allBranches.find((b: any) => b.id === bldg.branchId);
                const amenitiesList: string[] = Array.isArray(bldg.amenities) ? bldg.amenities : [];

                return (
                  <TableRow key={bldg.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="font-semibold text-xs text-[var(--text-primary)]">{bldg.buildingName}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {bldg.buildingCode}
                          </span>
                        </div>
                        {bldg.description && (
                          <span className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                            {bldg.description}
                          </span>
                        )}
                        {amenitiesList.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {amenitiesList.slice(0, 3).map((a, i) => (
                              <span key={i} className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                                {a}
                              </span>
                            ))}
                            {amenitiesList.length > 3 && (
                              <span className="text-[9px] text-[var(--text-muted)] font-mono">
                                +{amenitiesList.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-secondary)] font-medium">
                      {branch?.branchName || '-'}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        {bldg.contactPhone ? (
                          <span className="flex items-center gap-1 text-[var(--text-primary)] font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {bldg.contactPhone}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">No phone set</span>
                        )}
                        {bldg.contactEmail && (
                          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {bldg.contactEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <div>
                          <span>In: <strong className="text-[var(--text-primary)] font-mono">{bldg.checkInTime || "02:00 PM"}</strong></span>
                          <span className="mx-1">&bull;</span>
                          <span>Out: <strong className="text-[var(--text-primary)] font-mono">{bldg.checkOutTime || "12:00 PM"}</strong></span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{bldg.numberOfFloors || 1}</span> floors
                    </TableCell>
                    <TableCell>
                      {bldg.isActive === false ? (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-semibold text-[10px]">
                          Deactivated
                        </Badge>
                      ) : bldg.operatingStatus === "renovation" ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-300 font-semibold text-[10px]">
                          Renovation
                        </Badge>
                      ) : bldg.operatingStatus === "seasonal_maintenance" ? (
                        <Badge className="bg-sky-50 text-sky-700 border-sky-300 font-semibold text-[10px]">
                          Maintenance
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">
                          Operational
                        </Badge>
                      )}
                    </TableCell>
                    {canManageBuildings && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                            <DropdownMenuItem onClick={() => openEditDialog(bldg)}>Edit Configuration</DropdownMenuItem>
                            {bldg.isActive ? (
                              <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: bldg.id, isActive: false })}>
                                Deactivate Building
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: bldg.id, isActive: true })}>
                                Activate Building
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(bldg.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={6}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* Add / Edit Building Modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) setEditItem(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                {editItem ? "Edit Building Hotel Configuration" : "Add New Hotel Building Facility"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[var(--text-secondary)] mt-0.5">
              Configure this building as a standalone hotel facility governed under the primary branch.
            </DialogDescription>
          </DialogHeader>

          {formErrorMsg && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-600 font-medium">
              {formErrorMsg}
            </div>
          )}

          <form className="space-y-4 pt-2" onSubmit={onSubmit}>
            {/* Section 1: Facility Identity */}
            <div className="space-y-3 p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/30">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Facility Identification
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Governing Branch *</Label>
                  <Select 
                    name="branchId" 
                    defaultValue={editItem?.branchId || accessibleBranches[0]?.id} 
                    disabled={!isGlobal && !!editItem}
                    required
                  >
                    <SelectTrigger className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                      {accessibleBranches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.branchName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isGlobal && (
                    <input type="hidden" name="branchId" value={editItem?.branchId || accessibleBranches[0]?.id || ""} />
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Building / Wing Name *</Label>
                  <Input 
                    name="buildingName" 
                    defaultValue={editItem?.buildingName} 
                    placeholder="e.g. Adwa Tower, VIP Lakefront Villas" 
                    required 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Building Code *</Label>
                  <Input 
                    name="buildingCode" 
                    defaultValue={editItem?.buildingCode} 
                    placeholder="e.g. ADW-T1" 
                    required 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs font-mono" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Total Physical Floors *</Label>
                  <Input 
                    name="numberOfFloors" 
                    type="number" 
                    defaultValue={editItem?.numberOfFloors || 1} 
                    min={1} 
                    required 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs font-mono" 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Hotel Operating Schedule & Status */}
            <div className="space-y-3 p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/30">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Operating Schedule & Facility Status
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Check-In Time</Label>
                  <Input 
                    name="checkInTime" 
                    defaultValue={editItem?.checkInTime || "02:00 PM"} 
                    placeholder="02:00 PM" 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs font-mono" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Check-Out Time</Label>
                  <Input 
                    name="checkOutTime" 
                    defaultValue={editItem?.checkOutTime || "12:00 PM"} 
                    placeholder="12:00 PM" 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs font-mono" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Operating Status</Label>
                  <select 
                    name="operatingStatus" 
                    defaultValue={editItem?.operatingStatus || "active"}
                    className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="active">Operational (Open)</option>
                    <option value="renovation">Under Renovation (Closed)</option>
                    <option value="seasonal_maintenance">Seasonal Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Direct Lobby Reception Contact */}
            <div className="space-y-3 p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/30">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Lobby Front Desk Contact
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Direct Reception Phone</Label>
                  <Input 
                    name="contactPhone" 
                    defaultValue={editItem?.contactPhone || ""} 
                    placeholder="0911223344" 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs font-mono" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Direct Lobby Email</Label>
                  <Input 
                    type="email"
                    name="contactEmail" 
                    defaultValue={editItem?.contactEmail || ""} 
                    placeholder="e.g. wing.desk@hotel.com" 
                    className="border-[var(--border)] bg-[var(--surface)] h-9 text-xs" 
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Amenities & Features */}
            <div className="space-y-2 p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Building Amenities & Features
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">{selectedAmenities.length} selected</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isChecked = selectedAmenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                      <span>{amenity}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Description */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">Facility Overview / Guest Description</Label>
              <textarea 
                name="description" 
                defaultValue={editItem?.description || ""} 
                rows={2}
                placeholder="Brief summary of this building facility, view characteristics, or stay policies..." 
                className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600" 
              />
            </div>

            {editItem && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                <div>
                  <Label className="text-xs font-semibold text-[var(--text-primary)] block">Active Status</Label>
                  <span className="text-[11px] text-[var(--text-secondary)]">Deactivating locks all floors and rooms in this building</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    value="true"
                    defaultChecked={editItem.isActive !== false}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="h-9 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editItem ? "Save Configuration" : "Create Building"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

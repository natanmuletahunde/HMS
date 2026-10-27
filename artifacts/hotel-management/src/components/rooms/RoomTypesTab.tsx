"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, MoreHorizontal, Loader2, BedDouble, BedSingle, Sparkles, Check, 
  UploadCloud, CheckCircle2, Image as ImageIcon, Trash2 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TablePagination } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import { useAuth } from "@/components/auth-provider";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dggk6islo";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "dink_sports_preset";

export function RoomTypesTab() {
  const { user } = useAuth();
  const isGlobal = user?.roleName === "Admin" || user?.roleName === "System Admin" || user?.roleScope === "global";

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedBedTypeId, setSelectedBedTypeId] = useState<string>("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["room-types"],
    queryFn: () => apiFetch<any[]>("/room-types"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["room-categories"],
    queryFn: () => apiFetch<any[]>("/room-categories"),
  });

  const { data: bedTypes = [] } = useQuery({
    queryKey: ["bed-types"],
    queryFn: () => apiFetch<any[]>("/bed-types"),
  });

  const { data: amenitiesList = [] } = useQuery({
    queryKey: ["room-amenities"],
    queryFn: () => apiFetch<any[]>("/room-amenities"),
  });

  const {
    paginatedItems: paginatedTypes,
    currentPage,
    totalPages,
    totalItems,
    onPrev,
    onNext,
  } = usePagination(types, 5);

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editItem ? apiFetch(`/room-types/${editItem.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/room-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      toast({ title: editItem ? "Room type updated" : "Room type added" });
      setIsAddOpen(false);
      setEditItem(null);
      setSelectedAmenities([]);
      setSelectedBedTypeId("");
      setImageUrl("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/room-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      toast({ title: "Room type deleted" });
    }
  });

  const openAdd = () => {
    setEditItem(null);
    setSelectedBedTypeId(bedTypes[0]?.id || "");
    setSelectedAmenities([]);
    setImageUrl("");
    setIsAddOpen(true);
  };

  const openEdit = (type: any) => {
    setEditItem(type);
    setSelectedBedTypeId(type.bedTypeId || "");
    setSelectedAmenities(Array.isArray(type.amenities) ? type.amenities : []);
    setImageUrl(type.imageUrl || "");
    setIsAddOpen(true);
  };

  const toggleAmenity = (name: string) => {
    setSelectedAmenities(prev => 
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    );
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file format",
        description: "Please select an image file (PNG, JPG, WEBP, etc.)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Cloudinary image upload failed");
      }

      const data = await res.json();
      const secureUrl = data.secure_url || data.url;
      setImageUrl(secureUrl);
      toast({
        title: "Photo uploaded",
        description: "Room photo has been uploaded successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isUploading) {
      toast({
        title: "Upload in progress",
        description: "Please wait until the photo finishes uploading.",
        variant: "destructive"
      });
      return;
    }

    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd);
    saveMutation.mutate({
      ...data,
      categoryId: data.categoryId || null,
      bedTypeId: selectedBedTypeId || null,
      maximumAdults: Number(data.maximumAdults),
      maximumChildren: Number(data.maximumChildren),
      maxOccupancy: Number(data.maximumAdults) + Number(data.maximumChildren),
      basePrice: Number(data.basePrice),
      amenities: selectedAmenities,
      imageUrl: imageUrl || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Room Types</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure sellable room inventory profiles with default bed setups, pricing, amenities, and photos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isGlobal && (
            <Button onClick={openAdd} className="bg-blue-700 hover:bg-blue-800 text-white shadow-xs">
              <Plus className="mr-2 h-4 w-4" /> Add Room Type
            </Button>
          )}

          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditItem(null);
              setSelectedAmenities([]);
              setSelectedBedTypeId("");
              setImageUrl("");
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-[var(--border)] bg-[var(--surface)]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                  {editItem ? "Edit Room Type" : "Add Room Type"}
                </DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category selection */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Category</Label>
                    <Select name="categoryId" defaultValue={editItem?.categoryId || categories[0]?.id}>
                      <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bed Type selection */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Default Bed Type</Label>
                    <Select value={selectedBedTypeId} onValueChange={setSelectedBedTypeId}>
                      <SelectTrigger className="border-[var(--border)] bg-[var(--surface)]">
                        <SelectValue placeholder="Select Bed Type" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                        {bedTypes.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} ({b.capacity} {b.capacity === 1 ? 'person' : 'persons'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Type Name</Label>
                    <Input name="name" defaultValue={editItem?.name} required placeholder="e.g. Deluxe King Suite" className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Base Price ($)</Label>
                    <Input name="basePrice" type="number" step="0.01" min={0} defaultValue={editItem?.basePrice || 100} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Max Adults</Label>
                    <Input name="maximumAdults" type="number" min={1} defaultValue={editItem?.maximumAdults || 2} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-[var(--text-primary)]">Max Children</Label>
                    <Input name="maximumChildren" type="number" min={0} defaultValue={editItem?.maximumChildren ?? 1} required className="border-[var(--border)] bg-[var(--surface)]" />
                  </div>
                </div>

                {/* Amenities Multi-Select Section */}
                <div className="grid gap-2 border border-[var(--border)] p-3 rounded-md bg-[var(--surface-hover)]/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Standard Amenities ({selectedAmenities.length} selected)
                    </Label>
                    {selectedAmenities.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedAmenities([])}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                    {amenitiesList.map((amenity: any) => {
                      const isSelected = selectedAmenities.includes(amenity.name);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => toggleAmenity(amenity.name)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs transition-colors rounded-sm border ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 font-medium shadow-xs"
                              : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-400"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                          {amenity.name}
                        </button>
                      );
                    })}
                    {amenitiesList.length === 0 && (
                      <span className="text-xs text-[var(--text-secondary)] italic">
                        No amenities configured in Room Configurations.
                      </span>
                    )}
                  </div>
                </div>

                {/* Room Photo Upload Section */}
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                      Room Photo
                    </span>
                    {imageUrl && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Uploaded
                      </span>
                    )}
                  </Label>

                  {imageUrl ? (
                    <div className="relative border border-[var(--border)] rounded-lg p-2.5 bg-[var(--surface-hover)]/40 flex items-center gap-3">
                      <img
                        src={imageUrl}
                        alt="Room Type Preview"
                        className="h-16 w-24 object-cover rounded-md border border-[var(--border)] shrink-0 shadow-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {imageUrl.split("/").pop()}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            type="button"
                            onClick={() => replaceFileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium disabled:opacity-50"
                          >
                            Replace Photo
                          </button>
                          <input
                            ref={replaceFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f);
                            }}
                          />
                          <span className="text-[var(--text-secondary)]">•</span>
                          <button
                            type="button"
                            onClick={() => setImageUrl("")}
                            className="text-[11px] text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleFileUpload(f);
                      }}
                      onClick={() => {
                        if (!isUploading) fileInputRef.current?.click();
                      }}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                        isDragging
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-blue-500/50 hover:bg-[var(--surface-hover)]/30"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                        }}
                      />
                      {isUploading ? (
                        <div className="py-2 flex flex-col items-center justify-center gap-1.5">
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                          <p className="text-xs font-semibold text-[var(--text-primary)]">Uploading photo...</p>
                        </div>
                      ) : (
                        <div className="py-2 flex flex-col items-center justify-center gap-1.5">
                          <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            Click to upload or drag & drop room photo
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            PNG, JPG, WEBP, GIF up to 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold text-[var(--text-primary)]">Description</Label>
                  <Input name="description" defaultValue={editItem?.description} placeholder="Short overview of features and appeal" className="border-[var(--border)] bg-[var(--surface)]" />
                </div>
                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white" disabled={saveMutation.isPending || isUploading}>
                  {(saveMutation.isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploading ? "Uploading Photo..." : "Save Room Type"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Type & Photo</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Category</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Bed Type</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Max Adults</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Max Children</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Base Price</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Amenities</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Status</TableHead>
              {isGlobal && <TableHead className="w-[80px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isGlobal ? 9 : 8} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-secondary)]" /></TableCell></TableRow>
            ) : types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isGlobal ? 9 : 8} className="h-48 text-center text-[var(--text-secondary)]">
                  <BedDouble className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No room types found.</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTypes.map((type) => {
                const amenities = Array.isArray(type.amenities) ? type.amenities : [];
                return (
                  <TableRow key={type.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                    <TableCell className="font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-3">
                        {type.imageUrl ? (
                          <img
                            src={type.imageUrl}
                            alt={type.name}
                            className="h-10 w-12 object-cover rounded-md border border-[var(--border)] shrink-0 shadow-xs bg-muted"
                          />
                        ) : (
                          <div className="h-10 w-12 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center shrink-0 text-[var(--text-secondary)]">
                            <BedDouble className="h-5 w-5 opacity-40" />
                          </div>
                        )}
                        <div>
                          <span>{type.name}</span>
                          {type.description && (
                            <p className="text-[11px] text-[var(--text-secondary)] font-normal line-clamp-1">{type.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {type.categoryName ? (
                        <Badge variant="outline">{type.categoryName}</Badge>
                      ) : (
                        <span className="text-[var(--text-secondary)] text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.bedTypeName ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-primary)]">
                          <BedSingle className="h-3.5 w-3.5 text-blue-600" />
                          {type.bedTypeName}
                        </span>
                      ) : (
                        <span className="text-[var(--text-secondary)] text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{type.maximumAdults || 2}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-secondary)]">{type.maximumChildren || 0}</TableCell>
                    <TableCell className="font-semibold text-[var(--text-primary)] font-mono">${Number(type.basePrice ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {amenities.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {amenities.slice(0, 2).map((a: string, idx: number) => (
                            <Badge key={idx} variant="muted" className="text-[10px] px-1.5 py-0">
                              {a}
                            </Badge>
                          ))}
                          {amenities.length > 2 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              +{amenities.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-secondary)] text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.status === 'active' || type.isActive !== false ? 'success' : 'muted'}>
                        {type.status || 'Active'}
                      </Badge>
                    </TableCell>
                    {isGlobal && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--text-secondary)]"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-[var(--border)] bg-[var(--surface)]">
                            <DropdownMenuItem onClick={() => openEdit(type)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-danger" onClick={() => deleteMutation.mutate(type.id)}>Delete</DropdownMenuItem>
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
          pageSize={5}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>
    </div>
  );
}

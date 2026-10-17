"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type Hotel = {
  id: string;
  hotelName: string;
  legalName: string;
  hotelCode: string;
  currencyCode?: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  region: string;
  city: string;
  address: string;
  timezone: string;
  starRating: number;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  taxNumber: string;
  licenseNumber: string;
  description: string;
  logoUrl?: string;
};

export default function HotelPage() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawHotel, isLoading } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel"),
  });
  const hotel: Hotel | undefined = Array.isArray(rawHotel) ? rawHotel[0] : (rawHotel?.data?.[0] ?? rawHotel);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Hotel>) => 
      hotel?.id ? apiFetch(`/hotel/${hotel.id}`, { method: "PATCH", body: JSON.stringify(data) })
                : apiFetch("/hotel", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel"] });
      toast({ title: hotel?.id ? "Hotel updated" : "Hotel configured" });
      setIsEditOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const renderForm = () => (
    <form key={hotel?.id || "hotel-edit-form"} className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const data = Object.fromEntries(fd);
      saveMutation.mutate({
        ...data,
        starRating: Number(data.starRating)
      } as Partial<Hotel>);
    }}>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Hotel Name</Label>
          <Input name="hotelName" defaultValue={hotel?.hotelName} required />
        </div>
        <div className="grid gap-2">
          <Label>Legal Name</Label>
          <Input name="legalName" defaultValue={hotel?.legalName} required />
        </div>
        <div className="grid gap-2">
          <Label>Hotel Code</Label>
          <Input name="hotelCode" defaultValue={hotel?.hotelCode} required />
        </div>
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={hotel?.email} required />
        </div>
        <div className="grid gap-2">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={hotel?.phone} required />
        </div>
        <div className="grid gap-2">
          <Label>Website</Label>
          <Input name="website" defaultValue={hotel?.website} />
        </div>
        <div className="grid gap-2">
          <Label>Country</Label>
          <Input name="country" defaultValue={hotel?.country} required />
        </div>
        <div className="grid gap-2">
          <Label>City</Label>
          <Input name="city" defaultValue={hotel?.city} required />
        </div>
        <div className="grid gap-2 col-span-2">
          <Label>Address</Label>
          <Input name="address" defaultValue={hotel?.address} required />
        </div>
        <div className="grid gap-2">
          <Label>Star Rating (1-5)</Label>
          <Input name="starRating" type="number" min={1} max={5} defaultValue={hotel?.starRating} required />
        </div>
        <div className="grid gap-2">
          <Label>Timezone</Label>
          <Input name="timezone" defaultValue={hotel?.timezone || "Africa/Addis_Ababa"} />
        </div>
        <div className="grid gap-2">
          <Label>Currency Code</Label>
          <Input name="currencyCode" defaultValue={hotel?.currencyCode || "ETB"} placeholder="e.g. ETB, USD, EUR" required />
        </div>
        <div className="grid gap-2">
          <Label>Check-in Time</Label>
          <Input 
            name="checkInTime" 
            type="text" 
            defaultValue={hotel?.checkInTime || "14:00"} 
            placeholder="e.g. 14:00" 
            required 
          />
        </div>
        <div className="grid gap-2">
          <Label>Check-out Time</Label>
          <Input 
            name="checkOutTime" 
            type="text" 
            defaultValue={hotel?.checkOutTime || "12:00"} 
            placeholder="e.g. 12:00" 
            required 
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Configuration
      </Button>
    </form>
  );

  if (!hotel?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-muted">Hotel Setup / Hotel Config</h1>
        <Card className="border-dashed border-2 border-border bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center h-96 text-center">
            <Building2 className="h-12 w-12 text-text-muted mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Hotel Configured</h2>
            <p className="text-text-muted mb-6 max-w-sm">Setup your primary hotel details, branding, and default settings to get started.</p>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Configure Hotel</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configure Hotel</DialogTitle>
                </DialogHeader>
                {renderForm()}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-muted">Hotel Setup / Hotel Config</h1>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Details</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Hotel Configuration</DialogTitle>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-6">
          {hotel.logoUrl ? (
            <img src={hotel.logoUrl} alt="Logo" className="w-16 h-16 rounded-md object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-2xl font-bold text-text-muted">
              {hotel.hotelName?.charAt(0) ?? "H"}
            </div>
          )}
          <div>
            <CardTitle className="text-2xl">{hotel.hotelName}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{hotel.legalName}</span>
              <span>&bull;</span>
              <span>{hotel.hotelCode}</span>
              <span>&bull;</span>
              <span className="flex text-amber-500">
                {Array.from({ length: hotel.starRating || 0 }).map((_, i) => <span key={i}>★</span>)}
              </span>
            </CardDescription>
          </div>
          <Badge className="ml-auto" variant={hotel.status === 'active' ? 'success' : 'muted'}>
            {hotel.status || 'Active'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-text-muted uppercase tracking-wider">Contact & Location</h3>
              <div className="grid grid-cols-3 gap-y-2 text-sm">
                <span className="text-text-muted">Email</span>
                <span className="col-span-2">{hotel.email}</span>
                <span className="text-text-muted">Phone</span>
                <span className="col-span-2">{hotel.phone}</span>
                <span className="text-text-muted">Website</span>
                <span className="col-span-2">{hotel.website || '-'}</span>
                <span className="text-text-muted">Address</span>
                <span className="col-span-2">{hotel.address}, {hotel.city}, {hotel.region}, {hotel.country}</span>
                <span className="text-text-muted">Timezone</span>
                <span className="col-span-2">{hotel.timezone || '-'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-text-muted uppercase tracking-wider">Operations</h3>
              <div className="grid grid-cols-3 gap-y-2 text-sm">
                <span className="text-text-muted">Currency</span>
                <span className="col-span-2 font-medium">{hotel.currencyCode || 'ETB'}</span>
                <span className="text-text-muted">Check-in</span>
                <span className="col-span-2">{hotel.checkInTime}</span>
                <span className="text-text-muted">Check-out</span>
                <span className="col-span-2">{hotel.checkOutTime}</span>
                <span className="text-text-muted">Tax Number</span>
                <span className="col-span-2">{hotel.taxNumber || '-'}</span>
                <span className="text-text-muted">License</span>
                <span className="col-span-2">{hotel.licenseNumber || '-'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

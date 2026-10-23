"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Sliders,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Edit,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Save,
  X,
  Star,
  Clock,
  Coins,
  FileText,
  BedDouble,
  Coffee,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon,
  Plus,
  Trash2,
  Camera,
  Trees,
  Car,
  Dumbbell,
  Waves,
  Utensils,
  Briefcase,
  Search,
  ExternalLink,
  Ban,
  Dog,
  Cigarette,
  DollarSign,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "@/components/setup/StatusPill";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
type GalleryImage = {
  id: string;
  url: string;
  title: string;
  category: "facade" | "lobby" | "dining" | "wellness" | "outdoors" | "general";
};

type HotelSettings = {
  // Front Desk & Operations
  earlyCheckInAllowedTime?: string;
  lateCheckOutGracePeriod?: number;
  lateCheckOutHalfDayCutoff?: string;
  nightAuditMode?: "auto" | "manual";
  nightAuditTime?: string;
  noShowReleaseWindow?: string;
  overbookingThreshold?: number;

  // Facilities & Features
  propertyFacilities?: string[];

  // Media & Gallery
  heroImageUrl?: string;
  galleryImages?: GalleryImage[];

  // Policies & Refunds
  cancellationPolicyType?: "flexible" | "moderate" | "strict" | "non_refundable";
  cancellationFreeHours?: number;
  cancellationPenaltyPercent?: number;
  refundProcessingDays?: number;
  refundTermsText?: string;
  petPolicy?: "allowed" | "not_allowed" | "charges_apply";
  petFee?: number;
  smokingPolicy?: "strictly_non_smoking" | "designated_areas";
  smokingPenaltyFee?: number;
  folioTermsFooter?: string;
  registrationCardDisclaimer?: string;

  // Housekeeping & Dining
  checkoutTriggerState?: "dirty" | "cleaning";
  linenChangeFrequency?: number;
  turndownServiceEnabled?: boolean;
  defaultBoardBasis?: "ro" | "bb" | "hb" | "fb";
  breakfastServiceHours?: string;
  breakfastPriceAdult?: number;
  breakfastPriceChild?: number;
  extraBedDailyFee?: number;
  maxExtraBedsPerRoom?: number;

  // Revenue & Payment
  invoicePrefix?: string;
  receiptPrefix?: string;
  proformaPrefix?: string;
  defaultGuaranteePolicy?: "credit_card" | "first_night_deposit" | "non_guaranteed";
  ageTierInfantMax?: number;
  ageTierChildMax?: number;
  ageTierAdultMin?: number;
  enabledGateways?: string[];
};

type Hotel = {
  id: string;
  hotelName: string;
  legalName?: string;
  hotelCode: string;
  currencyCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  timezone?: string;
  starRating?: number;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  taxNumber?: string;
  licenseNumber?: string;
  description?: string;
  logo?: string;
  settings?: HotelSettings;
};

// ---------------------------------------------------------------------------
// DEFAULT CATALOGS & SETTINGS
// ---------------------------------------------------------------------------
const FACILITY_CATEGORIES = [
  {
    category: "Outdoors & Grounds",
    icon: Trees,
    items: [
      { id: "gardens", name: "Gardens & Landscaped Lawns" },
      { id: "rooftop_garden", name: "Rooftop Garden & Sunset Terrace" },
      { id: "barbecue_campfire", name: "Barbecue Area & Campfire / Bonfire" },
      { id: "childrens_park", name: "Children's Playground & Adventure Park" },
      { id: "private_beach", name: "Private Beach & Boardwalk Access" },
      { id: "nature_walk", name: "Guided Nature Walk & Botanical Trails" },
      { id: "marina", name: "Marina On-Site & Private Boat Slips" },
      { id: "fishing", name: "Fishing Excursions & Equipment" },
      { id: "safari", name: "Safari & Scenic Wildlife Excursions" },
    ],
  },
  {
    category: "Parking & Valet Services",
    icon: Car,
    items: [
      { id: "valet_service", name: "Valet Service (Complimentary)" },
      { id: "outdoor_parking_secured", name: "Outdoor Parking - Secured & CCTV Monitored" },
      { id: "outdoor_parking_non_secured", name: "Outdoor Parking - Non Secured" },
      { id: "parking_facilities", name: "Covered Underground Parking Facilities" },
      { id: "parking_surcharge", name: "Dedicated Long-Term Parking (Surcharge)" },
      { id: "bike_rent", name: "Bicycles & E-Bikes on Rent" },
    ],
  },
  {
    category: "Sports, Fitness & Recreation",
    icon: Dumbbell,
    items: [
      { id: "health_club_gym", name: "Health Club & 24/7 Gym Facility" },
      { id: "fitness_equipment", name: "Premium Cardio & Strength Equipment" },
      { id: "tennis_court", name: "Championship Floodlit Tennis Court" },
      { id: "badminton_court", name: "Indoor Badminton Court" },
      { id: "basketball_court", name: "Half-Court Basketball" },
      { id: "squash_court", name: "Squash Courts" },
      { id: "table_tennis", name: "Table Tennis & Ping Pong Lounge" },
      { id: "billiards", name: "Billiards & Luxury Pool Tables" },
      { id: "bowling", name: "Multi-Lane Bowling Alley" },
      { id: "golf_course", name: "18-Hole Championship Golf Course" },
      { id: "virtual_golf", name: "HD Virtual Golf Simulator" },
      { id: "clubhouse", name: "Private Residents & Members Clubhouse" },
      { id: "games_zone", name: "Arcade & Modern E-Sports Games Zone" },
      { id: "horse_ride", name: "Horse Riding & Equestrian Trails (Chargeable)" },
      { id: "camel_ride", name: "Camel Riding & Heritage Tours" },
      { id: "boating", name: "Boating, Kayaking & Watercraft Rental" },
      { id: "skiing", name: "Skiing Facility & Winter Sports Desk" },
    ],
  },
  {
    category: "Spa, Wellness & Water",
    icon: Waves,
    items: [
      { id: "spa_services", name: "Available Spa & Holistic Wellness Services" },
      { id: "water_amenities", name: "Infinity Heated Pools & Water Amenities" },
      { id: "fun_floats", name: "Resort Family Pools & Fun Floats" },
    ],
  },
  {
    category: "Dining, Lounge & Entertainment",
    icon: Utensils,
    items: [
      { id: "wine_and_dine", name: "Wine & Dine Fine Dining Restaurants" },
      { id: "entertainment", name: "Evening Entertainment & Live Music Lounge" },
    ],
  },
  {
    category: "Business, Connectivity & Services",
    icon: Briefcase,
    items: [
      { id: "business_services", name: "Executive Business Center & Secretarial Desk" },
      { id: "internet", name: "High-Speed Fiber Internet & Campus-Wide WiFi" },
      { id: "general_services", name: "24/7 Concierge, Porterage & Luggage Vault" },
      { id: "complementary", name: "Complimentary Arrival Welcome Drink & Valet" },
    ],
  },
];

const DEFAULT_GALLERY: GalleryImage[] = [
  {
    id: "img-1",
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    title: "Grand Facade & Portico",
    category: "facade",
  },
  {
    id: "img-2",
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    title: "Presidential Lobby & Atrium",
    category: "lobby",
  },
  {
    id: "img-3",
    url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    title: "Infinity Sky Pool & Sunbeds",
    category: "wellness",
  },
  {
    id: "img-4",
    url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    title: "Botanical Spa Sanctuary",
    category: "wellness",
  },
  {
    id: "img-5",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    title: "Amber Rooftop Wine & Dine",
    category: "dining",
  },
  {
    id: "img-6",
    url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
    title: "Landscaped Gardens & Fountain",
    category: "outdoors",
  },
];

const DEFAULT_SETTINGS: HotelSettings = {
  earlyCheckInAllowedTime: "10:00",
  lateCheckOutGracePeriod: 30,
  lateCheckOutHalfDayCutoff: "15:00",
  nightAuditMode: "auto",
  nightAuditTime: "02:00",
  noShowReleaseWindow: "18:00",
  overbookingThreshold: 2,

  propertyFacilities: [
    "gardens",
    "rooftop_garden",
    "outdoor_parking_secured",
    "valet_service",
    "health_club_gym",
    "fitness_equipment",
    "spa_services",
    "water_amenities",
    "wine_and_dine",
    "business_services",
    "internet",
    "general_services",
    "complementary",
    "billiards",
  ],

  heroImageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85",
  galleryImages: DEFAULT_GALLERY,

  cancellationPolicyType: "moderate",
  cancellationFreeHours: 48,
  cancellationPenaltyPercent: 100,
  refundProcessingDays: 5,
  refundTermsText:
    "Cancellations received up to 48 hours prior to arrival date by 14:00 local time will receive a 100% refund. Cancellations made inside 48 hours, or guest no-shows, will be charged the first night room rate plus applicable taxes. Refunds are processed back to the original method of payment (Telebirr, CBE Birr, or Credit Card) within 3 to 5 business days.",
  petPolicy: "not_allowed",
  petFee: 0,
  smokingPolicy: "strictly_non_smoking",
  smokingPenaltyFee: 250,

  checkoutTriggerState: "dirty",
  linenChangeFrequency: 3,
  turndownServiceEnabled: true,
  defaultBoardBasis: "bb",
  breakfastServiceHours: "06:30 - 10:00",
  breakfastPriceAdult: 450,
  breakfastPriceChild: 250,
  extraBedDailyFee: 800,
  maxExtraBedsPerRoom: 1,

  invoicePrefix: "NGH-INV-",
  receiptPrefix: "NGH-REC-",
  proformaPrefix: "NGH-PRO-",
  defaultGuaranteePolicy: "credit_card",
  ageTierInfantMax: 2,
  ageTierChildMax: 12,
  ageTierAdultMin: 13,
  enabledGateways: ["telebirr", "cbe_birr", "visa_mastercard", "cash"],

  folioTermsFooter:
    "Safe deposit boxes are provided at reception for valuables. The hotel is not responsible for money, jewelry, or documents left in guest rooms. Guests are liable for any damages caused to hotel property during their stay.",
  registrationCardDisclaimer:
    "I agree to the hotel rules and policies. I agree that my liability for this bill is not waived and I agree to be held personally liable in the event that the indicated person or company fails to pay the full amount.",
};

type TabKey = "identity" | "operations" | "facilities" | "media" | "revenue" | "housekeeping" | "policies";

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function HotelPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [isEditing, setIsEditing] = useState(false);
  const [facilitySearch, setFacilitySearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rawHotel, isLoading, isError, refetch } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel"),
  });

  const hotel: Hotel | undefined = Array.isArray(rawHotel)
    ? rawHotel[0]
    : (rawHotel?.data?.[0] ?? rawHotel);

  const mergedSettings: HotelSettings = {
    ...DEFAULT_SETTINGS,
    ...(hotel?.settings || {}),
  };

  // State for interactive features in Edit Mode
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    mergedSettings.propertyFacilities || DEFAULT_SETTINGS.propertyFacilities || []
  );

  const [gateways, setGateways] = useState<string[]>(
    mergedSettings.enabledGateways || DEFAULT_SETTINGS.enabledGateways || []
  );

  const [gallery, setGallery] = useState<GalleryImage[]>(
    mergedSettings.galleryImages && mergedSettings.galleryImages.length > 0
      ? mergedSettings.galleryImages
      : DEFAULT_GALLERY
  );

  const [heroImage, setHeroImage] = useState<string>(
    mergedSettings.heroImageUrl || DEFAULT_SETTINGS.heroImageUrl || ""
  );

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageTitle, setNewImageTitle] = useState("");
  const [newImageCategory, setNewImageCategory] = useState<GalleryImage["category"]>("general");

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Hotel>) =>
      hotel?.id
        ? apiFetch(`/hotel/${hotel.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/hotel", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel"] });
      toast({ title: "Hotel configuration updated successfully" });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = (text: string, key: string) => {
    if (!text || typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleFacility = (fid: string) => {
    if (!isEditing) return;
    setSelectedFacilities((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    );
  };

  const handleToggleGateway = (gw: string) => {
    if (!isEditing) return;
    setGateways((prev) =>
      prev.includes(gw) ? prev.filter((g) => g !== gw) : [...prev, gw]
    );
  };

  const handleAddGalleryImage = () => {
    if (!newImageUrl.trim()) return;
    const newImg: GalleryImage = {
      id: "img-" + Date.now(),
      url: newImageUrl.trim(),
      title: newImageTitle.trim() || "Hotel Photo",
      category: newImageCategory,
    };
    setGallery((prev) => [newImg, ...prev]);
    setNewImageUrl("");
    setNewImageTitle("");
    toast({ title: "Image added to property gallery" });
  };

  const handleRemoveGalleryImage = (id: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const formObj = Object.fromEntries(fd);

    const updatedSettings: HotelSettings = {
      // Front Desk & Operations
      earlyCheckInAllowedTime: String(formObj.earlyCheckInAllowedTime || mergedSettings.earlyCheckInAllowedTime),
      lateCheckOutGracePeriod: Number(formObj.lateCheckOutGracePeriod) || mergedSettings.lateCheckOutGracePeriod,
      lateCheckOutHalfDayCutoff: String(formObj.lateCheckOutHalfDayCutoff || mergedSettings.lateCheckOutHalfDayCutoff),
      nightAuditMode: formObj.nightAuditMode === "manual" ? "manual" : "auto",
      nightAuditTime: String(formObj.nightAuditTime || mergedSettings.nightAuditTime),
      noShowReleaseWindow: String(formObj.noShowReleaseWindow || mergedSettings.noShowReleaseWindow),
      overbookingThreshold: Number(formObj.overbookingThreshold) || 0,

      // Facilities & Media
      propertyFacilities: selectedFacilities,
      heroImageUrl: heroImage || String(formObj.heroImageUrl || mergedSettings.heroImageUrl),
      galleryImages: gallery,

      // Policies & Refunds
      cancellationPolicyType: (formObj.cancellationPolicyType as any) || mergedSettings.cancellationPolicyType,
      cancellationFreeHours: Number(formObj.cancellationFreeHours) || mergedSettings.cancellationFreeHours,
      cancellationPenaltyPercent: Number(formObj.cancellationPenaltyPercent) || mergedSettings.cancellationPenaltyPercent,
      refundProcessingDays: Number(formObj.refundProcessingDays) || mergedSettings.refundProcessingDays,
      refundTermsText: String(formObj.refundTermsText || mergedSettings.refundTermsText),
      petPolicy: (formObj.petPolicy as any) || mergedSettings.petPolicy,
      petFee: Number(formObj.petFee) || 0,
      smokingPolicy: (formObj.smokingPolicy as any) || mergedSettings.smokingPolicy,
      smokingPenaltyFee: Number(formObj.smokingPenaltyFee) || 0,
      folioTermsFooter: String(formObj.folioTermsFooter || mergedSettings.folioTermsFooter),
      registrationCardDisclaimer: String(formObj.registrationCardDisclaimer || mergedSettings.registrationCardDisclaimer),

      // Housekeeping & Dining
      checkoutTriggerState: formObj.checkoutTriggerState === "cleaning" ? "cleaning" : "dirty",
      linenChangeFrequency: Number(formObj.linenChangeFrequency) || 3,
      turndownServiceEnabled: formObj.turndownServiceEnabled === "on",
      defaultBoardBasis: (formObj.defaultBoardBasis as any) || "bb",
      breakfastServiceHours: String(formObj.breakfastServiceHours || mergedSettings.breakfastServiceHours),
      breakfastPriceAdult: Number(formObj.breakfastPriceAdult) || 0,
      breakfastPriceChild: Number(formObj.breakfastPriceChild) || 0,
      extraBedDailyFee: Number(formObj.extraBedDailyFee) || 0,
      maxExtraBedsPerRoom: Number(formObj.maxExtraBedsPerRoom) || 1,

      // Revenue & Financial
      invoicePrefix: String(formObj.invoicePrefix || mergedSettings.invoicePrefix),
      receiptPrefix: String(formObj.receiptPrefix || mergedSettings.receiptPrefix),
      proformaPrefix: String(formObj.proformaPrefix || mergedSettings.proformaPrefix),
      defaultGuaranteePolicy: (formObj.defaultGuaranteePolicy as any) || "credit_card",
      ageTierInfantMax: Number(formObj.ageTierInfantMax) || 2,
      ageTierChildMax: Number(formObj.ageTierChildMax) || 12,
      ageTierAdultMin: Number(formObj.ageTierAdultMin) || 13,
      enabledGateways: gateways,
    };

    saveMutation.mutate({
      hotelName: String(formObj.hotelName || hotel?.hotelName),
      legalName: String(formObj.legalName || hotel?.legalName),
      hotelCode: String(formObj.hotelCode || hotel?.hotelCode),
      starRating: Number(formObj.starRating) || 5,
      email: String(formObj.email || hotel?.email),
      phone: String(formObj.phone || hotel?.phone),
      website: String(formObj.website || hotel?.website),
      address: String(formObj.address || hotel?.address),
      city: String(formObj.city || hotel?.city),
      country: String(formObj.country || hotel?.country),
      timezone: String(formObj.timezone || hotel?.timezone),
      currencyCode: String(formObj.currencyCode || hotel?.currencyCode),
      checkInTime: String(formObj.checkInTime || hotel?.checkInTime),
      checkOutTime: String(formObj.checkOutTime || hotel?.checkOutTime),
      taxNumber: String(formObj.taxNumber || hotel?.taxNumber),
      licenseNumber: String(formObj.licenseNumber || hotel?.licenseNumber),
      settings: updatedSettings,
    } as Partial<Hotel>);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
        <div className="space-y-6 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
        <Building2 className="w-12 h-12 text-blue-700 dark:text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Unable to Load Hotel Configuration
        </h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-600 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const starsCount = hotel?.starRating || 5;

  return (
    <div className="max-w-7xl mx-auto pb-24 pt-2 space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Hotel Configuration
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Configuration</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-xs cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Configuration</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Luxury Identity Banner */}
        <div className="mt-4 p-6 rounded-2xl bg-gradient-to-r from-blue-700/10 via-blue-600/5 to-transparent dark:from-blue-900/30 dark:via-blue-950/10 dark:to-transparent border border-blue-600/20 dark:border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm border border-blue-400/30">
              {hotel?.hotelName?.charAt(0) || "N"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl text-[var(--text-primary)]">
                  {hotel?.hotelName || "Nexus Grand Hotel"}
                </span>
                <StatusPill status={hotel?.status || "active"} />
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono mt-1">
                <span className="font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  {hotel?.hotelCode || "NGH-001"}
                </span>
                <span>&bull;</span>
                <div className="flex items-center text-amber-500 gap-0.5" title={`${starsCount} Star Luxury`}>
                  {Array.from({ length: starsCount }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)] border-t md:border-t-0 md:border-l border-[var(--border)] pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Currency</span>
              <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{hotel?.currencyCode || "ETB"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Timezone</span>
              <span className="font-mono font-medium text-[var(--text-primary)]">{hotel?.timezone || "Africa/Addis_Ababa"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Check-In / Out</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{hotel?.checkInTime || "14:00"} / {hotel?.checkOutTime || "12:00"}</span>
            </div>
          </div>
        </div>

        {/* Luxury Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] mt-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("identity")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "identity"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Property & Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("facilities")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "facilities"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Facilities & Features</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "media"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Media & Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("policies")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "policies"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Policies & Refunds</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "operations"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Operations & Timers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "revenue"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Revenue & Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("housekeeping")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "housekeeping"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Housekeeping & Dining</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-6">
          {/* ================================================================= */}
          {/* TAB 1: IDENTITY & PROPERTY                                        */}
          {/* ================================================================= */}
          {activeTab === "identity" && (
            <div className="space-y-8">
              {/* Brand & Corporate */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Brand & Corporate Entity
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Hotel Brand Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hotelName"
                        defaultValue={hotel?.hotelName}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.hotelName || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Legal Entity Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="legalName"
                        defaultValue={hotel?.legalName}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.legalName || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Property Code</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="hotelCode"
                        defaultValue={hotel?.hotelCode}
                        required
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.hotelCode || "—"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Star Rating</span>
                    {isEditing ? (
                      <select
                        name="starRating"
                        defaultValue={hotel?.starRating || 5}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <option key={s} value={s}>{s} Stars</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{starsCount} Stars Luxury</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Location & Contact
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Official Email</span>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        defaultValue={hotel?.email}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.email || "—"}</span>
                        {hotel?.email && (
                          <button
                            type="button"
                            onClick={() => handleCopy(hotel.email!, "email")}
                            className="text-[var(--text-secondary)] hover:text-blue-700 p-1 cursor-pointer"
                          >
                            {copiedKey === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Phone Number</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="phone"
                        defaultValue={hotel?.phone}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{hotel?.phone || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Official Website</span>
                    {isEditing ? (
                      <input
                        type="url"
                        name="website"
                        defaultValue={hotel?.website}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.website || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Address</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="address"
                        defaultValue={hotel?.address}
                        required
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.address || "—"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">City & Country</span>
                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          name="city"
                          defaultValue={hotel?.city}
                          required
                          placeholder="City"
                          className="h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <input
                          type="text"
                          name="country"
                          defaultValue={hotel?.country || "Ethiopia"}
                          required
                          placeholder="Country"
                          className="h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.city || "Addis Ababa"}, {hotel?.country || "Ethiopia"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax & Legal Licensing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Tax & Licensing
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Tax Number (TIN)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="taxNumber"
                        defaultValue={hotel?.taxNumber || "TIN-ET-001234567"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.taxNumber || "TIN-ET-001234567"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Business License</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="licenseNumber"
                        defaultValue={hotel?.licenseNumber || "ETH-HTL-2020-00142"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.licenseNumber || "ETH-HTL-2020-00142"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">VAT Standard</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">15% Standard VAT</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: FACILITIES & FEATURES                                      */}
          {/* ================================================================= */}
          {activeTab === "facilities" && (
            <div className="space-y-6">
              {/* Header Filter Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Hotel Facilities, Amenities & Services Catalog
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedFacilities.length} features active across property
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search amenities & services..."
                    value={facilitySearch}
                    onChange={(e) => setFacilitySearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                  />
                </div>
              </div>

              {/* Categorized Facility Cards */}
              <div className="space-y-6">
                {FACILITY_CATEGORIES.map((cat) => {
                  const CategoryIcon = cat.icon;
                  const filteredItems = cat.items.filter((item) =>
                    item.name.toLowerCase().includes(facilitySearch.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div
                      key={cat.category}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-4"
                    >
                      <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-700/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {cat.category}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredItems.map((item) => {
                          const isChecked = selectedFacilities.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleFacility(item.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isEditing ? "cursor-pointer" : ""
                              } ${
                                isChecked
                                  ? "border-blue-700/40 bg-blue-700/5 dark:bg-blue-900/15"
                                  : "border-[var(--border)] bg-[var(--surface)] opacity-70"
                              }`}
                            >
                              <span
                                className={`text-xs font-semibold ${
                                  isChecked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                }`}
                              >
                                {item.name}
                              </span>

                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? "bg-blue-700 text-white"
                                    : "border border-[var(--border)] bg-transparent"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: MEDIA & GALLERY                                            */}
          {/* ================================================================= */}
          {activeTab === "media" && (
            <div className="space-y-8">
              {/* Primary Hero Cover Banner */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Primary Showcase Hero Cover
                  </h3>
                  {isEditing && (
                    <span className="text-xs text-[var(--text-secondary)]">Displayed on guest portals & booking headers</span>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-slate-900 h-64 md:h-80 shadow-xs group">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt="Hotel Cover"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                      <span className="text-sm">No cover photo set</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-blue-300 font-mono">Master Cover</span>
                        <h4 className="text-lg font-bold">{hotel?.hotelName || "Nexus Grand Hotel"}</h4>
                      </div>
                      <span className="text-xs font-mono bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                        {hotel?.city || "Addis Ababa"}, {hotel?.country || "Ethiopia"}
                      </span>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="url"
                      name="heroImageUrl"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="Enter High-Resolution Hero Cover Image URL..."
                      className="flex-1 h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  </div>
                )}
              </div>

              {/* Property Gallery Grid */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                      Property Photo Showcase Gallery
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {gallery.length} verified showcase photos
                    </span>
                  </div>

                  {isEditing && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="url"
                        placeholder="Image URL..."
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="w-48 sm:w-60 h-8 px-2.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                      <input
                        type="text"
                        placeholder="Title (e.g. Sunset Sky Pool)"
                        value={newImageTitle}
                        onChange={(e) => setNewImageTitle(e.target.value)}
                        className="w-36 h-8 px-2.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                      <select
                        value={newImageCategory}
                        onChange={(e) => setNewImageCategory(e.target.value as any)}
                        className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="facade">Facade</option>
                        <option value="lobby">Lobby</option>
                        <option value="dining">Dining</option>
                        <option value="wellness">Wellness & Spa</option>
                        <option value="outdoors">Outdoors</option>
                        <option value="general">General</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddGalleryImage}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Photo</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-xs aspect-[4/3]"
                    >
                      <img
                        src={img.url}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300">
                          {img.category}
                        </span>
                        <span className="text-sm font-bold truncate">{img.title}</span>
                      </div>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(img.id)}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: POLICIES & REFUNDS (FULL-WIDTH POLICY SUITE)               */}
          {/* ================================================================= */}
          {activeTab === "policies" && (
            <div className="space-y-8">
              {/* Cancellation & Refund Policy */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Cancellation & Refund Policy Architecture
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Governs booking deposit returns, late cancellations, and refund processing schedules
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                      Policy Archetype
                    </label>
                    {isEditing ? (
                      <select
                        name="cancellationPolicyType"
                        defaultValue={mergedSettings.cancellationPolicyType || "moderate"}
                        className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="flexible">Flexible (24 Hours Prior)</option>
                        <option value="moderate">Moderate (48 Hours Prior)</option>
                        <option value="strict">Strict (7 Days Prior)</option>
                        <option value="non_refundable">100% Non-Refundable</option>
                      </select>
                    ) : (
                      <span className="text-sm font-bold text-[var(--text-primary)] capitalize">
                        {mergedSettings.cancellationPolicyType || "moderate"}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                      Free Cancellation Window
                    </label>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="cancellationFreeHours"
                          defaultValue={mergedSettings.cancellationFreeHours || 48}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Hours before check-in</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        Up to {mergedSettings.cancellationFreeHours || 48} hours prior
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                      Refund Settlement Timeline
                    </label>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="refundProcessingDays"
                          defaultValue={mergedSettings.refundProcessingDays || 5}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Business days</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {mergedSettings.refundProcessingDays || 5} Business Days
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                    Official Cancellation & Refund Terms (Full Text)
                  </label>
                  {isEditing ? (
                    <textarea
                      name="refundTermsText"
                      rows={5}
                      defaultValue={mergedSettings.refundTermsText}
                      className="w-full p-3.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 leading-relaxed font-sans"
                    />
                  ) : (
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] leading-relaxed">
                      {mergedSettings.refundTermsText}
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Folio T&C Footer */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-3">
                <div className="border-b border-[var(--border)] pb-3">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Guest Folio & Invoice Legal T&C Footer
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Standardized legal statement rendered at the foot of all guest folios and checkout bills
                  </span>
                </div>
                {isEditing ? (
                  <textarea
                    name="folioTermsFooter"
                    rows={4}
                    defaultValue={mergedSettings.folioTermsFooter}
                    className="w-full p-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                    {mergedSettings.folioTermsFooter}
                  </div>
                )}
              </div>

              {/* Registration Card Agreement */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs space-y-3">
                <div className="border-b border-[var(--border)] pb-3">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Arrival Registration Card Agreement
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Pre-configured declaration signed by guests on arrival via physical or digital registration
                  </span>
                </div>
                {isEditing ? (
                  <textarea
                    name="registrationCardDisclaimer"
                    rows={4}
                    defaultValue={mergedSettings.registrationCardDisclaimer}
                    className="w-full p-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                    {mergedSettings.registrationCardDisclaimer}
                  </div>
                )}
              </div>

              {/* Smoking & Pet Policies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Cigarette className="w-4 h-4 text-rose-600" />
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Smoking Policy</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                      <span className="text-[var(--text-secondary)]">Room Policy</span>
                      <span className="font-semibold text-rose-600">Strictly Non-Smoking Indoors</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[var(--text-secondary)]">Deep Clean Violation Fee</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        ${mergedSettings.smokingPenaltyFee || 250} USD / 15,000 ETB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Dog className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Pet Accommodation Policy</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                      <span className="text-[var(--text-secondary)]">Policy Status</span>
                      <span className="font-semibold text-[var(--text-primary)]">Certified Guide & Service Dogs Only</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[var(--text-secondary)]">Pet Cleaning Deposit</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">Waived for Service Animals</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: OPERATIONS & TIMERS                                        */}
          {/* ================================================================= */}
          {activeTab === "operations" && (
            <div className="space-y-8">
              {/* Check-In / Check-Out Triggers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Check-In & Check-Out Triggers
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-In</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="checkInTime"
                        defaultValue={hotel?.checkInTime || "14:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{hotel?.checkInTime || "14:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-Out</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="checkOutTime"
                        defaultValue={hotel?.checkOutTime || "12:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{hotel?.checkOutTime || "12:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Early Check-In Allowed</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="earlyCheckInAllowedTime"
                        defaultValue={mergedSettings.earlyCheckInAllowedTime || "10:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.earlyCheckInAllowedTime || "10:00"} (Complimentary)</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Check-Out Grace</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="lateCheckOutGracePeriod"
                          defaultValue={mergedSettings.lateCheckOutGracePeriod || 30}
                          min={0}
                          max={120}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Minutes past 12:00</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.lateCheckOutGracePeriod || 30} minutes</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Half-Day Charge Cutoff</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="lateCheckOutHalfDayCutoff"
                        defaultValue={mergedSettings.lateCheckOutHalfDayCutoff || "15:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.lateCheckOutHalfDayCutoff || "15:00"} (Full night billed past cutoff)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Night Audit & Safeguards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Night Audit & Safeguards
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Night Audit Model</span>
                    {isEditing ? (
                      <select
                        name="nightAuditMode"
                        defaultValue={mergedSettings.nightAuditMode || "auto"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="auto">Scheduled Automatic Roll</option>
                        <option value="manual">Manual Front Desk Execution</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                        {mergedSettings.nightAuditMode === "auto" ? "Scheduled Automatic Roll" : "Manual Execution"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Scheduled Audit Time</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="nightAuditTime"
                        defaultValue={mergedSettings.nightAuditTime || "02:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{mergedSettings.nightAuditTime || "02:00"} AM</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">No-Show Release Window</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="noShowReleaseWindow"
                        defaultValue={mergedSettings.noShowReleaseWindow || "18:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.noShowReleaseWindow || "18:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Overbooking Buffer</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="overbookingThreshold"
                          defaultValue={mergedSettings.overbookingThreshold || 2}
                          min={0}
                          max={15}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">% overbooking allowed</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.overbookingThreshold || 2}%</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: REVENUE & PAYMENTS                                         */}
          {/* ================================================================= */}
          {activeTab === "revenue" && (
            <div className="space-y-8">
              {/* Document Sequencing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Financial Document Sequences
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Invoice Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="invoicePrefix"
                        defaultValue={mergedSettings.invoicePrefix || "NGH-INV-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {mergedSettings.invoicePrefix || "NGH-INV-"}00001
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Receipt Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="receiptPrefix"
                        defaultValue={mergedSettings.receiptPrefix || "NGH-REC-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {mergedSettings.receiptPrefix || "NGH-REC-"}00001
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Proforma Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="proformaPrefix"
                        defaultValue={mergedSettings.proformaPrefix || "NGH-PRO-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {mergedSettings.proformaPrefix || "NGH-PRO-"}00001
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Channels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Active Payment Channels
                  </h3>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "telebirr", label: "Telebirr (Ethio Telecom)", tag: "Mobile Money" },
                      { id: "cbe_birr", label: "CBE Birr (Commercial Bank)", tag: "Direct Banking" },
                      { id: "chapa", label: "Chapa Payment Gateway", tag: "Local & Card Gateway" },
                      { id: "visa_mastercard", label: "Visa / Mastercard / Amex", tag: "International POS" },
                      { id: "cash", label: "Cash & Direct Deposit", tag: "Front Desk Cashier" },
                    ].map((gw) => {
                      const isEnabled = gateways.includes(gw.id);
                      return (
                        <div
                          key={gw.id}
                          onClick={() => handleToggleGateway(gw.id)}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isEditing ? "cursor-pointer" : ""
                          } ${
                            isEnabled
                              ? "border-blue-700/40 bg-blue-700/5 dark:bg-blue-900/20"
                              : "border-[var(--border)] bg-[var(--surface)] opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{gw.label}</span>
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isEnabled ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-slate-300 dark:bg-slate-700"
                              }`}
                            />
                          </div>
                          <span className="text-[11px] text-[var(--text-secondary)] font-mono block mt-1">{gw.tag}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Guarantees & Age Tiers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Guarantee & Age Tiers
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Default Guarantee Policy</span>
                    {isEditing ? (
                      <select
                        name="defaultGuaranteePolicy"
                        defaultValue={mergedSettings.defaultGuaranteePolicy || "credit_card"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="credit_card">Credit Card Pre-Authorization</option>
                        <option value="first_night_deposit">First Night Deposit Required</option>
                        <option value="non_guaranteed">Non-Guaranteed (6 PM Release)</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {mergedSettings.defaultGuaranteePolicy === "first_night_deposit"
                          ? "First Night Deposit Required"
                          : mergedSettings.defaultGuaranteePolicy === "non_guaranteed"
                          ? "Non-Guaranteed"
                          : "Credit Card Pre-Authorization"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Age Classifications</span>
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Infant (Max Age)</label>
                          <input
                            type="number"
                            name="ageTierInfantMax"
                            defaultValue={mergedSettings.ageTierInfantMax || 2}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Child (Max Age)</label>
                          <input
                            type="number"
                            name="ageTierChildMax"
                            defaultValue={mergedSettings.ageTierChildMax || 12}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Adult (Min Age)</label>
                          <input
                            type="number"
                            name="ageTierAdultMin"
                            defaultValue={mergedSettings.ageTierAdultMin || 13}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                        Infant: 0–{mergedSettings.ageTierInfantMax || 2} &bull; Child: {(mergedSettings.ageTierInfantMax || 2) + 1}–{mergedSettings.ageTierChildMax || 12} &bull; Adult: {mergedSettings.ageTierAdultMin || 13}+
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 7: HOUSEKEEPING & DINING                                      */}
          {/* ================================================================= */}
          {activeTab === "housekeeping" && (
            <div className="space-y-8">
              {/* Housekeeping Operations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Housekeeping Operations
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Checkout Trigger State</span>
                    {isEditing ? (
                      <select
                        name="checkoutTriggerState"
                        defaultValue={mergedSettings.checkoutTriggerState || "dirty"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="dirty">Dirty (Requires Deep Cleaning)</option>
                        <option value="cleaning">Cleaning In Progress</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                        {mergedSettings.checkoutTriggerState || "dirty"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Linen Change Frequency</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="linenChangeFrequency"
                          defaultValue={mergedSettings.linenChangeFrequency || 3}
                          min={1}
                          max={7}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Days between full sheet change</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Every {mergedSettings.linenChangeFrequency || 3} days</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Turndown Service</span>
                    {isEditing ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="turndownServiceEnabled"
                          defaultChecked={mergedSettings.turndownServiceEnabled !== false}
                          className="w-4 h-4 rounded text-blue-700 focus:ring-blue-700 border-[var(--border)]"
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Enable evening turndown service</span>
                      </label>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {mergedSettings.turndownServiceEnabled !== false ? "Active for Executive Rooms" : "Disabled"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Breakfast & Dining */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Dining & Meal Plans
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Default Board Basis</span>
                    {isEditing ? (
                      <select
                        name="defaultBoardBasis"
                        defaultValue={mergedSettings.defaultBoardBasis || "bb"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="ro">Room Only (RO)</option>
                        <option value="bb">Bed & Breakfast (BB)</option>
                        <option value="hb">Half Board (HB)</option>
                        <option value="fb">Full Board (FB)</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {mergedSettings.defaultBoardBasis === "ro"
                          ? "Room Only (RO)"
                          : mergedSettings.defaultBoardBasis === "hb"
                          ? "Half Board (HB)"
                          : mergedSettings.defaultBoardBasis === "fb"
                          ? "Full Board (FB)"
                          : "Bed & Breakfast (BB)"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Breakfast Operational Hours</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="breakfastServiceHours"
                        defaultValue={mergedSettings.breakfastServiceHours || "06:30 - 10:00"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{mergedSettings.breakfastServiceHours || "06:30 - 10:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Breakfast Pricing</span>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Adult (ETB)</label>
                          <input
                            type="number"
                            name="breakfastPriceAdult"
                            defaultValue={mergedSettings.breakfastPriceAdult || 450}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Child (ETB)</label>
                          <input
                            type="number"
                            name="breakfastPriceChild"
                            defaultValue={mergedSettings.breakfastPriceChild || 250}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        Adult: {mergedSettings.breakfastPriceAdult || 450} ETB &bull; Child: {mergedSettings.breakfastPriceChild || 250} ETB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra Bed & Crib Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Cribs & Extra Beds
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Extra Bed Daily Fee</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="extraBedDailyFee"
                          defaultValue={mergedSettings.extraBedDailyFee || 800}
                          className="w-32 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">ETB per night</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.extraBedDailyFee || 800} ETB / night</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Max Extra Beds / Room</span>
                    {isEditing ? (
                      <input
                        type="number"
                        name="maxExtraBedsPerRoom"
                        defaultValue={mergedSettings.maxExtraBedsPerRoom || 1}
                        min={0}
                        max={3}
                        className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{mergedSettings.maxExtraBedsPerRoom || 1} Rollaway Bed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save Action Bar when Editing */}
        {isEditing && (
          <div className="sticky bottom-4 mt-8 py-3.5 px-6 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between z-30 border border-slate-700/50">
            <span className="text-sm font-medium text-slate-300">
              Unsaved configuration changes pending
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saveMutation.isPending}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

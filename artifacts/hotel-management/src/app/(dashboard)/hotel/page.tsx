"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Edit2,
  Key,
  Landmark,
  Smartphone,
  Eye,
  Banknote,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// DATA TYPES
// ---------------------------------------------------------------------------
export type GalleryImage = {
  id: string;
  url: string;
  title: string;
  category: "facade" | "lobby" | "dining" | "wellness" | "outdoors" | "general";
  description?: string;
};

export type CustomFacility = {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
};

export type ExtraBedItem = {
  id: string;
  name: string;
  type: "rollaway" | "crib" | "folding";
  capacity: number;
  dailyFee: number;
  totalInventory: number;
  isComplimentary: boolean;
};

export type PaymentAccountSpecifier = {
  channelId: string;
  channelName: string;
  isEnabled: boolean;
  accountNumber: string;
  accountName: string;
  bankOrProvider: string;
  category?: string;
  additionalIdentifier?: string;
};

export type HotelSettings = {
  // Operations & Timers
  earlyCheckInAllowedTime?: string;
  lateCheckOutGracePeriod?: number;
  lateCheckOutHalfDayCutoff?: string;
  nightAuditMode?: "auto" | "manual";
  nightAuditTime?: string;
  noShowReleaseWindow?: string;
  overbookingThreshold?: number;

  // Facilities
  propertyFacilities?: string[];
  customFacilitiesList?: CustomFacility[];

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
  smokingPolicy?: "strictly_non_smoking" | "designated_areas" | "allowed";
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
  extraBedsList?: ExtraBedItem[];

  // Revenue & Payment
  invoicePrefix?: string;
  receiptPrefix?: string;
  proformaPrefix?: string;
  defaultGuaranteePolicy?: "credit_card" | "first_night_deposit" | "non_guaranteed";
  ageTierInfantMax?: number;
  ageTierChildMax?: number;
  ageTierAdultMin?: number;
  enabledGateways?: string[];
  paymentAccountsList?: PaymentAccountSpecifier[];
};

export type Hotel = {
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
// DEFAULT CATALOGS
// ---------------------------------------------------------------------------
const BASE_FACILITIES: CustomFacility[] = [
  // Outdoors & Grounds
  { id: "gardens", name: "Gardens & Landscaped Lawns", category: "Outdoors & Grounds" },
  { id: "rooftop_garden", name: "Rooftop Garden & Sunset Terrace", category: "Outdoors & Grounds" },
  { id: "barbecue_campfire", name: "Barbecue Area & Campfire / Bonfire", category: "Outdoors & Grounds" },
  { id: "childrens_park", name: "Children's Playground & Adventure Park", category: "Outdoors & Grounds" },
  { id: "private_beach", name: "Private Beach & Boardwalk Access", category: "Outdoors & Grounds" },
  { id: "nature_walk", name: "Guided Nature Walk & Botanical Trails", category: "Outdoors & Grounds" },
  { id: "marina", name: "Marina On-Site & Private Boat Slips", category: "Outdoors & Grounds" },
  { id: "fishing", name: "Fishing Excursions & Equipment", category: "Outdoors & Grounds" },
  { id: "safari", name: "Safari & Scenic Wildlife Excursions", category: "Outdoors & Grounds" },

  // Parking & Valet
  { id: "valet_service", name: "Valet Service (Complimentary)", category: "Parking & Valet Services" },
  { id: "outdoor_parking_secured", name: "Outdoor Parking - Secured & CCTV Monitored", category: "Parking & Valet Services" },
  { id: "outdoor_parking_non_secured", name: "Outdoor Parking - Non Secured", category: "Parking & Valet Services" },
  { id: "parking_facilities", name: "Covered Underground Parking Facilities", category: "Parking & Valet Services" },
  { id: "parking_surcharge", name: "Dedicated Long-Term Parking (Surcharge)", category: "Parking & Valet Services" },
  { id: "bike_rent", name: "Bicycles & E-Bikes on Rent", category: "Parking & Valet Services" },

  // Sports & Recreation
  { id: "health_club_gym", name: "Health Club & 24/7 Gym Facility", category: "Sports, Fitness & Recreation" },
  { id: "fitness_equipment", name: "Premium Cardio & Strength Equipment", category: "Sports, Fitness & Recreation" },
  { id: "tennis_court", name: "Championship Floodlit Tennis Court", category: "Sports, Fitness & Recreation" },
  { id: "badminton_court", name: "Indoor Badminton Court", category: "Sports, Fitness & Recreation" },
  { id: "basketball_court", name: "Half-Court Basketball", category: "Sports, Fitness & Recreation" },
  { id: "squash_court", name: "Squash Courts", category: "Sports, Fitness & Recreation" },
  { id: "table_tennis", name: "Table Tennis & Ping Pong Lounge", category: "Sports, Fitness & Recreation" },
  { id: "billiards", name: "Billiards & Luxury Pool Tables", category: "Sports, Fitness & Recreation" },
  { id: "bowling", name: "Multi-Lane Bowling Alley", category: "Sports, Fitness & Recreation" },
  { id: "golf_course", name: "18-Hole Championship Golf Course", category: "Sports, Fitness & Recreation" },
  { id: "virtual_golf", name: "HD Virtual Golf Simulator", category: "Sports, Fitness & Recreation" },
  { id: "clubhouse", name: "Private Residents & Members Clubhouse", category: "Sports, Fitness & Recreation" },
  { id: "games_zone", name: "Arcade & Modern E-Sports Games Zone", category: "Sports, Fitness & Recreation" },
  { id: "horse_ride", name: "Horse Riding & Equestrian Trails", category: "Sports, Fitness & Recreation" },
  { id: "camel_ride", name: "Camel Riding & Heritage Tours", category: "Sports, Fitness & Recreation" },
  { id: "boating", name: "Boating, Kayaking & Watercraft Rental", category: "Sports, Fitness & Recreation" },
  { id: "skiing", name: "Skiing Facility & Winter Sports Desk", category: "Sports, Fitness & Recreation" },

  // Spa & Water
  { id: "spa_services", name: "Available Spa & Holistic Wellness Services", category: "Spa, Wellness & Water" },
  { id: "water_amenities", name: "Infinity Heated Pools & Water Amenities", category: "Spa, Wellness & Water" },
  { id: "fun_floats", name: "Resort Family Pools & Fun Floats", category: "Spa, Wellness & Water" },

  // Dining
  { id: "wine_and_dine", name: "Wine & Dine Fine Dining Restaurants", category: "Dining & Entertainment" },
  { id: "entertainment", name: "Evening Entertainment & Live Music Lounge", category: "Dining & Entertainment" },

  // Business & General
  { id: "business_services", name: "Executive Business Center & Secretarial Desk", category: "Business & Connectivity" },
  { id: "internet", name: "High-Speed Fiber Internet & Campus-Wide WiFi", category: "Business & Connectivity" },
  { id: "general_services", name: "24/7 Concierge, Porterage & Luggage Vault", category: "Business & Connectivity" },
  { id: "complementary", name: "Complimentary Arrival Welcome Drink & Valet", category: "Business & Connectivity" },
];

const DEFAULT_GALLERY: GalleryImage[] = [
  {
    id: "img-1",
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    title: "Grand Facade & Portico",
    category: "facade",
    description: "Main arrival portico and neoclassical architectural exterior.",
  },
  {
    id: "img-2",
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    title: "Presidential Lobby & Atrium",
    category: "lobby",
    description: "Double-height marble atrium with concierge desk.",
  },
  {
    id: "img-3",
    url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    title: "Infinity Sky Pool & Sunbeds",
    category: "wellness",
    description: "Heated panoramic rooftop pool overlooking the city skyline.",
  },
  {
    id: "img-4",
    url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    title: "Botanical Spa Sanctuary",
    category: "wellness",
    description: "Private hydrotherapy and couples massage suites.",
  },
  {
    id: "img-5",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    title: "Amber Rooftop Wine & Dine",
    category: "dining",
    description: "Fine dining restaurant with curated wine cellar.",
  },
  {
    id: "img-6",
    url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
    title: "Landscaped Gardens & Fountain",
    category: "outdoors",
    description: "Lush gardens featuring private walking paths.",
  },
];

const DEFAULT_EXTRA_BEDS: ExtraBedItem[] = [
  {
    id: "bed-1",
    name: "Luxury Rollaway Bed (Adult)",
    type: "rollaway",
    capacity: 1,
    dailyFee: 800,
    totalInventory: 15,
    isComplimentary: false,
  },
  {
    id: "bed-2",
    name: "Wooden Baby Cot / Crib (Infant)",
    type: "crib",
    capacity: 1,
    dailyFee: 0,
    totalInventory: 8,
    isComplimentary: true,
  },
  {
    id: "bed-3",
    name: "Executive Folding Extra Bed",
    type: "folding",
    capacity: 1,
    dailyFee: 1200,
    totalInventory: 5,
    isComplimentary: false,
  },
];

const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountSpecifier[] = [
  {
    channelId: "telebirr",
    channelName: "Telebirr (Ethio Telecom)",
    category: "Mobile Wallet",
    isEnabled: true,
    accountNumber: "10045239",
    accountName: "Nexus Grand Hotel PLC",
    bankOrProvider: "Ethio Telecom",
    additionalIdentifier: "+251 91 123 4567 (Till Shortcode)",
  },
  {
    channelId: "cbe_birr",
    channelName: "CBE Birr (Commercial Bank)",
    category: "Bank Wallet",
    isEnabled: true,
    accountNumber: "100028492019",
    accountName: "Nexus Grand Hotel PLC",
    bankOrProvider: "Commercial Bank of Ethiopia",
    additionalIdentifier: "CBE-MERCH-8841",
  },
  {
    channelId: "chapa",
    channelName: "Chapa Payment Gateway",
    category: "Payment Gateway",
    isEnabled: true,
    accountNumber: "CHAPUBK_LIVE-nexus8842",
    accountName: "Nexus Hospitality Services",
    bankOrProvider: "Chapa Financial",
    additionalIdentifier: "Merchant Account #48291",
  },
  {
    channelId: "visa_mastercard",
    channelName: "Visa / Mastercard / Amex",
    category: "Cards & POS",
    isEnabled: true,
    accountNumber: "MID-99238472",
    accountName: "Nexus Grand Hotel POS Settlement",
    bankOrProvider: "Dashen Bank Acquiring",
    additionalIdentifier: "Terminal TID-0042",
  },
  {
    channelId: "bank_transfer",
    channelName: "Direct Bank Wire Transfer",
    category: "Wire Transfer",
    isEnabled: true,
    accountNumber: "1000182930495",
    accountName: "Nexus Grand Hotel Main Corporate",
    bankOrProvider: "Commercial Bank of Ethiopia",
    additionalIdentifier: "SWIFT: CBETETAA",
  },
  {
    channelId: "cash",
    channelName: "Cash & Front Desk Cashier",
    category: "Cash & Vault",
    isEnabled: true,
    accountNumber: "CASH-VAULT-01",
    accountName: "Front Desk Cashier Drawer",
    bankOrProvider: "On-Site Safe Vault",
    additionalIdentifier: "Dual-Control Key Safe",
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
  customFacilitiesList: BASE_FACILITIES,

  heroImageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85",
  galleryImages: DEFAULT_GALLERY,

  cancellationPolicyType: "moderate",
  cancellationFreeHours: 48,
  cancellationPenaltyPercent: 100,
  refundProcessingDays: 5,
  refundTermsText: `<h3>Standard Cancellation & Refund Policy</h3><p>Our hotel strives to provide flexible, transparent terms for both business and leisure guests.</p><h4>Cancellation Windows:</h4><ul><li><strong>Free Cancellation:</strong> Bookings cancelled up to 48 hours prior to arrival date by 14:00 local time receive a 100% full refund.</li><li><strong>Late Cancellation:</strong> Cancellations received within 48 hours of check-in, or failure to arrive (No-Show), will be billed for the first night room rate plus applicable taxes.</li><li><strong>Non-Refundable Tariffs:</strong> Promotional rates flagged as non-refundable are charged at booking and cannot be refunded or transferred.</li></ul><h4>Refund Settlement Timeline:</h4><p>Approved refunds are credited directly to the original settlement instrument (Telebirr, CBE Birr, or Credit Card) within 3 to 5 business days.</p>`,
  petPolicy: "not_allowed",
  petFee: 0,
  smokingPolicy: "strictly_non_smoking",
  smokingPenaltyFee: 250,
  folioTermsFooter: `<h4>Guest Liability & Security Notice:</h4><ul><li><strong>Safe Deposit Boxes:</strong> Individual safe deposit boxes are provided at the Front Desk free of charge. Management disclaims all liability for cash, jewelry, or documents left in guest rooms.</li><li><strong>Property Damages:</strong> Registered guests assume full financial responsibility for any physical breakage, smoke damage, or fixture loss caused during their stay.</li><li><strong>Settlement of Charges:</strong> Unbilled incidental charges discovered post-departure will be posted to the credit card or billing account on record.</li></ul>`,
  registrationCardDisclaimer: `<h4>Guest Registration Agreement & Terms:</h4><p>I hereby certify that all information submitted during registration is accurate and complete.</p><ul><li>I agree to comply with hotel safety regulations, quiet hours, and property guidelines.</li><li>I agree that my personal liability for all room charges, taxes, and incidentals is not waived if any third party, employer, or sponsoring organization fails to pay in full.</li><li>I understand check-out time is 12:00 PM. Delayed departures without prior front desk clearance may incur half-day or full-day surcharges.</li></ul>`,

  checkoutTriggerState: "dirty",
  linenChangeFrequency: 3,
  turndownServiceEnabled: true,
  defaultBoardBasis: "bb",
  breakfastServiceHours: "06:30 - 10:00",
  breakfastPriceAdult: 450,
  breakfastPriceChild: 250,
  extraBedsList: DEFAULT_EXTRA_BEDS,

  invoicePrefix: "NGH-INV-",
  receiptPrefix: "NGH-REC-",
  proformaPrefix: "NGH-PRO-",
  defaultGuaranteePolicy: "credit_card",
  ageTierInfantMax: 2,
  ageTierChildMax: 12,
  ageTierAdultMin: 13,
  enabledGateways: ["telebirr", "cbe_birr", "visa_mastercard", "cash"],
  paymentAccountsList: DEFAULT_PAYMENT_ACCOUNTS,
};

type TabKey = "identity" | "operations" | "facilities" | "media" | "revenue" | "housekeeping" | "policies";

// ---------------------------------------------------------------------------
// PAYMENT BRAND LOGOS & METADATA
// ---------------------------------------------------------------------------
function PaymentChannelLogo({ channelId, channelName = "" }: { channelId: string; channelName?: string }) {
  switch (channelId) {
    case "telebirr":
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#005cb9] to-[#00b0f0] flex items-center justify-center shrink-0 p-1.5 border border-white/20">
          <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12H27" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M18 12V27" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M13 27H23" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M24 10C26.5 12 28 15 28 18" stroke="#FFD100" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M28 7C32 10.5 33 14.5 33 18" stroke="#FFD100" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
          </svg>
        </div>
      );
    case "cbe_birr":
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#671b50] to-[#8c226c] flex items-center justify-center shrink-0 p-1.5 border border-amber-400/25">
          <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="8" r="1.5" fill="#FFCA08" />
            <path d="M18 8V27" stroke="#FFCA08" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 13L18 10L26 13" stroke="#FFCA08" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 13V19C10 20.8 12.5 21.5 12.5 21.5C12.5 21.5 10 21.5 10 19" stroke="#FFCA08" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M26 13V19C26 20.8 23.5 21.5 23.5 21.5C23.5 21.5 26 21.5 26 19" stroke="#FFCA08" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M14 27H22" stroke="#FFCA08" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      );
    case "chapa":
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0A2540] to-[#123963] flex items-center justify-center shrink-0 p-1.5 border border-emerald-400/25">
          <svg viewBox="0 0 36 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12C22.2 10.5 19.8 9.5 17 9.5C12.3 9.5 8.5 13.3 8.5 18C8.5 22.7 12.3 26.5 17 26.5C19.8 26.5 22.2 25.5 24 24" stroke="#00D084" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M19 14L24 18L19 22" stroke="#00D084" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case "visa_mastercard":
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shrink-0 p-1 border border-slate-700">
          <svg viewBox="0 0 36 26" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="26" rx="3" fill="#0f172a" />
            <circle cx="13" cy="13" r="7" fill="#EB001B" fillOpacity="0.95" />
            <circle cx="23" cy="13" r="7" fill="#F79E1B" fillOpacity="0.95" />
            <path d="M18 8A7 7 0 0 1 18 18A7 7 0 0 1 18 8" fill="#FF5F00" />
          </svg>
        </div>
      );
    case "bank_transfer":
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] flex items-center justify-center shrink-0 border border-amber-500/25 text-amber-300">
          <Landmark className="w-4 h-4 text-amber-300" />
        </div>
      );
    case "cash":
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#064e3b] to-[#022c22] flex items-center justify-center shrink-0 border border-emerald-500/25 text-emerald-300">
          <Banknote className="w-4 h-4 text-emerald-300" />
        </div>
      );
    default: {
      const lower = (channelName || channelId).toLowerCase();
      if (lower.includes("mobile") || lower.includes("birr") || lower.includes("tele") || lower.includes("amole") || lower.includes("wallet") || lower.includes("pay")) {
        return (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shrink-0 border border-cyan-400/25 text-white">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
        );
      }
      if (lower.includes("bank") || lower.includes("wire") || lower.includes("transfer") || lower.includes("abyssinia") || lower.includes("awash") || lower.includes("dashen") || lower.includes("cbe")) {
        return (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center shrink-0 border border-indigo-500/25 text-indigo-300">
            <Landmark className="w-4 h-4 text-indigo-300" />
          </div>
        );
      }
      if (lower.includes("card") || lower.includes("pos") || lower.includes("visa") || lower.includes("master") || lower.includes("stripe") || lower.includes("terminal")) {
        return (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center shrink-0 border border-blue-500/25 text-blue-300">
            <CreditCard className="w-4 h-4 text-blue-300" />
          </div>
        );
      }
      const initials = (channelName || channelId).replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "PS";
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-800 flex items-center justify-center shrink-0 border border-blue-400/30 text-white font-bold text-xs tracking-wider">
          {initials}
        </div>
      );
    }
  }
}

function getPaymentMetadata(account: PaymentAccountSpecifier) {
  const { channelId, channelName, category, bankOrProvider } = account;
  switch (channelId) {
    case "telebirr":
      return {
        title: "Telebirr",
        provider: bankOrProvider || "Ethio Telecom",
        category: category || "Mobile Wallet",
        idLabel: "Till / Shortcode",
      };
    case "cbe_birr":
      return {
        title: "CBE Birr",
        provider: bankOrProvider || "Commercial Bank of Ethiopia",
        category: category || "Bank Wallet",
        idLabel: "Merchant Till",
      };
    case "chapa":
      return {
        title: "Chapa Gateway",
        provider: bankOrProvider || "Chapa Financial Tech",
        category: category || "Payment Gateway",
        idLabel: "Public API Key",
      };
    case "visa_mastercard":
      return {
        title: "Visa / Mastercard / Amex",
        provider: bankOrProvider || "International POS Gateway",
        category: category || "Card Settlement",
        idLabel: "Merchant ID (MID)",
      };
    case "bank_transfer":
      return {
        title: "Direct Bank Wire",
        provider: bankOrProvider || "Commercial Bank of Ethiopia",
        category: category || "Wire Transfer",
        idLabel: "Corporate Account",
      };
    case "cash":
      return {
        title: "Cash & Safe Vault",
        provider: bankOrProvider || "Front Desk Cashier",
        category: category || "Cash & Vault",
        idLabel: "Cash Vault ID",
      };
    default:
      return {
        title: channelName || channelId,
        provider: bankOrProvider || "Payment Provider",
        category: category || "Payment Service",
        idLabel: "Account / Till Number",
      };
  }
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function HotelPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [isEditing, setIsEditing] = useState(false);
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

  // -------------------------------------------------------------------------
  // REACTIVE LOCAL STATES (SYNCHRONIZED WITH BACKEND)
  // -------------------------------------------------------------------------
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    DEFAULT_SETTINGS.propertyFacilities || []
  );
  const [facilitiesCatalog, setFacilitiesCatalog] = useState<CustomFacility[]>(
    DEFAULT_SETTINGS.customFacilitiesList || BASE_FACILITIES
  );
  const [facilitySearch, setFacilitySearch] = useState("");

  const [gallery, setGallery] = useState<GalleryImage[]>(DEFAULT_GALLERY);
  const [heroImage, setHeroImage] = useState<string>(DEFAULT_SETTINGS.heroImageUrl || "");

  const [extraBeds, setExtraBeds] = useState<ExtraBedItem[]>(DEFAULT_EXTRA_BEDS);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountSpecifier[]>(DEFAULT_PAYMENT_ACCOUNTS);

  // Rich Text State Holders
  const [refundText, setRefundText] = useState(DEFAULT_SETTINGS.refundTermsText || "");
  const [folioFooterText, setFolioFooterText] = useState(DEFAULT_SETTINGS.folioTermsFooter || "");
  const [regCardText, setRegCardText] = useState(DEFAULT_SETTINGS.registrationCardDisclaimer || "");

  // Expandable Policies State
  const [expandedPolicies, setExpandedPolicies] = useState<Record<string, boolean>>({
    refund: true,
    folio: true,
    regCard: true,
    smokingPet: true,
  });

  const togglePolicyCollapse = (key: string) => {
    setExpandedPolicies((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllPolicies = (expand: boolean) => {
    setExpandedPolicies({
      refund: expand,
      folio: expand,
      regCard: expand,
      smokingPet: expand,
    });
  };

  // Synchronize state when hotel data arrives from server (prevents info disappearance!)
  useEffect(() => {
    if (hotel) {
      const s = hotel.settings || {};
      if (s.propertyFacilities) setSelectedFacilities(s.propertyFacilities);
      if (s.customFacilitiesList && s.customFacilitiesList.length > 0) setFacilitiesCatalog(s.customFacilitiesList);
      if (s.galleryImages && s.galleryImages.length > 0) setGallery(s.galleryImages);
      if (s.heroImageUrl) setHeroImage(s.heroImageUrl);
      if (s.extraBedsList && s.extraBedsList.length > 0) setExtraBeds(s.extraBedsList);
      if (s.paymentAccountsList && s.paymentAccountsList.length > 0) setPaymentAccounts(s.paymentAccountsList);
      if (s.refundTermsText) setRefundText(s.refundTermsText);
      if (s.folioTermsFooter) setFolioFooterText(s.folioTermsFooter);
      if (s.registrationCardDisclaimer) setRegCardText(s.registrationCardDisclaimer);
    }
  }, [hotel]);

  // Modals for CRUD operations
  // Facility Modal
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<CustomFacility | null>(null);

  // Gallery Modal
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryImage | null>(null);

  // Extra Bed Modal
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);
  const [editingBedItem, setEditingBedItem] = useState<ExtraBedItem | null>(null);

  // Payment Account CRUD Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentAccount, setEditingPaymentAccount] = useState<PaymentAccountSpecifier | null>(null);

  // -------------------------------------------------------------------------
  // MUTATION
  // -------------------------------------------------------------------------
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

  // Facility Actions
  const handleToggleFacility = (fid: string) => {
    if (!isEditing) return;
    setSelectedFacilities((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid]
    );
  };

  const handleSaveFacility = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const category = String(fd.get("category") || "General").trim();
    if (!name) return;

    if (editingFacility) {
      setFacilitiesCatalog((prev) =>
        prev.map((f) => (f.id === editingFacility.id ? { ...f, name, category } : f))
      );
      toast({ title: "Facility updated" });
    } else {
      const newF: CustomFacility = {
        id: "fac-" + Date.now(),
        name,
        category,
        isCustom: true,
      };
      setFacilitiesCatalog((prev) => [newF, ...prev]);
      setSelectedFacilities((prev) => [...prev, newF.id]);
      toast({ title: "Custom facility added" });
    }
    setIsFacilityModalOpen(false);
    setEditingFacility(null);
  };

  const handleDeleteFacility = (id: string) => {
    setFacilitiesCatalog((prev) => prev.filter((f) => f.id !== id));
    setSelectedFacilities((prev) => prev.filter((fid) => fid !== id));
    toast({ title: "Facility deleted" });
  };

  // Gallery Actions
  const handleSaveGalleryItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") || "").trim();
    const title = String(fd.get("title") || "").trim();
    const category = (fd.get("category") as GalleryImage["category"]) || "general";
    const description = String(fd.get("description") || "").trim();
    const setAsCover = fd.get("setAsCover") === "on";

    if (!url) return;

    if (editingGalleryItem) {
      setGallery((prev) =>
        prev.map((img) =>
          img.id === editingGalleryItem.id ? { ...img, url, title, category, description } : img
        )
      );
      if (setAsCover) setHeroImage(url);
      toast({ title: "Photo updated" });
    } else {
      const newImg: GalleryImage = {
        id: "img-" + Date.now(),
        url,
        title: title || "Property Showcase Photo",
        category,
        description,
      };
      setGallery((prev) => [newImg, ...prev]);
      if (setAsCover) setHeroImage(url);
      toast({ title: "Photo added to gallery" });
    }
    setIsGalleryModalOpen(false);
    setEditingGalleryItem(null);
  };

  const handleDeleteGalleryItem = (id: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== id));
    toast({ title: "Photo removed" });
  };

  // Extra Bed Actions
  const handleSaveBedItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const type = (fd.get("type") as ExtraBedItem["type"]) || "rollaway";
    const capacity = Number(fd.get("capacity")) || 1;
    const dailyFee = Number(fd.get("dailyFee")) || 0;
    const totalInventory = Number(fd.get("totalInventory")) || 1;
    const isComplimentary = fd.get("isComplimentary") === "on" || dailyFee === 0;

    if (!name) return;

    if (editingBedItem) {
      setExtraBeds((prev) =>
        prev.map((b) =>
          b.id === editingBedItem.id
            ? { ...b, name, type, capacity, dailyFee, totalInventory, isComplimentary }
            : b
        )
      );
      toast({ title: "Bed configuration updated" });
    } else {
      const newBed: ExtraBedItem = {
        id: "bed-" + Date.now(),
        name,
        type,
        capacity,
        dailyFee,
        totalInventory,
        isComplimentary,
      };
      setExtraBeds((prev) => [...prev, newBed]);
      toast({ title: "Extra bed added to inventory" });
    }
    setIsBedModalOpen(false);
    setEditingBedItem(null);
  };

  const handleDeleteBedItem = (id: string) => {
    setExtraBeds((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Bed configuration removed" });
  };

  // Payment Account Actions (Full CRUD)
  const handleSavePaymentAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const channelName = String(fd.get("channelName") || "").trim();
    const category = String(fd.get("category") || "Payment Method").trim();
    const bankOrProvider = String(fd.get("bankOrProvider") || "").trim();
    const accountNumber = String(fd.get("accountNumber") || "").trim();
    const accountName = String(fd.get("accountName") || "").trim();
    const additionalIdentifier = String(fd.get("additionalIdentifier") || "").trim();

    if (!channelName) return;

    if (editingPaymentAccount) {
      setPaymentAccounts((prev) =>
        prev.map((acc) =>
          acc.channelId === editingPaymentAccount.channelId
            ? { ...acc, channelName, category, bankOrProvider, accountNumber, accountName, additionalIdentifier }
            : acc
        )
      );
      toast({ title: "Payment channel updated" });
    } else {
      const channelId = "pay_" + Date.now();
      const newAcc: PaymentAccountSpecifier = {
        channelId,
        channelName,
        category,
        bankOrProvider,
        accountNumber,
        accountName,
        additionalIdentifier,
        isEnabled: true,
      };
      setPaymentAccounts((prev) => [...prev, newAcc]);
      toast({ title: "New payment service added" });
    }
    setIsPaymentModalOpen(false);
    setEditingPaymentAccount(null);
  };

  const handleDeletePaymentAccount = (channelId: string) => {
    setPaymentAccounts((prev) => prev.filter((acc) => acc.channelId !== channelId));
    toast({ title: "Payment service deleted" });
  };

  const handleTogglePaymentChannel = (channelId: string) => {
    if (!isEditing) return;
    setPaymentAccounts((prev) =>
      prev.map((acc) =>
        acc.channelId === channelId ? { ...acc, isEnabled: !acc.isEnabled } : acc
      )
    );
  };

  // Main Form Submit Handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const formObj = Object.fromEntries(fd);

    const mergedSettings = hotel?.settings || DEFAULT_SETTINGS;

    const updatedSettings: HotelSettings = {
      // Operations
      earlyCheckInAllowedTime: String(formObj.earlyCheckInAllowedTime || mergedSettings.earlyCheckInAllowedTime || "10:00"),
      lateCheckOutGracePeriod: Number(formObj.lateCheckOutGracePeriod) || mergedSettings.lateCheckOutGracePeriod || 30,
      lateCheckOutHalfDayCutoff: String(formObj.lateCheckOutHalfDayCutoff || mergedSettings.lateCheckOutHalfDayCutoff || "15:00"),
      nightAuditMode: formObj.nightAuditMode === "manual" ? "manual" : "auto",
      nightAuditTime: String(formObj.nightAuditTime || mergedSettings.nightAuditTime || "02:00"),
      noShowReleaseWindow: String(formObj.noShowReleaseWindow || mergedSettings.noShowReleaseWindow || "18:00"),
      overbookingThreshold: Number(formObj.overbookingThreshold) || 0,

      // Facilities CRUD list & Active IDs
      propertyFacilities: selectedFacilities,
      customFacilitiesList: facilitiesCatalog,

      // Media & Gallery CRUD
      heroImageUrl: heroImage || String(formObj.heroImageUrl || mergedSettings.heroImageUrl || ""),
      galleryImages: gallery,

      // Policies & Refunds (using live rich text states!)
      cancellationPolicyType: (formObj.cancellationPolicyType as any) || mergedSettings.cancellationPolicyType || "moderate",
      cancellationFreeHours: Number(formObj.cancellationFreeHours) || mergedSettings.cancellationFreeHours || 48,
      cancellationPenaltyPercent: Number(formObj.cancellationPenaltyPercent) || mergedSettings.cancellationPenaltyPercent || 100,
      refundProcessingDays: Number(formObj.refundProcessingDays) || mergedSettings.refundProcessingDays || 5,
      refundTermsText: refundText || String(formObj.refundTermsText || mergedSettings.refundTermsText || ""),
      petPolicy: (formObj.petPolicy as any) || mergedSettings.petPolicy || "not_allowed",
      petFee: Number(formObj.petFee) || 0,
      smokingPolicy: (formObj.smokingPolicy as any) || mergedSettings.smokingPolicy || "strictly_non_smoking",
      smokingPenaltyFee: Number(formObj.smokingPenaltyFee) || 0,
      folioTermsFooter: folioFooterText || String(formObj.folioTermsFooter || mergedSettings.folioTermsFooter || ""),
      registrationCardDisclaimer: regCardText || String(formObj.registrationCardDisclaimer || mergedSettings.registrationCardDisclaimer || ""),

      // Housekeeping & Dining + Cribs CRUD
      checkoutTriggerState: formObj.checkoutTriggerState === "cleaning" ? "cleaning" : "dirty",
      linenChangeFrequency: Number(formObj.linenChangeFrequency) || 3,
      turndownServiceEnabled: formObj.turndownServiceEnabled === "on",
      defaultBoardBasis: (formObj.defaultBoardBasis as any) || "bb",
      breakfastServiceHours: String(formObj.breakfastServiceHours || mergedSettings.breakfastServiceHours || "06:30 - 10:00"),
      breakfastPriceAdult: Number(formObj.breakfastPriceAdult) || 0,
      breakfastPriceChild: Number(formObj.breakfastPriceChild) || 0,
      extraBedsList: extraBeds,

      // Revenue & Financial + Payment Accounts Specifiers
      invoicePrefix: String(formObj.invoicePrefix || mergedSettings.invoicePrefix || "NGH-INV-"),
      receiptPrefix: String(formObj.receiptPrefix || mergedSettings.receiptPrefix || "NGH-REC-"),
      proformaPrefix: String(formObj.proformaPrefix || mergedSettings.proformaPrefix || "NGH-PRO-"),
      defaultGuaranteePolicy: (formObj.defaultGuaranteePolicy as any) || "credit_card",
      ageTierInfantMax: Number(formObj.ageTierInfantMax) || 2,
      ageTierChildMax: Number(formObj.ageTierChildMax) || 12,
      ageTierAdultMin: Number(formObj.ageTierAdultMin) || 13,
      enabledGateways: paymentAccounts.filter((a) => a.isEnabled).map((a) => a.channelId),
      paymentAccountsList: paymentAccounts,
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

  // Categories extracted from facilitiesCatalog
  const uniqueCategories = Array.from(new Set(facilitiesCatalog.map((f) => f.category)));

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

        {/* Hero Luxury Identity Banner (No StatusPill as requested) */}
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
          {/* TAB 2: FACILITIES & FEATURES (CRUD IMPLEMENTED)                  */}
          {/* ================================================================= */}
          {activeTab === "facilities" && (
            <div className="space-y-6">
              {/* Header with Search and "+ Add Custom Facility" CRUD action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Hotel Facilities, Amenities & Services
                </h3>

                <div className="flex items-center gap-3">
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search facilities..."
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingFacility(null);
                      setIsFacilityModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Facility</span>
                  </button>
                </div>
              </div>

              {/* Categorized Facility Groups */}
              <div className="space-y-6">
                {uniqueCategories.map((category) => {
                  const items = facilitiesCatalog.filter(
                    (f) =>
                      f.category === category &&
                      f.name.toLowerCase().includes(facilitySearch.toLowerCase())
                  );

                  if (items.length === 0) return null;

                  return (
                    <div
                      key={category}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-700/10 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                            {items.length}
                          </div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">
                            {category}
                          </h4>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {items.map((item) => {
                          const isChecked = selectedFacilities.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isChecked
                                  ? "border-blue-700/40 bg-blue-700/5 dark:bg-blue-900/15"
                                  : "border-[var(--border)] bg-[var(--surface)] opacity-70"
                              }`}
                            >
                              <div
                                onClick={() => handleToggleFacility(item.id)}
                                className={`flex items-center gap-2.5 flex-1 select-none ${
                                  isEditing ? "cursor-pointer" : ""
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                                    isChecked
                                      ? "bg-blue-700 text-white"
                                      : "border border-[var(--border)] bg-transparent"
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span
                                  className={`text-xs font-semibold ${
                                    isChecked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                  }`}
                                >
                                  {item.name}
                                </span>
                              </div>

                              {/* CRUD Actions on Facility */}
                              {isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFacility(item);
                                      setIsFacilityModalOpen(true);
                                    }}
                                    className="p-1 rounded text-[var(--text-secondary)] hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                                    title="Edit Facility"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {item.isCustom && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFacility(item.id)}
                                      className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                                      title="Delete Facility"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
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
          {/* TAB 3: MEDIA & GALLERY (CRUD IMPLEMENTED)                         */}
          {/* ================================================================= */}
          {activeTab === "media" && (
            <div className="space-y-8">
              {/* Primary Hero Cover Showcase */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Primary Showcase Hero Cover
                  </h3>
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
                      <span className="text-sm">No hero cover photo set</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex flex-col justify-end p-6">
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
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="url"
                      name="heroImageUrl"
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="Paste high-resolution hero cover image URL..."
                      className="flex-1 h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                    />
                  </div>
                )}
              </div>

              {/* Property Gallery Grid with Full CRUD */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Property Photo Showcase Gallery
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingGalleryItem(null);
                      setIsGalleryModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Photo</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {gallery.map((img) => {
                    const isCurrentCover = heroImage === img.url;
                    return (
                      <div
                        key={img.id}
                        className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-col"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                          <img
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-3.5 text-white">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300">
                              {img.category}
                            </span>
                            <span className="text-sm font-bold truncate">{img.title}</span>
                          </div>

                          {isCurrentCover && (
                            <span className="absolute top-2.5 left-2.5 bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              Current Hero Cover
                            </span>
                          )}
                        </div>

                        {/* Card Meta & CRUD Actions */}
                        <div className="p-3 bg-[var(--surface)] flex items-center justify-between text-xs border-t border-[var(--border)]">
                          <span className="text-[var(--text-secondary)] truncate flex-1 pr-2">
                            {img.description || "Verified property photo"}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setHeroImage(img.url);
                                toast({ title: "Set as Master Hero Cover" });
                              }}
                              className="px-2 py-1 rounded text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                              title="Set as Hero Cover"
                            >
                              Make Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGalleryItem(img);
                                setIsGalleryModalOpen(true);
                              }}
                              className="p-1 rounded text-[var(--text-secondary)] hover:text-blue-700 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                              title="Edit Photo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryItem(img.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: POLICIES & REFUNDS (EXPANDABLE & COLLAPSIBLE ACCORDIONS)   */}
          {/* ================================================================= */}
          {activeTab === "policies" && (
            <div className="space-y-6">
              {/* Header with Expand All / Collapse All */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Hotel Policies, Refund Terms & Legal Disclaimers
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAllPolicies(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllPolicies(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Collapse All</span>
                  </button>
                </div>
              </div>

              {/* ACCORDION 1: Cancellation & Refund Policy */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
                <div
                  onClick={() => togglePolicyCollapse("refund")}
                  className="flex items-center justify-between p-5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none border-b border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      CR
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Official Cancellation & Refund Policy (Full Text)
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Active Policy
                    </span>
                    {expandedPolicies.refund ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>
                </div>

                {expandedPolicies.refund && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[var(--border)]">
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                          Policy Archetype
                        </label>
                        {isEditing ? (
                          <select
                            name="cancellationPolicyType"
                            defaultValue={hotel?.settings?.cancellationPolicyType || "moderate"}
                            className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                          >
                            <option value="flexible">Flexible (24 Hours Prior)</option>
                            <option value="moderate">Moderate (48 Hours Prior)</option>
                            <option value="strict">Strict (7 Days Prior)</option>
                            <option value="non_refundable">100% Non-Refundable</option>
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-[var(--text-primary)] capitalize">
                            {hotel?.settings?.cancellationPolicyType || "moderate"}
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
                              defaultValue={hotel?.settings?.cancellationFreeHours ?? 48}
                              className="w-24 h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                            />
                            <span className="text-xs text-[var(--text-secondary)]">Hours before check-in</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            Up to {hotel?.settings?.cancellationFreeHours ?? 48} hours prior
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
                              defaultValue={hotel?.settings?.refundProcessingDays ?? 5}
                              className="w-24 h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                            />
                            <span className="text-xs text-[var(--text-secondary)]">Business days</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {hotel?.settings?.refundProcessingDays ?? 5} Business Days
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-2">
                        Official Cancellation & Refund Policy Document
                      </label>
                      <RichTextEditor
                        name="refundTermsText"
                        value={refundText}
                        onChange={setRefundText}
                        isEditable={isEditing}
                        minHeight="240px"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 2: Guest Folio Legal T&C Footer */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
                <div
                  onClick={() => togglePolicyCollapse("folio")}
                  className="flex items-center justify-between p-5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none border-b border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-700/10 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      TC
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Guest Folio & Invoice Legal T&C Footer
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-blue-700/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                      Invoice Footer
                    </span>
                    {expandedPolicies.folio ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>
                </div>

                {expandedPolicies.folio && (
                  <div className="p-6">
                    <RichTextEditor
                      name="folioTermsFooter"
                      value={folioFooterText}
                      onChange={setFolioFooterText}
                      isEditable={isEditing}
                      minHeight="180px"
                    />
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Arrival Registration Card Agreement */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
                <div
                  onClick={() => togglePolicyCollapse("regCard")}
                  className="flex items-center justify-between p-5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none border-b border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                      RC
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Arrival Registration Card Agreement
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Check-In Agreement
                    </span>
                    {expandedPolicies.regCard ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>
                </div>

                {expandedPolicies.regCard && (
                  <div className="p-6">
                    <RichTextEditor
                      name="registrationCardDisclaimer"
                      value={regCardText}
                      onChange={setRegCardText}
                      isEditable={isEditing}
                      minHeight="180px"
                    />
                  </div>
                )}
              </div>

              {/* ACCORDION 4: Smoking & Pet Accommodation Policies */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
                <div
                  onClick={() => togglePolicyCollapse("smokingPet")}
                  className="flex items-center justify-between p-5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none border-b border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs">
                      SP
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Smoking & Pet Accommodation Policies
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    {expandedPolicies.smokingPet ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>
                </div>

                {expandedPolicies.smokingPet && (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Cigarette className="w-4 h-4 text-rose-600" />
                        <h5 className="text-sm font-bold text-[var(--text-primary)]">Smoking Policy</h5>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-b border-[var(--border)]">
                          <span className="text-[var(--text-secondary)]">Room Policy</span>
                          {isEditing ? (
                            <select
                              name="smokingPolicy"
                              defaultValue={hotel?.settings?.smokingPolicy || "strictly_non_smoking"}
                              className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                            >
                              <option value="strictly_non_smoking">Strictly Non-Smoking Indoors</option>
                              <option value="designated_areas">Designated Outdoor Smoking Zones Only</option>
                              <option value="allowed">Smoking Permitted</option>
                            </select>
                          ) : (
                            <span className="font-semibold text-rose-600">
                              {hotel?.settings?.smokingPolicy === "designated_areas"
                                ? "Designated Outdoor Zones Only"
                                : hotel?.settings?.smokingPolicy === "allowed"
                                ? "Smoking Permitted"
                                : "Strictly Non-Smoking Indoors"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5">
                          <span className="text-[var(--text-secondary)]">Deep Clean Violation Fee</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--text-secondary)]">$</span>
                              <input
                                type="number"
                                name="smokingPenaltyFee"
                                defaultValue={hotel?.settings?.smokingPenaltyFee ?? 250}
                                min={0}
                                className="w-24 h-8 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                              />
                              <span className="text-[var(--text-secondary)]">USD / 15,000 ETB</span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              ${hotel?.settings?.smokingPenaltyFee ?? 250} USD / 15,000 ETB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Dog className="w-4 h-4 text-amber-600" />
                        <h5 className="text-sm font-bold text-[var(--text-primary)]">Pet Accommodation Policy</h5>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-b border-[var(--border)]">
                          <span className="text-[var(--text-secondary)]">Policy Status</span>
                          {isEditing ? (
                            <select
                              name="petPolicy"
                              defaultValue={hotel?.settings?.petPolicy || "not_allowed"}
                              className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                            >
                              <option value="not_allowed">Certified Guide & Service Dogs Only</option>
                              <option value="charges_apply">Pets Allowed (Surcharge Applies)</option>
                              <option value="allowed">Pets Fully Welcome (All Breeds)</option>
                            </select>
                          ) : (
                            <span className="font-semibold text-[var(--text-primary)]">
                              {hotel?.settings?.petPolicy === "allowed"
                                ? "Pets Fully Welcome (All Breeds)"
                                : hotel?.settings?.petPolicy === "charges_apply"
                                ? "Pets Allowed (Surcharge Applies)"
                                : "Certified Guide & Service Dogs Only"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5">
                          <span className="text-[var(--text-secondary)]">Pet Cleaning Deposit</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                name="petFee"
                                defaultValue={hotel?.settings?.petFee ?? 0}
                                min={0}
                                placeholder="0"
                                className="w-24 h-8 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                              />
                              <span className="text-[var(--text-secondary)]">ETB (0 = waived)</span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              {hotel?.settings?.petFee && hotel.settings.petFee > 0
                                ? `${hotel.settings.petFee} ETB per stay`
                                : "Waived for Service Animals"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                        defaultValue={hotel?.settings?.earlyCheckInAllowedTime || "10:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{hotel?.settings?.earlyCheckInAllowedTime || "10:00"} (Complimentary)</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Check-Out Grace</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="lateCheckOutGracePeriod"
                          defaultValue={hotel?.settings?.lateCheckOutGracePeriod ?? 30}
                          min={0}
                          max={120}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Minutes past 12:00</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.settings?.lateCheckOutGracePeriod ?? 30} minutes</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Half-Day Charge Cutoff</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="lateCheckOutHalfDayCutoff"
                        defaultValue={hotel?.settings?.lateCheckOutHalfDayCutoff || "15:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{hotel?.settings?.lateCheckOutHalfDayCutoff || "15:00"} (Full night billed past cutoff)</span>
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
                        defaultValue={hotel?.settings?.nightAuditMode || "auto"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="auto">Scheduled Automatic Roll</option>
                        <option value="manual">Manual Front Desk Execution</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                        {hotel?.settings?.nightAuditMode === "manual" ? "Manual Execution" : "Scheduled Automatic Roll"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Scheduled Audit Time</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="nightAuditTime"
                        defaultValue={hotel?.settings?.nightAuditTime || "02:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{hotel?.settings?.nightAuditTime || "02:00"} AM</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">No-Show Release Window</span>
                    {isEditing ? (
                      <input
                        type="time"
                        name="noShowReleaseWindow"
                        defaultValue={hotel?.settings?.noShowReleaseWindow || "18:00"}
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{hotel?.settings?.noShowReleaseWindow || "18:00"}</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Overbooking Buffer</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="overbookingThreshold"
                          defaultValue={hotel?.settings?.overbookingThreshold ?? 2}
                          min={0}
                          max={15}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">% overbooking allowed</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{hotel?.settings?.overbookingThreshold ?? 2}%</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: REVENUE & PAYMENTS (RECIPIENT ACCOUNTS CRUD/SPECIFIERS)    */}
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
                        defaultValue={hotel?.settings?.invoicePrefix || "NGH-INV-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {hotel?.settings?.invoicePrefix || "NGH-INV-"}00001
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Receipt Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="receiptPrefix"
                        defaultValue={hotel?.settings?.receiptPrefix || "NGH-REC-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {hotel?.settings?.receiptPrefix || "NGH-REC-"}00001
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Proforma Prefix</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="proformaPrefix"
                        defaultValue={hotel?.settings?.proformaPrefix || "NGH-PRO-"}
                        className="flex-1 h-9 px-3 text-sm font-mono uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                        {hotel?.settings?.proformaPrefix || "NGH-PRO-"}00001
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Services & Recipient Accounts with full CRUD */}
              <div className="space-y-4 pt-6 pb-2 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                    Payment Services & Recipient Accounts
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPaymentAccount(null);
                      setIsPaymentModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Payment Service</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paymentAccounts.length === 0 ? (
                    <div className="col-span-full py-10 text-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-hover)]/30">
                      <CreditCard className="mx-auto h-8 w-8 text-[var(--text-secondary)] mb-2 opacity-50" />
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">No payment channels registered</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Add a payment service or merchant account to start accepting guest transactions.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPaymentAccount(null);
                          setIsPaymentModalOpen(true);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Payment Service</span>
                      </button>
                    </div>
                  ) : (
                    paymentAccounts.map((account) => {
                      const meta = getPaymentMetadata(account);
                      const isCopied = copiedKey === account.channelId;

                      return (
                        <div
                          key={account.channelId}
                          className={`group rounded-lg border transition-all p-4 flex flex-col justify-between ${
                            account.isEnabled
                              ? "bg-[var(--surface)] border-[var(--border)] hover:border-slate-400/60 dark:hover:border-slate-600"
                              : "bg-[var(--surface-hover)]/30 border-[var(--border)] opacity-60"
                          }`}
                        >
                          <div>
                            {/* Card Header: Brand Logo + Provider Details + Toggle */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <PaymentChannelLogo channelId={account.channelId} channelName={account.channelName} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[150px]">
                                      {meta.title}
                                    </h4>
                                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                                      {meta.category}
                                    </span>
                                  </div>
                                  <span className="text-xs text-[var(--text-secondary)] block truncate mt-0.5">
                                    {account.bankOrProvider || meta.provider}
                                  </span>
                                </div>
                              </div>

                              {/* Toggle Switch */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isEditing) {
                                    toast({
                                      title: "Edit mode required",
                                      description: "Click 'Edit Hotel' in the top header to enable or disable payment channels.",
                                    });
                                    return;
                                  }
                                  handleTogglePaymentChannel(account.channelId);
                                }}
                                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                                  account.isEnabled ? "bg-blue-700" : "bg-slate-300 dark:bg-slate-700"
                                }`}
                                title={account.isEnabled ? "Active" : "Disabled"}
                              >
                                <span
                                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                    account.isEnabled ? "right-0.5" : "left-0.5"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Clean Specifier Specifications with Sharp Dividers */}
                            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)] tracking-wider">
                                  {meta.idLabel}
                                </span>
                                <div className="flex items-center gap-1 font-mono font-semibold text-[var(--text-primary)]">
                                  <span>{account.accountNumber || "—"}</span>
                                  {account.accountNumber && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(account.accountNumber, account.channelId)}
                                      className="p-0.5 text-[var(--text-secondary)] hover:text-blue-700 cursor-pointer"
                                      title="Copy"
                                    >
                                      {isCopied ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-[var(--text-secondary)]">Account Holder</span>
                                <span className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                                  {account.accountName || "—"}
                                </span>
                              </div>

                              {account.additionalIdentifier && (
                                <div className="flex items-center justify-between">
                                  <span className="text-[var(--text-secondary)]">Routing / Specifier</span>
                                  <span className="font-mono text-blue-700 dark:text-blue-400 font-medium truncate max-w-[160px]">
                                    {account.additionalIdentifier}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer: Sharp Action Buttons, Zero Redundant Status Text */}
                          <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPaymentAccount(account);
                                setIsPaymentModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors cursor-pointer"
                              title="Configure Account"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Configure</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePaymentAccount(account.channelId)}
                              className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete Service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                        defaultValue={hotel?.settings?.defaultGuaranteePolicy || "credit_card"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="credit_card">Credit Card Pre-Authorization</option>
                        <option value="first_night_deposit">First Night Deposit Required</option>
                        <option value="non_guaranteed">Non-Guaranteed (6 PM Release)</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.defaultGuaranteePolicy === "first_night_deposit"
                          ? "First Night Deposit Required"
                          : hotel?.settings?.defaultGuaranteePolicy === "non_guaranteed"
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
                            defaultValue={hotel?.settings?.ageTierInfantMax ?? 2}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Child (Max Age)</label>
                          <input
                            type="number"
                            name="ageTierChildMax"
                            defaultValue={hotel?.settings?.ageTierChildMax ?? 12}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Adult (Min Age)</label>
                          <input
                            type="number"
                            name="ageTierAdultMin"
                            defaultValue={hotel?.settings?.ageTierAdultMin ?? 13}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                        Infant: 0–{hotel?.settings?.ageTierInfantMax ?? 2} &bull; Child: {(hotel?.settings?.ageTierInfantMax ?? 2) + 1}–{hotel?.settings?.ageTierChildMax ?? 12} &bull; Adult: {hotel?.settings?.ageTierAdultMin ?? 13}+
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 7: HOUSEKEEPING & DINING (CRIBS & EXTRA BEDS CRUD)            */}
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
                        defaultValue={hotel?.settings?.checkoutTriggerState || "dirty"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="dirty">Dirty (Requires Deep Cleaning)</option>
                        <option value="cleaning">Cleaning In Progress</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                        {hotel?.settings?.checkoutTriggerState || "dirty"}
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
                          defaultValue={hotel?.settings?.linenChangeFrequency ?? 3}
                          min={1}
                          max={7}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">Days between full sheet change</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Every {hotel?.settings?.linenChangeFrequency ?? 3} days</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Turndown Service</span>
                    {isEditing ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="turndownServiceEnabled"
                          defaultChecked={hotel?.settings?.turndownServiceEnabled !== false}
                          className="w-4 h-4 rounded text-blue-700 focus:ring-blue-700 border-[var(--border)]"
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Enable evening turndown service</span>
                      </label>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.turndownServiceEnabled !== false ? "Active for Executive Rooms" : "Disabled"}
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
                        defaultValue={hotel?.settings?.defaultBoardBasis || "bb"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="ro">Room Only (RO)</option>
                        <option value="bb">Bed & Breakfast (BB)</option>
                        <option value="hb">Half Board (HB)</option>
                        <option value="fb">Full Board (FB)</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.defaultBoardBasis === "ro"
                          ? "Room Only (RO)"
                          : hotel?.settings?.defaultBoardBasis === "hb"
                          ? "Half Board (HB)"
                          : hotel?.settings?.defaultBoardBasis === "fb"
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
                        defaultValue={hotel?.settings?.breakfastServiceHours || "06:30 - 10:00"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{hotel?.settings?.breakfastServiceHours || "06:30 - 10:00"}</span>
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
                            defaultValue={hotel?.settings?.breakfastPriceAdult ?? 450}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--text-muted)] block font-medium">Child (ETB)</label>
                          <input
                            type="number"
                            name="breakfastPriceChild"
                            defaultValue={hotel?.settings?.breakfastPriceChild ?? 250}
                            className="h-8 w-full px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        Adult: {hotel?.settings?.breakfastPriceAdult ?? 450} ETB &bull; Child: {hotel?.settings?.breakfastPriceChild ?? 250} ETB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cribs & Extra Beds Table */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                    Cribs & Extra Beds
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingBedItem(null);
                      setIsBedModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bed / Crib</span>
                  </button>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Name</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Category</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Capacity</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Daily Rate</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Inventory Cap</TableHead>
                        <TableHead className="w-[90px] text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extraBeds.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-[var(--text-secondary)]">
                            <BedDouble className="mx-auto h-8 w-8 mb-2 opacity-40" />
                            <p>No extra beds or cribs configured.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        extraBeds.map((bed) => (
                          <TableRow key={bed.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors">
                            <TableCell className="font-semibold text-[var(--text-primary)]">{bed.name}</TableCell>
                            <TableCell>
                              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-semibold">
                                {bed.type}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-[var(--text-primary)] font-medium">
                              {bed.capacity} {bed.capacity === 1 ? "Person" : "Persons"}
                            </TableCell>
                            <TableCell>
                              {bed.isComplimentary ? (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  Complimentary
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                                  {bed.dailyFee.toFixed(2)} ETB
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-[var(--text-secondary)] font-semibold">
                              {bed.totalInventory} Units
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBedItem(bed);
                                    setIsBedModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                                  title="Edit Bed"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBedItem(bed.id)}
                                  className="p-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                                  title="Delete Bed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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

      {/* =================================================================== */}
      {/* MODAL 1: ADD / EDIT FACILITY (CRUD)                                 */}
      {/* =================================================================== */}
      <Dialog open={isFacilityModalOpen} onOpenChange={setIsFacilityModalOpen}>
        <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingFacility ? "Edit Facility" : "Add Custom Facility"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFacility} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Facility / Service Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingFacility?.name || ""}
                placeholder="e.g. Padél Court, Infinity Heliport"
                required
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Category
              </label>
              <input
                type="text"
                name="category"
                defaultValue={editingFacility?.category || "Sports, Fitness & Recreation"}
                placeholder="e.g. Outdoors & Grounds, Wellness"
                required
                list="category-suggestions"
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
              <datalist id="category-suggestions">
                {uniqueCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsFacilityModalOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800"
              >
                {editingFacility ? "Update Facility" : "Create Facility"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 2: ADD / EDIT GALLERY PHOTO (CRUD)                            */}
      {/* =================================================================== */}
      <Dialog open={isGalleryModalOpen} onOpenChange={setIsGalleryModalOpen}>
        <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingGalleryItem ? "Edit Property Photo" : "Add Property Photo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveGalleryItem} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Photo URL
              </label>
              <input
                type="url"
                name="url"
                defaultValue={editingGalleryItem?.url || ""}
                placeholder="https://images.unsplash.com/..."
                required
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Photo Title
              </label>
              <input
                type="text"
                name="title"
                defaultValue={editingGalleryItem?.title || ""}
                placeholder="e.g. Sunset Sky Pool"
                required
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Category
              </label>
              <select
                name="category"
                defaultValue={editingGalleryItem?.category || "general"}
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              >
                <option value="facade">Facade & Exterior</option>
                <option value="lobby">Lobby & Atrium</option>
                <option value="dining">Dining & Bar</option>
                <option value="wellness">Spa & Wellness</option>
                <option value="outdoors">Outdoors & Grounds</option>
                <option value="general">General Property</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Caption / Description
              </label>
              <input
                type="text"
                name="description"
                defaultValue={editingGalleryItem?.description || ""}
                placeholder="Short caption for guest views"
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                name="setAsCover"
                id="setAsCover"
                className="w-4 h-4 rounded text-blue-700"
              />
              <label htmlFor="setAsCover" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                Set as Master Hero Cover Image
              </label>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsGalleryModalOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800"
              >
                {editingGalleryItem ? "Update Photo" : "Add to Gallery"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 3: ADD / EDIT EXTRA BED & CRIB (CRUD)                         */}
      {/* =================================================================== */}
      <Dialog open={isBedModalOpen} onOpenChange={setIsBedModalOpen}>
        <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingBedItem ? "Edit Extra Bed / Crib" : "Add Extra Bed / Crib"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBedItem} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Item Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingBedItem?.name || ""}
                placeholder="e.g. Luxury Rollaway Bed"
                required
                className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Type
                </label>
                <select
                  name="type"
                  defaultValue={editingBedItem?.type || "rollaway"}
                  className="w-full h-9 px-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                >
                  <option value="rollaway">Rollaway Bed</option>
                  <option value="crib">Baby Cot / Crib</option>
                  <option value="folding">Folding Bed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Capacity (Guests)
                </label>
                <input
                  type="number"
                  name="capacity"
                  min={1}
                  max={3}
                  defaultValue={editingBedItem?.capacity || 1}
                  required
                  className="w-full h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Daily Rental Fee (ETB)
                </label>
                <input
                  type="number"
                  name="dailyFee"
                  min={0}
                  defaultValue={editingBedItem?.dailyFee ?? 800}
                  required
                  className="w-full h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Available Inventory Cap
                </label>
                <input
                  type="number"
                  name="totalInventory"
                  min={1}
                  defaultValue={editingBedItem?.totalInventory || 10}
                  required
                  className="w-full h-9 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                name="isComplimentary"
                id="isComplimentary"
                defaultChecked={editingBedItem?.isComplimentary}
                className="w-4 h-4 rounded text-blue-700"
              />
              <label htmlFor="isComplimentary" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                Complimentary Service (Free of Charge)
              </label>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsBedModalOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-xl hover:bg-blue-800"
              >
                {editingBedItem ? "Update Bed" : "Create Bed Option"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 4: PAYMENT CHANNEL & RECIPIENT SPECIFIER CRUD                 */}
      {/* =================================================================== */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          setIsPaymentModalOpen(open);
          if (!open) setEditingPaymentAccount(null);
        }}
      >
        <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingPaymentAccount ? `Configure ${editingPaymentAccount.channelName}` : "Add Payment Service"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePaymentAccount} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Payment Channel / Service Name
              </label>
              <input
                type="text"
                name="channelName"
                defaultValue={editingPaymentAccount?.channelName || ""}
                placeholder="e.g. Awash Birr, Stripe Gateway, Bank of Abyssinia"
                required
                className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Channel Category / Type
                </label>
                <select
                  name="category"
                  defaultValue={editingPaymentAccount?.category || "Mobile Wallet"}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                >
                  <option value="Mobile Wallet">Mobile Wallet</option>
                  <option value="Bank Wallet">Bank Wallet</option>
                  <option value="Payment Gateway">Payment Gateway</option>
                  <option value="Cards & POS">Cards & POS</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                  <option value="Cash & Vault">Cash & Vault</option>
                  <option value="Other">Other Service</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Provider / Bank Name
                </label>
                <input
                  type="text"
                  name="bankOrProvider"
                  defaultValue={editingPaymentAccount?.bankOrProvider || ""}
                  placeholder="e.g. Awash Bank, Ethio Telecom"
                  required
                  className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Recipient Account / Till / Merchant Shortcode
              </label>
              <input
                type="text"
                name="accountNumber"
                defaultValue={editingPaymentAccount?.accountNumber || ""}
                placeholder="e.g. 10045239, CHAPUBK_LIVE-..."
                required
                className="w-full h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Registered Account / Merchant Holder Name
              </label>
              <input
                type="text"
                name="accountName"
                defaultValue={editingPaymentAccount?.accountName || ""}
                placeholder="e.g. Nexus Grand Hotel PLC"
                required
                className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Additional Specifiers (SWIFT, Terminal TID, Phone)
              </label>
              <input
                type="text"
                name="additionalIdentifier"
                defaultValue={editingPaymentAccount?.additionalIdentifier || ""}
                placeholder="e.g. +251 91 123 4567, SWIFT: AWINETAA"
                className="w-full h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setEditingPaymentAccount(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                {editingPaymentAccount ? "Save Changes" : "Create Payment Service"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

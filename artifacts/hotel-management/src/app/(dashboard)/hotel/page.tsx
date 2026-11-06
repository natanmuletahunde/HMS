"use client";

import Link from "next/link";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Building,
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
  Tag,
  Filter,
  Gift,
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
  UploadCloud,
  Download,
  Percent,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { BranchConfigView } from "@/components/setup/BranchConfigView";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

export type CustomPolicyItem = {
  id: string;
  title: string;
  category?: string;
  badge?: string;
  initials?: string;
  content: string;
};

export type ComplianceDocument = {
  id: string;
  title: string;
  category: "tax_tin" | "vat_cert" | "trade_license" | "tourism_rating" | "health_fire_safety" | "other";
  docNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  status: "valid" | "expiring_soon" | "expired" | "pending_verification";
  notes?: string;
};


export type SupportedCurrency = {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBaseCurrency?: boolean;
  isEnabled: boolean;
  updatedAt?: string;
};


export type DiscountRule = {
  id: string;
  code: string;
  name: string;
  discountType: "percentage" | "fixed_amount";
  value: number;
  scope: "global" | "branch";
  branchId?: string;
  branchName?: string;
  applicableTo: "rooms" | "restaurant" | "all";
  startDate: string;
  endDate: string;
  maxUsageCount?: number;
  currentUsageCount?: number;
  minNightsRequired?: number;
  isEnabled: boolean;
};

export type PromotionalPackage = {
  id: string;
  code: string;
  name: string;
  description: string;
  scope: "global" | "branch";
  branchId?: string;
  branchName?: string;
  targetRoomTypeIds: string[];
  pricingType: "fixed_package" | "discount_percent";
  packagePrice?: number;
  discountPercent?: number;
  inclusions: string[];
  minNights: number;
  startDate: string;
  endDate: string;
  isEnabled: boolean;
  featured?: boolean;
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
  allowBranchCatalogManagement?: boolean;

  // Facilities
  propertyFacilities?: string[];
  customFacilitiesList?: CustomFacility[];

  // Media & Gallery
  heroImageUrl?: string;
  galleryImages?: GalleryImage[];

  // Policies & Refunds
  customPoliciesList?: CustomPolicyItem[];
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
  defaultBoardBasis?: string;

  // Ethiopian Tax & Regulatory Compliance
  vatRatePercent?: number;
  serviceChargePercent?: number;
  serviceChargeEnabled?: boolean;
  withholdingTaxServicePercent?: number;
  withholdingTaxGoodsPercent?: number;
  vatCalculationBasis?: "base_plus_service" | "base_only";
  diplomaticVatExemptionEnabled?: boolean;

  // Tax Registration & Licensing
  vatRegistrationNumber?: string;
  vatRegistrationDate?: string;
  tradeLicenseExpiryDate?: string;
  ministryOfTourismLicense?: string;
  ministryOfTourismRating?: string;

  // Fiscal Cash Register (ERCA / MoR Sales Register Machine)
  fiscalCashRegisterEnabled?: boolean;
  fiscalMachineCode?: string;
  fiscalMachineSerial?: string;
  fiscalTerminalId?: string;
  fiscalIntegrationStatus?: "online" | "offline" | "standalone";

  // Document Uploads
  complianceDocuments?: ComplianceDocument[];
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
  currencyRateScope?: "global" | "branch_bounded";
  supportedCurrencies?: SupportedCurrency[];
  discounts?: DiscountRule[];
  promotionalPackages?: PromotionalPackage[];
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
  lateCheckoutGraceMinutes?: number;
  lateCheckoutHourlyFee?: number | string;
  lateCheckoutTier1Percent?: number | string;
  lateCheckoutTier2Percent?: number | string;
  lateCheckoutCutoffTime?: string;
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


const DEFAULT_SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  {
    code: "ETB",
    name: "Ethiopian Birr",
    symbol: "ETB",
    exchangeRate: 1.0,
    isBaseCurrency: true,
    isEnabled: true,
    updatedAt: "2026-11-04",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    exchangeRate: 135.5,
    isBaseCurrency: false,
    isEnabled: true,
    updatedAt: "2026-11-04",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    exchangeRate: 147.2,
    isBaseCurrency: false,
    isEnabled: true,
    updatedAt: "2026-11-04",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    exchangeRate: 176.8,
    isBaseCurrency: false,
    isEnabled: false,
    updatedAt: "2026-11-04",
  },
];


const DEFAULT_DISCOUNTS: DiscountRule[] = [
  {
    id: "disc-1",
    code: "SUMMER20",
    name: "Summer Getaway 20% Off",
    discountType: "percentage",
    value: 20,
    scope: "global",
    applicableTo: "rooms",
    startDate: "2026-06-01",
    endDate: "2026-10-31",
    minNightsRequired: 2,
    isEnabled: true,
  },
  {
    id: "disc-2",
    code: "CORP-ETHIOAIR",
    name: "Ethiopian Airlines Corporate Tariff",
    discountType: "percentage",
    value: 15,
    scope: "global",
    applicableTo: "all",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    minNightsRequired: 1,
    isEnabled: true,
  },
  {
    id: "disc-3",
    code: "BOLE-TRANSIT",
    name: "Bole Airport Transit Direct Voucher",
    discountType: "fixed_amount",
    value: 500,
    scope: "branch",
    branchName: "Addis Ababa Bole",
    applicableTo: "rooms",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    minNightsRequired: 1,
    isEnabled: true,
  },
];

const DEFAULT_PROMOTIONAL_PACKAGES: PromotionalPackage[] = [
  {
    id: "pkg-1",
    code: "WKND-GETAWAY",
    name: "Luxury Weekend Retreat & Spa",
    description: "2 nights in luxury deluxe room with daily buffet breakfast and 60-minute couple spa voucher included.",
    scope: "global",
    targetRoomTypeIds: ["all"],
    pricingType: "fixed_package",
    packagePrice: 16500,
    inclusions: [
      "Daily Gourmet Buffet Breakfast",
      "60-Min Swedish Spa Voucher",
      "Complimentary Airport Chauffeur",
      "Late Check-Out until 14:00",
    ],
    minNights: 2,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isEnabled: true,
    featured: true,
  },
  {
    id: "pkg-2",
    code: "BIZ-EXECUTIVE",
    name: "Executive Corporate Bed & Breakfast",
    description: "Tailored for business travelers with express breakfast, high-speed WiFi, and meeting room voucher.",
    scope: "branch",
    branchName: "Addis Ababa Bole",
    targetRoomTypeIds: ["all"],
    pricingType: "discount_percent",
    discountPercent: 15,
    inclusions: [
      "Express Executive Buffet Breakfast",
      "High-Speed Fiber WiFi Voucher",
      "Laundry Service (2 garments/day)",
      "1-Hour Executive Boardroom Credit",
    ],
    minNights: 1,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isEnabled: true,
    featured: false,
  },
  {
    id: "pkg-3",
    code: "HONEYMOON-PARADISE",
    name: "Presidential Honeymoon Romance",
    description: "Chilled champagne welcome, 3-course candlelight dinner, and rose petal turndown in our signature suite.",
    scope: "global",
    targetRoomTypeIds: ["all"],
    pricingType: "fixed_package",
    packagePrice: 28000,
    inclusions: [
      "Chilled Champagne & Exotic Fruit Basket",
      "3-Course Candlelight Dinner at Chef's Table",
      "In-Room Champagne Breakfast",
      "Signature Rose Petal Turndown Service",
    ],
    minNights: 2,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isEnabled: true,
    featured: true,
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

const DEFAULT_POLICIES: CustomPolicyItem[] = [
  {
    id: "policy-refund",
    title: "Official Cancellation & Refund Policy",
    category: "Refunds",
    badge: "Active Policy",
    initials: "CR",
    content: `<h3>Standard Cancellation & Refund Policy</h3><p>Our hotel strives to provide flexible, transparent terms for both business and leisure guests.</p><h4>Cancellation Windows:</h4><ul><li><strong>Free Cancellation:</strong> Bookings cancelled up to 48 hours prior to arrival date by 14:00 local time receive a 100% full refund.</li><li><strong>Late Cancellation:</strong> Cancellations received within 48 hours of check-in, or failure to arrive (No-Show), will be billed for the first night room rate plus applicable taxes.</li><li><strong>Non-Refundable Tariffs:</strong> Promotional rates flagged as non-refundable are charged at booking and cannot be refunded or transferred.</li></ul><h4>Refund Settlement Timeline:</h4><p>Approved refunds are credited directly to the original settlement instrument within 3 to 5 business days.</p>`,
  },
  {
    id: "policy-folio",
    title: "Guest Folio & Invoice Legal Terms",
    category: "Legal & Invoicing",
    badge: "Invoice Footer",
    initials: "TC",
    content: `<h4>Guest Liability & Security Notice:</h4><ul><li><strong>Safe Deposit Boxes:</strong> Individual safe deposit boxes are provided at the Front Desk free of charge. Management disclaims all liability for cash, jewelry, or documents left in guest rooms.</li><li><strong>Property Damages:</strong> Registered guests assume full financial responsibility for any physical breakage, smoke damage, or fixture loss caused during their stay.</li><li><strong>Settlement of Charges:</strong> Unbilled incidental charges discovered post-departure will be posted to the credit card or billing account on record.</li></ul>`,
  },
  {
    id: "policy-regcard",
    title: "Arrival Registration Card Agreement",
    category: "Check-In Agreement",
    badge: "Registration Agreement",
    initials: "RC",
    content: `<h4>Guest Registration Agreement & Terms:</h4><p>I hereby certify that all information submitted during registration is accurate and complete.</p><ul><li>I agree to comply with hotel safety regulations, quiet hours, and property guidelines.</li><li>I agree that my personal liability for all room charges, taxes, and incidentals is not waived if any third party, employer, or sponsoring organization fails to pay in full.</li><li>I understand check-out time is 12:00 PM. Delayed departures without prior front desk clearance may incur half-day or full-day surcharges.</li></ul>`,
  },
  {
    id: "policy-smoking-pets",
    title: "Smoking & Pet Accommodation Policies",
    category: "House Rules",
    badge: "Property Guidelines",
    initials: "SP",
    content: `<h4>Smoking Policy:</h4><p>This property operates as a strictly non-smoking facility in all guest rooms, hallways, and indoor public venues. Dedicated smoking areas are available in landscaped garden terraces. Violations will incur a deep-cleaning penalty fee.</p><h4>Pet Accommodation:</h4><p>Pets are not permitted on hotel premises, with the exception of certified service animals registered at check-in.</p>`,
  },
];

const DEFAULT_COMPLIANCE_DOCUMENTS: ComplianceDocument[] = [
  {
    id: "doc-tin",
    title: "TIN Certificate",
    category: "tax_tin",
    docNumber: "0012345678",
    issueDate: "2018-04-10",
    status: "valid",
    fileName: "TIN_Certificate.pdf",
    fileSize: "1.2 MB",
  },
  {
    id: "doc-vat",
    title: "VAT Registration Certificate",
    category: "vat_cert",
    docNumber: "VAT-10-00892415",
    issueDate: "2020-01-11",
    status: "valid",
    fileName: "VAT_Certificate.pdf",
    fileSize: "1.8 MB",
  },
  {
    id: "doc-trade",
    title: "Business Trade License",
    category: "trade_license",
    docNumber: "ETH-HTL-2020-00142",
    issueDate: "2024-07-08",
    expiryDate: "2026-07-07",
    status: "valid",
    fileName: "Trade_License.pdf",
    fileSize: "2.4 MB",
  },
  {
    id: "doc-tourism",
    title: "Tourism Star Rating Certificate",
    category: "tourism_rating",
    docNumber: "MoT-HTL-CAT5-0042",
    issueDate: "2023-11-20",
    expiryDate: "2027-11-19",
    status: "valid",
    fileName: "Tourism_Star_Rating.pdf",
    fileSize: "3.1 MB",
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
  allowBranchCatalogManagement: true,

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

  customPoliciesList: DEFAULT_POLICIES,
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
  defaultBoardBasis: "Bed & Breakfast (BB)",
  vatRatePercent: 15,
  serviceChargePercent: 10,
  serviceChargeEnabled: true,
  withholdingTaxServicePercent: 3,
  withholdingTaxGoodsPercent: 2,
  vatCalculationBasis: "base_plus_service",
  diplomaticVatExemptionEnabled: true,
  vatRegistrationNumber: "VAT-10-00892415",
  vatRegistrationDate: "2020-01-11",
  tradeLicenseExpiryDate: "2026-07-07",
  ministryOfTourismLicense: "MoT-HTL-CAT5-0042",
  ministryOfTourismRating: "5 Star Luxury Hotel",
  fiscalCashRegisterEnabled: false,
  fiscalMachineCode: "MRC-AA-789230",
  fiscalMachineSerial: "FBR-2024-00918",
  fiscalTerminalId: "TID-FD-01",
  fiscalIntegrationStatus: "online",
  complianceDocuments: DEFAULT_COMPLIANCE_DOCUMENTS,
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

type TabKey = "identity" | "operations" | "facilities" | "media" | "revenue" | "rates_promos" | "housekeeping" | "policies";

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
  const { user, activeBranch, branches, switchBranch } = useAuth();
  const isGlobal =
    user?.roleName === "System Administrator" ||
    user?.roleName === "Admin" ||
    user?.roleName === "System Admin" ||
    user?.roleScope === "global";

  const branchId = activeBranch?.id || user?.primaryBranchId || branches?.[0]?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [isEditing, setIsEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Fetch Chain HQ Hotel defaults
  const { data: rawHotel, isLoading: isHotelLoading, isError: isHotelError, refetch: refetchHotel } = useQuery({
    queryKey: ["hotel"],
    queryFn: () => apiFetch<any>("/hotel"),
  });

  const chainHotel: Hotel | undefined = Array.isArray(rawHotel)
    ? rawHotel[0]
    : (rawHotel?.data?.[0] ?? rawHotel);

  // 1b. Fetch Branch Buildings for Facility Switcher
  const { data: rawBuildings } = useQuery({
    queryKey: ["buildings", branchId],
    queryFn: () => (branchId ? apiFetch<any>(`/buildings?branchId=${branchId}&status=all`) : apiFetch<any>("/buildings?status=all")),
  });
  const branchBuildings: any[] = Array.isArray(rawBuildings) ? rawBuildings : (rawBuildings?.data ?? []);

  // Building Scoping: If user is stationed in a building, default to their building!
  const userBuildingId: string | null = (user as any)?.buildingId || null;
  const defaultBuildingId = (!isGlobal && userBuildingId) ? userBuildingId : "all";
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(defaultBuildingId);

  useEffect(() => {
    if (!isGlobal && userBuildingId) {
      setSelectedBuildingId(userBuildingId);
    }
  }, [userBuildingId, isGlobal]);

  const selectedBuilding = branchBuildings.find((b: any) => b.id === selectedBuildingId);

  // Local Building Edit State
  const [bldgName, setBldgName] = useState("");
  const [bldgCode, setBldgCode] = useState("");
  const [bldgFloors, setBldgFloors] = useState<number | string>(1);
  const [bldgPhone, setBldgPhone] = useState("");
  const [bldgEmail, setBldgEmail] = useState("");
  const [bldgCheckIn, setBldgCheckIn] = useState("02:00 PM");
  const [bldgCheckOut, setBldgCheckOut] = useState("12:00 PM");
  const [bldgStatus, setBldgStatus] = useState("active");
  const [bldgAmenities, setBldgAmenities] = useState<string[]>([]);
  const [bldgDesc, setBldgDesc] = useState("");

  useEffect(() => {
    if (selectedBuilding) {
      setBldgName(selectedBuilding.buildingName || "");
      setBldgCode(selectedBuilding.buildingCode || "");
      setBldgFloors(selectedBuilding.numberOfFloors || 1);
      setBldgPhone(selectedBuilding.contactPhone || "");
      setBldgEmail(selectedBuilding.contactEmail || "");
      setBldgCheckIn(selectedBuilding.checkInTime || "02:00 PM");
      setBldgCheckOut(selectedBuilding.checkOutTime || "12:00 PM");
      setBldgStatus(selectedBuilding.operatingStatus || (selectedBuilding.isActive ? "active" : "inactive"));
      setBldgAmenities(Array.isArray(selectedBuilding.amenities) ? selectedBuilding.amenities : []);
      setBldgDesc(selectedBuilding.description || "");
    }
  }, [selectedBuilding]);

  const saveBuildingMutation = useMutation({
    mutationFn: (data: any) => apiFetch(`/buildings/${selectedBuildingId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "Building hotel configuration saved successfully" });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save building configuration", description: err.message, variant: "destructive" });
    },
  });

  const toggleBuildingAmenity = (amenity: string) => {
    setBldgAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

    // 2. Fetch Branch-specific configuration if branch-scoped
  const { data: branchData, isLoading: isBranchLoading, isError: isBranchError, refetch: refetchBranch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => (branchId ? apiFetch<any>(`/branches/${branchId}`) : null),
    enabled: !isGlobal && !!branchId,
  });

  const isLoading = isHotelLoading || (!isGlobal && isBranchLoading);
  const isError = isHotelError || (!isGlobal && isBranchError);
  const refetch = () => {
    refetchHotel();
    if (!isGlobal) refetchBranch();
  };

  // Effective Hotel Object: Exact same layout as Super Admin Hotel Config,
  // populated with branch values where set, with seamless fallback to Chain HQ defaults
  const hotel: Hotel | undefined = useMemo(() => {
    if (!chainHotel && !branchData) return undefined;
    if (isGlobal || !branchData) return chainHotel;

    const bSettings = branchData.settings || {};
    const hSettings = chainHotel?.settings || {};

    return {
      ...(chainHotel || {}),
      id: branchData.id || chainHotel?.id,
      hotelName: branchData.branchName ?? chainHotel?.hotelName ?? "",
      hotelCode: branchData.branchCode ?? chainHotel?.hotelCode ?? "",
      legalName: branchData.legalName ?? branchData.manager ?? chainHotel?.legalName ?? "",
      phone: branchData.phone ?? chainHotel?.phone ?? "",
      email: branchData.email ?? chainHotel?.email ?? "",
      website: branchData.website ?? chainHotel?.website ?? "",
      address: branchData.address ?? chainHotel?.address ?? "",
      city: branchData.city ?? chainHotel?.city ?? "",
      country: branchData.country ?? chainHotel?.country ?? "Ethiopia",
      timezone: branchData.timezone ?? chainHotel?.timezone ?? "Africa/Addis_Ababa",
      currencyCode: branchData.currencyCode ?? chainHotel?.currencyCode ?? "ETB",
      taxNumber: branchData.taxNumber ?? chainHotel?.taxNumber ?? "",
      licenseNumber: branchData.licenseNumber ?? chainHotel?.licenseNumber ?? "",
      description: branchData.description ?? chainHotel?.description ?? "",
      starRating: branchData.starRating ? Number(branchData.starRating) : (chainHotel?.starRating ?? 5),
      checkInTime: branchData.checkInTime || chainHotel?.checkInTime || "14:00",
      checkOutTime: branchData.checkOutTime || chainHotel?.checkOutTime || "12:00",
      lateCheckoutGraceMinutes: bSettings.lateCheckoutGraceMinutes ?? chainHotel?.lateCheckoutGraceMinutes ?? 30,
      lateCheckoutHourlyFee: bSettings.lateCheckoutHourlyFee ?? chainHotel?.lateCheckoutHourlyFee ?? "25",
      lateCheckoutTier1Percent: bSettings.lateCheckoutTier1Percent ?? chainHotel?.lateCheckoutTier1Percent ?? "25",
      lateCheckoutTier2Percent: bSettings.lateCheckoutTier2Percent ?? chainHotel?.lateCheckoutTier2Percent ?? "50",
      lateCheckoutCutoffTime: bSettings.lateCheckoutCutoffTime ?? chainHotel?.lateCheckoutCutoffTime ?? "18:00",
      settings: {
        ...hSettings,
        ...bSettings,
        propertyFacilities: bSettings.propertyFacilities || hSettings.propertyFacilities,
        galleryImages: bSettings.galleryImages || hSettings.galleryImages,
        heroImageUrl: bSettings.heroImageUrl || hSettings.heroImageUrl,
        extraBedsList: bSettings.extraBedsList || hSettings.extraBedsList,
        paymentAccountsList: bSettings.paymentAccountsList || hSettings.paymentAccountsList,
        customFacilitiesList: bSettings.customFacilitiesList || hSettings.customFacilitiesList,
        refundTermsText: bSettings.refundTermsText || hSettings.refundTermsText,
        folioTermsFooter: bSettings.folioTermsFooter || hSettings.folioTermsFooter,
        registrationCardDisclaimer: bSettings.registrationCardDisclaimer || hSettings.registrationCardDisclaimer,
      },
    };
  }, [chainHotel, branchData, isGlobal]);

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
  const [complianceDocuments, setComplianceDocuments] = useState<ComplianceDocument[]>(DEFAULT_COMPLIANCE_DOCUMENTS);
  const [fiscalCashRegisterEnabled, setFiscalCashRegisterEnabled] = useState(false);
  const [allowBranchCatalogManagement, setAllowBranchCatalogManagement] = useState(true);
  const [currencyRateScope, setCurrencyRateScope] = useState<"global" | "branch_bounded">("global");
  const [currenciesList, setCurrenciesList] = useState<SupportedCurrency[]>(DEFAULT_SUPPORTED_CURRENCIES);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [lastRatesSyncTime, setLastRatesSyncTime] = useState<string | null>(null);

  const [discountsList, setDiscountsList] = useState<DiscountRule[]>(DEFAULT_DISCOUNTS);
  const [promoPackagesList, setPromoPackagesList] = useState<PromotionalPackage[]>(DEFAULT_PROMOTIONAL_PACKAGES);
  const [promoScopeFilter, setPromoScopeFilter] = useState<string>("all");
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionalPackage | null>(null);
  const [promoInclusions, setPromoInclusions] = useState<string[]>([
    "Daily Gourmet Buffet Breakfast",
    "Airport Shuttle Transfer",
  ]);
  const [inclusionInput, setInclusionInput] = useState<string>("");

  const [editingCurrency, setEditingCurrency] = useState<SupportedCurrency | null>(null);
  const [editingBranchOverride, setEditingBranchOverride] = useState<SupportedCurrency | null>(null);
  const [isBranchOverrideModalOpen, setIsBranchOverrideModalOpen] = useState(false);
  const [branchOverrideRate, setBranchOverrideRate] = useState<number>(0);
  const [branchOverrideActive, setBranchOverrideActive] = useState<boolean>(true);

  const branchCurrencyOverrides = useMemo(() => {
    return (branchData?.settings?.currencyOverrides as Record<string, { exchangeRate?: number; isEnabled?: boolean }>) || {};
  }, [branchData]);

  const [policiesList, setPoliciesList] = useState<CustomPolicyItem[]>(DEFAULT_POLICIES);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CustomPolicyItem | null>(null);
  const [editablePolicyIds, setEditablePolicyIds] = useState<Record<string, boolean>>({});

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ComplianceDocument | null>(null);
  const [docFileUrl, setDocFileUrl] = useState<string>("");
  const [docFileName, setDocFileName] = useState<string>("");
  const [docFileSize, setDocFileSize] = useState<string>("");


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
      if (s.complianceDocuments && s.complianceDocuments.length > 0) setComplianceDocuments(s.complianceDocuments);
      if (s.fiscalCashRegisterEnabled !== undefined) setFiscalCashRegisterEnabled(s.fiscalCashRegisterEnabled);
      if (s.allowBranchCatalogManagement !== undefined) setAllowBranchCatalogManagement(s.allowBranchCatalogManagement !== false);
      if (s.currencyRateScope) setCurrencyRateScope(s.currencyRateScope);
      if (s.supportedCurrencies && s.supportedCurrencies.length > 0) setCurrenciesList(s.supportedCurrencies);
      if (s.discounts && s.discounts.length > 0) setDiscountsList(s.discounts);
      if (s.promotionalPackages && s.promotionalPackages.length > 0) setPromoPackagesList(s.promotionalPackages);


      if (s.customPoliciesList && s.customPoliciesList.length > 0) setPoliciesList(s.customPoliciesList);
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
    mutationFn: (data: Partial<Hotel>) => {
      if (!isGlobal && branchId) {
        // Save as per branch scope
        const branchSettings = {
          ...(branchData?.settings || {}),
          ...data.settings,
          lateCheckoutGraceMinutes: data.lateCheckoutGraceMinutes,
          lateCheckoutHourlyFee: data.lateCheckoutHourlyFee,
          lateCheckoutTier1Percent: data.lateCheckoutTier1Percent,
          lateCheckoutTier2Percent: data.lateCheckoutTier2Percent,
          lateCheckoutCutoffTime: data.lateCheckoutCutoffTime,
        };

        return apiFetch(`/branches/${branchId}`, {
          method: "PATCH",
          body: JSON.stringify({
            branchName: data.hotelName,
            legalName: data.legalName,
            manager: data.legalName,
            phone: data.phone,
            email: data.email,
            website: data.website,
            address: data.address,
            city: data.city,
            country: data.country,
            timezone: data.timezone,
            currencyCode: data.currencyCode,
            taxNumber: data.taxNumber,
            licenseNumber: data.licenseNumber,
            description: data.description,
            checkInTime: data.checkInTime,
            checkOutTime: data.checkOutTime,
            starRating: data.starRating ? Number(data.starRating) : undefined,
            settings: branchSettings,
          }),
        });
      }

      return hotel?.id
        ? apiFetch(`/hotel/${hotel.id}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiFetch("/hotel", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      if (!isGlobal && branchId) {
        queryClient.invalidateQueries({ queryKey: ["branch", branchId] });
        queryClient.invalidateQueries({ queryKey: ["branches"] });
        toast({ title: "Branch configuration saved successfully" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["hotel"] });
        toast({ title: "Hotel configuration updated successfully" });
      }
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

  const toggleCatalogMutation = useMutation({
    mutationFn: (enabled: boolean) => {
      const targetHotel = chainHotel || hotel;
      if (!targetHotel?.id) {
        throw new Error("Hotel configuration not loaded");
      }
      return apiFetch(`/hotel/${targetHotel.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            ...(targetHotel.settings || {}),
            allowBranchCatalogManagement: enabled,
          },
        }),
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["hotel"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      queryClient.invalidateQueries({ queryKey: ["hotels-primary-setting"] });
      queryClient.invalidateQueries({ queryKey: ["hotel-settings-for-rooms"] });
      toast({
        title: enabled ? "Branch Delegation Enabled" : "HQ Centralized Mode Active",
        description: enabled
          ? "Branch Managers can now create and manage rooms and room catalogs for their assigned branch."
          : "Room creation and catalog management is now restricted to Chain SuperAdmins.",
      });
    },
    onError: (err: Error) => {
      setAllowBranchCatalogManagement(!allowBranchCatalogManagement);
      toast({
        title: "Failed to update delegation",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleBranchCatalog = (enabled: boolean) => {
    setAllowBranchCatalogManagement(enabled);
    toggleCatalogMutation.mutate(enabled);
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


  // Compliance Document Handlers
  const handleSaveComplianceDoc = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    if (!title) {
      toast({ title: "Title Required", description: "Please enter a document title", variant: "destructive" });
      return;
    }

    const docCategory = (fd.get("category") as any) || "other";
    const docNumber = String(fd.get("docNumber") || "").trim();
    const issueDate = String(fd.get("issueDate") || "").trim();
    const expiryDate = String(fd.get("expiryDate") || "").trim();
    const notes = String(fd.get("notes") || "").trim();
    const explicitUrl = String(fd.get("fileUrl") || "").trim();
    const finalUrl = explicitUrl || docFileUrl || "";

    if (editingDoc) {
      setComplianceDocuments((prev) =>
        prev.map((d) =>
          d.id === editingDoc.id
            ? {
                ...d,
                title,
                category: docCategory,
                docNumber,
                issueDate,
                expiryDate,
                notes,
                fileUrl: finalUrl,
                fileName: docFileName || d.fileName,
                fileSize: docFileSize || d.fileSize,
              }
            : d
        )
      );
      toast({ title: "Document updated successfully" });
    } else {
      const newDoc: ComplianceDocument = {
        id: "doc-" + Date.now(),
        title,
        category: docCategory,
        docNumber,
        issueDate,
        expiryDate,
        notes,
        fileUrl: finalUrl,
        fileName: docFileName || (finalUrl ? "attached_document" : "document.pdf"),
        fileSize: docFileSize || "Uploaded File",
        status: "valid",
      };
      setComplianceDocuments((prev) => [...prev, newDoc]);
      toast({ title: "New document attached successfully" });
    }
    setIsDocModalOpen(false);
    setEditingDoc(null);
    setDocFileUrl("");
    setDocFileName("");
    setDocFileSize("");
  };


  // Dynamic Policy Handlers
  const formatContentForInput = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .trim();
  };

  const handleSavePolicy = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    if (!title) {
      toast({ title: "Title Required", description: "Please enter a policy title", variant: "destructive" });
      return;
    }
    const category = String(fd.get("category") || "General").trim();
    const badge = String(fd.get("badge") || "Active Policy").trim();
    let contentText = String(fd.get("content") || "").trim();
    if (contentText && !contentText.startsWith("<")) {
      contentText = contentText
        .split("\n\n")
        .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
        .join("");
    }
    const initials = title.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "PL";

    if (editingPolicy) {
      setPoliciesList((prev) =>
        prev.map((p) =>
          p.id === editingPolicy.id
            ? { ...p, title, category, badge, initials, content: contentText || p.content }
            : p
        )
      );
      toast({ title: "Policy updated successfully" });
    } else {
      const newPolicy: CustomPolicyItem = {
        id: "policy-" + Date.now(),
        title,
        category,
        badge,
        initials,
        content: contentText || "<p>Policy terms and operating guidelines.</p>",
      };
      setPoliciesList((prev) => [...prev, newPolicy]);
      setExpandedPolicies((prev) => ({ ...prev, [newPolicy.id]: true }));
      toast({ title: "New policy issue created" });
    }
    setIsPolicyModalOpen(false);
    setEditingPolicy(null);
  };

  const handleDeletePolicy = (id: string) => {
    setPoliciesList((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Policy removed" });
  };

  const handleDeleteComplianceDoc = (id: string) => {
    setComplianceDocuments((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Compliance document removed" });
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

  // Currency Handlers (Immediate Persistence)
  const handleSaveCurrency = (currency: SupportedCurrency) => {
    const idx = currenciesList.findIndex((c) => c.code.toUpperCase() === currency.code.toUpperCase());
    let nextList: SupportedCurrency[];
    if (idx >= 0) {
      nextList = [...currenciesList];
      nextList[idx] = { ...currency, updatedAt: new Date().toISOString().split("T")[0] };
    } else {
      nextList = [...currenciesList, { ...currency, updatedAt: new Date().toISOString().split("T")[0] }];
    }
    setCurrenciesList(nextList);
    setIsCurrencyModalOpen(false);
    setEditingCurrency(null);
    toast({ title: "Currency updated", description: `${currency.code} rate saved successfully.` });
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), supportedCurrencies: nextList },
      } as any);
    }
  };

  const handleDeleteCurrency = (code: string) => {
    if (code === "ETB") {
      toast({ title: "Cannot delete base currency", description: "ETB is the primary legal reporting currency.", variant: "destructive" });
      return;
    }
    const nextList = currenciesList.filter((c) => c.code !== code);
    setCurrenciesList(nextList);
    toast({ title: "Currency removed" });
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), supportedCurrencies: nextList },
      } as any);
    }
  };

  const handleToggleCurrency = (code: string) => {
    const nextList = currenciesList.map((c) => (c.code === code ? { ...c, isEnabled: !c.isEnabled } : c));
    setCurrenciesList(nextList);
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), supportedCurrencies: nextList },
      } as any);
    }
  };

  const handleUpdateCurrencyRate = (code: string, newRate: number) => {
    const nextList = currenciesList.map((c) =>
      c.code === code ? { ...c, exchangeRate: newRate, updatedAt: new Date().toISOString().split("T")[0] } : c
    );
    setCurrenciesList(nextList);
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), supportedCurrencies: nextList },
      } as any);
    }
  };

  const handleFetchLiveRates = async () => {
    setIsFetchingRates(true);
    try {
      let rates: Record<string, number> | null = null;
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/ETB");
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) {
            rates = data.rates;
          }
        }
      } catch (primaryErr) {
        console.warn("Primary live exchange rate API failed, attempting fallback...", primaryErr);
      }

      if (!rates) {
        const fallbackRes = await fetch("https://api.exchangerate-api.com/v4/latest/ETB");
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData && fallbackData.rates) {
            rates = fallbackData.rates;
          }
        }
      }

      if (!rates) {
        throw new Error("Unable to contact live exchange rate providers. Please check your network connection.");
      }

      const todayStr = new Date().toISOString().split("T")[0];
      let updatedCount = 0;

      const nextList = currenciesList.map((cur) => {
        if (cur.isBaseCurrency || cur.code.toUpperCase() === "ETB") {
          return cur;
        }
        const foreignPerEtb = rates![cur.code.toUpperCase()];
        if (foreignPerEtb && foreignPerEtb > 0) {
          const liveEtbRate = +(1 / foreignPerEtb).toFixed(2);
          updatedCount++;
          return {
            ...cur,
            exchangeRate: liveEtbRate,
            updatedAt: todayStr,
          };
        }
        return cur;
      });

      setCurrenciesList(nextList);
      const syncTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      setLastRatesSyncTime(syncTime);

      if (hotel) {
        saveMutation.mutate({
          settings: { ...(hotel.settings || {}), supportedCurrencies: nextList },
        } as any);
      }

      toast({
        title: "Live exchange rates updated",
        description: `Successfully synchronized ${updatedCount} currencies against base ETB.`,
      });
    } catch (err: any) {
      toast({
        title: "Exchange rate sync failed",
        description: err?.message || "Failed to fetch live rates.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Discounts Handlers (Immediate Persistence)
  const handleSaveDiscount = (discount: DiscountRule) => {
    const idx = discountsList.findIndex((d) => d.id === discount.id);
    let nextList: DiscountRule[];
    if (idx >= 0) {
      nextList = [...discountsList];
      nextList[idx] = discount;
    } else {
      nextList = [...discountsList, discount];
    }
    setDiscountsList(nextList);
    setIsDiscountModalOpen(false);
    setEditingDiscount(null);
    toast({ title: "Discount Rule Saved", description: `${discount.code} has been successfully saved.` });
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), discounts: nextList },
      } as any);
    }
  };

  const handleDeleteDiscount = (id: string) => {
    const nextList = discountsList.filter((d) => d.id !== id);
    setDiscountsList(nextList);
    toast({ title: "Discount Removed" });
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), discounts: nextList },
      } as any);
    }
  };

  const handleToggleDiscount = (id: string) => {
    const nextList = discountsList.map((d) => (d.id === id ? { ...d, isEnabled: !d.isEnabled } : d));
    setDiscountsList(nextList);
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), discounts: nextList },
      } as any);
    }
  };

  // Promotional Package Handlers (Immediate Persistence)
  const handleSavePromo = (pkg: PromotionalPackage) => {
    const idx = promoPackagesList.findIndex((p) => p.id === pkg.id);
    let nextList: PromotionalPackage[];
    if (idx >= 0) {
      nextList = [...promoPackagesList];
      nextList[idx] = pkg;
    } else {
      nextList = [...promoPackagesList, pkg];
    }
    setPromoPackagesList(nextList);
    setIsPromoModalOpen(false);
    setEditingPromo(null);
    toast({ title: "Package Saved", description: `${pkg.name} has been successfully updated.` });
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), promotionalPackages: nextList },
      } as any);
    }
  };

  const handleDeletePromo = (id: string) => {
    const nextList = promoPackagesList.filter((p) => p.id !== id);
    setPromoPackagesList(nextList);
    toast({ title: "Package Removed" });
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), promotionalPackages: nextList },
      } as any);
    }
  };

  const handleTogglePromo = (id: string) => {
    const nextList = promoPackagesList.map((p) => (p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
    setPromoPackagesList(nextList);
    if (hotel) {
      saveMutation.mutate({
        settings: { ...(hotel.settings || {}), promotionalPackages: nextList },
      } as any);
    }
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
      allowBranchCatalogManagement: allowBranchCatalogManagement,

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
      defaultBoardBasis: String(formObj.defaultBoardBasis || mergedSettings.defaultBoardBasis || "Bed & Breakfast (BB)").trim(),

      // Ethiopian Tax & Compliance
      vatRatePercent: Number(formObj.vatRatePercent) || 15,
      serviceChargePercent: Number(formObj.serviceChargePercent) || 10,
      serviceChargeEnabled: formObj.serviceChargeEnabled === "on" || formObj.serviceChargeEnabled === "true",
      withholdingTaxServicePercent: Number(formObj.withholdingTaxServicePercent) || 3,
      withholdingTaxGoodsPercent: Number(formObj.withholdingTaxGoodsPercent) || 2,
      vatCalculationBasis: (formObj.vatCalculationBasis as any) || "base_plus_service",
      diplomaticVatExemptionEnabled: formObj.diplomaticVatExemptionEnabled === "on" || formObj.diplomaticVatExemptionEnabled === "true",
      vatRegistrationNumber: String(formObj.vatRegistrationNumber || mergedSettings.vatRegistrationNumber || "VAT-10-00892415"),
      vatRegistrationDate: String(formObj.vatRegistrationDate || mergedSettings.vatRegistrationDate || "2020-01-11"),
      tradeLicenseExpiryDate: String(formObj.tradeLicenseExpiryDate || mergedSettings.tradeLicenseExpiryDate || "2026-07-07"),
      ministryOfTourismLicense: String(formObj.ministryOfTourismLicense || mergedSettings.ministryOfTourismLicense || "MoT-HTL-CAT5-0042"),
      ministryOfTourismRating: String(formObj.ministryOfTourismRating || mergedSettings.ministryOfTourismRating || "5 Star Luxury Hotel"),
      fiscalCashRegisterEnabled: fiscalCashRegisterEnabled,
      customPoliciesList: policiesList,
      fiscalMachineCode: String(formObj.fiscalMachineCode || mergedSettings.fiscalMachineCode || "MRC-AA-789230"),
      fiscalMachineSerial: String(formObj.fiscalMachineSerial || mergedSettings.fiscalMachineSerial || "FBR-2024-00918"),
      fiscalTerminalId: String(formObj.fiscalTerminalId || mergedSettings.fiscalTerminalId || "TID-FD-01"),
      fiscalIntegrationStatus: (formObj.fiscalIntegrationStatus as any) || "online",
      complianceDocuments: complianceDocuments,
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
      hotelName: String(formObj.hotelName || hotel?.hotelName || ""),
      legalName: String(formObj.legalName || hotel?.legalName || ""),
      hotelCode: String(formObj.hotelCode || hotel?.hotelCode || ""),
      starRating: Number(formObj.starRating) || 5,
      email: String(formObj.email || hotel?.email || ""),
      phone: String(formObj.phone || hotel?.phone || ""),
      website: String(formObj.website || hotel?.website || ""),
      address: String(formObj.address || hotel?.address || ""),
      city: String(formObj.city || hotel?.city || ""),
      country: String(formObj.country || hotel?.country || "Ethiopia"),
      timezone: String(formObj.timezone || hotel?.timezone || "Africa/Addis_Ababa"),
      currencyCode: String(formObj.currencyCode || hotel?.currencyCode || "ETB"),
      checkInTime: String(formObj.checkInTime || hotel?.checkInTime || "14:00"),
      checkOutTime: String(formObj.checkOutTime || hotel?.checkOutTime || "12:00"),
      taxNumber: String(formObj.taxNumber || hotel?.taxNumber || ""),
      licenseNumber: String(formObj.licenseNumber || hotel?.licenseNumber || ""),
      description: String(formObj.description || hotel?.description || ""),
      lateCheckoutGraceMinutes: formObj.lateCheckoutGraceMinutes !== undefined ? Number(formObj.lateCheckoutGraceMinutes) : (hotel?.lateCheckoutGraceMinutes ?? 30),
      lateCheckoutHourlyFee: formObj.lateCheckoutHourlyFee !== undefined ? String(formObj.lateCheckoutHourlyFee) : (hotel?.lateCheckoutHourlyFee ?? "25"),
      lateCheckoutTier1Percent: formObj.lateCheckoutTier1Percent !== undefined ? String(formObj.lateCheckoutTier1Percent) : (hotel?.lateCheckoutTier1Percent ?? "25"),
      lateCheckoutTier2Percent: formObj.lateCheckoutTier2Percent !== undefined ? String(formObj.lateCheckoutTier2Percent) : (hotel?.lateCheckoutTier2Percent ?? "50"),
      lateCheckoutCutoffTime: String(formObj.lateCheckoutCutoffTime || hotel?.lateCheckoutCutoffTime || "18:00"),
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

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Building / Facility Selector */}
            {branchBuildings.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">Facility:</span>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  disabled={!isGlobal && !!userBuildingId}
                  className="h-7 text-xs font-semibold text-[var(--text-primary)] bg-transparent focus:outline-none cursor-pointer"
                >
                  {(isGlobal || !userBuildingId) && (
                    <option value="all">Main Campus / Entire Branch</option>
                  )}
                  {branchBuildings.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.buildingName} ({b.buildingCode})
                    </option>
                  ))}
                </select>
                {!isGlobal && userBuildingId && (
                  <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                    Stationed
                  </span>
                )}
              </div>
            )}
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
      </div>

        {selectedBuildingId !== "all" && selectedBuilding ? (
          /* ─────────────────────────────────────────────────────────────────────────────
              BUILDING-SCOPED HOTEL CONFIGURATION VIEW
          ───────────────────────────────────────────────────────────────────────────── */
          <div className="mt-4 space-y-6">
            {/* Building Hero Identity Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700/10 via-blue-600/5 to-transparent dark:from-blue-900/30 dark:via-blue-950/10 dark:to-transparent border border-blue-600/20 dark:border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 text-white flex items-center justify-center font-bold text-xl tracking-wider shadow-sm border border-blue-400/30">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xl text-[var(--text-primary)]">
                      {selectedBuilding.buildingName}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Hotel Facility Unit
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono mt-1">
                    <span className="font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      {selectedBuilding.buildingCode}
                    </span>
                    <span>&bull;</span>
                    <span>Branch: {activeBranch?.branchName || "Main Property"}</span>
                    <span>&bull;</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      selectedBuilding.operatingStatus === "renovation"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : selectedBuilding.operatingStatus === "seasonal_maintenance"
                        ? "bg-sky-100 text-sky-800 border border-sky-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      {selectedBuilding.operatingStatus === "renovation"
                        ? "Under Renovation"
                        : selectedBuilding.operatingStatus === "seasonal_maintenance"
                        ? "Seasonal Maintenance"
                        : "Operational (Open)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Metrics Ribbon */}
              <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)] border-t md:border-t-0 md:border-l border-[var(--border)] pt-4 md:pt-0 md:pl-6">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Physical Floors</span>
                  <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{selectedBuilding.numberOfFloors || 1} Floors</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Check-In / Out</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {selectedBuilding.checkInTime || "02:00 PM"} / {selectedBuilding.checkOutTime || "12:00 PM"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">Lobby Reception Phone</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">{selectedBuilding.contactPhone || "Not configured"}</span>
                </div>
              </div>
            </div>

            {/* Building Hotel Configuration Form Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: 2 Spans */}
              <div className="lg:col-span-2 space-y-6">
                {/* Facility Identity */}
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-xs">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Facility Identification
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Building / Hotel Wing Name</Label>
                      {isEditing ? (
                        <Input value={bldgName} onChange={(e) => setBldgName(e.target.value)} required className="h-9 text-xs" />
                      ) : (
                        <p className="text-xs font-medium text-[var(--text-primary)] py-1.5">{bldgName || selectedBuilding.buildingName}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Building Code</Label>
                      {isEditing ? (
                        <Input value={bldgCode} onChange={(e) => setBldgCode(e.target.value)} required className="h-9 text-xs font-mono" />
                      ) : (
                        <p className="text-xs font-mono text-[var(--text-primary)] py-1.5">{bldgCode || selectedBuilding.buildingCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Total Floors</Label>
                      {isEditing ? (
                        <Input type="number" min={1} value={bldgFloors} onChange={(e) => setBldgFloors(e.target.value)} required className="h-9 text-xs font-mono" />
                      ) : (
                        <p className="text-xs font-mono text-[var(--text-primary)] py-1.5">{bldgFloors || 1} Physical Floors</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Operating Status</Label>
                      {isEditing ? (
                        <select
                          value={bldgStatus}
                          onChange={(e) => setBldgStatus(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="active">Operational (Open)</option>
                          <option value="renovation">Under Renovation (Closed)</option>
                          <option value="seasonal_maintenance">Seasonal Maintenance</option>
                        </select>
                      ) : (
                        <p className="text-xs font-medium text-[var(--text-primary)] py-1.5 capitalize">{bldgStatus || "Operational"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operating Schedule & Contact */}
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-xs">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Operating Schedule & Reception Desk
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Check-In Time</Label>
                      {isEditing ? (
                        <Input value={bldgCheckIn} onChange={(e) => setBldgCheckIn(e.target.value)} placeholder="02:00 PM" className="h-9 text-xs font-mono" />
                      ) : (
                        <p className="text-xs font-mono text-[var(--text-primary)] py-1.5">{bldgCheckIn || "02:00 PM"}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Check-Out Time</Label>
                      {isEditing ? (
                        <Input value={bldgCheckOut} onChange={(e) => setBldgCheckOut(e.target.value)} placeholder="12:00 PM" className="h-9 text-xs font-mono" />
                      ) : (
                        <p className="text-xs font-mono text-[var(--text-primary)] py-1.5">{bldgCheckOut || "12:00 PM"}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Lobby Reception Phone</Label>
                      {isEditing ? (
                        <Input value={bldgPhone} onChange={(e) => setBldgPhone(e.target.value)} placeholder="0911223344" className="h-9 text-xs font-mono" />
                      ) : (
                        <p className="text-xs font-mono text-[var(--text-primary)] py-1.5">{bldgPhone || "None specified"}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[var(--text-primary)]">Lobby Front Desk Email</Label>
                      {isEditing ? (
                        <Input type="email" value={bldgEmail} onChange={(e) => setBldgEmail(e.target.value)} placeholder="wing.desk@hotel.com" className="h-9 text-xs" />
                      ) : (
                        <p className="text-xs text-[var(--text-primary)] py-1.5">{bldgEmail || "None specified"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facility Overview Description */}
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3 shadow-xs">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Facility Overview & Guest Policies
                  </h4>
                  {isEditing ? (
                    <textarea
                      value={bldgDesc}
                      onChange={(e) => setBldgDesc(e.target.value)}
                      rows={3}
                      placeholder="Summary of this hotel facility, special check-in procedures, or guest privileges..."
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {bldgDesc || "No overview provided for this hotel building facility."}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: 1 Span */}
              <div className="space-y-6">
                {/* Building Amenities */}
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Facility Amenities
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">{bldgAmenities.length} active</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
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
                    ].map((amenity) => {
                      const isChecked = bldgAmenities.includes(amenity);
                      return isEditing ? (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleBuildingAmenity(amenity)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                          <span>{amenity}</span>
                        </button>
                      ) : isChecked ? (
                        <span key={amenity} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                          <Check className="w-3 h-3 text-blue-600" />
                          <span>{amenity}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                  {!isEditing && bldgAmenities.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] italic">No specific amenities configured.</p>
                  )}
                </div>

                {/* Building Quick Actions */}
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)]/30 space-y-3">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                    Campus Scope
                  </span>
                  <p className="text-xs text-[var(--text-secondary)]">
                    You are configuring <strong>{selectedBuilding.buildingName}</strong> under branch <strong>{activeBranch?.branchName || "Main Property"}</strong>.
                  </p>
                  {(isGlobal || !userBuildingId) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedBuildingId("all")}
                      className="w-full h-8 text-xs font-semibold"
                    >
                      Return to Main Campus View
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────────────────
              MAIN PROPERTY / ENTIRE BRANCH VIEW (STANDARD HOTEL CONFIG)
          ───────────────────────────────────────────────────────────────────────────── */
          <>
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
            onClick={() => setActiveTab("rates_promos")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "rates_promos"
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 font-bold"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Rates & Promotions</span>
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

              {/* Tax & Licensing */}
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
                        defaultValue={hotel?.taxNumber || "0012345678"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {hotel?.taxNumber || "0012345678"}
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">License Expiry Date</span>
                    {isEditing ? (
                      <input
                        type="date"
                        name="tradeLicenseExpiryDate"
                        defaultValue={hotel?.settings?.tradeLicenseExpiryDate || "2026-07-07"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.tradeLicenseExpiryDate || "2026-07-07"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">VAT Registration Number</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="vatRegistrationNumber"
                        defaultValue={hotel?.settings?.vatRegistrationNumber || "VAT-10-00892415"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.vatRegistrationNumber || "VAT-10-00892415"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">VAT Registration Date</span>
                    {isEditing ? (
                      <input
                        type="date"
                        name="vatRegistrationDate"
                        defaultValue={hotel?.settings?.vatRegistrationDate || "2020-01-11"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.vatRegistrationDate || "2020-01-11"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Tourism Classification License</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="ministryOfTourismLicense"
                        defaultValue={hotel?.settings?.ministryOfTourismLicense || "MoT-HTL-CAT5-0042"}
                        className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.ministryOfTourismLicense || "MoT-HTL-CAT5-0042"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Tourism Star Rating</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="ministryOfTourismRating"
                        defaultValue={hotel?.settings?.ministryOfTourismRating || "5 Star Luxury Hotel"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.ministryOfTourismRating || "5 Star Luxury Hotel"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Rates & Service Charge */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Tax Rates & Service Charge
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">VAT Standard Rate</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          name="vatRatePercent"
                          defaultValue={hotel?.settings?.vatRatePercent ?? 15}
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.vatRatePercent ?? 15}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Hotel Service Charge</span>
                    {isEditing ? (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            name="serviceChargePercent"
                            defaultValue={hotel?.settings?.serviceChargePercent ?? 10}
                            min={0}
                            max={30}
                            step={0.5}
                            className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                          />
                          <span className="text-sm font-medium text-[var(--text-secondary)]">%</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                          <input
                            type="checkbox"
                            name="serviceChargeEnabled"
                            defaultChecked={hotel?.settings?.serviceChargeEnabled !== false}
                            className="rounded border-[var(--border)] text-blue-700"
                          />
                          <span>Enabled</span>
                        </label>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.serviceChargePercent ?? 10}% ({hotel?.settings?.serviceChargeEnabled !== false ? "Enabled" : "Disabled"})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">VAT Calculation Basis</span>
                    {isEditing ? (
                      <select
                        name="vatCalculationBasis"
                        defaultValue={hotel?.settings?.vatCalculationBasis || "base_plus_service"}
                        className="flex-1 h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      >
                        <option value="base_plus_service">Base Room Rate + Service Charge</option>
                        <option value="base_only">Base Room Rate Only</option>
                      </select>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.vatCalculationBasis === "base_only"
                          ? "Base Room Rate Only"
                          : "Base Room Rate + Service Charge"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Withholding Tax (Services)</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          name="withholdingTaxServicePercent"
                          defaultValue={hotel?.settings?.withholdingTaxServicePercent ?? 3}
                          min={0}
                          max={20}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.withholdingTaxServicePercent ?? 3}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Withholding Tax (Goods)</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          name="withholdingTaxGoodsPercent"
                          defaultValue={hotel?.settings?.withholdingTaxGoodsPercent ?? 2}
                          min={0}
                          max={20}
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-sm font-medium text-[var(--text-secondary)]">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.withholdingTaxGoodsPercent ?? 2}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Diplomatic VAT Exemption</span>
                    {isEditing ? (
                      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                        <input
                          type="checkbox"
                          name="diplomaticVatExemptionEnabled"
                          defaultChecked={hotel?.settings?.diplomaticVatExemptionEnabled !== false}
                          className="rounded border-[var(--border)] text-blue-700"
                        />
                        <span>Enabled</span>
                      </label>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.diplomaticVatExemptionEnabled !== false ? "Enabled" : "Disabled"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fiscal Sales Register Machine */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Fiscal Cash Register
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Integration Status</span>
                    {isEditing ? (
                      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                        <input
                          type="checkbox"
                          name="fiscalCashRegisterEnabled"
                          checked={fiscalCashRegisterEnabled}
                          onChange={(e) => setFiscalCashRegisterEnabled(e.target.checked)}
                          className="rounded border-[var(--border)] text-blue-700"
                        />
                        <span>{fiscalCashRegisterEnabled ? "Enabled (Apply Machine Codes)" : "Disabled"}</span>
                      </label>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {fiscalCashRegisterEnabled ? "Enabled" : "Disabled"}
                      </span>
                    )}
                  </div>

                  {fiscalCashRegisterEnabled && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                        <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Machine Code (MRC)</span>
                        {isEditing ? (
                          <input
                            type="text"
                            name="fiscalMachineCode"
                            defaultValue={hotel?.settings?.fiscalMachineCode || "MRC-AA-789230"}
                            className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                          />
                        ) : (
                          <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                            {hotel?.settings?.fiscalMachineCode || "MRC-AA-789230"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                        <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Hardware Serial (MSN)</span>
                        {isEditing ? (
                          <input
                            type="text"
                            name="fiscalMachineSerial"
                            defaultValue={hotel?.settings?.fiscalMachineSerial || "FBR-2024-00918"}
                            className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                          />
                        ) : (
                          <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                            {hotel?.settings?.fiscalMachineSerial || "FBR-2024-00918"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                        <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Terminal ID (TID)</span>
                        {isEditing ? (
                          <input
                            type="text"
                            name="fiscalTerminalId"
                            defaultValue={hotel?.settings?.fiscalTerminalId || "TID-FD-01"}
                            className="flex-1 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                          />
                        ) : (
                          <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                            {hotel?.settings?.fiscalTerminalId || "TID-FD-01"}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Compliance Documents */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Compliance Documents
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Attached Licenses & Certificates</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDoc(null);
                        setDocFileUrl("");
                        setDocFileName("");
                        setDocFileSize("");
                        setIsDocModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </button>
                  </div>

                  {complianceDocuments.length === 0 ? (
                    <div className="py-3 text-sm text-[var(--text-secondary)]">No documents attached.</div>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {complianceDocuments.map((doc) => (
                        <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{doc.title}</span>
                            {doc.docNumber && (
                              <span className="ml-2 text-xs font-mono text-[var(--text-secondary)]">#{doc.docNumber}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
                              >
                                View
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDoc(doc);
                                setDocFileUrl(doc.fileUrl || "");
                                setDocFileName(doc.fileName || "");
                                setDocFileSize(doc.fileSize || "");
                                setIsDocModalOpen(true);
                              }}
                              className="p-1 rounded text-[var(--text-secondary)] hover:text-blue-700 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComplianceDoc(doc.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
              {/* Header with Add Policy & Expand/Collapse */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Hotel Policies, Terms & Legal Guidelines
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Manage guest cancellation terms, invoice footers, check-in disclaimers, and house rules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPolicy(null);
                      setIsPolicyModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Policy / Issue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      policiesList.forEach((p) => { next[p.id] = true; });
                      setExpandedPolicies(next);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, boolean> = {};
                      policiesList.forEach((p) => { next[p.id] = false; });
                      setExpandedPolicies(next);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Collapse All</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Policy Accordions */}
              {policiesList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-50" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">No policies configured</p>
                  <p className="text-xs text-[var(--text-secondary)]">Use the &quot;Add Policy / Issue&quot; button above to create a new hotel policy or house rule.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {policiesList.map((policy) => {
                    const isExpanded = expandedPolicies[policy.id] !== false;
                    const isPolicyWritable = isEditing || !!editablePolicyIds[policy.id];
                    return (
                      <div
                        key={policy.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden"
                      >
                        <div
                          onClick={() => {
                            setExpandedPolicies((prev) => ({
                              ...prev,
                              [policy.id]: !isExpanded,
                            }));
                          }}
                          className="flex items-center justify-between p-4 sm:p-5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none border-b border-[var(--border)]"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-blue-700/10 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {policy.initials || policy.title.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              {isPolicyWritable ? (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={policy.title}
                                    onChange={(e) => {
                                      const newTitle = e.target.value;
                                      setPoliciesList((prev) =>
                                        prev.map((p) =>
                                          p.id === policy.id
                                            ? {
                                                ...p,
                                                title: newTitle,
                                                initials: newTitle.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "PL",
                                              }
                                            : p
                                        )
                                      );
                                    }}
                                    className="text-sm font-bold text-[var(--text-primary)] px-2.5 py-1 rounded-lg border border-blue-500 bg-[var(--surface)] outline-none w-full max-w-sm"
                                    placeholder="Policy Title"
                                  />
                                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit">
                                    Writable Mode
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                                    {policy.title}
                                  </h4>
                                  {policy.category && (
                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                      {policy.category}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {policy.badge && (
                              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded bg-blue-700/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 hidden sm:inline-block">
                                {policy.badge}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPolicies((prev) => ({
                                  ...prev,
                                  [policy.id]: true,
                                }));
                                setEditablePolicyIds((prev) => ({
                                  ...prev,
                                  [policy.id]: !prev[policy.id],
                                }));
                                if (!isEditing) {
                                  setIsEditing(true);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isPolicyWritable
                                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                                  : "text-[var(--text-secondary)] hover:text-blue-700 hover:bg-[var(--surface)]"
                              }`}
                              title={isPolicyWritable ? "Writable Active (Click to finish)" : "Make Policy Writable & Edit"}
                            >
                              {isPolicyWritable ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePolicy(policy.id);
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                              title="Delete Policy"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="pl-1">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-5 sm:p-6 space-y-4">
                            <RichTextEditor
                              name={`policy_${policy.id}`}
                              value={policy.content}
                              onChange={(val) => {
                                setPoliciesList((prev) =>
                                  prev.map((p) => (p.id === policy.id ? { ...p, content: val } : p))
                                );
                              }}
                              isEditable={isPolicyWritable}
                              minHeight="200px"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "operations" && (
            <div className="space-y-8">
              {/* Arrival & Check-In Triggers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Arrival & Check-In Triggers
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-In</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="checkInTime"
                        defaultValue={hotel?.checkInTime || "14:00"}
                        placeholder="14:00"
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-bold font-mono text-[var(--text-primary)] px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-md border border-blue-500/20">
                        {hotel?.checkInTime || "14:00"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Early Check-In Allowed</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="earlyCheckInAllowedTime"
                        defaultValue={hotel?.settings?.earlyCheckInAllowedTime || "10:00"}
                        placeholder="10:00"
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.earlyCheckInAllowedTime || "10:00"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Departure & Late Check-Out Policies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Departure & Late Check-Out
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Standard Check-Out</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="checkOutTime"
                        defaultValue={hotel?.checkOutTime || "12:00"}
                        required
                        placeholder="12:00"
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-bold font-mono text-[var(--text-primary)] px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-md border border-blue-500/20">
                        {hotel?.checkOutTime || "12:00"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Check-Out Grace Period</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-36">
                        <input
                          type="number"
                          name="lateCheckoutGraceMinutes"
                          defaultValue={hotel?.lateCheckoutGraceMinutes ?? 30}
                          min="0"
                          max="180"
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">min</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.lateCheckoutGraceMinutes ?? 30} minutes
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Checkout Tier 1 Rate (1h – 3h late)</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-36">
                        <input
                          type="number"
                          name="lateCheckoutTier1Percent"
                          defaultValue={hotel?.lateCheckoutTier1Percent ?? 25}
                          min="0"
                          max="100"
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.lateCheckoutTier1Percent ?? 25}% of daily rate
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Checkout Tier 2 Rate (3h – 6h late)</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-36">
                        <input
                          type="number"
                          name="lateCheckoutTier2Percent"
                          defaultValue={hotel?.lateCheckoutTier2Percent ?? 50}
                          min="0"
                          max="100"
                          className="w-24 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">%</span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.lateCheckoutTier2Percent ?? 50}% of daily rate
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-48 shrink-0">Late Checkout Cut-Off Time</span>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lateCheckoutCutoffTime"
                        defaultValue={hotel?.lateCheckoutCutoffTime || "18:00"}
                        placeholder="18:00"
                        className="w-36 h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.lateCheckoutCutoffTime || "18:00"}
                      </span>
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

              {/* Branch Delegation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Branch Delegation
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-[var(--border)]">
                    <div>
                      <span className="text-sm font-semibold text-[var(--text-primary)] block">
                        Branch Catalog Management
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Allow assigned Branch Managers to create, configure, and maintain rooms and room types for their branch.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleBranchCatalog(!allowBranchCatalogManagement)}
                        disabled={toggleCatalogMutation.isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all cursor-pointer shadow-xs disabled:opacity-60 ${
                          allowBranchCatalogManagement
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                        title="Click to toggle branch catalog delegation"
                      >
                        <span className={`w-2 h-2 rounded-full ${allowBranchCatalogManagement ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        <span>{allowBranchCatalogManagement ? "Delegated to Branches" : "HQ Centralized"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBranchCatalog(!allowBranchCatalogManagement)}
                        disabled={toggleCatalogMutation.isPending}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 ${
                          allowBranchCatalogManagement ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={allowBranchCatalogManagement}
                        title="Toggle branch catalog delegation"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            allowBranchCatalogManagement ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
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

              {/* Currency Support & Daily Exchange Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 border-t border-[var(--border)]">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] uppercase">
                    Currency & Exchange Rates
                  </h3>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-64 shrink-0">Rate Governance Scope</span>
                    {isEditing ? (
                      <select
                        name="currencyRateScope"
                        value={currencyRateScope}
                        onChange={(e) => setCurrencyRateScope(e.target.value as any)}
                        className="h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 font-medium cursor-pointer"
                      >
                        <option value="global">System-Wide (Centralized)</option>
                        <option value="branch_bounded">Branch-Bounded (Branch Overrides Allowed)</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                        currencyRateScope === "global"
                          ? "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300"
                          : "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${currencyRateScope === "global" ? "bg-purple-500" : "bg-blue-500"}`} />
                        {currencyRateScope === "global" ? "System-Wide (Centralized)" : "Branch-Bounded Overrides"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border)]">
                    <span className="text-sm text-[var(--text-secondary)] sm:w-64 shrink-0">Base Accounting Currency</span>
                    <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                      {hotel?.currencyCode || "ETB"} &mdash; Ethiopian Birr
                    </span>
                  </div>

                  {/* Multi-Currency Rates Table */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Supported Multi-Currencies
                        </span>
                        {lastRatesSyncTime && (
                          <span className="text-[11px] text-[var(--text-secondary)] font-normal">
                            Synced at {lastRatesSyncTime}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFetchLiveRates}
                          disabled={isFetchingRates}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-60"
                          title="Fetch live market exchange rates against ETB"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${isFetchingRates ? "animate-spin" : ""}`} />
                          <span>{isFetchingRates ? "Syncing..." : "Sync Live Rates"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCurrency(null);
                            setIsCurrencyModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Currency</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                            <TableHead className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Currency</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Symbol</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Exchange Rate (to Base ETB)</TableHead>
                            <TableHead className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Status</TableHead>
                            <TableHead className="w-[80px] text-right text-xs font-semibold uppercase text-[var(--text-secondary)]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currenciesList.map((cur) => (
                            <TableRow key={cur.code} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]/40">
                              <TableCell className="font-medium text-[var(--text-primary)]">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                    {cur.code}
                                  </span>
                                  <span className="text-xs text-[var(--text-secondary)]">{cur.name}</span>
                                  {cur.isBaseCurrency && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">
                                      BASE
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-[var(--text-primary)]">
                                {cur.symbol}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-[var(--text-primary)]">
                                {cur.isBaseCurrency ? (
                                  <span className="text-emerald-600 font-semibold">1.0000 (Peg)</span>
                                ) : isEditing ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-[var(--text-muted)]">1 {cur.code} =</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={cur.exchangeRate}
                                      onChange={(e) => handleUpdateCurrencyRate(cur.code, parseFloat(e.target.value) || 0)}
                                      className="w-24 h-7 px-2 text-xs font-mono rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                                    />
                                    <span className="text-xs text-[var(--text-secondary)]">ETB</span>
                                  </div>
                                ) : (
                                  <span>1 {cur.code} = <strong>{cur.exchangeRate.toFixed(2)}</strong> ETB</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCurrency(cur.code)}
                                  disabled={cur.isBaseCurrency}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                                    cur.isEnabled
                                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
                                      : "bg-gray-500/10 text-gray-500 border border-gray-500/20 hover:bg-gray-500/20"
                                  } ${cur.isBaseCurrency ? "cursor-default opacity-80" : "cursor-pointer"}`}
                                  title={cur.isBaseCurrency ? "Base currency is always active" : "Toggle active state"}
                                >
                                  {cur.isEnabled ? "Active" : "Disabled"}
                                </button>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCurrency(cur);
                                      setIsCurrencyModalOpen(true);
                                    }}
                                    className="p-1 rounded text-[var(--text-secondary)] hover:text-blue-700 hover:bg-[var(--surface-hover)] cursor-pointer"
                                    title="Edit Rate"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {!cur.isBaseCurrency && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCurrency(cur.code)}
                                      className="p-1 rounded text-red-500 hover:bg-red-500/10 cursor-pointer"
                                      title="Remove Currency"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
          {/* ================================================================= */}
          {/* TAB: RATES, DISCOUNTS & PROMOTIONAL PACKAGES                      */}
          {/* ================================================================= */}
          {activeTab === "rates_promos" && (
            <div className="space-y-8">
              {/* Luxury Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                    Rates & Promotions
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
                    <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <select
                      value={promoScopeFilter}
                      onChange={(e) => setPromoScopeFilter(e.target.value)}
                      className="bg-transparent text-[var(--text-primary)] font-semibold outline-none cursor-pointer text-xs"
                    >
                      <option value="all">All Properties</option>
                      <option value="global">System-Wide</option>
                      <option value="branch">Branch Specific</option>
                      {branches && branches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.branchName}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPromo(null);
                      setPromoInclusions(["Daily Gourmet Buffet Breakfast", "Airport Shuttle Transfer"]);
                      setInclusionInput("");
                      setIsPromoModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Package</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingDiscount(null);
                      setIsDiscountModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors cursor-pointer shadow-xs"
                  >
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>New Discount Code</span>
                  </button>
                </div>
              </div>

              {/* SECTION 1: PROMOTIONAL PACKAGES */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500" />
                    <span>Promotional Packages</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {promoPackagesList
                    .filter((p) => {
                      if (promoScopeFilter === "all") return true;
                      if (promoScopeFilter === "global") return p.scope === "global";
                      if (promoScopeFilter === "branch") return p.scope === "branch";
                      return p.branchId === promoScopeFilter;
                    })
                    .map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 bg-[var(--surface)] ${
                          pkg.isEnabled
                            ? "border-[var(--border)] shadow-xs hover:border-blue-500/40"
                            : "border-[var(--border)] opacity-60 bg-gray-50/50 dark:bg-gray-900/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-[var(--text-primary)]">
                                  {pkg.name}
                                </h4>
                                {pkg.featured && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    Featured
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                                #{pkg.code}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                                pkg.scope === "global"
                                  ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                              }`}
                            >
                              {pkg.scope === "global" ? "System-Wide" : (pkg.branchName || "Branch Specific")}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                            {pkg.description}
                          </p>

                          <div className="flex items-center justify-between py-2 border-y border-[var(--border)] mb-3 text-xs">
                            <div>
                              <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Tariff</span>
                              <strong className="text-sm font-bold text-[var(--text-primary)]">
                                {pkg.pricingType === "fixed_package"
                                  ? `${(pkg.packagePrice || 0).toLocaleString()} ETB`
                                  : `${pkg.discountPercent || 0}% Off Base Rate`}
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Min Stay</span>
                              <span className="font-semibold text-[var(--text-primary)]">
                                {pkg.minNights} {pkg.minNights === 1 ? "Night" : "Nights"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {pkg.inclusions.map((inc, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] font-medium"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>{inc}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                            {pkg.startDate} &ndash; {pkg.endDate}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePromo(pkg.id)}
                              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                                pkg.isEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                              }`}
                              title={pkg.isEnabled ? "Active" : "Disabled"}
                            >
                              <span
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                                  pkg.isEnabled ? "right-0.5" : "left-0.5"
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPromo(pkg);
                                setPromoInclusions(pkg.inclusions || []);
                                setInclusionInput("");
                                setIsPromoModalOpen(true);
                              }}
                              className="p-1 text-[var(--text-secondary)] hover:text-blue-700 cursor-pointer"
                              title="Edit Package"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(pkg.id)}
                              className="p-1 text-[var(--text-secondary)] hover:text-red-600 cursor-pointer"
                              title="Delete Package"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* SECTION 2: DISCOUNT RULES & COUPONS */}
              <div className="space-y-3.5 pt-6 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    <span>Discount Rules & Coupons</span>
                  </h3>
                </div>

                <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] shadow-xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                        <TableHead className="font-bold text-xs uppercase">Coupon Code</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Name</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Benefit</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Scope</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Applicable Category</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Validity Window</TableHead>
                        <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                        <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discountsList
                        .filter((d) => {
                          if (promoScopeFilter === "all") return true;
                          if (promoScopeFilter === "global") return d.scope === "global";
                          if (promoScopeFilter === "branch") return d.scope === "branch";
                          return d.branchId === promoScopeFilter;
                        })
                        .map((disc) => (
                          <TableRow key={disc.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]/40">
                            <TableCell className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                              <span className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded">
                                {disc.code}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-[var(--text-primary)]">
                              {disc.name}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-emerald-600">
                              {disc.discountType === "percentage" ? `${disc.value}% OFF` : `-${disc.value} ETB`}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                  disc.scope === "global"
                                    ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                                    : "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                }`}
                              >
                                {disc.scope === "global" ? "System-Wide" : (disc.branchName || "Branch Specific")}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-[var(--text-secondary)] capitalize">
                              {disc.applicableTo === "all" ? "All Folio Items" : disc.applicableTo === "rooms" ? "Room Tariffs Only" : "Restaurant / F&B"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-[var(--text-secondary)]">
                              {disc.startDate} to {disc.endDate}
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => handleToggleDiscount(disc.id)}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                                  disc.isEnabled
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                }`}
                              >
                                {disc.isEnabled ? "Active" : "Disabled"}
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDiscount(disc);
                                    setIsDiscountModalOpen(true);
                                  }}
                                  className="p-1 rounded text-[var(--text-secondary)] hover:text-blue-700 cursor-pointer"
                                  title="Edit Discount"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDiscount(disc.id)}
                                  className="p-1 rounded text-red-500 hover:bg-red-500/10 cursor-pointer"
                                  title="Remove Discount"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

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
                    <div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">Default Board Basis</span>
                      <p className="text-xs text-[var(--text-secondary)]">Standard guest meal plan applied to room bookings by default</p>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="defaultBoardBasis"
                        defaultValue={
                          hotel?.settings?.defaultBoardBasis === "ro"
                            ? "Room Only (RO)"
                            : hotel?.settings?.defaultBoardBasis === "bb"
                            ? "Bed & Breakfast (BB)"
                            : hotel?.settings?.defaultBoardBasis === "hb"
                            ? "Half Board (HB)"
                            : hotel?.settings?.defaultBoardBasis === "fb"
                            ? "Full Board (FB)"
                            : hotel?.settings?.defaultBoardBasis || "Bed & Breakfast (BB)"
                        }
                        placeholder="e.g. Bed & Breakfast (BB), Room Only (RO), Half Board (HB), Full Board (FB)"
                        className="flex-1 max-w-sm h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {hotel?.settings?.defaultBoardBasis === "ro"
                          ? "Room Only (RO)"
                          : hotel?.settings?.defaultBoardBasis === "bb"
                          ? "Bed & Breakfast (BB)"
                          : hotel?.settings?.defaultBoardBasis === "hb"
                          ? "Half Board (HB)"
                          : hotel?.settings?.defaultBoardBasis === "fb"
                          ? "Full Board (FB)"
                          : hotel?.settings?.defaultBoardBasis || "Bed & Breakfast (BB)"}
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
          </>
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
      {/* =================================================================== */}
      {/* MODAL 5: COMPLIANCE DOCUMENT UPLOAD & VERIFICATION MODAL           */}
      {/* =================================================================== */}
      <Dialog
        open={isDocModalOpen}
        onOpenChange={(open) => {
          setIsDocModalOpen(open);
          if (!open) {
            setEditingDoc(null);
            setDocFileUrl("");
            setDocFileName("");
            setDocFileSize("");
          }
        }}
      >
        <DialogContent className="max-w-lg border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <span>{editingDoc ? "Edit Compliance Document" : "Upload Compliance Certificate / License"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveComplianceDoc} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Document Title *
              </label>
              <input
                type="text"
                name="title"
                defaultValue={editingDoc?.title || ""}
                placeholder="e.g. Ministry of Revenues TIN Certificate, Commercial Trade License"
                required
                className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Document Category
                </label>
                <select
                  name="category"
                  defaultValue={editingDoc?.category || "trade_license"}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                >
                  <option value="tax_tin">TIN Certificate</option>
                  <option value="vat_cert">VAT Certificate</option>
                  <option value="trade_license">Trade License</option>
                  <option value="tourism_rating">Tourism Star Rating Certificate</option>
                  <option value="health_fire_safety">Fire Safety / Health Inspection</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  License / Document Number
                </label>
                <input
                  type="text"
                  name="docNumber"
                  defaultValue={editingDoc?.docNumber || ""}
                  placeholder="e.g. 0012345678, VAT-10-883"
                  className="w-full h-9 px-3 text-sm font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  name="issueDate"
                  defaultValue={editingDoc?.issueDate || ""}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Expiry / Renewal Date
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  defaultValue={editingDoc?.expiryDate || ""}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            {/* File Upload Attachment Box */}
            <div className="p-3.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-hover)] space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Attach Official PDF / Image File
              </label>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDocFileName(file.name);
                  setDocFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                  const reader = new FileReader();
                  reader.onload = () => {
                    setDocFileUrl(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-800 file:cursor-pointer cursor-pointer"
              />
              {(docFileName || editingDoc?.fileName) && (
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>File Selected: {docFileName || editingDoc?.fileName} ({docFileSize || editingDoc?.fileSize || "Ready"})</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Or Document Web / Cloud Link (Optional)
              </label>
              <input
                type="url"
                name="fileUrl"
                defaultValue={editingDoc?.fileUrl || ""}
                placeholder="https://storage.provider.com/licenses/cert.pdf"
                className="w-full h-8 px-3 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Compliance Notes
              </label>
              <textarea
                name="notes"
                defaultValue={editingDoc?.notes || ""}
                rows={2}
                placeholder="e.g. Document notes or issuing office"
                className="w-full p-2.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDocModalOpen(false);
                  setEditingDoc(null);
                  setDocFileUrl("");
                  setDocFileName("");
                  setDocFileSize("");
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                {editingDoc ? "Save Changes" : "Attach Document"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 6: ADD / EDIT CUSTOM HOTEL POLICY (CRUD)                      */}
      
      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT CURRENCY & EXCHANGE RATE                          */}
      {/* =================================================================== */}
      <Dialog
        open={isCurrencyModalOpen}
        onOpenChange={(open) => {
          setIsCurrencyModalOpen(open);
          if (!open) setEditingCurrency(null);
        }}
      >
        <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingCurrency ? `Edit Rate for ${editingCurrency.code}` : "Add Supported Currency"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const code = ((fd.get("code") as string) || "").toUpperCase().trim();
              const name = (fd.get("name") as string) || "";
              const symbol = (fd.get("symbol") as string) || "";
              const exchangeRate = parseFloat(fd.get("exchangeRate") as string) || 1;
              const isEnabled = fd.get("isEnabled") === "on";

              if (!code || !name) {
                toast({ title: "Validation Error", description: "Currency code and name are required.", variant: "destructive" });
                return;
              }

              handleSaveCurrency({
                code,
                name,
                symbol: symbol || code,
                exchangeRate,
                isBaseCurrency: editingCurrency?.isBaseCurrency || false,
                isEnabled,
              });
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Currency Code (ISO) *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingCurrency?.code || ""}
                  placeholder="e.g. USD, EUR, AED, SAR"
                  required
                  maxLength={5}
                  disabled={editingCurrency?.isBaseCurrency}
                  className="w-full h-9 px-3 font-mono font-bold uppercase rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Currency Symbol *
                </label>
                <input
                  type="text"
                  name="symbol"
                  defaultValue={editingCurrency?.symbol || "$"}
                  placeholder="e.g. $, €, £, د.إ"
                  required
                  className="w-full h-9 px-3 font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                Currency Full Name *
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingCurrency?.name || ""}
                placeholder="e.g. United States Dollar, Euro"
                required
                className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                Exchange Rate (1 Unit = X ETB) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  name="exchangeRate"
                  defaultValue={editingCurrency ? editingCurrency.exchangeRate : 135.5}
                  disabled={editingCurrency?.isBaseCurrency}
                  required
                  className="flex-1 h-9 px-3 font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 disabled:opacity-50"
                />
                <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">ETB</span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">
                {editingCurrency?.isBaseCurrency ? "Base reporting currency is always pegged at 1.0000" : "Rate used for guest folio conversions and multi-currency billing."}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                name="isEnabled"
                id="curEnabled"
                defaultChecked={editingCurrency ? editingCurrency.isEnabled : true}
                disabled={editingCurrency?.isBaseCurrency}
                className="w-4 h-4 rounded text-blue-700"
              />
              <label htmlFor="curEnabled" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                Active for guest payments and billing conversions
              </label>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyModalOpen(false);
                  setEditingCurrency(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                {editingCurrency ? "Update Rate" : "Add Currency"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      <Dialog
        open={isPolicyModalOpen}
        onOpenChange={(open) => {
          setIsPolicyModalOpen(open);
          if (!open) setEditingPolicy(null);
        }}
      >
        <DialogContent className="max-w-xl border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <span>{editingPolicy ? "Edit Hotel Policy / Issue" : "Add Hotel Policy / Issue"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePolicy} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Policy Title *
              </label>
              <input
                type="text"
                name="title"
                defaultValue={editingPolicy?.title || ""}
                placeholder="e.g. Standard Cancellation & Refund Policy, Pet Accommodation"
                required
                className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  defaultValue={editingPolicy?.category || "Guest Policy & Guidelines"}
                  placeholder="e.g. Reservations, House Rules"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Badge / Tag Label
                </label>
                <input
                  type="text"
                  name="badge"
                  defaultValue={editingPolicy?.badge || "Active Policy"}
                  placeholder="e.g. Mandatory, Core Policy"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Policy Content / Operating Guidelines *
              </label>
              <textarea
                name="content"
                defaultValue={editingPolicy ? formatContentForInput(editingPolicy.content) : ""}
                rows={6}
                placeholder="Enter detailed guidelines, operating rules, disclaimers, or cancellation timelines..."
                required
                className="w-full p-3 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 leading-relaxed resize-y"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPolicyModalOpen(false);
                  setEditingPolicy(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                {editingPolicy ? "Save Policy Changes" : "Create Policy"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* =================================================================== */}
      {/* MODAL 8: ADD / EDIT PROMOTIONAL PACKAGE                             */}
      {/* =================================================================== */}
      <Dialog
        open={isPromoModalOpen}
        onOpenChange={(open) => {
          setIsPromoModalOpen(open);
          if (!open) setEditingPromo(null);
        }}
      >
        <DialogContent className="max-w-lg border border-[var(--border)] bg-[var(--surface)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingPromo ? "Edit Promotional Package" : "Create Promotional Package"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const scope = fd.get("scope") as "global" | "branch";
              const branchIdVal = fd.get("branchId") as string;
              const selectedBranch = branches?.find((b: any) => b.id === branchIdVal);
              const pricingType = fd.get("pricingType") as "fixed_package" | "discount_percent";
              const inclusions = promoInclusions.length > 0 ? promoInclusions : ["Daily Gourmet Buffet Breakfast"];

              const pkg: PromotionalPackage = {
                id: editingPromo?.id || `pkg-${Date.now()}`,
                code: ((fd.get("code") as string) || "").toUpperCase().trim(),
                name: (fd.get("name") as string) || "",
                description: (fd.get("description") as string) || "",
                scope,
                branchId: scope === "branch" ? branchIdVal : undefined,
                branchName: scope === "branch" ? (selectedBranch?.branchName || "Branch") : undefined,
                targetRoomTypeIds: ["all"],
                pricingType,
                packagePrice: pricingType === "fixed_package" ? parseFloat(fd.get("packagePrice") as string) || 0 : undefined,
                discountPercent: pricingType === "discount_percent" ? parseFloat(fd.get("discountPercent") as string) || 0 : undefined,
                inclusions: inclusions.length > 0 ? inclusions : ["Complimentary Breakfast"],
                minNights: parseInt(fd.get("minNights") as string) || 1,
                startDate: (fd.get("startDate") as string) || "2026-01-01",
                endDate: (fd.get("endDate") as string) || "2026-12-31",
                isEnabled: editingPromo ? editingPromo.isEnabled : true,
                featured: fd.get("featured") === "on",
              };
              handleSavePromo(pkg);
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Package Code *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingPromo?.code || ""}
                  placeholder="e.g. WKND-ESCAPE"
                  required
                  className="w-full h-9 px-3 font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingPromo?.name || ""}
                  placeholder="e.g. Weekend Retreat & Spa"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                Description / Highlights *
              </label>
              <textarea
                name="description"
                defaultValue={editingPromo?.description || ""}
                placeholder="Describe package benefits, experiences, and inclusions..."
                rows={2}
                required
                className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Scope
                </label>
                <select
                  name="scope"
                  defaultValue={editingPromo?.scope || "global"}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  <option value="global">System-Wide (All Branches)</option>
                  <option value="branch">Branch Specific</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Assigned Branch
                </label>
                <select
                  name="branchId"
                  defaultValue={editingPromo?.branchId || branches?.[0]?.id || ""}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  {branches && branches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Tariff Model
                </label>
                <select
                  name="pricingType"
                  defaultValue={editingPromo?.pricingType || "fixed_package"}
                  className="w-full h-9 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  <option value="fixed_package">Fixed Package (ETB)</option>
                  <option value="discount_percent">% Off Room Rate</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Price / Discount Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="packagePrice"
                  defaultValue={editingPromo?.packagePrice || 15000}
                  placeholder="e.g. 15000"
                  className="w-full h-9 px-3 font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Min Nights
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  name="minNights"
                  defaultValue={editingPromo?.minNights || 2}
                  className="w-full h-9 px-3 font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Package Inclusions
                </label>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {promoInclusions.length} inclusion(s) added
                </span>
              </div>

              {/* Removable Inclusion Chips Container */}
              <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] mb-2">
                {promoInclusions.map((inc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xs"
                  >
                    <span>{inc}</span>
                    <button
                      type="button"
                      onClick={() => setPromoInclusions(promoInclusions.filter((_, i) => i !== idx))}
                      className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer ml-0.5"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {promoInclusions.length === 0 && (
                  <span className="text-xs text-[var(--text-secondary)] self-center italic">
                    No inclusions added yet. Add items below.
                  </span>
                )}
              </div>

              {/* Free-field Add Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inclusionInput}
                  onChange={(e) => setInclusionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (inclusionInput.trim()) {
                        setPromoInclusions([...promoInclusions, inclusionInput.trim()]);
                        setInclusionInput("");
                      }
                    }
                  }}
                  placeholder="Type an inclusion and press Enter or Add..."
                  className="flex-1 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inclusionInput.trim()) {
                      setPromoInclusions([...promoInclusions, inclusionInput.trim()]);
                      setInclusionInput("");
                    }
                  }}
                  className="px-3.5 h-9 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  + Add
                </button>
              </div>

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-[var(--text-secondary)] font-medium">Quick Suggestions:</span>
                {[
                  "Daily Buffet Breakfast",
                  "Airport Shuttle Transfer",
                  "60-Min Swedish Spa Voucher",
                  "Late Check-Out until 14:00",
                  "Chef's 3-Course Dinner",
                  "Chilled Champagne & Fruits",
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!promoInclusions.includes(sug)) {
                        setPromoInclusions([...promoInclusions, sug]);
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] hover:border-blue-500/50 text-[var(--text-secondary)] hover:text-blue-700 cursor-pointer transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={editingPromo?.startDate || "2026-01-01"}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={editingPromo?.endDate || "2026-12-31"}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                name="featured"
                id="promoFeatured"
                defaultChecked={editingPromo?.featured}
                className="w-4 h-4 rounded text-blue-700"
              />
              <label htmlFor="promoFeatured" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                Highlight as Featured Package on Guest Portal Booking Engine
              </label>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPromoModalOpen(false);
                  setEditingPromo(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                {editingPromo ? "Save Package Changes" : "Create Package"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL 9: ADD / EDIT DISCOUNT RULE                                   */}
      {/* =================================================================== */}
      <Dialog
        open={isDiscountModalOpen}
        onOpenChange={(open) => {
          setIsDiscountModalOpen(open);
          if (!open) setEditingDiscount(null);
        }}
      >
        <DialogContent className="max-w-md border border-[var(--border)] bg-[var(--surface)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
              {editingDiscount ? "Edit Discount Rule" : "Create Discount Rule / Coupon"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const scope = fd.get("scope") as "global" | "branch";
              const branchIdVal = fd.get("branchId") as string;
              const selectedBranch = branches?.find((b: any) => b.id === branchIdVal);

              const disc: DiscountRule = {
                id: editingDiscount?.id || `disc-${Date.now()}`,
                code: ((fd.get("code") as string) || "").toUpperCase().trim(),
                name: (fd.get("name") as string) || "",
                discountType: (fd.get("discountType") as "percentage" | "fixed_amount") || "percentage",
                value: parseFloat(fd.get("value") as string) || 0,
                scope,
                branchId: scope === "branch" ? branchIdVal : undefined,
                branchName: scope === "branch" ? (selectedBranch?.branchName || "Branch") : undefined,
                applicableTo: (fd.get("applicableTo") as "rooms" | "restaurant" | "all") || "rooms",
                startDate: (fd.get("startDate") as string) || "2026-01-01",
                endDate: (fd.get("endDate") as string) || "2026-12-31",
                minNightsRequired: parseInt(fd.get("minNightsRequired") as string) || 1,
                isEnabled: editingDiscount ? editingDiscount.isEnabled : true,
              };
              handleSaveDiscount(disc);
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  name="code"
                  defaultValue={editingDiscount?.code || ""}
                  placeholder="e.g. SUMMER15"
                  required
                  className="w-full h-9 px-3 font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Discount Name *
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingDiscount?.name || ""}
                  placeholder="e.g. Summer Special 15%"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Discount Type
                </label>
                <select
                  name="discountType"
                  defaultValue={editingDiscount?.discountType || "percentage"}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (ETB)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Value (% or ETB) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="value"
                  defaultValue={editingDiscount?.value || 15}
                  required
                  className="w-full h-9 px-3 font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Scope
                </label>
                <select
                  name="scope"
                  defaultValue={editingDiscount?.scope || "global"}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  <option value="global">System-Wide</option>
                  <option value="branch">Branch Specific</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Assigned Branch
                </label>
                <select
                  name="branchId"
                  defaultValue={editingDiscount?.branchId || branches?.[0]?.id || ""}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  {branches && branches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.branchName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Applicable Category
                </label>
                <select
                  name="applicableTo"
                  defaultValue={editingDiscount?.applicableTo || "rooms"}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  <option value="rooms">Room Tariffs Only</option>
                  <option value="restaurant">Restaurant & F&B Only</option>
                  <option value="all">Entire Guest Folio</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Min Nights Required
                </label>
                <input
                  type="number"
                  min={1}
                  name="minNightsRequired"
                  defaultValue={editingDiscount?.minNightsRequired || 1}
                  className="w-full h-9 px-3 font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={editingDiscount?.startDate || "2026-01-01"}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={editingDiscount?.endDate || "2026-12-31"}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDiscountModalOpen(false);
                  setEditingDiscount(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                {editingDiscount ? "Save Discount Changes" : "Create Discount Rule"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

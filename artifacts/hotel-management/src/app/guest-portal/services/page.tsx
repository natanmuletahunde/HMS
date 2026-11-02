"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Utensils,
  BedDouble,
  Car,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Send,
  ArrowLeft,
  ArrowRight,
  Search,
  Bell,
  RefreshCw,
  ShieldCheck,
  User,
  DoorClosed,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  Check,
  Lock,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ROOM_SERVICE_CATEGORIES, 
  FULL_ROOM_SERVICE_MENU, 
  getInHouseRequests, 
  saveInHouseRequest, 
  InHouseServiceRequest 
} from "@/lib/in-house-requests";

// Fallback catalog in case backend endpoint is slow or offline
const DEFAULT_CATALOG = {
  dining: FULL_ROOM_SERVICE_MENU.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.categoryId,
    categoryName: item.categoryName,
    price: item.price,
    desc: item.desc,
    prepTime: item.prepTime,
    badge: item.badge,
    station: item.station,
  })),
  amenities: [
    {
      id: "am-1",
      name: "Extra Feather Pillows (x2)",
      category: "housekeeping",
      price: 0.0,
      desc: "Hypoallergenic ultra-soft down feather pillows delivered in protective sanitised linen casing.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "am-2",
      name: "Extra Warm Wool Blanket",
      category: "housekeeping",
      price: 0.0,
      desc: "Freshly laundered, high-insulation warm fleece blanket for cooler evenings.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "am-3",
      name: "Fresh Bath Towels & Robe Set",
      category: "housekeeping",
      price: 0.0,
      desc: "Plush 100% Egyptian cotton bath sheet, hand towel, and luxury waffle bathrobe with slippers.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "am-4",
      name: "Baby Cot / Crib Setup",
      category: "housekeeping",
      price: 0.0,
      desc: "European safety-certified wooden baby crib with breathable mattress, fitted sheet, and blanket.",
      prepTime: "20-30 mins",
      badge: "Complimentary",
    },
    {
      id: "am-5",
      name: "Evening Turndown Service",
      category: "housekeeping",
      price: 0.0,
      desc: "Bed freshened, mood lighting adjusted, fresh bedside water, and curtains drawn.",
      prepTime: "Scheduled",
      badge: "Complimentary",
    },
    {
      id: "am-6",
      name: "Luxury Dental & Shaving Kit",
      category: "housekeeping",
      price: 0.0,
      desc: "Eco bamboo toothbrush, mint toothpaste, ergonomic razor, and organic shaving balm.",
      prepTime: "10 mins",
      badge: "Complimentary",
    },
  ],
  transport: [
    {
      id: "tr-1",
      name: "Airport Chauffeur Transfer (Drop-off)",
      category: "transport",
      price: 3000,
      desc: "Private executive sedan transfer to Addis Ababa Bole International Airport (Terminal 1/2).",
      prepTime: "Scheduled",
      vehicleType: "Executive Sedan",
      duration: "35 mins",
      badge: "Direct Airport Service",
    },
    {
      id: "tr-2",
      name: "Airport Arrival VIP Meet & Pickup",
      category: "transport",
      price: 3750,
      desc: "Personalized name-board greeting in the arrival terminal with full luggage handling to your hotel suite.",
      prepTime: "Scheduled",
      vehicleType: "Executive Sedan / SUV",
      duration: "40 mins",
      badge: "VIP Welcome",
    },
    {
      id: "tr-3",
      name: "Half-Day City Tour Chauffeur (4 Hours)",
      category: "transport",
      price: 6800,
      desc: "Private dedicated vehicle and driver for Entoto Park, National Museum, and city highlights.",
      prepTime: "On Request",
      vehicleType: "Luxury SUV",
      duration: "4 Hours",
    },
    {
      id: "tr-4",
      name: "Full-Day Business Chauffeur (8 Hours)",
      category: "transport",
      price: 11200,
      desc: "On-demand executive standby vehicle for corporate meetings, diplomatic missions, and embassy visits.",
      prepTime: "On Request",
      vehicleType: "Executive Sedan / Van",
      duration: "8 Hours",
    },
    {
      id: "tr-5",
      name: "Complimentary Downtown / UNECA Shuttle",
      category: "transport",
      price: 0.0,
      desc: "Scheduled hourly luxury shuttle bus servicing Africa Hall, UNECA headquarters, and Meskel Square.",
      prepTime: "Hourly Scheduled",
      vehicleType: "Luxury Van",
      duration: "Hourly",
      badge: "Complimentary",
    },
  ],
  services: [
    {
      id: "sv-1",
      name: "Express Laundry & Pressing",
      category: "laundry",
      price: 1500,
      desc: "Rapid same-day wash, steam press, and hanger delivery for up to 3 business or casual garments.",
      prepTime: "3-4 Hours",
    },
    {
      id: "sv-2",
      name: "AC & Climate Adjustment Assistance",
      category: "maintenance",
      price: 0.0,
      desc: "In-room engineering technician visit to inspect heating, ventilation, or air conditioning presets.",
      prepTime: "15 mins",
      badge: "Complimentary",
    },
    {
      id: "sv-3",
      name: "High-Speed Wi-Fi Tech Support",
      category: "maintenance",
      price: 0.0,
      desc: "Dedicated in-room IT assistance for secure VPN setups, video conference optimization, and device pairing.",
      prepTime: "10-15 mins",
      badge: "Complimentary",
    },
    {
      id: "sv-4",
      name: "Morning Wake-up Call",
      category: "wake_up",
      price: 0.0,
      desc: "Bespoke front desk wake-up phone call at your exact designated morning time.",
      prepTime: "Scheduled",
      badge: "Complimentary",
    },
  ],
  stay: [
    {
      id: "st-1",
      name: "Stay Extension Request",
      category: "stay",
      price: 2500,
      desc: "Request additional nights or extended stay checkout dates at current room rates.",
      prepTime: "Front Desk Review",
      badge: "Room Rate",
    },
    {
      id: "st-2",
      name: "Late Check-Out Request (Until 2:00 PM)",
      category: "stay",
      price: 800,
      desc: "Request extended late room access before afternoon departure. Tier 1 late departure fee applies.",
      prepTime: "Subject to Availability",
      badge: "Late Departure",
    },
    {
      id: "st-3",
      name: "Guaranteed Late Check-Out (Until 4:00 PM)",
      category: "stay",
      price: 1500,
      desc: "Guaranteed extended late room access for evening flight or relaxed departure. Tier 2 fee applies.",
      prepTime: "Front Desk Confirmation",
      badge: "Popular",
    },
    {
      id: "st-4",
      name: "Room Move / Suite Upgrade Request",
      category: "stay",
      price: 1800,
      desc: "Inquire about moving to a quieter wing, higher floor, or executive suite upgrades. Rate difference charged to folio.",
      prepTime: "Front Desk Review",
      badge: "Suite Upgrade",
    },
    {
      id: "st-5",
      name: "Luggage Pickup & Bellhop at Departure",
      category: "stay",
      price: 250,
      desc: "Porter luggage collection directly from your suite at requested checkout time.",
      prepTime: "15 mins",
      badge: "Porter Service",
    },
  ],
};

const COMPLIMENTARY_GROUPS = [
  "All",
  "Ethiopian Traditional",
  "Meat Dishes",
  "Fish & Seafood",
  "International Cuisine",
  "Breakfast",
  "Snacks & Desserts",
  "Hot Drinks",
  "Fresh Juices",
  "Cold Drinks",
];

const COMPLIMENTARY_FOOD_ITEMS = [
  // Ethiopian Traditional
  { id: "comp-et-1", name: "Doro Wot (ዶሮ ወጥ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Simmered tender chicken drumstick & boiled organic egg in rich berbere sauce with fresh injera.", prepTime: "25-35 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-2", name: "Siga Wot (ስጋ ወጥ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Slow-braised prime beef cubes in spiced red pepper sauce with warm fermented injera.", prepTime: "25-30 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-3", name: "Tibs (ጥብስ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Sautéed beef tenderloin with rosemary, onions, garlic, and fresh green peppers.", prepTime: "15-20 mins", station: "grill", isComplimentary: true },
  { id: "comp-et-4", name: "Kitfo (ክትፎ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Finely minced lean beef seasoned with niter kibbeh & mitmita, served with ayeb cottage cheese.", prepTime: "15-20 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-5", name: "Shiro (ሽሮ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Velvety spiced ground chickpea stew slow-cooked in traditional clay pot.", prepTime: "15 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-6", name: "Beyaynetu (በያይነቱ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Grand colorful assortment of fresh fasting vegetarian stews served with injera.", prepTime: "20 mins", station: "cold", isComplimentary: true },
  { id: "comp-et-7", name: "Firfir (ፍርፍር)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Torn soft injera sautéed in aromatic spiced berbere broth and seasoned butter.", prepTime: "15 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-8", name: "Chechebsa (ጨጨብሳ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Warm torn flatbread fried in niter kibbeh & berbere, drizzled with highland honey.", prepTime: "15 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-9", name: "Kinche (ቅንጬ)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Warm cracked wheat porridge gently tossed with spiced Ethiopian butter.", prepTime: "15 mins", station: "hot", isComplimentary: true },
  { id: "comp-et-10", name: "Ful (ፉል)", category: "traditional", categoryGroup: "Ethiopian Traditional", price: 0, desc: "Simmered fava beans with olive oil, cumin, chopped tomatoes, onion, and fresh bread.", prepTime: "15 mins", station: "hot", isComplimentary: true },

  // Meat Dishes
  { id: "comp-md-1", name: "Beef Steak", category: "meat", categoryGroup: "Meat Dishes", price: 0, desc: "Tender grilled sirloin steak with herb jus, roasted vegetables, and potato.", prepTime: "25 mins", station: "grill", isComplimentary: true },
  { id: "comp-md-2", name: "Grilled Beef", category: "meat", categoryGroup: "Meat Dishes", price: 0, desc: "Flame-charred marinated beef cuts seasoned with garlic and rosemary.", prepTime: "20 mins", station: "grill", isComplimentary: true },
  { id: "comp-md-3", name: "Lamb Chops", category: "meat", categoryGroup: "Meat Dishes", price: 0, desc: "Succulent grilled lamb chops with fresh rosemary and mint glaze.", prepTime: "25 mins", station: "grill", isComplimentary: true },
  { id: "comp-md-4", name: "Grilled Chicken", category: "meat", categoryGroup: "Meat Dishes", price: 0, desc: "Herb-marinated tender chicken breast grilled over flame with garden vegetables.", prepTime: "20 mins", station: "grill", isComplimentary: true },
  { id: "comp-md-5", name: "Beef Tibs", category: "meat", categoryGroup: "Meat Dishes", price: 0, desc: "Pan-roasted prime beef tenderloin sizzled with onions and green chilies.", prepTime: "20 mins", station: "grill", isComplimentary: true },

  // Fish & Seafood
  { id: "comp-fs-1", name: "Grilled Fish", category: "fish", categoryGroup: "Fish & Seafood", price: 0, desc: "Flame-grilled fresh fish fillet with lemon garlic herb butter.", prepTime: "20 mins", station: "grill", isComplimentary: true },
  { id: "comp-fs-2", name: "Fried Fish", category: "fish", categoryGroup: "Fish & Seafood", price: 0, desc: "Crispy golden spiced fish fillet served with house tartar and fresh lemon.", prepTime: "15 mins", station: "grill", isComplimentary: true },
  { id: "comp-fs-3", name: "Fish Fillet", category: "fish", categoryGroup: "Fish & Seafood", price: 0, desc: "Delicate pan-seared fish fillet with white wine herb reduction and steamed rice.", prepTime: "20 mins", station: "grill", isComplimentary: true },
  { id: "comp-fs-4", name: "Seafood Platters", category: "fish", categoryGroup: "Fish & Seafood", price: 0, desc: "Chef's luxury assortment of grilled fish, prawns, and calamari with garlic dip.", prepTime: "25 mins", station: "grill", isComplimentary: true },

  // International Cuisine
  { id: "comp-int-1", name: "Pasta", category: "international", categoryGroup: "International Cuisine", price: 0, desc: "Penne or fettuccine tossed with rich tomato basil marinara or garlic butter.", prepTime: "15 mins", station: "hot", isComplimentary: true },
  { id: "comp-int-2", name: "Spaghetti", category: "international", categoryGroup: "International Cuisine", price: 0, desc: "Classic al dente spaghetti with traditional minced beef bolognese or tomato sauce.", prepTime: "20 mins", station: "hot", isComplimentary: true },
  { id: "comp-int-3", name: "Pizza", category: "international", categoryGroup: "International Cuisine", price: 0, desc: "Fresh oven-baked pizza with mozzarella, tomato passata, and aromatic herbs.", prepTime: "20 mins", station: "hot", isComplimentary: true },
  { id: "comp-int-4", name: "Burgers", category: "international", categoryGroup: "International Cuisine", price: 0, desc: "Grilled beef or chicken patty with cheddar, crisp lettuce, tomato, and golden fries.", prepTime: "20 mins", station: "grill", isComplimentary: true },
  { id: "comp-int-5", name: "Sandwiches", category: "international", categoryGroup: "International Cuisine", price: 0, desc: "Toasted club or grilled chicken sandwich with crisps and dip.", prepTime: "15 mins", station: "cold", isComplimentary: true },
  { id: "comp-int-6", name: "Fried Rice", category: "international", categoryGroup: "International Cuisine", price: 0, desc: "Wok-fried jasmine rice with farm eggs, garden vegetables, and mild soy.", prepTime: "15 mins", station: "hot", isComplimentary: true },

  // Breakfast
  { id: "comp-bf-1", name: "Eggs", category: "breakfast", categoryGroup: "Breakfast", price: 0, desc: "Farm fresh eggs prepared to your choice: scrambled, sunny-side, or poached.", prepTime: "10 mins", station: "hot", isComplimentary: true },
  { id: "comp-bf-2", name: "Pancakes", category: "breakfast", categoryGroup: "Breakfast", price: 0, desc: "Stack of fluffy golden pancakes served with pure highland honey or syrup.", prepTime: "15 mins", station: "pastry", isComplimentary: true },
  { id: "comp-bf-3", name: "Fresh Bread", category: "breakfast", categoryGroup: "Breakfast", price: 0, desc: "Warm bakery artisan bread served with natural forest honey and sweet butter.", prepTime: "5 mins", station: "cold", isComplimentary: true },
  { id: "comp-bf-4", name: "Omelets", category: "breakfast", categoryGroup: "Breakfast", price: 0, desc: "Fluffy three-egg omelet filled with cheese, mushrooms, tomatoes, and herbs.", prepTime: "12 mins", station: "hot", isComplimentary: true },
  { id: "comp-bf-5", name: "Fresh Fruit Platters", category: "breakfast", categoryGroup: "Breakfast", price: 0, desc: "Sliced seasonal tropical papaya, sweet pineapple, mango, and watermelon.", prepTime: "10 mins", station: "cold", isComplimentary: true },

  // Snacks & Desserts
  { id: "comp-sd-1", name: "Sambusa", category: "snacks", categoryGroup: "Snacks & Desserts", price: 0, desc: "Crispy triangular pastries filled with seasoned lentils or minced beef.", prepTime: "12 mins", station: "hot", isComplimentary: true },
  { id: "comp-sd-2", name: "Kolo", category: "snacks", categoryGroup: "Snacks & Desserts", price: 0, desc: "Traditional roasted Ethiopian barley and sunflower seeds.", prepTime: "5 mins", station: "cold", isComplimentary: true },
  { id: "comp-sd-3", name: "Dabo Kolo", category: "snacks", categoryGroup: "Snacks & Desserts", price: 0, desc: "Crispy sweet-spiced baked Ethiopian finger bread snacks.", prepTime: "5 mins", station: "pastry", isComplimentary: true },
  { id: "comp-sd-4", name: "Cakes", category: "desserts", categoryGroup: "Snacks & Desserts", price: 0, desc: "Decadent slice of dark chocolate or sponge cake with cream.", prepTime: "10 mins", station: "pastry", isComplimentary: true },
  { id: "comp-sd-5", name: "Cheesecake", category: "desserts", categoryGroup: "Snacks & Desserts", price: 0, desc: "Silky baked New York style cheesecake with fruit reduction.", prepTime: "10 mins", station: "pastry", isComplimentary: true },
  { id: "comp-sd-6", name: "Ice Cream", category: "desserts", categoryGroup: "Snacks & Desserts", price: 0, desc: "Three scoops of artisan gelato: Vanilla, Dark Chocolate, or Strawberry.", prepTime: "5 mins", station: "pastry", isComplimentary: true },

  // Hot Drinks
  { id: "comp-hd-1", name: "Ethiopian Coffee", category: "hot_drinks", categoryGroup: "Hot Drinks", price: 0, desc: "Freshly roasted single-origin Ethiopian coffee brewed in clay jebena.", prepTime: "10 mins", station: "hot", isComplimentary: true },
  { id: "comp-hd-2", name: "Espresso", category: "hot_drinks", categoryGroup: "Hot Drinks", price: 0, desc: "Rich single or double shot of pure aromatic espresso.", prepTime: "5 mins", station: "hot", isComplimentary: true },
  { id: "comp-hd-3", name: "Cappuccino", category: "hot_drinks", categoryGroup: "Hot Drinks", price: 0, desc: "Espresso topped with steamed milk and velvety foam dusted with cocoa.", prepTime: "5 mins", station: "hot", isComplimentary: true },
  { id: "comp-hd-4", name: "Macchiato", category: "hot_drinks", categoryGroup: "Hot Drinks", price: 0, desc: "Rich double espresso layered with micro-foamed hot milk.", prepTime: "5 mins", station: "hot", isComplimentary: true },
  { id: "comp-hd-5", name: "Tea", category: "hot_drinks", categoryGroup: "Hot Drinks", price: 0, desc: "Aromatic infused black tea or spiced ginger-cinnamon tea with lemon.", prepTime: "5 mins", station: "hot", isComplimentary: true },

  // Fresh Juices
  { id: "comp-fj-1", name: "Mango Juice", category: "juices", categoryGroup: "Fresh Juices", price: 0, desc: "Chilled pure freshly blended sweet ripe mango.", prepTime: "10 mins", station: "cold", isComplimentary: true },
  { id: "comp-fj-2", name: "Avocado Juice", category: "juices", categoryGroup: "Fresh Juices", price: 0, desc: "Thick creamy Hass avocado juice served with fresh lime wedge.", prepTime: "10 mins", station: "cold", isComplimentary: true },
  { id: "comp-fj-3", name: "Orange Juice", category: "juices", categoryGroup: "Fresh Juices", price: 0, desc: "Freshly squeezed sweet Valencia oranges.", prepTime: "10 mins", station: "cold", isComplimentary: true },
  { id: "comp-fj-4", name: "Papaya Juice", category: "juices", categoryGroup: "Fresh Juices", price: 0, desc: "Smooth chilled fresh tropical papaya juice.", prepTime: "10 mins", station: "cold", isComplimentary: true },
  { id: "comp-fj-5", name: "Pineapple Juice", category: "juices", categoryGroup: "Fresh Juices", price: 0, desc: "Cold-pressed tangy sweet fresh pineapple juice.", prepTime: "10 mins", station: "cold", isComplimentary: true },
  { id: "comp-fj-6", name: "Mixed Fruit Juice", category: "juices", categoryGroup: "Fresh Juices", price: 0, desc: "Layered blend of fresh mango, avocado, and papaya juice.", prepTime: "10 mins", station: "cold", isComplimentary: true },

  // Cold Drinks
  { id: "comp-cd-1", name: "Bottled Water", category: "cold_drinks", categoryGroup: "Cold Drinks", price: 0, desc: "Premium chilled still natural mineral spring water.", prepTime: "5 mins", station: "cold", isComplimentary: true },
  { id: "comp-cd-2", name: "Fresh Lemonade", category: "cold_drinks", categoryGroup: "Cold Drinks", price: 0, desc: "Fresh-squeezed lemonade with mint leaves and crushed ice.", prepTime: "5 mins", station: "cold", isComplimentary: true },
  { id: "comp-cd-3", name: "Seasonal Fruit Drinks", category: "cold_drinks", categoryGroup: "Cold Drinks", price: 0, desc: "Lightly sweetened fresh seasonal fruit cooler over ice.", prepTime: "5 mins", station: "cold", isComplimentary: true },
];

interface TrayItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  desc?: string;
  preferences?: string;
}

const AVAILABLE_WAITERS = [
  { id: "waiter-1", name: "Dawit Tadesse", role: "Floor Captain", status: "Available" },
  { id: "waiter-2", name: "Almaz Bekele", role: "Room Service", status: "Available" },
  { id: "waiter-3", name: "Kidus Yohannes", role: "Senior Server", status: "Available" },
];

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("waiter-1");

  // Pagination state (Limit 5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Guest & Room identification & Live Stay Status
  const [roomNumber, setRoomNumber] = useState(searchParams.get("room") || "");
  const [guestName, setGuestName] = useState(searchParams.get("name") || "");
  const [guestId, setGuestId] = useState("");
  const [reservationId, setReservationId] = useState("");
  const [isRecognizedGuest, setIsRecognizedGuest] = useState(false);
  const [stayStatus, setStayStatus] = useState<"checked_in" | "confirmed" | "checked_out" | "none">("none");
  const [isStayActive, setIsStayActive] = useState<boolean>(false);
  const [checkingStay, setCheckingStay] = useState<boolean>(true);
  const [reservationDetails, setReservationDetails] = useState<any | null>(null);

  const [diningCategoryFilter, setDiningCategoryFilter] = useState<string>("all");
  const [complimentaryGroupFilter, setComplimentaryGroupFilter] = useState<string>("all");
  const [isComplimentaryTab, setIsComplimentaryTab] = useState<boolean>(false);

  // Personalized Complimentary Meal state
  const [personalizeModalOpen, setPersonalizeModalOpen] = useState(false);
  const [personalizeItem, setPersonalizeItem] = useState<any>(null);
  const [customDishName, setCustomDishName] = useState("");
  const [dietaryReq, setDietaryReq] = useState("Standard");
  const [cookingStyle, setCookingStyle] = useState("Chef's Specialty");
  const [spiceLevel, setSpiceLevel] = useState("Medium");
  const [portionSize, setPortionSize] = useState("Standard");
  const [preferredIngredients, setPreferredIngredients] = useState("");

  const openPersonalize = (item: any = null) => {
    setPersonalizeItem(item);
    setCustomDishName(item ? item.name : "");
    setDietaryReq("Standard");
    setCookingStyle("Chef's Specialty");
    setSpiceLevel("Medium");
    setPortionSize("Standard");
    setPreferredIngredients("");
    setPersonalizeModalOpen(true);
  };

  const handleAddPersonalizedMeal = () => {
    if (!isStayActive) {
      alert("In-room services and dining can only be requested once you have checked in to your room. Please check in at the front desk to activate service ordering.");
      return;
    }
    const dishName = (personalizeItem?.name || customDishName.trim()) || "Chef's Special Complimentary Request";
    const prefSummary = `${dietaryReq !== "Standard" ? dietaryReq + " • " : ""}${cookingStyle} • ${spiceLevel} Spice • ${portionSize} Portion${preferredIngredients.trim() ? ` • ${preferredIngredients.trim()}` : ""}`;

    setTray((prev) => [
      ...prev,
      {
        id: `comp-custom-${Date.now()}`,
        name: `${dishName} (Complimentary)`,
        category: "food",
        price: 0,
        quantity: 1,
        desc: prefSummary,
        preferences: prefSummary,
      },
    ]);

    setPersonalizeModalOpen(false);
  };

  // Track My Orders Modal & Live Store
  const [isTrackOrdersOpen, setIsTrackOrdersOpen] = useState(false);
  const [allInHouseOrders, setAllInHouseOrders] = useState<InHouseServiceRequest[]>([]);

  useEffect(() => {
    setAllInHouseOrders(getInHouseRequests());
    const handleSync = (e: any) => {
      if (e?.detail) setAllInHouseOrders(e.detail);
      else setAllInHouseOrders(getInHouseRequests());
    };
    window.addEventListener("nexus_inhouse_requests_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("nexus_inhouse_requests_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const myOrders = useMemo(() => {
    const currentRoom = roomNumber.trim().toLowerCase();
    const currentGuest = guestName.trim().toLowerCase();
    if (!currentRoom && !currentGuest) return allInHouseOrders.slice(0, 5);
    return allInHouseOrders.filter((o) => {
      return (
        (currentRoom && o.roomNumber.toLowerCase() === currentRoom) ||
        (currentGuest && o.guestName.toLowerCase().includes(currentGuest.split(" ")[0]))
      );
    });
  }, [allInHouseOrders, roomNumber, guestName]);

  // Reset pagination on category or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, diningCategoryFilter, complimentaryGroupFilter, isComplimentaryTab, searchQuery]);

  // Catalog state
  const [catalog, setCatalog] = useState<typeof DEFAULT_CATALOG>(DEFAULT_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Tray / Cart state
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [specialNotes, setSpecialNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom request modal state
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customType, setCustomType] = useState("housekeeping");
  const [customDetails, setCustomDetails] = useState("");

  // Order placed confirmation dialog
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // 1. Verify live stay status from backend & browser storage
  const verifyStayStatus = async () => {
    try {
      const token =
        (typeof window !== "undefined" &&
          (sessionStorage.getItem("nexus_guest_token") || localStorage.getItem("nexus_guest_token"))) ||
        null;

      if (token) {
        const res = await fetch("/api/guest-portal/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.valid) {
            const resObj = data.reservation;
            const status = (resObj?.status || "confirmed") as "checked_in" | "confirmed" | "checked_out" | "none";
            const active = Boolean(data.isStayActive || status === "checked_in");
            setIsStayActive(active);
            setStayStatus(status);
            setReservationDetails(resObj);
            if (data.room?.number) {
              setRoomNumber(data.room.number);
            }
            if (data.guest?.fullName) {
              setGuestName(data.guest.fullName);
            }
            if (data.guest?.id) {
              setGuestId(data.guest.id);
            }
            if (resObj?.id) {
              setReservationId(resObj.id);
            }
            setIsRecognizedGuest(true);
            setCheckingStay(false);
            return;
          }
        }
      }

      // Fallback check from stored guest session
      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem("nexus_guest_session") || localStorage.getItem("nexus_guest_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          const resObj = parsed.reservation;
          const status = (resObj?.status || parsed.status || "confirmed") as "checked_in" | "confirmed" | "checked_out" | "none";
          const active = Boolean(parsed.isStayActive || status === "checked_in");
          setIsStayActive(active);
          setStayStatus(status);
          setReservationDetails(resObj || null);

          const guest = parsed.guest || parsed;
          const derivedName =
            guest.fullName ||
            `${guest.firstName || ""} ${guest.lastName || ""}`.trim() ||
            guestName;
          if (derivedName) setGuestName(derivedName);
          if (guest.id) setGuestId(guest.id);

          const derivedRoom =
            parsed.roomNumber ||
            parsed.room?.number ||
            parsed.reservation?.roomNumber ||
            parsed.reservation?.room?.number ||
            guest.roomNumber;
          if (derivedRoom) setRoomNumber(derivedRoom);

          if (parsed.reservation?.id || parsed.reservationId) {
            setReservationId(parsed.reservation?.id || parsed.reservationId);
          }
          if (derivedName || derivedRoom || guest.id) {
            setIsRecognizedGuest(true);
          }
        }
      }
    } catch (e) {
      console.warn("Could not verify stay status", e);
    } finally {
      setCheckingStay(false);
    }
  };

  useEffect(() => {
    verifyStayStatus();

    const handleFocus = () => {
      verifyStayStatus();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // Auto-poll every 6 seconds if not yet checked in so the portal automatically unlocks
    // the moment front desk staff checks the guest in
    const interval = setInterval(() => {
      if (!isStayActive) {
        verifyStayStatus();
      }
    }, 6000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      clearInterval(interval);
    };
  }, [isStayActive]);

  // 2. Fetch Catalog from backend
  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const res = await fetch("/api/guest-portal/catalog");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setCatalog({
              // ALWAYS preserve complete 83 dishes across all 10 categories with real ETB market prices
              dining: DEFAULT_CATALOG.dining,
              amenities: data.amenities || DEFAULT_CATALOG.amenities,
              transport: data.transport || DEFAULT_CATALOG.transport,
              services: data.services || DEFAULT_CATALOG.services,
              stay: data.stay || DEFAULT_CATALOG.stay,
            });
          }
        }
      } catch {
        // use default catalog
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // Combine catalog items for filtering
  const allItems = useMemo(() => {
    const list: Array<any & { section: string; sectionLabel: string }> = [];
    catalog.dining.forEach((i) => list.push({ ...i, section: "dining", sectionLabel: "Dining & Drinks" }));
    catalog.amenities.forEach((i) => list.push({ ...i, section: "amenities", sectionLabel: "Housekeeping & Amenities" }));
    catalog.transport.forEach((i) => list.push({ ...i, section: "transport", sectionLabel: "Airport & Transport" }));
    catalog.services.forEach((i) => list.push({ ...i, section: "services", sectionLabel: "Guest Services" }));
    catalog.stay?.forEach((i) => list.push({ ...i, section: "stay", sectionLabel: "Stay & Room Requests" }));
    COMPLIMENTARY_FOOD_ITEMS.forEach((i) => list.push({ ...i, section: "complimentary", sectionLabel: "Complimentary Food & Beverage" }));
    return list;
  }, [catalog]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // 1. If in dedicated Complimentary tab, ONLY show complimentary items
      if (isComplimentaryTab) {
        if (item.section !== "complimentary") return false;

        const matchesGroup =
          complimentaryGroupFilter === "all" ||
          item.categoryGroup === complimentaryGroupFilter;

        const matchesSearch =
          !searchQuery.trim() ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesGroup && matchesSearch;
      }

      // 2. Outside the complimentary tab, STRICTLY EXCLUDE complimentary items
      if (item.section === "complimentary") return false;

      // 3. When a specific dining category is picked from the 10 food & drink categories dropdown:
      // STRICT RULE: ONLY show dining items of that category (all with real market prices, paid to folio)
      if (diningCategoryFilter !== "all") {
        const isTargetCategory =
          item.section === "dining" &&
          (item.categoryId === diningCategoryFilter ||
            item.category === diningCategoryFilter);
        if (!isTargetCategory) return false;

        const matchesSearch =
          !searchQuery.trim() ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      }

      // 4. Standard category filter
      const matchesCategory =
        selectedCategory === "all" || item.section === selectedCategory;

      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allItems, isComplimentaryTab, selectedCategory, diningCategoryFilter, complimentaryGroupFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Tray management
  const addToTray = (item: any) => {
    if (!isStayActive) {
      alert("In-room services and dining can only be requested once you have checked in to your room. Please check in at the front desk to activate service ordering.");
      return;
    }

    setTray((prev) => {
      const existing = prev.find((t) => t.id === item.id);
      if (existing) {
        return prev.map((t) =>
          t.id === item.id ? { ...t, quantity: t.quantity + 1 } : t
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.isComplimentary ? `${item.name} (Complimentary)` : item.name,
          category: item.category || item.section,
          price: Number(item.price) || 0,
          quantity: 1,
          desc: item.desc,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setTray((prev) =>
      prev
        .map((t) => {
          if (t.id === id) {
            const newQty = t.quantity + delta;
            return newQty > 0 ? { ...t, quantity: newQty } : null;
          }
          return t;
        })
        .filter(Boolean) as TrayItem[]
    );
  };

  const removeFromTray = (id: string) => {
    setTray((prev) => prev.filter((t) => t.id !== id));
  };

  const trayTotal = useMemo(() => {
    return tray.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [tray]);

  const trayItemCount = useMemo(() => {
    return tray.reduce((acc, item) => acc + item.quantity, 0);
  }, [tray]);

  // Submit Order to backend
  const handleSubmitOrder = async () => {
    if (!isStayActive) {
      alert("In-room service requests are only active for guests currently checked into their room. Please check in at the front desk to activate in-room service.");
      return;
    }
    if (!roomNumber.trim()) {
      alert("Please specify your Room Number so our team knows where to deliver.");
      return;
    }
    if (!guestName.trim()) {
      alert("Please provide the Guest Name for this request.");
      return;
    }
    if (tray.length === 0) {
      alert("Please select at least one item or service to request.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build descriptive summary of items
      const itemsSummary = tray
        .map((t) => `${t.quantity}x ${t.name}${t.price > 0 ? ` (${(t.price * t.quantity).toLocaleString()} ETB)` : " (Free)"}`)
        .join(", ");

      // Primary service type
      const primaryType = tray[0].category || "food";

      const selectedWaiter = AVAILABLE_WAITERS.find((w) => w.id === selectedWaiterId) || AVAILABLE_WAITERS[0];

      const payload = {
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        guestId: guestId || undefined,
        reservationId: reservationId || undefined,
        serviceType: primaryType,
        description: itemsSummary,
        specialInstructions: specialNotes.trim() || undefined,
        priority: priority,
        chargeAmount: trayTotal,
        assignedWaiterId: "",
        assignedWaiterName: "Pending Front Desk Assignment",
      };

      const res = await fetch("/api/guest-portal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to dispatch request");
      }

      const created = await res.json();
      const generatedReqNum = created.requestNumber || "RS " + Date.now().toString(36).toUpperCase();

      // Persist in-house service request to synchronized store
      saveInHouseRequest({
        id: "ih-req-" + Date.now(),
        requestNumber: generatedReqNum,
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        phone: (reservationDetails?.guestPhone || reservationDetails?.guest?.phone || "0954123456"),
        assignedWaiterId: "",
        assignedWaiterName: "Pending Front Desk Assignment",
        items: tray.map((t) => ({
          name: t.name,
          quantity: t.quantity,
          category: t.category,
          price: t.price,
        })),
        specialNotes: specialNotes.trim() || undefined,
        totalAmount: trayTotal,
        status: "pending",
        stage: "pending_assignment",
        createdAt: new Date().toISOString(),
      });

      setConfirmedOrder({
        requestNumber: generatedReqNum,
        items: itemsSummary,
        total: trayTotal,
        priority,
        specialNotes,
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        eta: primaryType === "food" ? "25 - 35 mins" : "15 - 25 mins",
      });

      // Clear tray
      setTray([]);
      setSpecialNotes("");
    } catch (err: any) {
      alert(err.message || "An error occurred while submitting your service request. Please try again or contact front desk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add custom request to tray
  const handleAddCustomRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStayActive) {
      alert("Custom in-room service requests activate automatically upon physical room check-in.");
      return;
    }
    if (!customTitle.trim()) return;

    const customItem: TrayItem = {
      id: "custom-" + Date.now(),
      name: customTitle.trim(),
      category: customType,
      price: 0.0,
      quantity: 1,
      desc: customDetails.trim() || "Bespoke custom guest request",
    };

    setTray((prev) => [...prev, customItem]);
    setCustomTitle("");
    setCustomDetails("");
    setCustomModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Luxury Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0b0c10]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand & Return */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-slate-400 hover:text-amber-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5 border border-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Hotel Home</span>
            </Link>
          </div>

          {/* Right: Guest & Room Status */}
          <div className="flex items-center gap-2.5">
            {isRecognizedGuest && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                  isStayActive
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}
              >
                {isStayActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold">{roomNumber ? `Room ${roomNumber}` : "In-Room"}</span>
                    <span className="text-emerald-500/40">•</span>
                    <span className="text-emerald-300 font-medium">Checked In</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="font-semibold">{roomNumber ? `Room ${roomNumber}` : "Upcoming"}</span>
                    <span className="text-amber-500/40">•</span>
                    <span className="text-amber-300 font-medium">Check-In Pending</span>
                  </>
                )}
                {guestName && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-slate-300 truncate max-w-[130px]">{guestName}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#14171f] to-amber-900/20 border border-amber-500/20 p-5 sm:p-6 mb-6 shadow-xl shadow-black/40">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Guest Services & Stay Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
                In-Room Dining, Amenities & Stay Requests
              </h1>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTrackOrdersOpen(true)}
              className="h-9 px-4 text-xs font-semibold border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-center"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Track Active Orders</span>
              {myOrders.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                  {myOrders.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Pre-Arrival / Check-In Pending Banner */}
        {!isStayActive && !checkingStay && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#181c28] to-amber-900/10 p-5 shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base">
                      {stayStatus === "confirmed" ? "Reservation Confirmed — Check-In Pending" : "In-Room Services Locked"}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/10">
                      {stayStatus === "confirmed" ? "Pre-Arrival Preview" : "Check-In Required"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {stayStatus === "confirmed" ? (
                      <>
                        Welcome, <strong className="text-white">{guestName || "Guest"}</strong>! You are viewing our luxury dining & amenities catalog in <strong>Preview Mode</strong>. In-room ordering and room service requests will <strong>automatically activate</strong> as soon as you complete check-in at the Front Desk and occupy {roomNumber ? `Room ${roomNumber}` : "your suite"}.
                      </>
                    ) : (
                      <>
                        In-room service requests and dining orders are strictly activated for guests currently checked into their rooms. Please sign in with your confirmed reservation credentials or complete check-in at the Front Desk.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {stayStatus === "confirmed" ? (
                <div className="shrink-0 flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-xs text-amber-300/90 font-mono">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Auto-activates on Check-In</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => router.push("/guest-portal/login")}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl shadow-md cursor-pointer"
                >
                  Sign In to Check Stay
                </Button>
              )}
            </div>
          </div>
        )}

        {/* In-Room Services & Ordering */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Catalog Section (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Category Filter Dropdown & Complimentary Tab */}
              <div className="flex items-center gap-3 flex-wrap border-b border-white/10 pb-4">
                <div className="w-56 shrink-0">
                  <Select value={selectedCategory} onValueChange={(val) => {
                    setSelectedCategory(val);
                    setIsComplimentaryTab(false);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs bg-white/5 border-white/10 text-white rounded-xl focus:ring-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <SelectValue placeholder="All Services" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#14171f] border-white/10 text-slate-200">
                      <SelectItem value="all">All Hotel Services</SelectItem>
                      <SelectItem value="dining">Dining & Refreshments</SelectItem>
                      <SelectItem value="stay">Stay & Room Requests</SelectItem>
                      <SelectItem value="amenities">Housekeeping & Amenities</SelectItem>
                      <SelectItem value="transport">Airport & Chauffeur</SelectItem>
                      <SelectItem value="services">Guest Services & Tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 10 Food & Drink Menu Categories Dropdown - ALWAYS VISIBLE WITHOUT DISORDER */}
                <div className="w-64 sm:w-72 shrink-0">
                  <Select value={diningCategoryFilter} onValueChange={(val) => {
                    setDiningCategoryFilter(val);
                    setIsComplimentaryTab(false);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-full h-10 text-xs bg-white/5 border-amber-500/30 text-amber-300 rounded-xl focus:ring-amber-500/30">
                      <div className="flex items-center gap-2 truncate">
                        <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <SelectValue placeholder="Food & Drinks Category" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#14171f] border-white/10 text-slate-200 max-h-72">
                      <SelectItem value="all">All 10 Food & Drink Categories</SelectItem>
                      {ROOM_SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dedicated Complimentary Food Tab Button - Highlighted with Shadow when active */}
                <button
                  type="button"
                  onClick={() => {
                    setIsComplimentaryTab((prev) => !prev);
                    setCurrentPage(1);
                  }}
                  className={`h-10 px-4 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                    isComplimentaryTab
                      ? "bg-gradient-to-r from-emerald-500/25 to-amber-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/50"
                      : "bg-white/5 text-slate-300 border-white/10 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-500/10 shadow-xs"
                  }`}
                >
                  <Coffee className="w-4 h-4 text-emerald-400" />
                  <span>Complimentary Foods</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isComplimentaryTab
                      ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/60 shadow-xs"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}>
                    0 ETB
                  </span>
                </button>
              </div>

              {/* Complimentary Group Pills and Custom Request */}
              {isComplimentaryTab && (
                <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COMPLIMENTARY_GROUPS.map((grp) => {
                        const isSelected =
                          (grp === "All" && complimentaryGroupFilter === "all") ||
                          complimentaryGroupFilter === grp;
                        return (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => {
                              setComplimentaryGroupFilter(grp === "All" ? "all" : grp);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                                : "bg-white/5 text-slate-300 border border-white/10 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            {grp}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      onClick={() => openPersonalize(null)}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs h-8 px-3 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Custom Meal Request</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Bar & Custom Request Trigger */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search dishes, towels, executive transfers, coffee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-[#14171f] border-white/10 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <Button
                  onClick={() => setCustomModalOpen(true)}
                  variant="outline"
                  className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Request</span>
                </Button>
              </div>

              {/* Items Grid */}
              {catalogLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading luxury catalog...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#14171f]/40 space-y-3">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-300">No services match your search</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Try another keyword or submit a custom guest request for anything not listed.
                  </p>
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    variant="outline"
                    className="border-white/10 text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedItems.map((item) => {
                      const isFree = Number(item.price) === 0;

                      return (
                        <Card
                          key={item.id}
                          className="bg-[#14171f] border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between group"
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400/90 font-semibold bg-amber-400/10 px-2 py-0.5 rounded">
                                {item.sectionLabel}
                              </span>
                              {item.badge && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0 ${
                                    isFree
                                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                      : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                  }`}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base font-semibold text-white group-hover:text-amber-200 transition-colors mt-2">
                              {item.name}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="p-4 pt-2">
                            {/* Metadata pill row (prepTime, vehicleType, etc.) */}
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-slate-400">
                              {item.prepTime && (
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {item.prepTime}
                                </span>
                              )}
                              {item.vehicleType && (
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded">
                                  <Car className="w-3 h-3 text-slate-400" />
                                  {item.vehicleType}
                                </span>
                              )}
                            </div>

                            {/* Price & Add to cart button */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <div>
                                <span className={`text-base font-bold ${item.isComplimentary || isComplimentaryTab ? "text-emerald-400" : "text-amber-400"}`}>
                                  {Number(item.price || 0).toLocaleString()} ETB
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {(item.isComplimentary || isComplimentaryTab) && isStayActive && (
                                  <Button
                                    onClick={() => openPersonalize(item)}
                                    size="sm"
                                    variant="outline"
                                    className="bg-white/5 hover:bg-white/10 text-emerald-300 border-emerald-500/30 text-xs h-8 px-2.5 rounded-lg cursor-pointer"
                                  >
                                    Personalize
                                  </Button>
                                )}
                                {isStayActive ? (
                                  <Button
                                    onClick={() => addToTray(item)}
                                    size="sm"
                                    className={`active:scale-95 text-slate-950 font-semibold text-xs h-8 px-3.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                                      item.isComplimentary || isComplimentaryTab
                                        ? "bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                                        : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-amber-500/20"
                                    }`}
                                  >
                                    <Bell className="w-3.5 h-3.5" />
                                    <span>{item.isComplimentary || isComplimentaryTab ? "Request Free" : "Request Service"}</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    disabled
                                    className="bg-white/5 border border-white/10 text-slate-400 font-medium text-xs h-8 px-3 rounded-lg cursor-not-allowed opacity-75 flex items-center gap-1.5"
                                    title="In-room requests activate automatically upon physical room check-in."
                                  >
                                    <Lock className="w-3 h-3 text-amber-500/70" />
                                    <span>Preview Only</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination Controls (Limit 5 items per page) */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-8 w-8 border-white/10 text-slate-300 hover:text-white disabled:opacity-30"
                          title="Previous"
                          aria-label="Previous"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                            <button
                              key={pg}
                              onClick={() => setCurrentPage(pg)}
                              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                currentPage === pg
                                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {pg}
                            </button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-8 w-8 border-white/10 text-slate-300 hover:text-white disabled:opacity-30"
                          title="Next"
                          aria-label="Next"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Service Requests Sidebar (4 cols) */}
            <div className="lg:col-span-4 sticky top-20 space-y-4">
              <Card className="bg-[#14171f] border-amber-500/20 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-white/5 to-transparent p-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>Service Requests</span>
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {tray.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-black/20 flex flex-col items-center justify-center p-4">
                      <Bell className="w-7 h-7 text-slate-600/60 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No service requested yet</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Click &quot;Request Service&quot; on any item to submit a guest request.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      {tray.map((item) => (
                        <div
                          key={item.id}
                          className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {item.price === 0 && item.category !== "stay"
                                ? "Complimentary"
                                : item.price === 0
                                ? "Charged to Folio"
                                : `${item.price.toLocaleString()} ETB each`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center font-bold text-amber-400 text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromTray(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delivery Location Check */}
                  <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                    {!roomNumber.trim() && (
                      <div className="space-y-1">
                        <Input
                          placeholder="Enter Room #"
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                          className="h-7 w-full text-xs bg-black/40 border-amber-500/40 text-amber-300 font-bold"
                        />
                        <p className="text-[10px] text-rose-400">
                          * Please enter your room number above to place order.
                        </p>
                      </div>
                    )}

                    {/* Server Allocation Managed by Receptionist */}
                    <div className="pt-2">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>Server Allocation</span>
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            Front Desk Dispatch
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Your order will be received by the Front Desk Receptionist, who will assign an available floor waiter and dispatch to the kitchen pass.
                        </p>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div className="pt-2">
                      <label className="text-[11px] text-slate-400 block mb-1 font-medium">
                        Special Instructions
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Please knock softly, deliver at 7:30 PM, extra ice..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-black/30 rounded-lg p-3 space-y-1.5 border border-white/5 pt-3">
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Items Subtotal</span>
                        <span>{trayTotal.toLocaleString()} ETB</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Room Delivery Fee</span>
                        <span className="text-emerald-400 font-medium">Complimentary</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-white/10">
                        <span>Total to Folio</span>
                        <span className="text-amber-400">{trayTotal.toLocaleString()} ETB</span>
                      </div>
                    </div>

                    {/* Dispatch Action or Locked Check-In Notice */}
                    {!isStayActive ? (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center space-y-2.5 mt-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Ordering Activates on Check-In</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                            In-room dining, amenities, and room service delivery activate automatically once you check in at the Front Desk and occupy {roomNumber ? `Room ${roomNumber}` : "your suite"}.
                          </p>
                        </div>
                        {!isRecognizedGuest && (
                          <Button
                            size="sm"
                            onClick={() => router.push("/guest-portal/login")}
                            className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 rounded-lg cursor-pointer"
                          >
                            Sign In with Reservation
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={handleSubmitOrder}
                        disabled={isSubmitting || tray.length === 0}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs py-5 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>Dispatching to Staff...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Send className="w-4 h-4" />
                            <span>Submit Service Request ({trayItemCount})</span>
                          </div>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
      </main>

      {/* Custom Request Dialog */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="bg-[#14171f] border-amber-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Special Custom Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Need something unique not on the standard menu? Let our 24/7 Front Desk team know.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomRequest} className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Request Title / Item
              </label>
              <Input
                required
                placeholder="e.g. Extra coat hangers, hypoallergenic baby soap..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="bg-black/40 border-white/10 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Department
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="housekeeping">Housekeeping & Amenities</option>
                <option value="food">In-Room Dining / Special Dish</option>
                <option value="transport">Transportation & Chauffeur</option>
                <option value="maintenance">Room Maintenance / Tech Support</option>
                <option value="laundry">Laundry & Pressing</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Detailed Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Provide any specific preferences or schedule..."
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomModalOpen(false)}
                className="border-white/10 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                Add to Requests
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Placed Success Modal */}
      <Dialog open={!!confirmedOrder} onOpenChange={() => setConfirmedOrder(null)}>
        <DialogContent className="bg-[#14171f] border-amber-500/40 text-white max-w-lg">
          <DialogHeader className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto text-slate-950 shadow-lg shadow-amber-500/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <DialogTitle className="text-2xl font-serif font-bold text-white">
              Request Dispatched to Front Desk
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Our hospitality team has received your order and is preparing it for delivery.
            </DialogDescription>
          </DialogHeader>

          {confirmedOrder && (
            <div className="space-y-4 pt-3">
              <div className="bg-black/40 border border-amber-500/20 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-white/10">
                  <span className="text-slate-400">Order Reference</span>
                  <span className="font-mono font-bold text-amber-400">
                    {confirmedOrder.requestNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination</span>
                  <span className="font-semibold text-slate-200">
                    Room {confirmedOrder.roomNumber} ({confirmedOrder.guestName})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Delivery</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {confirmedOrder.eta}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-slate-400 block mb-1">Ordered Items:</span>
                  <p className="text-slate-200 font-medium">{confirmedOrder.items}</p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setConfirmedOrder(null)}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs py-3.5 rounded-xl shadow-md shadow-amber-500/20 transition-all"
                >
                  Close & Order More Services
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Live Order Fulfillment Tracker Modal */}
      <Dialog open={isTrackOrdersOpen} onOpenChange={setIsTrackOrdersOpen}>
        <DialogContent className="bg-[#14171f] border-amber-500/30 text-white max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  My Room Service Orders
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-1">
                  Live status tracking for Room {roomNumber || "Your Room"}
                </DialogDescription>
              </div>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px]">
                {myOrders.length} {myOrders.length === 1 ? "Order" : "Orders"}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {myOrders.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <Utensils className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">No active room service orders</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse our 10 culinary & drink categories, add items to your tray, and submit an order directly to front desk.
                </p>
              </div>
            ) : (
              myOrders.map((ord) => {
                const cleanId = (ord.requestNumber || "").replace(/#/g, "").replace(/-/g, " ");
                const isDelivered = ord.status === "served";
                const isDispatched = ord.status === "dispatched";
                const isAssigned = Boolean(ord.assignedWaiterId && ord.assignedWaiterId !== "");
                const itemsSummary = Array.isArray(ord.items)
                  ? ord.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")
                  : String(ord.items || "");

                return (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-amber-500/30 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Order ID</span>
                        <p className="font-mono font-bold text-amber-400 text-sm">{cleanId || "ORD"}</p>
                      </div>
                      <Badge
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          isDelivered
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : isDispatched
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : isAssigned
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {isDelivered
                          ? "Delivered to Room"
                          : isDispatched
                          ? "In Kitchen Prep"
                          : isAssigned
                          ? `Assigned: ${ord.assignedWaiterName}`
                          : "Order Placed"}
                      </Badge>
                    </div>

                    {/* Step progress track */}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[10px] text-amber-300 font-medium">Received</span>
                      </div>
                      <div className="space-y-1">
                        <div className={`h-1.5 rounded-full ${isAssigned || isDispatched || isDelivered ? "bg-amber-500" : "bg-white/10"}`} />
                        <span className={`text-[10px] ${isAssigned || isDispatched || isDelivered ? "text-amber-300 font-medium" : "text-slate-500"}`}>Waiter</span>
                      </div>
                      <div className="space-y-1">
                        <div className={`h-1.5 rounded-full ${isDispatched || isDelivered ? "bg-amber-500" : "bg-white/10"}`} />
                        <span className={`text-[10px] ${isDispatched || isDelivered ? "text-amber-300 font-medium" : "text-slate-500"}`}>Kitchen</span>
                      </div>
                      <div className="space-y-1">
                        <div className={`h-1.5 rounded-full ${isDelivered ? "bg-emerald-500" : "bg-white/10"}`} />
                        <span className={`text-[10px] ${isDelivered ? "text-emerald-400 font-medium" : "text-slate-500"}`}>Delivered</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Items:</span>
                        <span className="font-semibold text-slate-200 text-right max-w-[280px] truncate">{itemsSummary}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Destination:</span>
                        <span className="font-medium text-slate-300">Room {ord.roomNumber}</span>
                      </div>
                      {ord.assignedWaiterName && (
                        <div className="flex justify-between text-slate-400">
                          <span>Assigned Waiter:</span>
                          <span className="font-medium text-amber-300">{ord.assignedWaiterName}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-white/5 font-semibold">
                        <span>Total:</span>
                        <span className="text-amber-400">ETB {Number(ord.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setIsTrackOrdersOpen(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs py-2.5 rounded-xl border border-white/10"
            >
              Close Tracker
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Luxury Complimentary Meal Personalization Dialog */}
      <Dialog open={personalizeModalOpen} onOpenChange={setPersonalizeModalOpen}>
        <DialogContent className="bg-[#14171f] border-emerald-500/40 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Complimentary Culinary Service • 0 ETB</span>
            </div>
            <DialogTitle className="text-xl font-serif font-bold text-white">
              {personalizeItem ? `Personalize ${personalizeItem.name}` : "Chef's Custom Meal Request"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Personalize your meal with dietary requirements, cooking styles, spice level, and portion size. Prepared fresh for your room at 0 ETB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {!personalizeItem && (
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Dish or Beverage Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Kitfo Special, Egg & Mushroom Omelet, Avocado Smoothie..."
                  value={customDishName}
                  onChange={(e) => setCustomDishName(e.target.value)}
                  className="bg-black/40 border-white/10 text-xs text-slate-200"
                />
              </div>
            )}

            {/* Dietary Requirements */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Dietary Preference / Fasting
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "Standard",
                  "Vegetarian",
                  "Vegan",
                  "Fasting (Tsom)",
                  "Halal",
                  "Gluten-Free",
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDietaryReq(opt)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium text-center ${
                      dietaryReq === opt
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Cooking Style */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Cooking Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "Chef's Specialty",
                  "Grilled / Charred",
                  "Pan-Seared",
                  "Steamed",
                  "Light Oil",
                  "Crispy",
                ].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCookingStyle(style)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium text-center ${
                      cookingStyle === style
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Spice Level */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Spice Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "Plain (No Spice)",
                  "Mild",
                  "Medium",
                  "Spicy",
                  "Mitmita on Side",
                ].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSpiceLevel(lvl)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium text-center ${
                      spiceLevel === lvl
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Portion Size */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Portion Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Light", "Standard", "Generous"].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPortionSize(sz)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium text-center ${
                      portionSize === sz
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Instructions & Ingredients */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Special Requests & Ingredients (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Extra onions, garlic on the side, lemon slices, decaf coffee..."
                value={preferredIngredients}
                onChange={(e) => setPreferredIngredients(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm font-bold text-emerald-400">0 ETB</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPersonalizeModalOpen(false)}
                  className="border-white/10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddPersonalizedMeal}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                >
                  Add to Tray (0 ETB)
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GuestServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-slate-300">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading guest services experience...</p>
          </div>
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}

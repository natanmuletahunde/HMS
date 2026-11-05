"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { 
  LayoutDashboard, CalendarCheck, Users, BedDouble, SlidersHorizontal, 
  Sparkles, Wrench, UtensilsCrossed, FileText, 
  CreditCard, Package, Building2, GitBranch, Building, Layers, Tag, BedSingle, DollarSign,
  Shield, Lock, ClipboardList,
  CalendarDays, ShoppingCart, Bed, LogOut,
  ShoppingBag, Users2,
  BarChart2,
  GitMerge,
  QrCode, ChefHat, Receipt, Boxes, Wine, Coffee, GlassWater,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { isRouteAuthorized, normalizeRole } from "@/lib/rbac";

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Hotel Setup",
    items: [
      { name: "Hotel Config", href: "/hotel", icon: Building2 },
      { name: "Branches", href: "/branches", icon: GitBranch },
    ]
  },
  {
    title: "Room Setup",
    items: [
      { name: "Rooms", href: "/rooms", icon: BedDouble },
      { name: "Configs", href: "/room-configs", icon: SlidersHorizontal },
    ]
  },
  {
    title: "Front Desk",
    items: [
      { name: "Guests", href: "/guests", icon: Users },
      { name: "Res. Calendar", href: "/reservations/calendar", icon: CalendarDays },
      { name: "Guest QR Codes", href: "/qr-codes", icon: QrCode },
    ]
  },
  {
    title: "Front Office",
    items: [
      { name: "Stay & Room Service", href: "/stay", icon: Bed },
      { name: "Check-out", href: "/check-out", icon: LogOut },
    ]
  },
  {
    title: "Operations",
    items: [
      { name: "Housekeeping", href: "/housekeeping", icon: Sparkles },
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
      { name: "Waiter", href: "/restaurant", icon: UtensilsCrossed },
      { name: "Kitchen", href: "/kitchen", icon: ChefHat },
      { name: "Bar Station", href: "/bar", icon: Wine },
  { name: "Coffee Station", href: "/coffee", icon: Coffee },
  { name: "Beverage Station", href: "/beverages", icon: GlassWater },
      { name: "Coordinator", href: "/coordinator", icon: GitMerge },
      { name: "Staff Supplies", href: "/staff-supplies", icon: Boxes },
      { name: "Cashier Desk", href: "/cashier", icon: Receipt },
      { name: "POS", href: "/pos", icon: ShoppingCart },
    ]
  },
  {
    title: "Finance",
    items: [
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Payments", href: "/payments", icon: CreditCard },
    ]
  },
  {
    title: "Business",
    items: [
      { name: "Inventory", href: "/inventory", icon: Package },
      { name: "Procurement", href: "/procurement", icon: ShoppingBag },
      { name: "Financial", href: "/financial", icon: DollarSign },
      { name: "Conference", href: "/conference", icon: Building2 },
    ]
  },
  {
    title: "Admin",
    items: [
      { name: "HR", href: "/hr", icon: Users2 },
      { name: "Users & Roles", href: "/users", icon: Shield },
      { name: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
    ]
  },
  {
    title: "Reports",
    items: [
      { name: "Reports Document", href: "/reports", icon: BarChart2 },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const currentRole = user?.role || (user as any)?.roleName || "Staff";
  const isWaiter = normalizeRole(currentRole) === "waiter";
  const isGlobal =
    user?.roleName === "Admin" ||
    user?.roleName === "System Admin" ||
    user?.roleScope === "global";

  // Filter navigation groups based on role authorization & dynamic permissions
  const filteredNavGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => {
      let items = group.items;
      let groupTitle = group.title;

      if (group.title === "Hotel Setup") {
        if (!isGlobal) {
          groupTitle = "Branch Setup";
          items = [
            { name: "Branch Config", href: "/hotel", icon: Building2 },
            { name: "Buildings & Floors", href: "/branches?tab=buildings", icon: Building },
          ];
        } else {
          groupTitle = "Hotel Setup";
          items = [
            { name: "HQ Hotel Config", href: "/hotel", icon: Building2 },
            { name: "Branches & Properties", href: "/branches", icon: GitBranch },
          ];
        }
      }

      const authorizedItems = items.filter((item) => {
        const pathOnly = item.href.split('?')[0];
        const roleCat = normalizeRole(currentRole);
        const isManagement =
          isGlobal ||
          ["admin", "manager", "chief_officer"].includes(roleCat) ||
          user?.roleName === "Admin" ||
          user?.roleName === "System Admin";

        // ── Operational Station Isolation (Strict 1-Station-per-Role) ──
        if (pathOnly === "/bar" && roleCat !== "barman" && !isManagement) {
          return false;
        }

        if (pathOnly === "/coffee" && roleCat !== "barista" && !isManagement) {
          return false;
        }

        if (pathOnly === "/beverages" && roleCat !== "beverage_staff" && !isManagement) {
          return false;
        }

        if (
          pathOnly === "/kitchen" &&
          !["kitchen_officer", "head_chef", "chief_chef"].includes(roleCat) &&
          !isManagement
        ) {
          return false;
        }

        if (pathOnly === "/restaurant" && roleCat !== "waiter" && !isManagement) {
          return false;
        }

        if (pathOnly === "/coordinator" && roleCat !== "coordinator" && !isManagement) {
          return false;
        }

        if (pathOnly === "/cashier" && roleCat !== "cashier" && !isManagement) {
          return false;
        }

        if (
          pathOnly === "/pos" &&
          !["cashier", "manager", "restaurant_manager"].includes(roleCat) &&
          !isManagement
        ) {
          return false;
        }

        if (pathOnly === "/housekeeping" && roleCat !== "housekeeping" && !isManagement) {
          return false;
        }

        if (pathOnly === "/maintenance" && roleCat !== "maintenance" && !isManagement) {
          return false;
        }

        // ── Warehouse & Procurement Isolation ──
        if (
          pathOnly === "/inventory" &&
          !["storekeeper", "coordinator", "manager", "restaurant_manager"].includes(roleCat) &&
          !isManagement
        ) {
          return false;
        }

        if (
          pathOnly === "/procurement" &&
          !["storekeeper", "accountant", "manager"].includes(roleCat) &&
          !isManagement
        ) {
          return false;
        }

        return isRouteAuthorized(user, pathOnly, user?.permissions);
      });
      return {
        ...group,
        title: groupTitle,
        items: authorizedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [user, currentRole, isWaiter, isGlobal]);

  return (
    <aside 
      className="w-64 flex flex-col h-screen sticky top-0 overflow-y-auto z-20 select-none border-r border-white/10 shadow-2xl"
      style={{
        background: "linear-gradient(180deg, #7898ed 0%, #5067aa 35%, #263360 68%, #070c28 100%)",
      }}
    >
      {/* Brand Header */}
      <div className="flex items-center px-6 py-5 border-b border-white/15 shrink-0 bg-white/5 backdrop-blur-xs">
        <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white mr-3 shadow-xs">
          <Building2 className="h-4 w-4 stroke-[2] text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white block drop-shadow-xs">
            Nexus HMS
          </span>
        </div>
      </div>
      
      {/* Nav Groups */}
      <div className="flex-1 py-5 px-3 space-y-6">
        {filteredNavGroups.map((group) => (
          <div key={group.title}>
            <h4 className="px-3 mb-2 text-[11px] font-bold text-white/75 uppercase tracking-[0.08em] drop-shadow-xs">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const pathOnly = item.href.split('?')[0];
                const isActive = item.href === "/reservations"
                  ? pathname === "/reservations" || pathname.startsWith("/reservations/")
                  : pathname === pathOnly || pathname.startsWith(pathOnly + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onMouseEnter={() => {
                      try {
                        router.prefetch(item.href);
                      } catch {
                        // ignore
                      }
                    }}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium transition-all group rounded-lg",
                      isActive 
                        ? "bg-white/20 text-white font-semibold shadow-xs border-l-[3px] border-white pl-[9px] backdrop-blur-xs" 
                        : "text-white/80 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-4 w-4 shrink-0 transition-colors stroke-[1.75]",
                        isActive ? "text-white" : "text-white/75 group-hover:text-white"
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

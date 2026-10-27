"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { 
  LayoutDashboard, CalendarCheck, Users, BedDouble, 
  Sparkles, Wrench, UtensilsCrossed, FileText, 
  CreditCard, Package, UserCog, Building2, GitBranch, Building, Layers, Tag, BedSingle, DollarSign,
  Shield, Lock, ClipboardList,
  CalendarDays, ShoppingCart, Bed, LogOut,
  ShoppingBag, Users2,
  BarChart2, Bell,
  Globe, Puzzle, GitMerge, Cpu, CreditCard as SubscriptionIcon,
  TrendingUp, ShieldCheck, QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { isRouteAuthorized } from "@/lib/rbac";

const NAV_GROUPS = [
  {
    title: "Hotel Setup",
    items: [
      { name: "Hotel Config", href: "/hotel", icon: Building2 },
      { name: "Branches", href: "/branches", icon: GitBranch },
      { name: "Buildings", href: "/buildings", icon: Building },
      { name: "Floors", href: "/floors", icon: Layers },
    ]
  },
  {
    title: "Room Setup",
    items: [
      { name: "Room Types", href: "/room-types", icon: BedDouble },
      { name: "Room Categories", href: "/room-categories", icon: Tag },
      { name: "Bed Types", href: "/bed-types", icon: BedSingle },
      { name: "Amenities", href: "/room-amenities", icon: Sparkles },
      { name: "Pricing", href: "/room-pricing", icon: DollarSign },
    ]
  },
  {
    title: "Front Desk",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Guests", href: "/guests", icon: Users },
      { name: "Rooms", href: "/rooms", icon: BedDouble },
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
      { name: "Restaurant", href: "/restaurant", icon: UtensilsCrossed },
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
      { name: "Employees", href: "/employees", icon: UserCog },
      { name: "HR", href: "/hr", icon: Users2 },
      { name: "Users", href: "/users", icon: Shield },
      { name: "Roles", href: "/roles", icon: Lock },
      { name: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
    ]
  },
  {
    title: "Enterprise",
    items: [
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "BI Dashboard", href: "/bi", icon: TrendingUp },
      { name: "Security", href: "/security", icon: ShieldCheck },
    ]
  },
  {
    title: "SaaS Platform",
    items: [
      { name: "Tenants", href: "/tenants", icon: Globe },
      { name: "Organizations", href: "/organizations", icon: Building2 },
      { name: "Subscriptions", href: "/subscriptions", icon: SubscriptionIcon },
      { name: "Workflows", href: "/workflows", icon: GitMerge },
      { name: "Modules", href: "/module-config", icon: Cpu },
      { name: "Plugins", href: "/plugins", icon: Puzzle },
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

  // Filter navigation groups based on role authorization
  const filteredNavGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => {
      const authorizedItems = group.items.filter((item) => {
        const pathOnly = item.href.split('?')[0];
        return isRouteAuthorized(currentRole, pathOnly);
      });
      return {
        ...group,
        items: authorizedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [currentRole]);

  return (
    <aside className="w-64 flex flex-col bg-[#071039] border-r border-[#0F2270] h-screen sticky top-0 overflow-y-auto z-20 select-none">
      {/* Brand Header */}
      <div className="flex items-center px-6 py-5 border-b border-[#0F2270] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#1A3BB0] flex items-center justify-center text-white mr-3 shadow-xs">
          <Building2 className="h-4 w-4 stroke-[1.5] text-[#AFC5F8]" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white block">
            Nexus HMS
          </span>
        </div>
      </div>
      
      {/* Nav Groups */}
      <div className="flex-1 py-5 px-3 space-y-6">
        {filteredNavGroups.map((group) => (
          <div key={group.title}>
            <h4 className="px-3 mb-2 text-[11px] font-bold text-[#6E92F2] uppercase tracking-[0.08em]">
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
                      "flex items-center px-3 py-2 text-sm font-medium transition-all group",
                      isActive 
                        ? "bg-gradient-to-r from-blue-700/80 via-blue-800/40 to-transparent text-white border-l-[3px] border-blue-400 pl-[9px] rounded-r-lg font-semibold" 
                        : "text-[#AFC5F8] hover:bg-white/5 hover:text-white rounded-lg"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-4 w-4 shrink-0 transition-colors stroke-[1.5]",
                        isActive ? "text-[#6E92F2]" : "text-[#AFC5F8] group-hover:text-white"
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

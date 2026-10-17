"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, CalendarCheck, Users, BedDouble, 
  Sparkles, Wrench, UtensilsCrossed, FileText, 
  CreditCard, Package, UserCog, Building2, GitBranch, Building, Layers, Tag, BedSingle, DollarSign,
  Shield, Lock, ClipboardList,
  CalendarSearch, UserPlus, LogIn, LogOut, Bed, CalendarDays, ShoppingCart, ConciergeBell,
  ShoppingBag, Car, Users2,
  MessageSquare, BarChart2, FolderOpen, Bell,
  Globe, Puzzle, GitMerge, Cpu, CreditCard as SubscriptionIcon,
  TrendingUp, ShieldCheck,
} from "lucide-react";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    ]
  },
  {
    title: "Front Office",
    items: [
      { name: "Front Office", href: "/front-office", icon: LayoutDashboard },
      { name: "Availability", href: "/availability", icon: CalendarSearch },
      { name: "Walk-in", href: "/walk-in", icon: UserPlus },
      { name: "Check-in", href: "/check-in", icon: LogIn },
      { name: "Check-out", href: "/check-out", icon: LogOut },
      { name: "Stay Management", href: "/stay", icon: Bed },
    ]
  },
  {
    title: "Reservations",
    items: [
      { name: "Reservations", href: "/reservations", icon: CalendarCheck },
      { name: "Res. Calendar", href: "/reservations/calendar", icon: CalendarDays },
    ]
  },
  {
    title: "Operations",
    items: [
      { name: "Housekeeping", href: "/housekeeping", icon: Sparkles },
      { name: "Maintenance", href: "/maintenance", icon: Wrench },
      { name: "Restaurant", href: "/restaurant", icon: UtensilsCrossed },
      { name: "POS", href: "/pos", icon: ShoppingCart },
      { name: "Room Service", href: "/room-service", icon: ConciergeBell },
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
      { name: "Transport", href: "/transport", icon: Car },
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
      { name: "Customer Service", href: "/customer-service", icon: MessageSquare },
      { name: "Reports", href: "/reports", icon: BarChart2 },
      { name: "Search", href: "/search", icon: SearchIcon },
      { name: "Documents", href: "/documents", icon: FolderOpen },
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
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
        <BedDouble className="h-6 w-6 text-primary mr-3" />
        <span className="font-bold text-lg tracking-tight">Nexus HMS</span>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-8">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="px-2 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === "/reservations/calendar"
                  ? pathname === item.href || pathname.startsWith(item.href + "/")
                  : item.href === "/reservations"
                  ? pathname === "/reservations" || (pathname.startsWith("/reservations/") && !pathname.startsWith("/reservations/calendar"))
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      "flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-text hover:bg-muted hover:text-text"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-primary" : "text-text-muted group-hover:text-text")} />
                    {item.name}
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

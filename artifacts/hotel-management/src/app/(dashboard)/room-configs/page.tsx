"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BedSingle, Sparkles, DollarSign } from "lucide-react";
import { BedTypesTab } from "@/components/rooms/BedTypesTab";
import { AmenitiesTab } from "@/components/rooms/AmenitiesTab";
import { PricingTab } from "@/components/rooms/PricingTab";

function RoomConfigsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const initialTab = tabParam === "amenities" ? "amenities" : tabParam === "pricing" ? "pricing" : "beds";
  const [activeTab, setActiveTab] = useState<"beds" | "amenities" | "pricing">(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "amenities" && activeTab !== "amenities") {
      setActiveTab("amenities");
    } else if (currentTab === "pricing" && activeTab !== "pricing") {
      setActiveTab("pricing");
    } else if ((!currentTab || currentTab === "beds") && activeTab !== "beds") {
      setActiveTab("beds");
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tab: "beds" | "amenities" | "pricing") => {
    setActiveTab(tab);
    const url = tab === "beds" ? "/room-configs" : `/room-configs?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Room Configurations</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => handleTabChange("beds")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "beds"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <BedSingle className="h-4 w-4" />
          <span>Bed Types</span>
        </button>
        <button
          onClick={() => handleTabChange("amenities")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "amenities"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Amenities</span>
        </button>
        <button
          onClick={() => handleTabChange("pricing")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "pricing"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Pricing Rules</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "beds" && <BedTypesTab />}
      {activeTab === "amenities" && <AmenitiesTab />}
      {activeTab === "pricing" && <PricingTab />}
    </div>
  );
}

export default function RoomConfigsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading configurations...</div>}>
      <RoomConfigsContent />
    </Suspense>
  );
}

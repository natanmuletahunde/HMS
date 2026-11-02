"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Search, Plus, Sparkles } from "lucide-react";

export interface SpecialRequestCategory {
  category: string;
  items: string[];
}

export const SPECIAL_REQUEST_CATALOG: SpecialRequestCategory[] = [
  {
    category: "🛏️ Room Amenities & Comfort",
    items: [
      "Extra Feather Pillows (x2)",
      "Extra Warm Wool Blanket",
      "Fresh Bath Towels & Robe Set",
      "Baby Cot / Crib Setup",
      "Room Evening Turn-down Service",
    ],
  },
  {
    category: "🛎️ Guest & Stay Services",
    items: [
      "Quiet Room / High Floor Preference",
      "Early Check-In Request",
      "Late Check-Out Request",
      "Morning Wake-up Call",
      "Express Laundry & Pressing ($12.00)",
      "AC / Climate Adjustment Assistance",
    ],
  },
  {
    category: "🚗 Airport & Chauffeur Transport",
    items: [
      "Airport Arrival VIP Meet & Pickup (3,750 ETB)",
      "Airport Chauffeur Drop-off (3,000 ETB)",
      "Complimentary Downtown / UNECA Shuttle",
      "Half-Day City Tour Chauffeur (6,800 ETB)",
      "Luggage & Bellhop Vehicle Dispatch",
    ],
  },
  {
    category: "🍽️ In-Room Dining & Breakfast",
    items: [
      "Traditional Doro Wat Feast ($18.50)",
      "Deluxe Angus Burger & Fries ($14.00)",
      "Continental Club Sandwich ($11.50)",
      "Fresh Seasonal Fruit Platter ($8.00)",
      "Signature Ethiopian Jebena Coffee ($4.50)",
      "Fresh Mango & Avocado Smoothie ($5.50)",
      "Sparkling Mineral Water (750ml, $3.50)",
    ],
  },
];

interface SpecialRequestsMultiSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function SpecialRequestsMultiSelect({
  value = "",
  onChange,
  placeholder = "",
  id,
  className = "",
}: SpecialRequestsMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customText, setCustomText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value into array of selected items
  const selectedItems = useMemo(() => {
    if (!value || typeof value !== "string") return [];
    return value
      .split(/[,;]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleItem = (item: string) => {
    const exists = selectedItems.includes(item);
    let next: string[];
    if (exists) {
      next = selectedItems.filter((i) => i !== item);
    } else {
      next = [...selectedItems, item];
    }
    onChange(next.join(", "));
  };

  const handleAddCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (!selectedItems.includes(trimmed)) {
      const next = [...selectedItems, trimmed];
      onChange(next.join(", "));
    }
    setCustomText("");
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleRemoveChip = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const next = selectedItems.filter((i) => i !== item);
    onChange(next.join(", "));
  };

  // Filter catalog items by search term
  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return SPECIAL_REQUEST_CATALOG;
    const lower = searchTerm.toLowerCase();
    return SPECIAL_REQUEST_CATALOG.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.toLowerCase().includes(lower)),
    })).filter((cat) => cat.items.length > 0);
  }, [searchTerm]);

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`} id={id}>
      {/* Trigger Button (Single Form Input) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-full rounded-md border border-border bg-white dark:bg-[#0E172E] px-3 py-2 text-sm shadow-xs cursor-pointer flex items-center justify-between gap-2 hover:border-primary/50 transition-colors"
      >
        <div className="flex-1 flex items-center overflow-hidden">
          {selectedItems.length === 0 && placeholder ? (
            <span className="text-muted-foreground text-xs sm:text-sm select-none">{placeholder}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer rounded hover:bg-muted"
              title="Clear all selected requests"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Selected Items Chips Display */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {selectedItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 shadow-2xs"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveChip(e, item)}
                className="hover:text-destructive hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                title={`Remove ${item}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Menu with Checkboxes */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-white dark:bg-[#0E172E] shadow-2xl p-2.5 space-y-3 animate-in fade-in-0 zoom-in-95">
          {/* Header & Quick Filter */}
          <div className="space-y-2 pb-2 border-b border-border">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Special Requests Catalog
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-2 text-xs rounded-md border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Catalog Checkbox Groups */}
          <div className="space-y-3.5 max-h-52 overflow-y-auto pr-1">
            {filteredCatalog.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No matching requests found for &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filteredCatalog.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="text-[11px] font-bold text-foreground px-1 select-none sticky top-0 bg-white/90 dark:bg-[#0E172E]/90 backdrop-blur-xs py-0.5">
                    {cat.category}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {cat.items.map((item) => {
                      const isChecked = selectedItems.includes(item);
                      return (
                        <div
                          key={item}
                          onClick={() => toggleItem(item)}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                            isChecked
                              ? "bg-primary/10 border-primary/40 text-primary font-medium"
                              : "border-border/60 hover:border-border hover:bg-muted/40 text-foreground"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-colors ${
                              isChecked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="leading-snug">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Custom Request Input (+ Other) */}
          <div className="pt-2 border-t border-border flex items-center gap-1.5">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-8 px-2.5 text-xs rounded-md border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customText.trim()}
              className="h-8 px-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

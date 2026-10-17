"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Calendar, Bed, Package, Building, UserCheck, MessageCircle, Car, ChevronRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; href: string }> = {
  guest: { icon: User, href: "/guests" },
  reservation: { icon: Calendar, href: "/reservations" },
  room: { icon: Bed, href: "/rooms" },
  inventory: { icon: Package, href: "/inventory" },
  supplier: { icon: Building, href: "/procurement" },
  employee: { icon: UserCheck, href: "/employees" },
  complaint: { icon: MessageCircle, href: "/customer-service" },
  vehicle: { icon: Car, href: "/transport" },
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
        setResults(Array.isArray(data) ? data : []);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  function handleClick(result: SearchResult) {
    const config = TYPE_CONFIG[result.type];
    if (config) {
      router.push(`${config.href}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Global Search</h1>
        <p className="text-text-muted">Search across all hotel management modules</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guests, reservations, rooms, employees..."
          className="pl-10 h-12 text-base"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-text-muted" />
        )}
      </div>

      {query.length < 2 && !searched && (
        <div className="text-center py-12 text-text-muted">
          <Search className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>Start typing to search across all modules</p>
        </div>
      )}

      {searched && results.length === 0 && !isLoading && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const config = TYPE_CONFIG[type];
        const Icon = config?.icon ?? Package;
        const sectionLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
        return (
          <div key={type} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">{sectionLabel}</h2>
            <div className="rounded-lg border border-border bg-surface overflow-hidden divide-y divide-border">
              {items.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{result.label}</p>
                    {result.sublabel && <p className="text-xs text-text-muted truncate">{result.sublabel}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

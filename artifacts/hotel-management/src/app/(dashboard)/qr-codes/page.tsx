"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  QrCode,
  Printer,
  Download,
  Copy,
  ExternalLink,
  Hotel,
  Sparkles,
  BedDouble,
  Wifi,
  Phone,
  Utensils,
  RefreshCw,
  Loader2,
  Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function QrCodesPage() {
  const { toast } = useToast();

  const [mode, setMode] = useState<"lobby" | "room">("room");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("101");
  const [customHost, setCustomHost] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch rooms list
  const { data: rawRooms = [], isLoading: roomsLoading } = useQuery<any>({
    queryKey: ["rooms"],
    queryFn: () => apiFetch<any>("/rooms"),
  });
  const rooms: any[] = Array.isArray(rawRooms)
    ? rawRooms
    : Array.isArray(rawRooms?.data)
      ? rawRooms.data
      : [];

  // Determine target URL
  const [origin, setOrigin] = useState("http://localhost:3000");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const effectiveHost = customHost.trim() || origin;
  const targetUrl =
    mode === "room"
      ? `${effectiveHost}/?room=${encodeURIComponent(selectedRoomNumber)}`
      : `${effectiveHost}/`;

  // Fetch generated QR Code from API
  const { data: qrData, isLoading: qrLoading, refetch } = useQuery({
    queryKey: ["qr-code", targetUrl],
    queryFn: async () => {
      const res = await fetch(`/api/guest-portal/qr-code?url=${encodeURIComponent(targetUrl)}`);
      return res.json();
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    toast({ title: "Link Copied!", description: targetUrl });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrData?.qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrData.qrCodeDataUrl;
    a.download = `nexus-guest-qr-${mode === "room" ? `room-${selectedRoomNumber}` : "lobby"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "QR Code Downloaded", description: "Saved as PNG image" });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header (hidden in print) with integrated sleek toolbar */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <QrCode className="h-5 w-5 text-amber-500" />
            Guest QR Codes & Room Placards
          </h1>
        </div>

        {/* Sleek Top Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
            <Button
              type="button"
              size="sm"
              variant={mode === "room" ? "default" : "ghost"}
              className={`h-8 text-xs font-semibold ${mode === "room" ? "bg-amber-500 text-slate-950 hover:bg-amber-600" : ""}`}
              onClick={() => setMode("room")}
            >
              <BedDouble className="mr-1.5 h-3.5 w-3.5" /> In-Room
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "lobby" ? "default" : "ghost"}
              className={`h-8 text-xs font-semibold ${mode === "lobby" ? "bg-amber-500 text-slate-950 hover:bg-amber-600" : ""}`}
              onClick={() => setMode("lobby")}
            >
              <Hotel className="mr-1.5 h-3.5 w-3.5" /> Lobby
            </Button>
          </div>

          {/* Room Selector if room mode */}
          {mode === "room" && (
            <Select value={selectedRoomNumber} onValueChange={setSelectedRoomNumber}>
              <SelectTrigger className="h-8 text-xs w-[130px] font-semibold bg-surface">
                <SelectValue placeholder="Room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.length > 0 ? (
                  rooms.map((r) => (
                    <SelectItem key={r.id} value={r.number || r.roomNumber || r.id}>
                      Room {r.number || r.roomNumber}
                    </SelectItem>
                  ))
                ) : (
                  ["101", "102", "103", "104", "201", "202"].map((num) => (
                    <SelectItem key={num} value={num}>
                      Room {num}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}

          {/* Quick Copy Link & Open Link */}
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="h-8 text-xs px-2" title="Open Link">
            <a href={targetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Actions: Download & Print */}
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!qrData?.qrCodeDataUrl} className="h-8 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
          </Button>
          <Button size="sm" onClick={handlePrint} className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Main Content: Pure Centered QR Placard */}
      <div className="flex items-center justify-center py-4">
        <div
          id="printable-placard"
          className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none"
        >
          {/* Placard Top Banner */}
          <div className="bg-slate-950 text-white p-6 text-center space-y-2 border-b border-amber-500/40">
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Hotel className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-wider text-amber-400">NEXUS HOTEL & SUITES</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                Smart Guest Portal
              </p>
            </div>

            {mode === "room" ? (
              <div className="pt-1">
                <span className="inline-block bg-amber-500 text-slate-950 font-black text-sm px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  ROOM {selectedRoomNumber}
                </span>
              </div>
            ) : (
              <div className="pt-1">
                <span className="inline-block bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  WELCOME GUEST
                </span>
              </div>
            )}
          </div>

          {/* Placard Body */}
          <div className="p-8 text-center space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                {mode === "room" ? "Scan for Hotel Services & Bookings" : "Welcome to Nexus Hotel"}
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Point your smartphone camera at the QR code below to access our portal and book reservations directly.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="relative mx-auto w-64 h-64 bg-slate-50 p-4 rounded-2xl border-2 border-slate-900 shadow-inner flex items-center justify-center">
              {qrLoading ? (
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
              ) : qrData?.qrCodeDataUrl ? (
                <img
                  src={qrData.qrCodeDataUrl}
                  alt="Guest Portal QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <span className="text-xs text-red-500">Failed to render QR</span>
              )}
            </div>
          </div>

          {/* Placard Footer */}
          <div className="bg-slate-100 p-3.5 text-center text-[10px] text-slate-500 border-t border-slate-200">
            Need assistance? Dial <strong>0</strong> from your room phone or visit the Front Desk.
          </div>
        </div>
      </div>
    </div>
  );
}

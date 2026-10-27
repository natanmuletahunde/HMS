"use client";

import { useState, useRef } from "react";
import {
  QrCode,
  Upload,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type ParsedFaydaGuest,
  processFaydaFile,
} from "@/lib/fayda";

interface FaydaScannerProps {
  onDecoded: (data: ParsedFaydaGuest) => void;
  onClear?: () => void;
  className?: string;
}

export function FaydaScanner({ onDecoded, onClear, className = "" }: FaydaScannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedGuest, setDecodedGuest] = useState<ParsedFaydaGuest | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const res = await processFaydaFile(file);
      if (res.success && res.data) {
        setDecodedGuest(res.data);
        onDecoded(res.data);
      } else {
        setError(res.error || "Failed to decode Fayda card");
      }
    } catch (err: any) {
      setError(err?.message || "Error reading file");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDecodedGuest(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onClear) onClear();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`rounded-xl border transition-all p-3.5 shadow-sm ${
        isDragging
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-background to-emerald-950/10"
      } ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Main Bar: Header & Single Upload Photo Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold shrink-0">
            <QrCode className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Fayda National ID Scan</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                🇪🇹 NIDP Ethiopia
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                Auto-Fill
              </Badge>
            </div>
          </div>
        </div>

        {/* Single Scan / Upload Button */}
        {!decodedGuest && (
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="h-8 text-xs px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload Photo
              </>
            )}
          </Button>
        )}
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 p-3 bg-surface/70 rounded-lg border border-border/80 text-xs text-foreground animate-pulse">
          <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
          <span>Decoding Fayda QR code & verifying cryptographic signature...</span>
        </div>
      )}

      {/* Decoded success state */}
      {!loading && decodedGuest && (
        <div className="mt-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Face photo or avatar */}
              <div className="h-12 w-12 rounded-lg overflow-hidden border border-emerald-500/30 bg-surface flex items-center justify-center shrink-0">
                {decodedGuest.faceBase64 ? (
                  <img
                    src={`data:image/${decodedGuest.faceFormat || "webp"};base64,${decodedGuest.faceBase64}`}
                    alt="Fayda Biometric Face"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCheck className="h-6 w-6 text-emerald-600" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{decodedGuest.fullName}</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    ✓ NIDP Verified
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  <span>FAN: <strong className="text-foreground">{decodedGuest.fan}</strong></span>
                  <span>•</span>
                  <span>Gender: <strong className="text-foreground capitalize">{decodedGuest.gender}</strong></span>
                  {decodedGuest.phone && (
                    <>
                      <span>•</span>
                      <span>Phone: <strong className="text-foreground">{decodedGuest.phone}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                Form Auto-Filled
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Scan Another
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error state with test option */}
      {!loading && error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Fayda Scan: </span>
              {error}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                setError(null);
                setLoading(true);
                const { SAMPLE_FAYDA_PAYLOADS, processFaydaQrText } = await import("@/lib/fayda");
                const res = processFaydaQrText(SAMPLE_FAYDA_PAYLOADS[0].payload);
                if (res.success && res.data) {
                  setDecodedGuest(res.data);
                  onDecoded(res.data);
                }
                setLoading(false);
              }}
              className="h-7 text-[11px] px-2.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
            >
              Use Sample Test Card
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StatusPillProps {
  status: string;
  className?: string;
  variant?: "success" | "warning" | "danger" | "neutral" | "brand";
}

export function StatusPill({ status, className, variant }: StatusPillProps) {
  const norm = (status || "").toLowerCase().trim();

  let resolvedVariant = variant;
  if (!resolvedVariant) {
    if (["active", "enabled", "confirmed", "available", "paid", "ready", "verified"].includes(norm)) {
      resolvedVariant = "success";
    } else if (["pending", "maintenance", "cleaning", "hold", "partially_paid"].includes(norm)) {
      resolvedVariant = "warning";
    } else if (["inactive", "suspended", "cancelled", "blocked", "out_of_service", "failed"].includes(norm)) {
      resolvedVariant = "danger";
    } else {
      resolvedVariant = "neutral";
    }
  }

  const variantStyles = {
    success: "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
    warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
    danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]",
    neutral: "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]",
    brand: "bg-[var(--blue-50)] text-[var(--blue-700)] border-[var(--border)] dark:text-[var(--blue-400)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors select-none",
        variantStyles[resolvedVariant],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span className="capitalize">{norm.replace(/_/g, " ")}</span>
    </span>
  );
}

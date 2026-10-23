"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1.5 mb-6", className)}>
      {breadcrumb && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {breadcrumb}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Copy, Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoCardRow {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  copyValue?: string;
  isMono?: boolean;
}

export interface InfoCardProps {
  title: string;
  icon: LucideIcon;
  rows: InfoCardRow[];
  action?: React.ReactNode;
  className?: string;
}

export function InfoCard({
  title,
  icon: Icon,
  rows,
  action,
  className,
}: InfoCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    if (!text || typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md",
        className
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--blue-50)] text-[var(--blue-700)] dark:text-[var(--blue-400)] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 stroke-[2]" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {title}
          </h3>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Card Rows (Clean 50px height with hairline separators) */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {rows.map((row, idx) => {
          const stringVal = typeof row.value === "string" ? row.value : String(row.copyValue || "");
          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className="group min-h-[50px] py-3 flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-[var(--text-secondary)] text-xs sm:text-sm shrink-0">
                {row.label}
              </span>

              <div className="flex items-center gap-2 overflow-hidden text-right">
                <span
                  className={cn(
                    "font-semibold text-[var(--text-primary)] truncate text-sm",
                    row.isMono && "font-mono text-xs tracking-tight bg-[var(--blue-50)] px-2.5 py-0.5 rounded-md text-[var(--blue-700)] dark:text-[var(--blue-200)] border border-[var(--border)]"
                  )}
                >
                  {row.value ?? "—"}
                </span>

                {row.copyable && stringVal && stringVal !== "—" && (
                  <button
                    type="button"
                    onClick={() => handleCopy(row.copyValue || stringVal, idx)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-[var(--blue-50)] text-[var(--text-secondary)] hover:text-[var(--blue-700)] transition-all cursor-pointer"
                    title={`Copy ${row.label}`}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

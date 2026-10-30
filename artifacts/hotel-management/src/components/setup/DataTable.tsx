"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries available to display at this time.",
  emptyAction,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 5,
  onPrev,
  onNext,
  className,
}: DataTableProps<T>) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Header row: subtle neutral with uppercase 11px labels */}
          <thead>
            <tr className="bg-[var(--bg-page)] border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "h-11 px-6 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="h-14">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-6 py-3">
                      <div className="h-5 rounded-md bg-[var(--surface-hover)] animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 px-6 text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--blue-50)] text-[var(--blue-700)] dark:text-[var(--blue-400)] flex items-center justify-center mb-3">
                    <Inbox className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    {emptyTitle}
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
                    {emptyDescription}
                  </p>
                  {emptyAction && <div>{emptyAction}</div>}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={item.id ?? rowIdx}
                  className="h-14 transition-colors hover:bg-[var(--surface-hover)]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-6 py-3.5 text-[var(--text-primary)] align-middle",
                        col.className
                      )}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quiet Footer with pagination */}
      <div className="px-6 py-3.5 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end gap-3 text-xs text-[var(--text-secondary)]">

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={onPrev}
              disabled={currentPage <= 1}
              className="px-2.5 h-8 rounded-lg border border-[var(--border)] flex items-center gap-1 font-mono text-xs font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>&lt;-</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentPage >= totalPages}
              className="px-2.5 h-8 rounded-lg border border-[var(--border)] flex items-center gap-1 font-mono text-xs font-semibold hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <span>-&gt;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

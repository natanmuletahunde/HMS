"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onPageChange?: (page: number) => void;
  className?: string;
  pagination?: any;
  showEntriesCount?: boolean;
}

export function TablePagination(props: TablePaginationProps) {
  const p = props.pagination || props;
  const currentPage = p.currentPage ?? 1;
  const totalPages = p.totalPages ?? 1;
  const totalItems = p.totalItems;
  const pageSize = Math.min(Math.max(1, p.pageSize ?? 5), 5);
  const onPrev = p.onPrev ?? (() => {});
  const onNext = p.onNext ?? (() => {});
  const className = props.className;
  const showEntriesCount = p.showEntriesCount ?? true;

  // If explicitly 0 items or total items fit on a single page, don't show pagination
  if (totalItems !== undefined && totalItems <= pageSize) return null;
  if (totalPages !== undefined && totalPages <= 1 && (totalItems === undefined || totalItems <= pageSize)) return null;

  const validTotalPages = Math.max(1, totalPages || 1);
  const start = totalItems !== undefined ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : (currentPage - 1) * pageSize + 1;
  const end = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-border bg-surface text-sm text-text-muted rounded-b-xl select-none",
        className
      )}
    >
      <div className="text-xs sm:text-sm font-medium">
        {totalItems !== undefined ? (
          <>
            Showing <span className="font-semibold text-text">{start}</span> to{" "}
            <span className="font-semibold text-text">{end}</span> of{" "}
            <span className="font-semibold text-text">{totalItems}</span> entries (Limit: 5)
          </>
        ) : (
          <>
            Page <span className="font-semibold text-text">{currentPage}</span> of{" "}
            <span className="font-semibold text-text">{validTotalPages}</span> (Limit: 5)
          </>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="h-8 px-2.5 flex items-center gap-1.5 hover:bg-muted transition-colors rounded-lg font-mono text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
          title="Previous page"
          aria-label="Previous page"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>&lt;-</span>
        </Button>

        <div className="text-xs font-semibold px-2.5 py-1 rounded bg-muted/50 border border-border text-text">
          {currentPage} / {validTotalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage >= validTotalPages}
          className="h-8 px-2.5 flex items-center gap-1.5 hover:bg-muted transition-colors rounded-lg font-mono text-xs font-semibold cursor-pointer disabled:cursor-not-allowed"
          title="Next page"
          aria-label="Next page"
        >
          <span>-&gt;</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

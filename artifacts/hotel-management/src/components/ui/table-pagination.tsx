"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPrev: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 5,
  onPrev,
  onNext,
  className,
}: TablePaginationProps) {
  // If explicitly 0 items, don't show pagination
  if (totalItems !== undefined && totalItems === 0) return null;

  const validTotalPages = Math.max(1, totalPages || 1);
  const start = totalItems !== undefined ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : (currentPage - 1) * pageSize + 1;
  const end = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-border bg-surface text-sm text-text-muted rounded-b-md select-none",
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
          className="h-8 px-3 text-xs flex items-center gap-1.5 hover:bg-muted font-medium transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <div className="text-xs font-semibold px-2.5 py-1 rounded bg-muted/50 border border-border text-text">
          {currentPage} / {validTotalPages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage >= validTotalPages}
          className="h-8 px-3 text-xs flex items-center gap-1.5 hover:bg-muted font-medium transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

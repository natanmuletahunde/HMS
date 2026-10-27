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
  const pageSize = p.pageSize ?? 5;
  const onPrev = p.onPrev ?? (() => {});
  const onNext = p.onNext ?? (() => {});
  const className = props.className;
  const showEntriesCount = p.showEntriesCount ?? false;

  // If explicitly 0 items, don't show pagination
  if (totalItems !== undefined && totalItems === 0) return null;

  const validTotalPages = Math.max(1, totalPages || 1);
  const start = totalItems !== undefined ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : (currentPage - 1) * pageSize + 1;
  const end = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-4 px-4 py-3 border-t border-border bg-surface text-sm text-text-muted rounded-b-md select-none",
        className
      )}
    >
      {showEntriesCount && (
        <div className="text-xs sm:text-sm font-medium mr-auto">
          {totalItems !== undefined ? (
            <>
              Showing <span className="font-semibold text-text">{start}</span> to{" "}
              <span className="font-semibold text-text">{end}</span> of{" "}
              <span className="font-semibold text-text">{totalItems}</span> entries (Limit: {pageSize})
            </>
          ) : (
            <>
              Page <span className="font-semibold text-text">{currentPage}</span> of{" "}
              <span className="font-semibold text-text">{validTotalPages}</span> (Limit: {pageSize})
            </>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="h-8 w-8 hover:bg-muted transition-colors rounded-md"
          title="Previous page"
          aria-label="Previous page"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="text-xs font-semibold px-2.5 py-1 rounded bg-muted/50 border border-border text-text">
          {currentPage} / {validTotalPages}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={currentPage >= validTotalPages}
          className="h-8 w-8 hover:bg-muted transition-colors rounded-md"
          title="Next page"
          aria-label="Next page"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

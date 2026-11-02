import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(items: T[] = [], pageSize: number = 5) {
  // Enforce system-wide limit of 5 entries per page
  const limit = Math.min(Math.max(1, pageSize || 5), 5);
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  // Reset to valid range if items length drops
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const startIndex = (currentPage - 1) * limit;
    return items.slice(startIndex, startIndex + limit);
  }, [items, currentPage, limit]);

  const onPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const onNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize: limit,
    paginatedItems,
    onPrev,
    onNext,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

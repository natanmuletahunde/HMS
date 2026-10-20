import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(items: T[] = [], pageSize: number = 5) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to valid range if items length drops
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const onPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const onNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    onPrev,
    onNext,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

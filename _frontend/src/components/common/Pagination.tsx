import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ currentPage, totalPage, onPageChange, isLoading }: PaginationProps) {
  const safeTotalPage = Math.max(1, totalPage);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPage) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-between border-t border-(--border-color) bg-(--bg-card) px-5 py-4">
      <span className="text-xs font-medium text-(--text-secondary)">
        Page <span className="text-(--text-primary)">{currentPage}</span> of {safeTotalPage}
      </span>
      <div className="flex gap-2">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1 || isLoading}
          className="flex items-center gap-1 rounded-lg border border-(--btn-border) bg-(--bg-main) px-3 py-1.5 text-xs font-bold text-(--text-secondary) transition-all hover:bg-(--bg-card) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          Prev
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage >= safeTotalPage || isLoading}
          className="flex items-center gap-1 rounded-lg border border-(--btn-border) bg-(--bg-main) px-3 py-1.5 text-xs font-bold text-(--text-secondary) transition-all hover:bg-(--bg-card) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

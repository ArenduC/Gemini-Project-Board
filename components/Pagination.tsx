import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

// Helper to generate page numbers with ellipses
const generatePageNumbers = (currentPage: number, totalPages: number, pageNeighbours: number = 1): (number | string)[] => {
    const totalNumbers = (pageNeighbours * 2) + 3;
    const totalBlocks = totalNumbers + 2;

    if (totalPages > totalBlocks) {
        const startPage = Math.max(2, currentPage - pageNeighbours);
        const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
        let pages: (number | string)[] = [1];

        if (startPage > 2) {
            pages.push('...');
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        if (endPage < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);
        return pages;
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
};


export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems
}) => {
  if (totalPages <= 1) {
    return null;
  }
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between mt-4 text-xs">
      <div className="text-gray-400">
        Showing <span className="font-semibold text-white">{startItem}</span> to <span className="font-semibold text-white">{endItem}</span> of <span className="font-semibold text-white">{totalItems}</span> results
      </div>
      <nav className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-white bg-gray-800/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={`${page}-${index}`}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-md transition-colors ${
                  currentPage === page
                    ? 'bg-gray-300 text-black font-bold'
                    : 'bg-gray-800/50 text-white hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                ...
              </span>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-white bg-gray-800/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          Next
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
};

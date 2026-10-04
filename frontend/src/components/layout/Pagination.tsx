"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  goToPage: (page: number) => void;
  pageNumbers: number[];
}

export default function Pagination({
  page,
  totalPages,
  goToPage,
  pageNumbers,
}: PaginationProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 md:flex-row">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="rounded-xl border border-gray-200 cursor-pointer p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>

        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => goToPage(pageNumber)}
            className={`rounded-xl cursor-pointer px-3 py-2 text-sm font-semibold transition ${
              pageNumber === page
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-xl border border-gray-200 cursor-pointer p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

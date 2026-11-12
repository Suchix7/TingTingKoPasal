"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

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
  const { t } = useLang();
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the current page visible inside the scrollable strip on small screens.
  useEffect(() => {
    const strip = stripRef.current;
    const active = activeRef.current;
    if (!strip || !active) return;
    const target =
      active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [page, pageNumbers]);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 md:flex-row">
      <p className="shrink-0 text-sm text-gray-500">
        {t("Page")} {page} / {totalPages}
      </p>

      <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="shrink-0 rounded-xl border border-gray-200 cursor-pointer p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={stripRef}
          className="relative flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              ref={pageNumber === page ? activeRef : undefined}
              onClick={() => goToPage(pageNumber)}
              className={`shrink-0 rounded-xl cursor-pointer px-3 py-2 text-sm font-semibold transition ${
                pageNumber === page
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="shrink-0 rounded-xl border border-gray-200 cursor-pointer p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

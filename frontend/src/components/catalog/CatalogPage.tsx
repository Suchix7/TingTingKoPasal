"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  useCatalogCategories,
  useCatalogModels,
  useCovers,
} from "@/hooks/useCatalog";
import type { CatalogCategory, Cover } from "@/hooks/useCatalog";
import { useDebounced } from "@/hooks/useDebounced";
import { coverImage } from "./image";
import { pcs } from "./format";
import CoverViewer from "./CoverViewer";
import FilterSheet from "./FilterSheet";

const inStockModels = (c: Cover) => c.models.filter((m) => m.quantity > 0);

// chips shown on a card; the full list is in the full-screen view
const MAX_CHIPS = 3;

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  const q = useDebounced(search.trim(), 350);

  // phone back button returns to the menu instead of leaving the site
  const pick = (id: string) => {
    window.history.pushState({ category: id }, "");
    setCategory(id);
    setModels([]);
    setSearch("");
    window.scrollTo({ top: 0 });
  };
  const back = () => window.history.back();
  useEffect(() => {
    const onPop = () => {
      setCategory("");
      setModels([]);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const { data: modelList = [] } = useCatalogModels(category);
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCatalogCategories();

  // landing screen: the category menu, until a category is picked or a search is typed
  const showMenu = !category && !q;
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCovers({ q, models, category }, !showMenu);

  const covers = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );
  const total = data?.pages[0]?.pagination.total ?? 0;
  const suggestions = data?.pages[0]?.suggestions ?? [];
  const fuzzy = Boolean(data?.pages[0]?.fuzzy);

  // load the next page when the sentinel scrolls into view
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, covers.length]);

  const categoryName = categories.find((c) => c.id === category)?.name;
  // phone cases are matched to phone models; accessories are plain items
  const isCase = /case|cover/i.test(categoryName ?? "");
  const noun = isCase ? "case" : "item";
  const activeCount = models.length;

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pb-3 pt-3">
          <div className="mb-3 flex items-center gap-2.5">
            {category && (
              <button
                type="button"
                onClick={back}
                className="-ml-2 shrink-0 rounded-full p-2 text-gray-700 active:bg-gray-100"
                aria-label="Back to categories"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Ting Ting ko pasal"
              width={48}
              height={48}
              className="h-11 w-11 shrink-0 rounded-full sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-gray-900 sm:text-lg">
                {category ? (categoryName ?? "Items") : "Ting Ting ko pasal"}
              </h1>
              <p className="truncate text-xs leading-tight text-gray-500">
                {category ? "Ting Ting ko pasal" : "Mobile cases & accessories"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search design or phone, e.g. Hello Kitty, iPhone 14"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm outline-none focus:border-gray-400 focus:bg-white"
                  enterKeyHint="search"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            }
            {!showMenu && isCase && (
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 active:bg-gray-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
                {activeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[11px] font-semibold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {models.length > 0 && !showMenu && isCase && (
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {models.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  onRemove={() =>
                    setModels((cur) => cur.filter((x) => x !== m))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        {showMenu ? (
          <CategoryMenu
            categories={categories}
            loading={categoriesLoading}
            error={categoriesError}
            onRetry={() => refetchCategories()}
            onPick={pick}
          />
        ) : (
          <>
            {q && suggestions.length > 0 && (
              <div className="mb-3 px-1">
                <p className="mb-2 text-xs text-gray-500">
                  {fuzzy
                    ? `No exact match for "${q}". Did you mean:`
                    : "Did you mean:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSearch(m)}
                      className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 active:bg-gray-100"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && !isError && covers.length > 0 && (
              <p className="mb-3 px-1 text-xs text-gray-500">
                {total} {total === 1 ? noun : `${noun}s`}
              </p>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-200"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="py-20 text-center">
                <p className="text-sm text-gray-600">
                  Couldn&apos;t load items.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
                >
                  Try again
                </button>
              </div>
            ) : covers.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm font-medium text-gray-800">
                  Nothing found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Try a different search.
                </p>
                {(search || activeCount > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setModels([]);
                    }}
                    className="mt-4 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-800"
                  >
                    Clear all
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {covers.map((cover, i) => (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => setViewing(i)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 active:scale-[0.98]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage(cover.photo_url, 480)}
                      alt=""
                      loading={i < 6 ? "eager" : "lazy"}
                      decoding="async"
                      className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        cover.in_stock ? "" : "opacity-50 grayscale"
                      }`}
                    />
                    {!cover.in_stock ? (
                      <span className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent px-2 pb-3 pt-10">
                        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                          Out of stock
                        </span>
                      </span>
                    ) : (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-2 pt-10 text-left">
                        {inStockModels(cover).length > 0 ? (
                          <>
                            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-white/70">
                              Available for
                            </span>
                            <span className="flex flex-wrap gap-1">
                              {inStockModels(cover)
                                .slice(0, MAX_CHIPS)
                                .map((m) => (
                                  <span
                                    key={m.model}
                                    className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold leading-4 text-gray-900"
                                  >
                                    {m.model} · {pcs(m.quantity)}
                                  </span>
                                ))}
                              {inStockModels(cover).length > MAX_CHIPS && (
                                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
                                  +{inStockModels(cover).length - MAX_CHIPS}{" "}
                                  more
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold leading-4 text-gray-900">
                            {pcs(cover.quantity)} left
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div ref={sentinel} className="h-px" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
          </>
        )}
      </main>

      <FilterSheet
        key={String(filterOpen)}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        models={modelList}
        selectedModels={models}
        onApply={setModels}
      />

      {viewing !== null && covers.length > 0 && (
        <CoverViewer
          covers={covers}
          isCase={isCase}
          index={Math.min(viewing, covers.length - 1)}
          onIndexChange={(i) => {
            setViewing(i);
            // nearing the end of what's loaded: fetch more
            if (i >= covers.length - 3 && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-900 py-1.5 pl-3 pr-1.5 text-xs font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-white/20"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function CategoryMenu({
  categories,
  loading,
  error,
  onRetry,
  onPick,
}: {
  categories: CatalogCategory[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onPick: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-2xl bg-gray-200"
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-600">Couldn&apos;t load categories.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }
  if (categories.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-gray-500">
        Nothing in stock right now. Please check back soon.
      </p>
    );
  }
  return (
    <>
      <h2 className="mb-3 px-1 text-sm font-medium text-gray-600">
        What are you looking for?
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 active:scale-[0.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage(c.photo_url, 480)}
              alt=""
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-12 text-left">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {c.name}
                </span>
                <span className="block text-[11px] text-white/70">
                  {c.count} {c.count === 1 ? "item" : "items"}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

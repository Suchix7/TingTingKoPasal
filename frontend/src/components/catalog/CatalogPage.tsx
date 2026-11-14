"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Images,
  MapPin,
  Play,
  Phone,
  Loader2,
  LogOut,
  Search,
  Tag,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  useCatalogCategories,
  useCatalogModels,
  useCatalogSession,
  useCatalogStore,
  useCovers,
  fitsModels,
} from "@/hooks/useCatalog";
import type { CatalogCategory, Cover } from "@/hooks/useCatalog";
import { useDebounced } from "@/hooks/useDebounced";
import SoldOutMark from "./SoldOutMark";
import { coverImage, blurBehind, clearBlur, preloadFull } from "./image";
import { pcs, priceLabel, same, type Tr } from "./format";
import { useLang } from "@/lib/i18n";
import { zhColour } from "@/lib/colourNames";
import InstagramButton from "./InstagramButton";
import axiosInstance from "@/lib/axiosInstance";
import CoverViewer from "./CoverViewer";
import FilterSheet from "./FilterSheet";
import ShopSplash from "./ShopSplash";

const inStockModels = (c: Cover) => c.models.filter((m) => m.quantity > 0);

// Card photo: when the cover photo shows a colour that is sold out, show
// the first colour still in stock instead
// `models`: the phone models picked in the filter; a colour made for one of
// them is shown, not the product's first photo (another phone's case)
const cardPhoto = (c: Cover, models: string[]) => {
  if (!c.in_stock || !c.variants?.length) return c.photo_url;
  const fits = c.variants.find((v) => v.media_index >= 0 && fitsModels(v, models));
  if (fits) return fits.media_index === 0 ? c.photo_url : c.media[fits.media_index]?.poster || c.photo_url;
  const first = c.variants.find((v) => v.media_index === 0);
  if (first && first.quantity > 0) return c.photo_url;
  const available = c.variants.find((v) => v.quantity > 0 && v.media_index >= 0);
  return available ? c.media[available.media_index]?.poster || c.photo_url : c.photo_url;
};

// chips shown on a card; the full list is in the full-screen view
const MAX_CHIPS = 3;

// `priceView`: the /prices page, for the signed-in price viewer
export default function CatalogPage({ priceView = false }: { priceView?: boolean }) {
  const [search, setSearch] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  // cost prices stay hidden until the price viewer turns on "CP", so someone
  // looking over their shoulder does not see them; off again on every visit
  const [showCost, setShowCost] = useState(false);
  // the price page can be read in Chinese (the 中文 switch); the public shop
  // stays in English
  const { t: tLang, lang, setLang } = useLang();
  const zh = priceView && lang === "zh";
  const t: Tr = zh ? tLang : same;
  // colour names in Chinese too ("Light Blue" -> 浅蓝色); others stay as typed
  const colour = (name: string) => (zh ? zhColour(name) : name);
  // product name on the price page, in Chinese when one is set
  const productName = (c: Cover) => (zh && c.name_zh) || c.name || "";
  const nameOf = (c?: CatalogCategory) => (c ? (zh && c.name_zh) || c.name : undefined);

  const q = useDebounced(search.trim(), 350);

  // the open category (?c=) and phone models (?m=) live in the address, so a
  // reload or a shared link opens the same page; the phone back button
  // returns to the menu instead of leaving the site
  const urlRead = useRef(false);
  useEffect(() => {
    const readUrl = () => {
      const p = new URLSearchParams(window.location.search);
      setCategory(p.get("c") ?? "");
      setModels(p.get("m")?.split(",").filter(Boolean) ?? []);
    };
    readUrl();
    urlRead.current = true;
    window.addEventListener("popstate", readUrl);
    return () => window.removeEventListener("popstate", readUrl);
  }, []);
  useEffect(() => {
    if (!urlRead.current) return;
    const url = new URL(window.location.href);
    if (models.length) url.searchParams.set("m", models.join(","));
    else url.searchParams.delete("m");
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [models]);
  const pick = (id: string) => {
    window.history.pushState({ category: id }, "", `${window.location.pathname}?c=${encodeURIComponent(id)}`);
    setCategory(id);
    setModels([]);
    setSearch("");
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    // opened straight from a link: there is no menu behind it to go back to
    if (window.history.state?.category) window.history.back();
    else {
      window.history.replaceState(null, "", window.location.pathname);
      setCategory("");
      setModels([]);
      window.scrollTo({ top: 0 });
    }
  };

  const { data: store } = useCatalogStore();
  const { data: session, isSuccess: sessionReady } = useCatalogSession();
  const priceUser = session?.prices?.username;
  // /prices without the price login: sign in first
  useEffect(() => {
    if (priceView && sessionReady && !priceUser) {
      window.location.replace("/admin/auth?for=prices");
    }
  }, [priceView, sessionReady, priceUser]);
  // signs out the price viewer only; an admin signed in here stays signed in
  const signOut = async () => {
    try {
      await axiosInstance.post("/logout", { scope: "prices" });
    } finally {
      window.location.href = "/";
    }
  };
  const { data: modelList = [] } = useCatalogModels(category);
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    isSuccess: categoriesReady,
    isFetching: categoriesFetching,
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
  } = useCovers({ q, models, category }, !showMenu && (!priceView || !!priceUser), priceView);

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
  const shownCategoryName = nameOf(categories.find((c) => c.id === category));
  // a saved link to a category that no longer exists: show the menu
  useEffect(() => {
    if (categoriesReady && category && !categoryName) {
      window.history.replaceState(null, "", window.location.pathname);
      setCategory("");
      setModels([]);
    }
  }, [categoriesReady, category, categoryName]);
  // phone cases are matched to phone models; accessories are plain items
  const isCase = /case|cover/i.test(categoryName ?? "");
  const noun = isCase ? "case" : "item";
  const sizedCategoryIds = new Set(
    categories.filter((c) => c.has_sizes).map((c) => c.id),
  );
  const activeCount = models.length;

  return (
    <div className="min-h-dvh bg-gray-50">
      <ShopSplash
        t={t}
        ready={categoriesReady}
        error={categoriesError && !categoriesFetching}
        onRetry={() => refetchCategories()}
      />
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        {priceView && (
          <div className="bg-emerald-600 text-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5 text-xs">
              <span className="flex min-w-0 items-center gap-1.5 font-medium">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("Price view")} · {priceUser}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLang(zh ? "en" : "zh")}
                  aria-label={zh ? "English" : "中文"}
                  className="flex h-8 min-w-11 items-center justify-center rounded-full bg-white/15 px-2.5 font-bold active:bg-white/25"
                >
                  {zh ? "EN" : "中文"}
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showCost}
                  aria-label={t("Show cost prices")}
                  onClick={() => setShowCost((v) => !v)}
                  className={`flex h-8 items-center gap-1.5 rounded-full pl-2.5 pr-1 font-bold transition-colors ${
                    showCost ? "bg-orange-500 text-white" : "bg-white/15 text-white active:bg-white/25"
                  }`}
                >
                  CP
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      showCost ? "bg-white/40" : "bg-black/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] ${
                        showCost ? "left-[1.125rem]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 font-semibold active:bg-white/25"
                  aria-label={t("Sign out")}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden min-[420px]:inline">{t("Sign out")}</span>
                </button>
              </span>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-5xl px-4 pb-3 pt-3">
          <div className="relative flex flex-col items-center gap-1.5 text-center">
            {category && (
              <button
                type="button"
                onClick={back}
                className="absolute left-0 top-0 -ml-2 shrink-0 rounded-full p-2 text-gray-700 active:bg-gray-100"
                aria-label={t("Back to categories")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Ting Ting ko pasal"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16"
            />
            <div className="min-w-0 max-w-full px-10">
              <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-gray-900 sm:text-lg">
                {category ? (shownCategoryName ?? t("Items")) : "Ting Ting ko pasal"}
              </h1>
              {category && (
                <p className="truncate text-xs leading-tight text-gray-500">
                  Ting Ting ko pasal
                </p>
              )}
            </div>
          </div>

          {(store?.address || store?.phone) && (
            <div className="mb-3 mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-gray-200">
              {store?.address && (
                <a
                  href={
                    store.map_url ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-1.5 text-gray-700 active:text-gray-900"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span className="truncate underline decoration-gray-300 underline-offset-2">
                    {store.address}
                  </span>
                </a>
              )}
              {store?.phone && (
                <a
                  href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}
                  className="flex shrink-0 items-center gap-1.5 font-semibold text-gray-900"
                >
                  <Phone className="h-3.5 w-3.5 text-green-600" />
                  {store.phone}
                </a>
              )}
            </div>
          )}

          {!showMenu && (
            <div className="flex gap-2">
              {
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("Search")}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm outline-none focus:border-gray-400 focus:bg-white"
                    enterKeyHint="search"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400"
                      aria-label={t("Clear search")}
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
                  <span className="hidden sm:inline">{t("Filter")}</span>
                  {activeCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[11px] font-semibold text-white">
                      {activeCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {models.length > 0 && !showMenu && isCase && (
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {models.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  t={t}
                  onRemove={() =>
                    setModels((cur) => cur.filter((x) => x !== m))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 pb-[max(6rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        {showMenu ? (
          <CategoryMenu
            categories={categories}
            loading={categoriesLoading}
            error={categoriesError}
            onRetry={() => refetchCategories()}
            onPick={pick}
            t={t}
            nameOf={nameOf}
          />
        ) : (
          <>
            {q && suggestions.length > 0 && (
              <div className="mb-3 px-1">
                <p className="mb-2 text-xs text-gray-500">
                  {fuzzy
                    ? `${t("No exact match for")} "${q}". ${t("Did you mean:")}`
                    : t("Did you mean:")}
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
                {total} {t(total === 1 ? noun : `${noun}s`)}
              </p>
            )}

            {isLoading ? (
              <>
                <WakingNotice loading t={t} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="skeleton aspect-[3/4] rounded-2xl"
                    />
                  ))}
                </div>
              </>
            ) : isError ? (
              <div className="py-20 text-center">
                <p className="text-sm text-gray-600">
                  {t("Couldn't load items.")}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
                >
                  {t("Try again")}
                </button>
              </div>
            ) : covers.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm font-medium text-gray-800">
                  {t("Nothing found")}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {t("Try a different search.")}
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
                    {t("Clear all")}
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
                    // the full photo starts loading as the finger goes down
                    onPointerDown={() => preloadFull(cardPhoto(cover, models))}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 active:scale-[0.98]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage(cardPhoto(cover, models), 480)}
                      style={blurBehind(cardPhoto(cover, models))}
                      onLoad={clearBlur}
                      alt=""
                      loading={i < 6 ? "eager" : "lazy"}
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {!cover.in_stock && <SoldOutMark zh={zh} />}
                    {((cover.media?.length ?? 0) > 1 ||
                      cover.media?.some((m) => m.type === "video")) && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                        {cover.media.some((m) => m.type === "video") && (
                          <Play className="h-3 w-3 fill-white" />
                        )}
                        {cover.media.length > 1 && (
                          <>
                            <Images className="h-3 w-3" />
                            {cover.media.length}
                          </>
                        )}
                      </span>
                    )}
                    {(cover.variants?.length ?? 0) > 1 && (
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-900 shadow-sm">
                        {cover.variants!.filter((v) => v.quantity > 0).length ||
                          cover.variants!.length}{" "}
                        {t("colours")}
                      </span>
                    )}
                    {(priceLabel(cover.price_min, cover.price_max) ||
                        (showCost && priceLabel(cover.cost_min, cover.cost_max))) && (
                        // cost in orange, then the selling price in green
                        <span className="absolute left-2 top-9 flex flex-col items-start gap-1">
                          {showCost && priceLabel(cover.cost_min, cover.cost_max) && (
                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                              {priceLabel(cover.cost_min, cover.cost_max)}
                            </span>
                          )}
                          {priceLabel(cover.price_min, cover.price_max) && (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                              {priceLabel(cover.price_min, cover.price_max)}
                            </span>
                          )}
                        </span>
                      )}
                    {!cover.in_stock ? (
                      // the band on the photo says it; screen readers get the words
                      <>
                        <span className="sr-only">{t("Out of stock")}</span>
                        {productName(cover) && (
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 text-left">
                            <span className="block truncate text-xs font-bold text-white">
                              {productName(cover)}
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-2 pt-10 text-left">
                        {productName(cover) && (
                          <span className="mb-1 block truncate text-xs font-bold leading-tight text-white">
                            {productName(cover)}
                          </span>
                        )}
                        {inStockModels(cover).length > 0 ? (
                          <>
                            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-white/70">
                              {cover.has_sizes ||
                              sizedCategoryIds.has(cover.category_id ?? "")
                                ? t("Sizes")
                                : cover.variants?.length && !cover.has_models
                                  ? t("Colours")
                                  : t("Available for")}
                            </span>
                            <span className="flex flex-wrap gap-1">
                              {inStockModels(cover)
                                .slice(0, MAX_CHIPS)
                                .map((m) => (
                                  <span
                                    key={m.model}
                                    className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold leading-4 text-gray-900"
                                  >
                                    {colour(m.model)} · {pcs(m.quantity, t)}
                                  </span>
                                ))}
                              {inStockModels(cover).length > MAX_CHIPS && (
                                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white">
                                  +{inStockModels(cover).length - MAX_CHIPS}{" "}
                                  {t("more")}
                                </span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold leading-4 text-gray-900">
                            {pcs(cover.quantity, t)} {t("left")}
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

      {/* customers can message the shop; the price page is for staff */}
      {!priceView && store?.instagram && <InstagramButton username={store.instagram} />}

      <FilterSheet
        key={String(filterOpen)}
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        models={modelList}
        selectedModels={models}
        onApply={setModels}
        t={t}
      />

      {viewing !== null && covers[viewing] && (
        <CoverViewer
          cover={covers[viewing]}
          isCase={isCase}
          showPrices={priceView}
          showCost={priceView && showCost}
          models={models}
          t={t}
          zh={zh}
          hasSizes={
            !!covers[viewing].has_sizes ||
            sizedCategoryIds.has(covers[viewing].category_id ?? "")
          }
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function Chip({ label, onRemove, t }: { label: string; onRemove: () => void; t: Tr }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-900 py-1.5 pl-3 pr-1.5 text-xs font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-white/20"
        aria-label={`${t("Remove")} ${label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

// After a few seconds of loading, explain why: the server is waking up.
function WakingNotice({ loading, t = same }: { loading: boolean; t?: Tr }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 4000);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [loading]);
  if (!loading || !slow) return null;
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
      <p className="text-sm text-amber-900">
        <span className="font-semibold">{t("Waking up the shop…")}</span>
        <span className="block text-xs text-amber-800/80">
          {t(
            "It was resting, so the first load can take up to a minute. It will show up by itself, no need to refresh.",
          )}
        </span>
      </p>
    </div>
  );
}

function CategoryMenu({
  categories,
  loading,
  error,
  onRetry,
  onPick,
  t,
  nameOf,
}: {
  categories: CatalogCategory[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onPick: (id: string) => void;
  t: Tr;
  nameOf: (c: CatalogCategory) => string | undefined;
}) {
  if (loading) {
    return (
      <>
        <WakingNotice loading t={t} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton aspect-square rounded-2xl"
            />
          ))}
        </div>
      </>
    );
  }
  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-600">{t("Couldn't load categories.")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          {t("Try again")}
        </button>
      </div>
    );
  }
  if (categories.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-gray-500">
        {t("Nothing in stock right now. Please check back soon.")}
      </p>
    );
  }
  return (
    <>
      <h2 className="mb-3 px-1 text-sm font-medium text-gray-600">
        {t("What are you looking for?")}
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
              style={blurBehind(c.photo_url)}
              onLoad={clearBlur}
              alt=""
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-3 pt-12 text-left">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {nameOf(c)}
                </span>
                <span className="block text-[11px] text-white/70">
                  {c.count} {t(c.count === 1 ? "item" : "items")}
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

"use client";

import { useEffect, useState } from "react";
import { Ruler, X } from "lucide-react";

import { fitsModels, type Cover } from "@/hooks/useCatalog";
import { zhColour } from "@/lib/colourNames";
import { pcs as pcsOf, priceLabel, same, type Tr } from "./format";
import { coverImage } from "./image";
import MediaGallery from "./MediaGallery";

type Props = {
  cover: Cover;
  // phone cases: tell shoppers to ask in store when no model is listed
  isCase: boolean;
  // stock lines are sizes (S, M, L), not phone models
  hasSizes?: boolean;
  // signed in as the price viewer: show selling prices
  showPrices?: boolean;
  // the price viewer turned on "CP": show cost prices too
  showCost?: boolean;
  // phone models picked in the shop filter: open on a colour made for them
  models?: string[];
  // translates the text (the price page in Chinese)
  t?: Tr;
  // the price page in Chinese: colour names too
  zh?: boolean;
  onClose: () => void;
};

// Full-screen view of one cover with the phone models it fits. Swiping only
// moves between this cover's own photos and videos, never to another product.
export default function CoverViewer({
  cover,
  isCase,
  hasSizes = false,
  showPrices = false,
  showCost = false,
  models = [],
  t = same,
  zh = false,
  onClose,
}: Props) {
  // "Light Blue" -> 浅蓝色 in Chinese; names we don't know stay as typed
  const colour = (name: string) => (zh ? zhColour(name) : name);
  const pcs = (n: number) => pcsOf(n, t);
  const coverPrice = showPrices ? priceLabel(cover.price_min, cover.price_max) : "";
  const coverCost = showCost ? priceLabel(cover.cost_min, cover.cost_max) : "";
  const availableModels = cover.models.filter((m) => m.quantity > 0);
  const media = cover.media?.length
    ? cover.media
    : [{ type: "image" as const, url: cover.photo_url, poster: cover.photo_url }];

  // Colours / styles: pick one to see its photo and the sizes left in it
  // in-stock colours first, so a sold-out one is never what opens first
  const variants = [...(cover.variants ?? [])].sort(
    (a, b) => Number(b.quantity > 0) - Number(a.quantity > 0),
  );
  const sizeGuide = cover.size_guide_index ?? -1;
  // open on a colour made for the phone picked in the filter, else the first
  // available colour
  const [picked, setPicked] = useState(() =>
    Math.max(variants.findIndex((v) => fitsModels(v, models)), 0),
  );
  const [slide, setSlide] = useState(() => {
    const first = variants[picked];
    return cover.in_stock && first?.quantity > 0 && first.media_index >= 0
      ? first.media_index
      : 0;
  });
  const variant = variants[picked];

  const pickVariant = (i: number) => {
    setPicked(i);
    if (variants[i].media_index >= 0) setSlide(variants[i].media_index);
  };
  // swiping onto a colour's photo selects that colour
  const onSlide = (i: number) => {
    setSlide(i);
    const v = variants.findIndex((x) => x.media_index === i);
    if (v >= 0) setPicked(v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // keep the page behind from scrolling
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-end px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2.5 text-white active:bg-white/20"
          aria-label={t("Close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <MediaGallery
        key={cover.id}
        zh={zh}
        labels={{ previous: t("Previous photo"), next: t("Next photo") }}
        items={media}
        soldOut={(i) =>
          !cover.in_stock ||
          variants.some((v) => v.media_index === i && v.quantity <= 0)
        }
        index={slide}
        onIndexChange={onSlide}
      />

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {showPrices && ((zh && cover.name_zh) || cover.name) && (
          <h2 className="mb-2 text-center text-lg font-bold leading-snug text-white">
            {(zh && cover.name_zh) || cover.name}
          </h2>
        )}
        {(coverPrice || coverCost) && (
          <p className="mb-3 flex flex-wrap justify-center gap-2 text-center">
            {coverCost && (
              <span className="rounded-full bg-orange-500 px-3 py-1 text-base font-bold text-white">
                {coverCost}
              </span>
            )}
            {coverPrice && (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-base font-bold text-white">
                {coverPrice}
              </span>
            )}
          </p>
        )}
        {!cover.in_stock && (
          <p className="mb-3 text-center">
            <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
              {t("Out of stock")}
            </span>
          </p>
        )}
        {variants.length > 0 ? (
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/60">
                {variants.length === 1 ? t("Colour") : `${t("Colours")} · ${variants.length}`}
              </p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {variants.map((v, i) => {
                  const active = i === picked;
                  const soldOut = v.quantity <= 0;
                  const photo = media[v.media_index];
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => pickVariant(i)}
                      aria-pressed={active}
                      className={`flex h-12 shrink-0 items-center gap-2 rounded-full pl-1 pr-3 text-sm font-semibold transition ${
                        active ? "bg-white text-gray-900" : "bg-white/10 text-white active:bg-white/20"
                      } ${soldOut ? "opacity-50" : ""}`}
                    >
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverImage(photo.poster, 96)}
                          alt=""
                          className="h-10 w-10 rounded-full bg-white object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="h-10 w-2" />
                      )}
                      <span className={soldOut ? "line-through" : ""}>{colour(v.name)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {variant && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                    {variant.sizes.length > 0
                      ? `${t(cover.has_models ? "Phone models in" : "Sizes in")} ${colour(variant.name)}`
                      : colour(variant.name)}
                    {showCost && priceLabel(variant.cost_min, variant.cost_max) && (
                      <span className="ml-1.5 normal-case tracking-normal text-orange-300">
                        {priceLabel(variant.cost_min, variant.cost_max)}
                      </span>
                    )}
                    {showPrices && priceLabel(variant.price_min, variant.price_max) && (
                      <span className="ml-1.5 normal-case tracking-normal text-emerald-300">
                        {priceLabel(variant.price_min, variant.price_max)}
                      </span>
                    )}
                  </p>
                  {sizeGuide >= 0 && (
                    <button
                      type="button"
                      onClick={() => setSlide(sizeGuide)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white active:bg-white/20"
                    >
                      <Ruler className="h-3.5 w-3.5" /> {t("Size guide")}
                    </button>
                  )}
                </div>
                {variant.sizes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {variant.sizes.map((s) =>
                      s.quantity > 0 ? (
                        <span
                          key={s.size}
                          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900"
                        >
                          {s.size} · {pcs(s.quantity)}
                        </span>
                      ) : (
                        <span
                          key={s.size}
                          className="rounded-full border border-white/20 px-3 py-1.5 text-sm font-medium text-white/40 line-through"
                          aria-label={`${s.size} ${t("sold out")}`}
                        >
                          {s.size}
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-white">
                    {variant.quantity > 0 ? `${pcs(variant.quantity)} ${t("in stock")}` : t("Sold out")}
                  </p>
                )}
                {variant.quantity <= 0 && variant.sizes.length > 0 && (
                  <p className="mt-2 text-xs text-white/60">{t("This colour is sold out.")}</p>
                )}
              </div>
            )}
          </div>
        ) : cover.models.length > 0 ? (
          // Only the models that are actually available; sold-out ones are
          // left out entirely (the "Out of stock" badge covers a sold-out cover)
          availableModels.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                  {t(hasSizes ? "Sizes" : "Phone models")}
                </p>
                {sizeGuide >= 0 && (
                  <button
                    type="button"
                    onClick={() => setSlide(sizeGuide)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white active:bg-white/20"
                  >
                    <Ruler className="h-3.5 w-3.5" /> {t("Size guide")}
                  </button>
                )}
              </div>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {availableModels.map((m) => (
                  <span
                    key={m.model}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900"
                  >
                    {colour(m.model)} · {pcs(m.quantity)}
                  </span>
                ))}
              </div>
            </>
          )
        ) : cover.in_stock ? (
          <p className="text-center text-sm font-medium text-white">
            {pcs(cover.quantity)} {t("in stock")}
            {isCase && (
              <span className="mt-1 block text-xs font-normal text-white/60">
                {t("Ask in store for your phone model")}
              </span>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useProductBatchesByProduct } from "@/hooks/useProductBatch";
import type { ProductBatch } from "@/hooks/useProductBatch";
import { Package, X, Layers, AlertCircle, ChevronLeft } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import { coverImage, variantPhoto } from "@/components/catalog/image";
import { Skeleton } from "@/components/layout/Skeleton";

import Tn from "@/components/layout/Tn";
import { useLang } from "@/lib/i18n";
import { compareModelOrSize, fitsPhone } from "@/lib/phoneModels";
interface BatchSelectionModalProps {
  product: Product;
  onSelect: (unitPrice: number, batchId?: string) => void;
  onClose: () => void;
  // phone model picked in the POS filter: only that model's lines are offered
  model?: string;
}

// The phone model (or size) a stock line is for
const lineModel = (b: ProductBatch) =>
  b.model || b.size || (b.variant ? "" : b.batch_number);

// phone models / sizes in one straight line (iPhone 11, 11 Pro, 12... or S, M, L)
const byLine = (a: ProductBatch, b: ProductBatch) =>
  compareModelOrSize(lineModel(a) || a.batch_number, lineModel(b) || b.batch_number);

export default function BatchSelectionModal({
  product,
  onSelect,
  onClose,
  model = "",
}: BatchSelectionModalProps) {
  const { t } = useLang();
  // colour picked in step one (for colours that come in several models/sizes)
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data: batchesData, isLoading } = useProductBatchesByProduct(
    product.id,
  );

  // Only models that can actually be sold; sold-out ones aren't listed
  const allBatches = batchesData?.data || [];
  const inStock = allBatches.filter((b) => b.quantity > 0);
  // "iPhone 14" also offers a line for "iPhone 13/14/15" (one piece fits all)
  const forModel = model
    ? inStock.filter((b) => lineModel(b) === model || (!b.size && fitsPhone(lineModel(b), model)))
    : [];
  const batches = forModel.length ? forModel : inStock;

  // Lines with a colour/style are picked by the colour's photo first, then
  // by phone model / size; other lines stay in the plain list
  const plainLines = batches.filter((b) => !b.variant).sort(byLine);
  const colours: {
    name: string;
    lines: ProductBatch[];
    photo: string | null;
  }[] = [];
  for (const b of batches) {
    if (!b.variant) continue;
    const c = colours.find((x) => x.name === b.variant);
    if (c) c.lines.push(b);
    else
      colours.push({
        name: b.variant,
        lines: [b],
        photo: variantPhoto(product, b) || product.photo_url || null,
      });
  }
  // colours keep their order; inside each, models / sizes go in a line
  for (const c of colours) c.lines.sort(byLine);
  // the product's own price is offered too, unless its stock lives only on lines
  const showBase = !(product.stock_quantity === 0 && allBatches.length > 0);
  // only one colour and nothing else to choose: skip straight to its models / sizes
  const onlyColour =
    colours.length === 1 && plainLines.length === 0 && !showBase ? colours[0] : null;
  const colour = colours.find((c) => c.name === picked) ?? onlyColour ?? undefined;

  const money = (value?: number | null) =>
    new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const priceRange = (lines: ProductBatch[]) => {
    const prices = lines.map((l) => l.sale_price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
  };
  const qty = (lines: ProductBatch[]) =>
    lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);

  const pickColour = (c: (typeof colours)[number]) => {
    if (c.lines.length === 1) onSelect(c.lines[0].sale_price, c.lines[0].id);
    else setPicked(c.name);
  };
  const shownPhoto = colour
    ? colour.photo
    : colours.length
      ? null
      : product.photo_url;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {shownPhoto && (
          <div className="flex h-56 items-center justify-center bg-slate-100 sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage(shownPhoto, 800)}
              alt={colour?.name || product.product_name}
              className="h-full w-full object-contain"
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t("Select Size / Model / Batch")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("Choose which size, phone model or batch to sell for")}{" "}
              <span className="font-medium text-slate-700">
                <Tn v={product.product_name} />
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 p-6">
          {/* Base Product Price - hidden for products whose stock lives only on models/batches */}
          {showBase && (
            <button
              onClick={() => onSelect(product.sale_price)}
              disabled={product.stock_quantity === 0}
              className="w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:shadow-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {t("Standard Price")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("Use the product's default sale price")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">
                    {money(product.sale_price)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("per")} {product.unit}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Batch Prices */}
          {isLoading ? (
            <div
              className="space-y-2"
              role="status"
              aria-label={t("Loading batches...")}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border-2 border-slate-100 p-4"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="ml-auto h-6 w-20" />
                    <Skeleton className="ml-auto h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : colour ? (
            <>
              {!onlyColour && (
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  <ChevronLeft size={16} />
                  {t("Colours")}
                </button>
              )}
              <p className="text-sm font-medium text-slate-500">
                {colour.lines.some((l) => l.model)
                  ? t("Phone models")
                  : t("Sizes")}
                {" · "}
                {colour.name}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {colour.lines.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => onSelect(line.sale_price, line.id)}
                    className="cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-400 hover:shadow-md"
                  >
                    <p className="truncate font-semibold text-slate-900">
                      {lineModel(line) || line.batch_number}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {money(line.sale_price)}
                      </span>
                      <span
                        className={`text-xs ${line.quantity <= 5 ? "font-medium text-amber-700" : "text-slate-500"}`}
                      >
                        {line.quantity} {product.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : batches.length > 0 ? (
            <>
              {colours.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <Layers size={16} className="text-slate-400" />
                    <p className="text-sm font-medium text-slate-500">
                      {t("Colours")}
                      {model ? ` · ${model}` : ""} ({colours.length})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {colours.map((c) => {
                      const left = qty(c.lines);
                      const only =
                        c.lines.length === 1 ? lineModel(c.lines[0]) : "";
                      return (
                        <button
                          key={c.name}
                          onClick={() => pickColour(c)}
                          title={c.name}
                          className="cursor-pointer overflow-hidden rounded-xl border-2 border-slate-200 bg-white text-left transition-all hover:border-blue-400 hover:shadow-md"
                        >
                          <div className="relative aspect-square bg-slate-100">
                            {c.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={coverImage(c.photo, 400)}
                                alt={c.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package size={28} className="text-slate-300" />
                              </div>
                            )}
                            {left <= 5 && (
                              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                <AlertCircle size={10} />
                                {t("Low Stock")}
                              </span>
                            )}
                            {c.lines.length > 1 && (
                              <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                                {c.lines.length}{" "}
                                {c.lines.some((l) => l.model)
                                  ? t("models")
                                  : t("sizes")}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            {only && (
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {only}
                              </p>
                            )}
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-bold text-slate-900">
                                {priceRange(c.lines)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {left} {product.unit}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {plainLines.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <Layers size={16} className="text-slate-400" />
                    <p className="text-sm font-medium text-slate-500">
                      {t("Sizes / models / batches")} ({plainLines.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {plainLines.map((batch) => {
                      const isLowStock =
                        batch.quantity <= 5 && batch.quantity > 0;
                      const isOutOfStock = batch.quantity === 0;

                      return (
                        <button
                          key={batch.id}
                          onClick={() => onSelect(batch.sale_price, batch.id)}
                          disabled={isOutOfStock}
                          className="w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:shadow-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <code className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                  {batch.batch_number}
                                </code>
                                {isLowStock && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                    <AlertCircle size={10} />
                                    {t("Low Stock")}
                                  </span>
                                )}
                                {isOutOfStock && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                    {t("Out of Stock")}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                {t("Quantity")}: {batch.quantity} {product.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-slate-900">
                                {money(batch.sale_price)}
                              </p>
                              <p className="text-xs text-slate-400">
                                {t("per")} {product.unit}
                              </p>
                              {batch.sale_price !== product.sale_price && (
                                <p
                                  className={`mt-1 text-xs font-medium ${
                                    batch.sale_price < product.sale_price
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {batch.sale_price < product.sale_price
                                    ? "↓ "
                                    : "↑ "}
                                  {money(
                                    Math.abs(
                                      batch.sale_price - product.sale_price,
                                    ),
                                  )}{" "}
                                  {t("vs standard")}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Package size={32} className="mb-2" />
              <p className="text-sm">
                {t("No sizes, models or batches available")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

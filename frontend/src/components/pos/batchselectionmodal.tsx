"use client";

import { useProductBatchesByProduct } from "@/hooks/useProductBatch";
import { Package, X, Layers, AlertCircle } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import { coverImage } from "@/components/catalog/image";
import { Skeleton } from "@/components/layout/Skeleton";

import Tn from "@/components/layout/Tn";
import { useLang } from "@/lib/i18n";
interface BatchSelectionModalProps {
  product: Product;
  onSelect: (unitPrice: number, batchId?: string) => void;
  onClose: () => void;
}

export default function BatchSelectionModal({
  product,
  onSelect,
  onClose,
}: BatchSelectionModalProps) {
  const { t } = useLang();
  const { data: batchesData, isLoading } = useProductBatchesByProduct(
    product.id,
  );

  const batches = batchesData?.data || [];

  const money = (value?: number | null) =>
    new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80dvh] w-full max-w-md overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {product.photo_url && (
          <div className="flex h-56 items-center justify-center bg-slate-100 sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage(product.photo_url, 800)}
              alt={product.product_name}
              className="h-full w-full object-contain"
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t("Select Model / Batch")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("Choose which phone model or batch to sell for")}{" "}
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
          {!(product.stock_quantity === 0 && batches.length > 0) && (
            <button
              onClick={() => onSelect(product.sale_price)}
              disabled={product.stock_quantity === 0}
              className="w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:shadow-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{t("Standard Price")}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("Use the product's default sale price")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">
                    {money(product.sale_price)}
                  </p>
                  <p className="text-xs text-slate-400">{t("per")} {product.unit}</p>
                </div>
              </div>
            </button>
          )}

          {/* Batch Prices */}
          {isLoading ? (
            <div className="space-y-2" role="status" aria-label={t("Loading batches...")}>
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
          ) : batches.length > 0 ? (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Layers size={16} className="text-slate-400" />
                <p className="text-sm font-medium text-slate-500">
                  {t("Phone models / batches")} ({batches.length})
                </p>
              </div>

              <div className="space-y-2">
                {batches.map((batch) => {
                  const isLowStock = batch.quantity <= 5 && batch.quantity > 0;
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
                                Math.abs(batch.sale_price - product.sale_price),
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
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Package size={32} className="mb-2" />
              <p className="text-sm">{t("No models or batches available")}</p>
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

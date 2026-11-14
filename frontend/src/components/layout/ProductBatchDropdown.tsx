"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Check,
  Loader2,
  ChevronRight,
  ChevronDown,
  Package,
  Boxes,
} from "lucide-react";
import { useDebounced } from "@/hooks/useDebounced";
import { useProducts, Product, ProductBatch } from "@/hooks/useProducts";
import { useLang } from "@/lib/i18n";
import Tn from "@/components/layout/Tn";
import { Skeleton } from "@/components/layout/Skeleton";

export type ProductBatchSelection = {
  productId: string | null;
  batchId: string | null;
  productName?: string;
  batchNumber?: string;
  quantity?: number;
  salePrice?: number;
  costPrice?: number;
};

type ProductBatchDropdownProps = {
  selectedProductId?: string | null;
  selectedBatchId?: string | null;
  onSelect: (selection: ProductBatchSelection | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  // no longer shown; kept so existing callers still compile
  showBatchQuantities?: boolean;
  showBatchPrices?: boolean;
  debounceDelay?: number;
  autoFocus?: boolean;
  maxHeight?: string;
};

export function ProductBatchDropdown({
  selectedProductId = null,
  selectedBatchId = null,
  onSelect,
  placeholder = "Select product",
  searchPlaceholder = "Search products...",
  emptyMessage = "No products found",
  className = "",
  disabled = false,
  showBatchPrices = true,
  debounceDelay = 300,
  autoFocus = true,
  maxHeight = "max-h-80",
}: ProductBatchDropdownProps) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null,
  );

  const debouncedSearchTerm = useDebounced(searchTerm, debounceDelay);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: productsData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useProducts({
    search: debouncedSearchTerm || undefined,
    limit: 50,
  });

  const products = useMemo(() => productsData?.data ?? [], [productsData]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) {
      return null;
    }

    return products.find((product) => product.id === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  const selectedBatch = useMemo(() => {
    if (!selectedProduct || !selectedBatchId) {
      return null;
    }

    return (
      selectedProduct.batches?.find((batch) => batch.id === selectedBatchId) ??
      null
    );
  }, [selectedProduct, selectedBatchId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && autoFocus && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, autoFocus]);

  useEffect(() => {
    if (isOpen && selectedProductId) {
      setExpandedProductId(selectedProductId);
    }
  }, [isOpen, selectedProductId]);

  const handleSelect = (selection: ProductBatchSelection) => {
    if (
      selection.productId === selectedProductId &&
      selection.batchId === selectedBatchId
    ) {
      onSelect(null);
    } else {
      onSelect(selection);
    }

    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSelectProductOnly = (product: Product) => {
    handleSelect({
      productId: product.id,
      batchId: null,
      productName: product.product_name,
      salePrice: product.sale_price,
      costPrice: product.cost_price,
    });
  };

  const handleSelectBatch = (product: Product, batch: ProductBatch) => {
    handleSelect({
      productId: product.id,
      batchId: batch.id,
      productName: product.product_name,
      batchNumber: batch.batch_number,
      quantity: batch.quantity,
      salePrice: batch.sale_price,
      costPrice: batch.cost_price,
    });
  };

  const handleToggleProduct = (product: Product) => {
    if (product.batches && product.batches.length > 0) {
      setExpandedProductId(
        expandedProductId === product.id ? null : product.id,
      );
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "NPR",
    }).format(price);
  };

  const getDisplayText = () => {
    if (selectedProduct && selectedBatch) {
      return (
        <>
          <Tn v={selectedProduct.product_name} /> · <Tn v={selectedBatch.batch_number} />
        </>
      );
    }

    if (selectedProduct) {
      return <Tn v={selectedProduct.product_name} />;
    }

    return null;
  };

  const getDisplaySubtext = () => null;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen((previous) => !previous)}
        className={`relative w-full rounded-xl border border-slate-200 bg-white transition ${
          !disabled
            ? "cursor-pointer hover:border-slate-400"
            : "cursor-not-allowed bg-slate-50"
        }`}
      >
        <div className="flex min-h-[45px] items-center justify-between px-4 py-2">
          <div className="flex-1 min-w-0">
            {getDisplayText() ? (
              <>
                <div className="text-sm font-medium text-slate-700 truncate">
                  {getDisplayText()}
                </div>

                {getDisplaySubtext() && (
                  <div className="mt-0.5 text-xs text-slate-500 truncate">
                    {getDisplaySubtext()}
                  </div>
                )}
              </>
            ) : isLoading && selectedProductId ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span className="text-sm text-slate-400">{t(placeholder)}</span>
            )}
          </div>

          <svg
            className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t(searchPlaceholder)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          </div>

          <div className={`${maxHeight} overflow-y-auto`}>
            {isError ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm font-medium text-rose-500">
                  {t("Failed to load products")}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  {error?.message || t("Something went wrong")}
                </div>
              </div>
            ) : isLoading ? (
              <div role="status" aria-label={t("Loading...")} className="space-y-1 px-4 py-3">
                <div className="flex items-center gap-2 pb-1 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("Loading...")}
                </div>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {debouncedSearchTerm
                  ? `${t("No products found for")} "${debouncedSearchTerm}"`
                  : t(emptyMessage)}
              </div>
            ) : (
              <div
                className={`transition-opacity ${
                  isFetching ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {isFetching && (
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("Searching...")}
                  </div>
                )}

                {products.map((product) => {
                  const isExpanded = expandedProductId === product.id;

                  const isSelected =
                    selectedProductId === product.id && !selectedBatchId;

                  const hasBatches =
                    Array.isArray(product.batches) &&
                    product.batches.length > 0;

                  return (
                    <div
                      key={product.id}
                      className="border-b border-slate-50 last:border-b-0"
                    >
                      <div
                        className={`flex w-full items-center transition hover:bg-slate-50 ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                      >
                        <button
                          type="button"
                          // a product with colours / sizes is sold from one of
                          // them, so open the list instead of picking the bare
                          // product (its own stock is 0)
                          onClick={() =>
                            hasBatches
                              ? handleToggleProduct(product)
                              : handleSelectProductOnly(product)
                          }
                          className="flex-1 cursor-pointer px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 flex-shrink-0 text-slate-400" />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium text-slate-900">
                                  <Tn v={product.product_name} />
                                </span>

                                {isSelected && (
                                  <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                                )}
                              </div>

                              <div className="mt-0.5 text-xs text-slate-500">
                                {showBatchPrices &&
                                  product.sale_price !== undefined && (
                                    <span className="ml-2">
                                      {t("Price")}: {formatPrice(product.sale_price)}
                                    </span>
                                  )}

                              </div>
                            </div>
                          </div>
                        </button>

                        {hasBatches && (
                          <button
                            type="button"
                            onClick={() => handleToggleProduct(product)}
                            className="cursor-pointer px-3 py-3 hover:bg-slate-100"
                            aria-label={
                              isExpanded
                                ? t("Hide colours")
                                : t("Show colours")
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {isExpanded && hasBatches && (
                        <div className="ml-4 border-l-4 border-l-blue-200 bg-slate-50">
                          {product.batches!.map((batch) => {
                            const isBatchSelected =
                              selectedBatchId === batch.id &&
                              selectedProductId === product.id;

                            return (
                              <button
                                key={batch.id}
                                type="button"
                                onClick={() =>
                                  handleSelectBatch(product, batch)
                                }
                                className={`w-full cursor-pointer px-4 py-2.5 text-left transition hover:bg-white ${
                                  isBatchSelected ? "bg-white" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Boxes className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-slate-700 truncate">
                                        <Tn v={batch.batch_number} />
                                      </span>

                                      {isBatchSelected && (
                                        <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                                      )}
                                    </div>

                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

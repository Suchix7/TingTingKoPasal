"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Search,
  CheckCircle2,
  Package,
  Layers,
  Check,
  Tag,
  Filter,
} from "lucide-react";
import { Product, ProductBatch, useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useLang } from "@/lib/i18n";
import { coverImage, linePhoto } from "@/components/catalog/image";
import type { ProductBatchSelection } from "../layout/ProductBatchDropdown";

type ProductCardPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selection: ProductBatchSelection) => void;
  initialProductId?: string | null;
  initialBatchId?: string | null;
  products?: Product[];
};

export default function ProductCardPickerModal({
  isOpen,
  onClose,
  onApply,
  initialProductId,
  initialBatchId,
  products: passedProducts,
}: ProductCardPickerModalProps) {
  const { t } = useLang();
  const { data: productsData, isLoading: isProductsLoading } = useProducts({
    limit: 1000,
  });
  const { data: categoriesData } = useCategories(1, 100);

  const allProducts = passedProducts || productsData?.data || [];
  const categories = categoriesData?.data || [];

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Selected state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initialProductId || null,
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    initialBatchId || null,
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedProductId(initialProductId || null);
      setSelectedBatchId(initialBatchId || null);
    }
  }, [isOpen, initialProductId, initialBatchId]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // Category filter
      if (selectedCategory !== "all" && product.category_id !== selectedCategory) {
        return false;
      }

      // Stock filter
      if (inStockOnly && (product.stock_quantity || 0) <= 0) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const nameMatch = product.product_name?.toLowerCase().includes(query);
        const skuMatch = product.sku?.toLowerCase().includes(query);
        const barcodeMatch = product.barcode?.toLowerCase().includes(query);
        const batchMatch = (product.batches || []).some((b) =>
          b.batch_number?.toLowerCase().includes(query) ||
          b.variant?.toLowerCase().includes(query) ||
          b.size?.toLowerCase().includes(query)
        );
        return nameMatch || skuMatch || barcodeMatch || batchMatch;
      }

      return true;
    });
  }, [allProducts, selectedCategory, inStockOnly, search]);

  // Compute selected details
  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) || null,
    [allProducts, selectedProductId],
  );

  const selectedBatch = useMemo(() => {
    if (!selectedProduct || !selectedBatchId) return null;
    return (selectedProduct.batches || []).find((b) => b.id === selectedBatchId) || null;
  }, [selectedProduct, selectedBatchId]);

  const handleSelectProduct = (product: Product, batch?: ProductBatch | null) => {
    setSelectedProductId(product.id);
    if (batch) {
      setSelectedBatchId(batch.id);
    } else if (product.batches && product.batches.length > 0) {
      if (
        selectedProductId === product.id &&
        selectedBatchId &&
        product.batches.some((b) => b.id === selectedBatchId)
      ) {
        // preserve already selected batch if valid
      } else {
        // Auto-select first in-stock batch, or first batch
        const firstInStock = product.batches.find((b) => (b.quantity ?? 0) > 0);
        setSelectedBatchId(firstInStock?.id || product.batches[0].id);
      }
    } else {
      setSelectedBatchId(null);
    }
  };

  const handleConfirmApply = () => {
    if (!selectedProduct) return;

    let batchToUse = selectedBatch;
    if (selectedProduct.batches && selectedProduct.batches.length > 0 && !batchToUse) {
      const firstInStock = selectedProduct.batches.find((b) => (b.quantity ?? 0) > 0);
      batchToUse = firstInStock || selectedProduct.batches[0];
    }

    const price =
      batchToUse?.sale_price !== undefined
        ? batchToUse.sale_price
        : selectedProduct.sale_price;

    const cost =
      batchToUse?.cost_price !== undefined
        ? batchToUse.cost_price
        : selectedProduct.cost_price;

    const photo = linePhoto(selectedProduct, batchToUse);

    const selection: ProductBatchSelection = {
      productId: selectedProduct.id,
      batchId: batchToUse?.id || null,
      productName: selectedProduct.product_name,
      batchNumber: batchToUse?.batch_number,
      salePrice: price,
      costPrice: cost,
      photoUrl: photo,
      quantity: batchToUse?.quantity ?? selectedProduct.stock_quantity ?? 0,
    };

    onApply(selection);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-5xl max-h-[96dvh] sm:max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-900 shrink-0" />
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                {initialProductId
                  ? t("Change Product (Card View)")
                  : t("Select Product (Card View)")}
              </h2>
            </div>
            <p className="text-2xs sm:text-xs text-slate-500 mt-0.5 truncate">
              {t("Select the product and variant, then click Apply")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="p-2.5 sm:p-4 border-b border-slate-100 bg-white space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by product name, SKU, variant, size, or barcode...")}
                className="w-full pl-9 sm:pl-10 pr-8 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 min-w-0 max-w-full sm:flex-none sm:max-w-[200px] truncate rounded-xl border border-slate-200 bg-slate-50 px-2.5 sm:px-3 py-2 sm:py-2.5 text-2xs sm:text-xs font-medium text-slate-700 outline-none focus:border-slate-900"
              >
                <option value="all">{t("All Categories")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-2xs sm:text-xs font-medium transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  inStockOnly
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{t("In Stock Only")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-5 bg-slate-50/50">
          {isProductsLoading && allProducts.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent" />
              <p className="text-sm">{t("Loading catalog products...")}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="mx-auto h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">{t("No products found matching your search")}</p>
              <p className="text-xs text-slate-400 mt-1">{t("Try adjusting your keyword or category filters")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {filteredProducts.map((product) => {
                const isProductSelected = selectedProductId === product.id;
                const photo = linePhoto(product, null);
                const hasBatches = product.batches && product.batches.length > 0;
                const totalStock = product.stock_quantity ?? 0;

                return (
                  <div
                    key={product.id}
                    className={`min-w-0 rounded-xl sm:rounded-2xl border bg-white overflow-hidden transition-all flex flex-col ${
                      isProductSelected
                        ? "border-blue-600 ring-2 ring-blue-600/30 shadow-md"
                        : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    {/* Top Image & Info Header */}
                    <div
                      onClick={() => handleSelectProduct(product, null)}
                      className="p-2 sm:p-2.5 cursor-pointer flex-1 flex flex-col min-w-0"
                    >
                      <div className="relative aspect-square w-full rounded-xl bg-slate-100 overflow-hidden mb-1.5 sm:mb-2 border border-slate-100">
                        {photo ? (
                          <img
                            src={coverImage(photo, 300)}
                            alt={product.product_name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <Package className="h-6 w-6 sm:h-8 sm:w-8" />
                          </div>
                        )}

                        {/* Stock pill */}
                        <div className="absolute top-1.5 left-1.5 max-w-[calc(100%-2.25rem)]">
                          <span
                            className={`block truncate px-1.5 py-0.5 rounded-md text-3xs sm:text-2xs font-bold shadow-xs ${
                              totalStock > 0
                                ? "bg-emerald-600/90 text-white backdrop-blur-xs"
                                : "bg-rose-600/90 text-white backdrop-blur-xs"
                            }`}
                          >
                            {totalStock > 0 ? `Stock: ${totalStock}` : t("Out of stock")}
                          </span>
                        </div>

                        {/* Selected Checkmark */}
                        {isProductSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white p-0.5 sm:p-1 rounded-full shadow-md">
                            <Check className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-2xs sm:text-xs line-clamp-1 sm:line-clamp-2 leading-tight break-words">
                        {product.product_name}
                      </h4>
                      {product.sku && (
                        <p className="text-3xs text-slate-400 font-mono mt-0.5 truncate hidden sm:block">
                          SKU: {product.sku}
                        </p>
                      )}

                      <div className="mt-auto pt-1.5 flex flex-wrap items-baseline justify-between gap-1 min-w-0">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          Rs. {Number(product.sale_price).toLocaleString()}
                        </span>
                        {product.original_price && product.original_price > product.sale_price && (
                          <span className="text-3xs sm:text-2xs text-slate-400 line-through hidden sm:inline">
                            Rs. {Number(product.original_price).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Batch Variants Section (if available) */}
                    {hasBatches && (
                      <div className="border-t border-slate-100 bg-slate-50/70 p-1.5 sm:p-2 space-y-1">
                        <div className="flex items-center justify-between text-3xs sm:text-2xs font-semibold text-slate-500">
                          <span>{t("Variants")}:</span>
                          <span>{product.batches?.length}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 max-h-16 sm:max-h-24 overflow-y-auto pr-0.5">
                          {product.batches?.map((batch) => {
                            const isBatchSelected =
                              isProductSelected && selectedBatchId === batch.id;
                            const batchStock = batch.quantity ?? 0;

                            return (
                              <button
                                key={batch.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectProduct(product, batch);
                                }}
                                className={`min-w-0 max-w-full overflow-hidden px-1.5 py-0.5 rounded-md text-3xs sm:text-2xs font-medium cursor-pointer transition flex items-center gap-1 border ${
                                  isBatchSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : batchStock > 0
                                      ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                                      : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                                }`}
                              >
                                <span className="truncate min-w-0">{batch.batch_number}</span>
                                <span className={`shrink-0 ${isBatchSelected ? "text-blue-100" : "text-slate-400"}`}>
                                  Rs.{Number(batch.sale_price || product.sale_price).toLocaleString()}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Summary Bar & Footer */}
        <div className="p-2.5 sm:p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto min-w-0 flex-1">
            {selectedProduct ? (
              <div className="flex items-center gap-2 min-w-0 w-full">
                <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                  {linePhoto(selectedProduct, selectedBatch) ? (
                    <img
                      src={coverImage(linePhoto(selectedProduct, selectedBatch)!, 100)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-full w-full p-1.5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-2xs sm:text-xs font-bold text-slate-900 truncate">
                      {selectedProduct.product_name}
                    </span>
                    {selectedBatch && (
                      <span className="px-1.5 py-0.5 rounded text-3xs sm:text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0 max-w-[110px] truncate">
                        {selectedBatch.batch_number}
                      </span>
                    )}
                  </div>
                  <p className="text-3xs sm:text-xs text-slate-600 font-medium truncate">
                    Rs.{" "}
                    {Number(
                      selectedBatch?.sale_price !== undefined
                        ? selectedBatch.sale_price
                        : selectedProduct.sale_price,
                    ).toLocaleString()}{" "}
                    • Stock:{" "}
                    {selectedBatch
                      ? selectedBatch.quantity
                      : selectedProduct.stock_quantity}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-2xs sm:text-xs text-slate-400 italic">
                {t("Click any product card or variant above to select it")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
            >
              {t("Cancel")}
            </button>

            <button
              type="button"
              onClick={handleConfirmApply}
              disabled={!selectedProduct}
              className="flex-1 sm:flex-none px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t("Apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

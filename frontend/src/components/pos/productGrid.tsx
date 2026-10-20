// components/pos/productGrid.tsx (Updated)
"use client";
import { useState, useEffect } from "react";
import PhotoLightbox from "@/components/layout/PhotoLightbox";
import { coverImage } from "@/components/catalog/image";
import {
  Edit,
  Package,
  Plus,
  Layers,
  ScanLine,
  Loader2,
  ImageIcon,
  Maximize2,
} from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import {
  initialFormData,
  type ProductFormData,
} from "@/components/tabs/ProductTab";
import ProductModal from "../product/modal";
import BatchSelectionModal from "./batchselectionmodal";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { useProductByBarcode } from "@/hooks/useProducts";
import toast from "react-hot-toast";

import Tn from "@/components/layout/Tn";
import { useLang } from "@/lib/i18n";
type CartItem = {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount?: number;
  total_price: number;
  batch_id?: string;
  barcode?: string | null;
};

interface ProductGridProps {
  products: Product[];
  cartItems: CartItem[];
  addToCart: (product: Product, unitPrice?: number, batchId?: string) => void;
}

export default function ProductGrid({
  products,
  cartItems,
  addToCart,
}: ProductGridProps) {
  const { t, tn } = useLang();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<{ url: string; title: string } | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [batchSelectionProduct, setBatchSelectionProduct] =
    useState<Product | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);

  // Fetch product by barcode when scanned
  const {
    data: scannedProductData,
    isLoading: isLoadingScannedProduct,
    isError: isScannedProductError,
    error: scannedProductError,
  } = useProductByBarcode(scannedBarcode);

  // Process scanned product when data is fetched
  useEffect(() => {
    if (scannedProductData?.data && scannedBarcode) {
      const product = scannedProductData.data;

      if (scannedProductData.retired) {
        toast.error(
          `${t("This is a retired barcode for")} ${tn(product.product_name)} — ${t("please reprint a new label.")}`,
          { duration: 6000 },
        );
      }

      // Check if product is active
      if (product.status !== "Active") {
        toast.error(
          `${tn(product.product_name)} ${t("is currently")} ${t(product.status.toLowerCase())}`,
        );
        setScannedBarcode("");
        setIsProcessingBarcode(false);
        return;
      }

      // A model sticker names the exact model: deduct that one directly
      const scannedBatch = product.matched_batch_id
        ? product.batches?.find((b) => b.id === product.matched_batch_id)
        : null;

      if (scannedBatch) {
        if (scannedBatch.quantity <= 0) {
          toast.error(
            `${tn(product.product_name)} (${scannedBatch.batch_number}) ${t("is out of stock")}`,
          );
          setScannedBarcode("");
          setIsProcessingBarcode(false);
          return;
        }
        addToCart(product, scannedBatch.sale_price, scannedBatch.id);
        showScanConfirmation(product, scannedBatch.batch_number);
      } else if (product.batches && product.batches.length > 0) {
        // Check if product has batches
        setBatchSelectionProduct(product);
        showScanConfirmation(product);
      } else {
        // Check stock
        if (product.stock_quantity <= 0) {
          toast.error(`${tn(product.product_name)} ${t("is out of stock")}`);
          setScannedBarcode("");
          setIsProcessingBarcode(false);
          return;
        }

        // Add to cart
        addToCart(product, product.sale_price);
        showScanConfirmation(product);
      }

      // Reset states
      setScannedBarcode("");
      setIsProcessingBarcode(false);
      setIsBarcodeScannerOpen(false);
    }
  }, [scannedProductData, scannedBarcode, addToCart]);

  // Brief visual confirmation (photo + name) so the operator can catch a
  // mislabeled sticker before it becomes a sale.
  const showScanConfirmation = (product: Product, model?: string) => {
    toast.custom(
      (toastItem) => (
        <div
          className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg transition-opacity ${
            toastItem.visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {product.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage(product.photo_url, 200)}
                alt={product.product_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-gray-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              <Tn v={product.product_name} />
              {model ? ` — ${model}` : ""}
            </p>
            <p className="text-xs text-gray-500">{t("Added to cart")}</p>
          </div>
        </div>
      ),
      { duration: 2500 },
    );
  };

  // Handle scanned product error
  useEffect(() => {
    if (isScannedProductError && scannedBarcode) {
      const errorMessage =
        scannedProductError instanceof Error
          ? scannedProductError.message
          : t("Failed to fetch product");

      // Check if it's a 404 (product not found)
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        toast.error(`${t("No product found with barcode")}: ${scannedBarcode}`);
      } else {
        toast.error(errorMessage);
      }

      setScannedBarcode("");
      setIsProcessingBarcode(false);
    }
  }, [isScannedProductError, scannedProductError, scannedBarcode]);

  const closeModal = () => {
    setOpen(false);
    setFormData(initialFormData);
  };

  const handleAddToCart = (product: Product) => {
    if (product.batches && product.batches.length > 0) {
      setBatchSelectionProduct(product);
    } else {
      addToCart(product, product.sale_price);
    }
  };

  const handleBatchPriceSelect = (unitPrice: number, batchId?: string) => {
    if (batchSelectionProduct) {
      addToCart(batchSelectionProduct, unitPrice, batchId);
      setBatchSelectionProduct(null);
    }
  };

  // Handle barcode scanning
  const handleBarcodeScanned = (barcode: string) => {
    // Trim the barcode
    // A lookup is already running: ignore repeat scans of the same sticker
    if (isProcessingBarcode) return;
    const trimmedBarcode = barcode.trim();

    if (!trimmedBarcode) {
      toast.error(t("Invalid barcode"));
      return;
    }

    const localProduct = products.find((p) => p.barcode === trimmedBarcode);
    const localModelOwner = localProduct
      ? undefined
      : products.find((p) =>
          p.batches?.some((b) => b.barcode === trimmedBarcode),
        );

    if (localModelOwner) {
      const batch = localModelOwner.batches!.find(
        (b) => b.barcode === trimmedBarcode,
      )!;
      if (localModelOwner.status !== "Active") {
        toast.error(
          `${tn(localModelOwner.product_name)} ${t("is currently")} ${t(localModelOwner.status.toLowerCase())}`,
        );
        return;
      }
      if (batch.quantity <= 0) {
        toast.error(
          `${tn(localModelOwner.product_name)} (${batch.batch_number}) ${t("is out of stock")}`,
        );
        return;
      }
      addToCart(localModelOwner, batch.sale_price, batch.id);
      showScanConfirmation(localModelOwner, batch.batch_number);
      setIsBarcodeScannerOpen(false);
    } else if (localProduct) {
      processProduct(localProduct);
    } else {
      const toastId = toast.loading(t("Searching for product..."));
      setIsProcessingBarcode(true);
      setScannedBarcode(trimmedBarcode);
      toast.dismiss(toastId);
    }
  };

  const processProduct = (product: Product) => {
    if (product.status !== "Active") {
      toast.error(
        `${tn(product.product_name)} ${t("is currently")} ${t(product.status.toLowerCase())}`,
      );
      return;
    }

    if (product.batches && product.batches.length > 0) {
      setBatchSelectionProduct(product);
      showScanConfirmation(product);
      setIsBarcodeScannerOpen(false);
    } else {
      if (product.stock_quantity <= 0) {
        toast.error(`${tn(product.product_name)} ${t("is out of stock")}`);
        return;
      }
      addToCart(product, product.sale_price);
      showScanConfirmation(product);
      setIsBarcodeScannerOpen(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {/* Barcode Scanner Button */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setIsBarcodeScannerOpen(true)}
            disabled={isProcessingBarcode}
            className="inline-flex items-center gap-2 rounded-xl cursor-pointer border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingBarcode || isLoadingScannedProduct ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ScanLine size={18} />
            )}
            {isProcessingBarcode || isLoadingScannedProduct
              ? t("Searching...")
              : t("Scan Barcode")}
          </button>
          {(isProcessingBarcode || isLoadingScannedProduct) && (
            <span
              role="status"
              className="inline-flex items-center gap-2 text-sm text-gray-500"
            >
              <Loader2 size={14} className="animate-spin" />
              {t("Looking up product...")}
            </span>
          )}
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">{t("No products found")}</p>
            <p className="text-sm mt-1">{t("Try adjusting your search")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-4">
            {products.map((product) => {
              // Stock on phone models / batches counts toward the total shown
              const totalStock =
                Number(product.stock_quantity) +
                (product.batches || []).reduce(
                  (sum, b) => sum + Number(b.quantity || 0),
                  0,
                );
              const isOutOfStock = totalStock <= 0;
              const cartItem = cartItems.find(
                (item) => item.product_id === product.id,
              );
              const currentInCart = cartItem?.quantity || 0;
              const hasBatches = product.batches && product.batches.length > 0;

              return (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="group relative bg-white border border-gray-200 rounded-xl p-3 sm:p-5 text-left transition-all hover:border-gray-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none cursor-pointer w-full"
                >
                  {isOutOfStock && (
                    <span className="absolute top-2 left-2 z-10 sm:top-3 sm:left-3 text-[10px] sm:text-xs bg-red-100 text-red-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium">
                      {t("Out of Stock")}
                    </span>
                  )}

                  {currentInCart > 0 && !isOutOfStock && (
                    <span className="absolute top-2 left-2 z-10 sm:top-3 sm:left-3 text-[10px] sm:text-xs bg-gray-900 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium">
                      {currentInCart} {t("in cart")}
                    </span>
                  )}

                  {/* Batch indicator */}
                  {hasBatches && !isOutOfStock && (
                    <span className="absolute top-2 left-2 z-10 sm:top-3 sm:left-3 flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium text-blue-700">
                      <Layers size={10} />
                      {product.batches?.length}{" "}
                      {product.batches?.length === 1 ? t("model") : t("models")}
                    </span>
                  )}

                  {/* Barcode indicator - only when there's room to breathe */}
                  {product.barcode && (
                    <span className="absolute bottom-2 right-5 hidden text-xs text-gray-400 font-mono sm:block">
                      {product.barcode}
                    </span>
                  )}

                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <div className="relative -mx-3 -mt-3 mb-3 aspect-square overflow-hidden rounded-t-xl bg-gray-100 sm:-mx-5 sm:-mt-5">
                        {product.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverImage(product.photo_url, 480)}
                            alt={product.product_name}
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-full object-cover ${
                              isOutOfStock ? "opacity-60 grayscale" : ""
                            }`}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                        {product.photo_url && (
                          <span
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setZoom({
                                url: product.photo_url!,
                                title: product.product_name,
                              });
                            }}
                            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur active:bg-black/75"
                            aria-label={t("View photo")}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </span>
                        )}
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setOpen(true);
                            setFormData({
                              product_name: product.product_name,
                              category_id: product.category_id,
                              cost_price: product.cost_price,
                              sale_price: product.sale_price,
                              stock_quantity: product.stock_quantity,
                              unit: product.unit,
                              status: product.status,
                              barcode: product.barcode || "",
                              description: product.description || "",
                              variants: [],
                            });
                          }}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                          aria-label={t("Edit product")}
                        >
                          <Edit className="h-3.5 w-3.5 text-gray-700" />
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-700 line-clamp-2 pr-2">
                        <Tn v={product.product_name} />
                      </h3>
                    </div>

                    <div className="mt-2 pt-2 sm:mt-4 sm:pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm sm:text-md font-bold text-gray-900">
                            Rs. {product.sale_price.toLocaleString()}
                          </span>
                          {hasBatches && (
                            <span className="text-[10px] sm:text-xs text-blue-600 font-medium">
                              {t("Multiple prices")}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs sm:text-sm font-medium ${isOutOfStock ? "text-red-500" : "text-gray-700"}`}
                          >
                            {totalStock} {product.unit}
                          </span>
                          {totalStock <= 5 && totalStock > 0 && (
                            <p className="text-[10px] sm:text-xs text-orange-500">
                              {t("Low stock")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              className="group relative min-h-[120px] sm:min-h-[180px] flex items-center justify-center border-2 cursor-pointer border-dashed border-gray-200 rounded-xl p-3 sm:p-5 text-left transition-all hover:border-gray-900 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:shadow-none"
              onClick={() => {
                setSelectedProduct(null);
                setFormData(initialFormData);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-700" />{" "}
              <span className="text-sm text-gray-400 group-hover:text-gray-700">
                {t("Add Product")}
              </span>
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-gray-500">
          {t("Showing")} {products.length} {t("products")}.{" "}
          {t("Search, choose a category, or scan barcode to find more.")}
        </p>
      </div>

      {zoom && (
        <PhotoLightbox
          url={zoom.url}
          title={zoom.title}
          onClose={() => setZoom(null)}
        />
      )}

      {/* Product Modal */}
      {open && (
        <ProductModal
          closeModal={closeModal}
          selectedProduct={selectedProduct}
        />
      )}

      {/* Batch Selection Modal */}
      {batchSelectionProduct && (
        <BatchSelectionModal
          product={batchSelectionProduct}
          onSelect={handleBatchPriceSelect}
          onClose={() => setBatchSelectionProduct(null)}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
        buttonLabel={t("Scan Product Barcode")}
        isLookingUp={isProcessingBarcode || isLoadingScannedProduct}
      />
    </>
  );
}

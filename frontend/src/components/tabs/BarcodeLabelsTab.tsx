"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Tag, Trash2, Loader2, Printer, Download } from "lucide-react";
import toast from "react-hot-toast";
import {
  useProducts,
  useMarkBarcodePrinted,
  type Product,
} from "@/hooks/useProducts";
import { useDebounced } from "@/hooks/useDebounced";
import LabelSheetPDFDocument, {
  type LabelItem,
} from "@/components/barcode-labels/LabelSheetPDF";
import {
  ReprintConfirmDialog,
  type ReprintConflict,
} from "@/components/barcode-labels/ReprintConfirmDialog";

// One printable sticker source: a plain product, or a single phone model
// (batch) of a product - each model has its own barcode so a scan deducts
// the right one.
type LabelSource = Product & { batchId?: string };

type SelectedProduct = {
  product: LabelSource;
  quantity: number;
};

function expandToLabelSources(products: Product[]): LabelSource[] {
  return products.flatMap((product): LabelSource[] => {
    const batches = (product.batches ?? []).filter((b) => b.barcode);
    if (batches.length === 0) return [product];

    return batches.map((batch) => ({
      ...product,
      id: batch.id,
      batchId: batch.id,
      product_name: `${product.product_name} - ${batch.batch_number}`,
      barcode: batch.barcode,
      sale_price: batch.sale_price,
      stock_quantity: batch.quantity,
      barcode_last_printed_at: null,
      barcode_last_printed_quantity: 0,
    }));
  });
}

// GS1 mod-10 check digit, shared by EAN-8/UPC-A/EAN-13 (only the length
// differs). Used to figure out which symbology a stored barcode actually
// is, since products can carry a manufacturer-scanned code of any length,
// not just the EAN-13 codes this app generates itself.
function gs1CheckDigit(bodyDigits: string): number {
  let sum = 0;
  const len = bodyDigits.length;
  for (let i = 0; i < len; i++) {
    const digit = Number(bodyDigits[len - 1 - i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

function isValidGS1(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  return gs1CheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);
}

// Forcing every barcode through bcid "ean13" breaks (throws, aborting the
// whole batch) for anything that isn't a valid 13-digit EAN-13 - e.g. a
// 12-digit UPC-A scanned off a manufacturer's package, an 8-digit EAN-8, or
// a plain SKU typed in manually. Pick the symbology the code actually is,
// and fall back to Code128 (accepts arbitrary text) instead of throwing.
function pickBarcodeSymbology(code: string): "ean13" | "upca" | "ean8" | "code128" {
  if (/^\d{13}$/.test(code) && isValidGS1(code)) return "ean13";
  if (/^\d{12}$/.test(code) && isValidGS1(code)) return "upca";
  if (/^\d{8}$/.test(code) && isValidGS1(code)) return "ean8";
  return "code128";
}

// How many units still don't have a sticker on them: stock minus whatever
// was already printed. Never negative - if stock dropped below what was
// printed (e.g. some sold since), there's nothing new to print.
function remainingUnprinted(product: LabelSource): number {
  const stock = Math.floor(product.stock_quantity || 0);
  const printed = Math.floor(product.barcode_last_printed_quantity || 0);
  return printed > 0 ? Math.max(stock - printed, 0) : stock;
}

export default function BarcodeLabelsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounced(searchTerm, 300);
  const { data, isLoading } = useProducts({
    page: 1,
    limit: 20,
    search: debouncedSearch,
  });

  const products = useMemo(
    () => expandToLabelSources(data?.data || []),
    [data],
  );
  const markBarcodePrinted = useMarkBarcodePrinted();

  const [selected, setSelected] = useState<Record<string, SelectedProduct>>(
    {},
  );
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  const [reprintConflicts, setReprintConflicts] = useState<
    ReprintConflict[] | null
  >(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleProduct = (product: LabelSource) => {
    if (!product.barcode) return;

    setSelected((prev) => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        // Default to only the units that don't have a sticker yet - if 10
        // were already printed and 2 more came into stock, that's 2 new
        // labels needed, not 12. Still freely editable below.
        const remaining = remainingUnprinted(product);
        next[product.id] = { product, quantity: remaining > 0 ? remaining : 1 };
      }
      return next;
    });
  };

  // Actually build and save the PDF, and record the print against each
  // product so the "Printed" badge and next default reflect it.
  const runDownload = async () => {
    setIsDownloading(true);
    try {
      selectedList.forEach(({ product, quantity }) => {
        // Print tracking is per product; model stickers aren't tracked
        if (product.batchId) return;
        markBarcodePrinted.mutate({ id: product.id, quantity });
      });

      const { pdf } = require("@react-pdf/renderer");
      const blob: Blob = await pdf(
        <LabelSheetPDFDocument labels={labels} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `barcode-labels-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate label sheet PDF:", error);
      toast.error("Failed to generate the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Gate the actual download: printing more than the unprinted stock for a
  // product means some of what's about to print duplicates stickers already
  // on the shelf - confirm that in-app before it happens instead of quietly
  // overwriting.
  const requestDownload = () => {
    const conflicts: ReprintConflict[] = selectedList
      .map(({ product, quantity }) => {
        const alreadyPrinted = Math.floor(
          product.barcode_last_printed_quantity || 0,
        );
        if (alreadyPrinted <= 0) return null;

        const remaining = remainingUnprinted(product);
        if (quantity <= remaining) return null;

        return {
          productId: product.id,
          productName: product.product_name,
          alreadyPrinted,
          requested: quantity,
          overlap: quantity - remaining,
        };
      })
      .filter((entry): entry is ReprintConflict => entry !== null);

    if (conflicts.length > 0) {
      setReprintConflicts(conflicts);
      return;
    }

    void runDownload();
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setSelected((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: Math.max(1, quantity),
      },
    }));
  };

  const removeSelected = (productId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Build the actual barcode images (bwip-js is browser/canvas-only, so this
  // runs client-side and can't happen synchronously during render).
  useEffect(() => {
    let cancelled = false;

    async function buildLabels() {
      if (selectedList.length === 0) {
        setLabels([]);
        return;
      }

      setIsGenerating(true);
      try {
        const bwipjs = (await import("bwip-js")).default;
        const built: LabelItem[] = [];
        const failed: string[] = [];

        for (const { product, quantity } of selectedList) {
          if (!product.barcode) continue;

          // Isolated per product: one malformed/unscannable barcode must
          // not blank out the whole sheet for everything else selected.
          try {
            const canvas = document.createElement("canvas");
            bwipjs.toCanvas(canvas, {
              bcid: pickBarcodeSymbology(product.barcode),
              text: product.barcode,
              // The human-readable digits are rendered as our own PDF Text
              // element instead (see LabelSheetPDF), not baked into this
              // image. Baked-in text made the image taller by a variable
              // amount per code, and when that combined height got
              // rescaled/clipped to fit the label cell, the text row could
              // end up squashed into the bars instead of sitting cleanly
              // below them.
              includetext: false,
              // 22mm bar height: well above the minimum reliable-scan
              // height (GS1 recommends ~80%-200% of nominal size; this
              // sits close to 100%) so cheap handheld/phone scanners can
              // read it without a perfectly steady hand. Scale 5 only
              // raises the source raster's pixel density (sharper bar
              // edges once printed) - it doesn't change the printed size,
              // since the PDF always displays this at a fixed width.
              scale: 5,
              height: 22,
              // Without includetext, bwip-js crops the canvas tight to the
              // bars with NO quiet zone at all - a scanner physically
              // cannot lock onto a barcode with no blank margin around it.
              // Pad it back in explicitly (comfortably above GS1's ~11/7
              // module minimum either side).
              paddingwidth: 4,
              paddingheight: 1.5,
              // Bake in an opaque white background instead of leaving the
              // margin transparent. A transparent PNG relies on the PDF
              // viewer/printer correctly compositing its alpha channel
              // against white - some print pipelines get that wrong and
              // render transparent regions as solid black, which would
              // turn the whole label into an unreadable black block.
              backgroundcolor: "FFFFFF",
            });
            const dataUri = canvas.toDataURL("image/png");
            // Preserve the barcode's real proportions in the PDF instead of
            // forcing it into an arbitrary box, which would squash the bars
            // and make the label harder or impossible to scan.
            const barcodeAspectRatio = canvas.height / canvas.width;

            for (let i = 0; i < quantity; i++) {
              built.push({
                productName: product.product_name,
                barcode: product.barcode,
                salePrice: product.sale_price,
                barcodeImage: dataUri,
                barcodeAspectRatio,
              });
            }
          } catch (itemError) {
            console.error(
              `Failed to render barcode for "${product.product_name}" (${product.barcode}):`,
              itemError,
            );
            failed.push(product.product_name);
          }
        }

        if (!cancelled) {
          setLabels(built);
          if (failed.length > 0) {
            toast.error(
              `Couldn't generate a barcode for: ${failed.join(", ")}. Their barcode value looks invalid.`,
            );
          }
        }
      } catch (error) {
        console.error("Failed to render barcode images:", error);
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    }

    buildLabels();
    return () => {
      cancelled = true;
    };
  }, [selectedList]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Barcode Labels</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select products, choose how many stickers to print for each, then
          download an A4 sheet of scannable labels.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product picker */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gray-400"
            />
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No products found.
              </p>
            ) : (
              products.map((product) => {
                const isSelected = Boolean(selected[product.id]);
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!product.barcode}
                    onClick={() => toggleProduct(product)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-400"
                    } ${!product.barcode ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product.product_name}
                        </p>
                        <p className="font-mono text-xs text-gray-500">
                          {product.barcode || "No barcode yet"}
                        </p>
                        {(product.barcode_last_printed_quantity || 0) > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                            <Printer size={10} />
                            Printed {product.barcode_last_printed_quantity}
                            {product.barcode_last_printed_at &&
                              ` · ${new Date(
                                product.barcode_last_printed_at,
                              ).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                      <Tag
                        size={16}
                        className={
                          isSelected ? "text-gray-900" : "text-gray-300"
                        }
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected products + quantities */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Selected for printing ({selectedList.length})
          </h2>

          {selectedList.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Select products on the left to add them here.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedList.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product.product_name}
                    </p>
                    <p className="font-mono text-xs text-gray-500">
                      {product.barcode}
                    </p>
                    {(product.barcode_last_printed_quantity || 0) > 0 && (
                      <p className="text-xs text-blue-600">
                        {product.barcode_last_printed_quantity} printed
                        before
                      </p>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      updateQuantity(product.id, parseInt(e.target.value, 10) || 1)
                    }
                    className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelected(product.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs text-gray-500">
              {labels.length} label{labels.length === 1 ? "" : "s"} total · 18
              per A4 page
            </p>
            {isGenerating ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Rendering barcodes...
              </span>
            ) : labels.length === 0 ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400">
                Select products to print
              </span>
            ) : (
              <button
                type="button"
                onClick={requestDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Preparing PDF...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download A4 Label Sheet
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {reprintConflicts && (
        <ReprintConfirmDialog
          conflicts={reprintConflicts}
          onCancel={() => setReprintConflicts(null)}
          onConfirm={() => {
            setReprintConflicts(null);
            void runDownload();
          }}
        />
      )}
    </div>
  );
}

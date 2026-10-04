"use client";

import { useEffect, useState } from "react";
import { IPHONE_MODELS } from "@/lib/phoneModels";
import toast from "react-hot-toast";
import {
  useCreateProductBatch,
  useUpdateProductBatch,
  type ProductBatch,
} from "@/hooks/useProductBatch";
import { useProducts } from "@/hooks/useProducts";
import {
  initialBatchFormData,
  type BatchFormData,
} from "@/components/tabs/ProductBatchTab";
import { useDebounced } from "@/hooks/useDebounced";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";

export default function BatchModal({
  closeModal,
  selectedBatch,
  productId,
  defaultCostPrice,
  defaultSalePrice,
}: {
  closeModal: () => void;
  selectedBatch?: ProductBatch | null;
  productId?: string;
  defaultCostPrice?: number;
  defaultSalePrice?: number;
}) {
  const [formData, setFormData] = useState<BatchFormData>(initialBatchFormData);
  const [searchProductTerm, setSearchProductTerm] = useState("");
  const debouncedSearchProductTerm = useDebounced(searchProductTerm, 300);
  const [showNewBatchDialog, setShowNewBatchDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<BatchFormData | null>(
    null,
  );

  const { data: productsData, isLoading: isProductsLoading } = useProducts({
    page: 1,
    limit: 50,
    search: debouncedSearchProductTerm,
  });

  const products = productsData?.data || [];
  const createBatchMutation = useCreateProductBatch();
  const updateBatchMutation = useUpdateProductBatch();

  const isSubmitting =
    createBatchMutation.isPending || updateBatchMutation.isPending;

  const isEditMode = !!selectedBatch;

  useEffect(() => {
    if (selectedBatch) {
      setFormData({
        product_id: selectedBatch.product_id || "",
        batch_number: selectedBatch.batch_number || "",
        quantity: selectedBatch.quantity || 0,
        cost_price: selectedBatch.cost_price || 0,
        sale_price: selectedBatch.sale_price || 0,
      });
    } else {
      setFormData({
        product_id: productId || initialBatchFormData.product_id,
        batch_number: initialBatchFormData.batch_number,
        quantity: initialBatchFormData.quantity,
        cost_price: defaultCostPrice || initialBatchFormData.cost_price,
        sale_price: defaultSalePrice || initialBatchFormData.sale_price,
      });

      if (productId) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          const generatedBatchNumber = generateBatchNumber(
            product.product_name,
          );
          setFormData((prev) => ({
            ...prev,
            batch_number: generatedBatchNumber,
          }));
        }
      }
    }
  }, [selectedBatch, productId, defaultCostPrice, defaultSalePrice, products]);

  useEffect(() => {
    if (!selectedBatch && defaultCostPrice !== undefined) {
      setFormData((prev) => ({
        ...prev,
        cost_price: defaultCostPrice,
      }));
    }
  }, [defaultCostPrice, selectedBatch]);

  // Update form data when defaultSalePrice changes
  useEffect(() => {
    if (!selectedBatch && defaultSalePrice !== undefined) {
      setFormData((prev) => ({
        ...prev,
        sale_price: defaultSalePrice,
      }));
    }
  }, [defaultSalePrice, selectedBatch]);

  // Auto-generate batch number when product changes
  useEffect(() => {
    if (!isEditMode && formData.product_id) {
      const product = products.find(
        (p) => p.id === formData.product_id,
      );
      if (product) {
        const generatedBatchNumber = generateBatchNumber(product.product_name);
        setFormData((prev) => ({
          ...prev,
          batch_number: generatedBatchNumber,
        }));
      }
    }
  }, [formData.product_id, products, isEditMode]);

  const generateBatchNumber = (productName: string) => {
    const firstWord = productName.trim().split(/\s+/)[0].toUpperCase();

    const cleanFirstWord = firstWord.replace(/[^A-Z0-9]/g, "");

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    return `${cleanFirstWord}-${year}${month}${day}-${randomSuffix}`;
  };

  const handleChange = (field: keyof BatchFormData, value: string | number) => {
    if (field === "cost_price" && isEditMode && selectedBatch) {
      const newCostPrice = Number(value);
      const currentCostPrice = Number(formData.cost_price);

      if (newCostPrice !== currentCostPrice) {
        setPendingFormData({
          ...formData,
          cost_price: newCostPrice,
        });
        setShowNewBatchDialog(true);
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewBatchConfirm = () => {
    setShowNewBatchDialog(false);

    if (pendingFormData) {
      const newBatchData = {
        productId: selectedBatch?.product_id,
        defaultCostPrice: pendingFormData.cost_price,
        defaultSalePrice: pendingFormData.sale_price,
      };

      closeModal();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("openBatchModal", {
            detail: newBatchData,
          }),
        );
      }
    }

    setPendingFormData(null);
  };

  const handleNewBatchCancel = () => {
    setShowNewBatchDialog(false);
    setPendingFormData(null);
    closeModal();
  };

  const validateForm = () => {
    if (!formData.product_id) {
      toast.error("Product is required.");
      return false;
    }

    if (!formData.batch_number.trim()) {
      toast.error("Phone model / batch number is required.");
      return false;
    }

    if (Number(formData.quantity) < 0) {
      toast.error("Quantity cannot be negative.");
      return false;
    }

    if (Number(formData.cost_price) < 0) {
      toast.error("Cost price cannot be negative.");
      return false;
    }

    if (Number(formData.sale_price) < 0) {
      toast.error("Sale price cannot be negative.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (formData.cost_price > formData.sale_price) {
      toast.error("Cost price cannot be greater than sale price.");
      return;
    }

    if (
      isEditMode &&
      selectedBatch &&
      formData.cost_price !== selectedBatch.cost_price
    ) {
      const confirmNewBatch = window.confirm(
        "Cost price has changed. Would you like to create a new batch instead? Click OK to create new batch, Cancel to update this batch.",
      );

      if (confirmNewBatch) {
        handleNewBatchConfirm();
        return;
      }
    }

    try {
      const payload = {
        product_id: formData.product_id,
        batch_number: formData.batch_number.trim(),
        quantity: Number(formData.quantity),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
      };

      const promise =
        isEditMode && selectedBatch
          ? updateBatchMutation.mutateAsync({
              id: selectedBatch.id,
              ...payload,
            })
          : createBatchMutation.mutateAsync(payload);

      await promise;
      toast.success(isEditMode ? "Batch updated." : "Batch created.");
      closeModal();
    } catch (error: any) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} batch:`,
        error,
      );
      toast.error(
        error.response?.data?.message ||
          error.message ||
          `Failed to ${isEditMode ? "update" : "create"} batch. Please try again later.`,
      );
    }
  };

  const selectedProduct = products.find(
    (p) => p.id === formData.product_id,
  );

  // Find product name for display when product is pre-selected
  const getSelectedProductName = () => {
    if (selectedProduct) {
      return selectedProduct.product_name;
    }
    // If product is pre-selected but not in the products list, show a placeholder
    if (formData.product_id && productsData?.data) {
      return `Product ID: ${formData.product_id}`;
    }
    return "N/A";
  };

  // Regenerate batch number
  const handleRegenerateBatchNumber = () => {
    const product = products.find((p) => p.id === formData.product_id);
    if (product) {
      const newBatchNumber = generateBatchNumber(product.product_name);
      setFormData((prev) => ({
        ...prev,
        batch_number: newBatchNumber,
      }));
      toast.success("Batch number regenerated");
    }
  };

  return (
    <>
      <div
        onClick={() => {
          if (isSubmitting) return;
          closeModal();
        }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {isEditMode ? "Update Batch" : "Add Batch"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isEditMode
                  ? "Update the batch details for this product."
                  : productId
                    ? `Create a new batch for the selected product with updated cost price.`
                    : "Create a new batch with pricing for inventory tracking."}
              </p>
            </div>
            <button
              onClick={closeModal}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Product Selection - Full width */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Product
                </label>
                {productId ? (
                  // Display selected product as read-only when productId is provided
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {getSelectedProductName()}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Pre-selected
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Product is pre-selected and cannot be changed
                    </p>
                  </div>
                ) : (
                  <DropdownWithSearch
                    options={
                      productsData?.data?.map((product) => ({
                        id: product.id,
                        label: product.product_name,
                        sublabel: `Stock: ${product.stock_quantity || 0} ${product.unit || "units"}`,
                        metadata: product,
                      })) || []
                    }
                    selectedId={formData.product_id}
                    onSelect={(option) => {
                      setFormData({
                        ...formData,
                        product_id: option?.id || "",
                      });
                    }}
                    isLoading={isProductsLoading}
                    placeholder="Select product"
                    searchPlaceholder="Search products by name..."
                    disabled={isSubmitting || isEditMode}
                    emptyMessage="No products found"
                    onSearch={(searchTerm) => {
                      setSearchProductTerm(searchTerm);
                    }}
                  />
                )}
                {isEditMode && (
                  <p className="mt-1 text-xs text-amber-600">
                    Product cannot be changed when editing a batch.
                  </p>
                )}
              </div>

              {/* Batch Number */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone Model / Batch Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="batch-phone-model-suggestions"
                    placeholder="Pick a phone model, or keep the auto batch number"
                    value={formData.batch_number}
                    onChange={(e) =>
                      handleChange("batch_number", e.target.value)
                    }
                    disabled={isSubmitting || isEditMode}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-24 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                  {!isEditMode && formData.product_id && (
                    <button
                      type="button"
                      onClick={handleRegenerateBatchNumber}
                      disabled={isSubmitting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Regenerate batch number"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>

              <datalist id="batch-phone-model-suggestions">
                {IPHONE_MODELS.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>

              {/* Quantity */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Enter quantity"
                  value={String(formData.quantity)}
                  onChange={(e) =>
                    handleChange(
                      "quantity",
                      e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                    )
                  }
                  disabled={isSubmitting}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {/* Cost Price */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cost Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter cost price"
                  value={String(formData.cost_price)}
                  onChange={(e) =>
                    handleChange(
                      "cost_price",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                  disabled={isSubmitting}
                  onWheel={(e) => e.currentTarget.blur()}
                  readOnly={isEditMode}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {isEditMode && (
                  <p className="mt-1 text-xs text-amber-600">
                    To change cost price you will need to create a new batch
                  </p>
                )}
              </div>

              {/* Sale Price */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sale Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter sale price"
                  value={String(formData.sale_price)}
                  onChange={(e) =>
                    handleChange(
                      "sale_price",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                  disabled={isSubmitting}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {/* Batch Summary - Full width */}
              {formData.product_id && formData.quantity > 0 && (
                <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-blue-900">
                    Batch Summary
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700">Product</p>
                      <p className="font-medium text-blue-900">
                        {getSelectedProductName()}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700">Batch Number</p>
                      <p className="font-medium text-blue-900">
                        {formData.batch_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700">Total Value (Cost)</p>
                      <p className="font-medium text-blue-900">
                        {new Intl.NumberFormat("en-NP", {
                          style: "currency",
                          currency: "NPR",
                          maximumFractionDigits: 0,
                        }).format(formData.quantity * formData.cost_price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700">Total Value (Sale)</p>
                      <p className="font-medium text-blue-900">
                        {new Intl.NumberFormat("en-NP", {
                          style: "currency",
                          currency: "NPR",
                          maximumFractionDigits: 0,
                        }).format(formData.quantity * formData.sale_price)}
                      </p>
                    </div>
                    {formData.cost_price > 0 && (
                      <div className="col-span-2">
                        <p className="text-blue-700">Potential Profit</p>
                        <p className="font-medium text-green-600">
                          {new Intl.NumberFormat("en-NP", {
                            style: "currency",
                            currency: "NPR",
                            maximumFractionDigits: 0,
                          }).format(
                            formData.quantity *
                              (formData.sale_price - formData.cost_price),
                          )}{" "}
                          <span className="text-xs">
                            (
                            {(
                              ((formData.sale_price - formData.cost_price) /
                                formData.cost_price) *
                              100
                            ).toFixed(2)}
                            %)
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex cursor-pointer min-w-[140px] items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {isEditMode ? "Updating..." : "Saving..."}
                  </span>
                ) : isEditMode ? (
                  "Update Batch"
                ) : (
                  "Save Batch"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Batch Dialog */}
      {showNewBatchDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Create New Batch
              </h3>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              You're changing the cost price of batch{" "}
              <span className="font-semibold text-slate-900">
                {selectedBatch?.batch_number}
              </span>{" "}
              from{" "}
              <span className="font-semibold text-slate-900">
                NPR {selectedBatch?.cost_price?.toFixed(2)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                NPR {pendingFormData?.cost_price?.toFixed(2)}
              </span>
              . Cost price changes should be tracked with a new batch for better
              inventory management.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleNewBatchCancel}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleNewBatchConfirm}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Create New Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  useCreateProduct,
  useUpdateProduct,
  useUploadProductPhoto,
  useReprintBarcode,
  useRegenerateBarcode,
  type Product,
} from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import {
  initialFormData,
  type ProductFormData,
} from "@/components/tabs/ProductTab";
import { useDebounced } from "@/hooks/useDebounced";
import { IPHONE_MODELS } from "@/lib/phoneModels";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";
import CategoriesModal from "../categories/modal";
import BatchModal from "../product-batch/modal";
import { BarcodeScannerModal } from "@/components/pos/BarcodeScannerModal";
import { Camera, Barcode as BarcodeIcon, ImagePlus, RotateCcw, RefreshCw } from "lucide-react";

export default function ProductModal({
  closeModal,
  selectedProduct,
}: {
  closeModal: () => void;
  selectedProduct?: Product | null;
}) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [searchCategoryTerm, setSearchCategoryTerm] = useState("");
  const debouncedSearchCategoryTerm = useDebounced(searchCategoryTerm, 300);
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategories(1, 50, debouncedSearchCategoryTerm);

  const categories = categoriesData?.data || [];
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const uploadPhotoMutation = useUploadProductPhoto();
  const reprintBarcodeMutation = useReprintBarcode();
  const regenerateBarcodeMutation = useRegenerateBarcode();

  const isSubmitting =
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    uploadPhotoMutation.isPending;

  const isEditMode = !!selectedProduct;
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCostPriceDialog, setShowCostPriceDialog] = useState(false);
  const [originalCostPrice, setOriginalCostPrice] = useState<number>(0);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedProduct) {
      setFormData({
        product_name: selectedProduct.product_name || "",
        barcode: selectedProduct.barcode || "",
        description: selectedProduct.description || "",
        status: selectedProduct.status || "Active",
        category_id: selectedProduct.category_id || "",
        unit: selectedProduct.unit || "",
        cost_price: selectedProduct.cost_price || 0,
        sale_price: selectedProduct.sale_price || 0,
        stock_quantity: selectedProduct.stock_quantity || 0,
        variants: [],
      });
      setOriginalCostPrice(selectedProduct.cost_price || 0);
      setPhotoPreview(selectedProduct.photo_url || null);
      setPhotoFile(null);
    } else {
      setFormData(initialFormData);
      setOriginalCostPrice(0);
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  }, [selectedProduct]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhotoIfNeeded = async (productId: number | string) => {
    if (!photoFile) return;

    try {
      await uploadPhotoMutation.mutateAsync({ id: productId, file: photoFile });
    } catch (error) {
      console.error("Error uploading product photo:", error);
    }
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasVariants = !isEditMode && formData.variants.length > 0;
  // Editing a product whose stock lives only on its phone models / batches
  const stockOnModelsOnly =
    isEditMode &&
    (selectedProduct?.batches?.length ?? 0) > 0 &&
    Number(selectedProduct?.stock_quantity ?? 0) === 0;
  const variantsTotal = formData.variants.reduce(
    (sum, v) => sum + (Number(v.quantity) || 0),
    0,
  );

  const addVariant = () =>
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { model: "", quantity: 1 }],
    }));

  // Quick-add a known model; if it is already listed, leave it alone
  const addKnownModel = (model: string) => {
    if (!model) return;
    setFormData((prev) =>
      prev.variants.some((v) => v.model.trim().toLowerCase() === model.toLowerCase())
        ? prev
        : {
            ...prev,
            // reuse a trailing empty row instead of leaving it blank
            variants:
              prev.variants.length > 0 &&
              !prev.variants[prev.variants.length - 1].model.trim()
                ? [
                    ...prev.variants.slice(0, -1),
                    { model, quantity: prev.variants[prev.variants.length - 1].quantity || 1 },
                  ]
                : [...prev.variants, { model, quantity: 1 }],
          },
    );
  };

  const updateVariant = (
    index: number,
    field: "model" | "quantity",
    value: string | number,
  ) =>
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v,
      ),
    }));

  const removeVariant = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));

  const handleBarcodeScanned = (barcode: string) => {
    handleChange("barcode", barcode);
    toast.success("Barcode added to form");
  };

  const validateForm = () => {
    if (!formData.product_name.trim()) {
      toast.error("Product name is required.");
      return false;
    }

    if (!formData.category_id) {
      toast.error("Category is required.");
      return false;
    }

    if (!formData.unit.trim()) {
      toast.error("Unit is required.");
      return false;
    }

    if (!isEditMode && formData.variants.length > 0) {
      const names = formData.variants.map((v) => v.model.trim().toLowerCase());
      if (names.some((n) => !n)) {
        toast.error("Enter a phone model name for every row, or remove the row.");
        return false;
      }
      if (new Set(names).size !== names.length) {
        toast.error("Each phone model can only be listed once.");
        return false;
      }
      if (
        formData.variants.some(
          (v) => !Number.isInteger(Number(v.quantity)) || Number(v.quantity) < 0,
        )
      ) {
        toast.error("Phone model quantities must be whole numbers, 0 or more.");
        return false;
      }
    }

    if (Number(formData.cost_price) < 0) {
      toast.error("Cost price cannot be negative.");
      return false;
    }

    if (Number(formData.sale_price) < 0) {
      toast.error("Sale price cannot be negative.");
      return false;
    }

    if (Number(formData.stock_quantity) < 0) {
      toast.error("Stock quantity cannot be negative.");
      return false;
    }

    if (Number(formData.cost_price || 0) > Number(formData.sale_price || 0)) {
      toast.error("Cost price cannot be greater than sale price.");
      return false;
    }

    return true;
  };

  const handleUpdateWithCostPriceChange = async () => {
    // Update product with new cost price
    setShowCostPriceDialog(false);

    try {
      const payload = {
        ...formData,
        product_name: formData.product_name.trim(),
        category_id: formData.category_id,
        unit: formData.unit.trim(),
        barcode:
          formData.barcode.trim() === "" ? null : formData.barcode.trim(),
        description:
          formData.description.trim() === ""
            ? null
            : formData.description.trim(),
      };

      if (isEditMode && selectedProduct) {
        await updateProductMutation.mutateAsync({
          ...payload,
          id: selectedProduct.id,
        });
        await uploadPhotoIfNeeded(selectedProduct.id);
      }

      closeModal();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleCreateNewBatch = () => {
    setShowCostPriceDialog(false);
    setShowBatchModal(true);
  };

  const handleCostPriceDialogCancel = () => {
    // Revert cost price to original and close dialog
    setShowCostPriceDialog(false);
    setFormData((prev) => ({
      ...prev,
      cost_price: originalCostPrice,
    }));
  };

  const handleBatchModalClose = () => {
    setShowBatchModal(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Check if cost price changed in edit mode
    if (
      isEditMode &&
      selectedProduct &&
      Number(formData.cost_price) !== originalCostPrice
    ) {
      // Show dialog asking how to proceed
      setShowCostPriceDialog(true);
      return;
    }

    // Proceed with normal save if no cost price change
    try {
      const payload = {
        ...formData,
        product_name: formData.product_name.trim(),
        category_id: formData.category_id,
        unit: formData.unit.trim(),
        barcode:
          formData.barcode.trim() === "" ? null : formData.barcode.trim(),
        description:
          formData.description.trim() === ""
            ? null
            : formData.description.trim(),
      };

      if (isEditMode && selectedProduct) {
        await updateProductMutation.mutateAsync({
          ...payload,
          id: selectedProduct.id,
        });
        await uploadPhotoIfNeeded(selectedProduct.id);
      } else {
        const result: any =
          await createProductMutation.mutateAsync(payload);
        const newProductId = result?.data?.id ?? result?.id;
        if (newProductId) {
          await uploadPhotoIfNeeded(newProductId);
        }
      }

      closeModal();
    } catch (error: any) {}
  };

  return (
    <>
      <div
        onClick={() => {
          if (isSubmitting) return;
          closeModal();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {isEditMode ? "Update Product" : "Add Product"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isEditMode
                  ? "Update the product details in your inventory."
                  : "Fill in the product details to add a new item."}
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
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Product Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {photoPreview ? (
                      <Image
                        src={photoPreview}
                        alt="Product photo"
                        width={80}
                        height={80}
                        unoptimized={photoPreview.startsWith("blob:")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={isSubmitting}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ImagePlus size={16} />
                      {photoPreview ? "Change Photo" : "Upload Photo"}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">
                      Used for visual confirmation when scanning at checkout.
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={formData.product_name}
                  onChange={(e) => handleChange("product_name", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <DropdownWithSearch
                  options={
                    categoriesData?.data?.map((category) => ({
                      id: category.id,
                      label: category.category_name,
                      sublabel: `Description: ${category.description || "N/A"}`,
                      metadata: category,
                    })) || []
                  }
                  selectedId={formData.category_id}
                  onSelect={(option) => {
                    setFormData({ ...formData, category_id: String(option?.id || "") });
                  }}
                  isLoading={isCategoriesLoading}
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                  disabled={isSubmitting}
                  emptyMessage="No categories found"
                  onSearch={(searchTerm) => {
                    setSearchCategoryTerm(searchTerm);
                  }}
                  showAddNew={true}
                  addNewLabel="Add New Category"
                  onAddNew={() => setShowCategoryModal(true)}
                />
              </div>

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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {isEditMode &&
                  Number(formData.cost_price) !== originalCostPrice && (
                    <p className="mt-1 text-xs text-amber-600">
                      Cost price changed from NPR {originalCostPrice.toFixed(2)}
                    </p>
                  )}
              </div>

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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {stockOnModelsOnly && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Stock for this product is kept per phone model. Change
                  quantities or add models on the Product Batches page.
                </div>
              )}

              {!hasVariants && !stockOnModelsOnly && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Enter stock quantity"
                  value={String(formData.stock_quantity)}
                  onChange={(e) =>
                    handleChange(
                      "stock_quantity",
                      e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
              )}

              {!isEditMode && (
                <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Phone models (optional)
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        For covers and similar items: add each phone model with
                        its own stock. Leave empty for a normal product.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addVariant}
                      disabled={isSubmitting}
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      + Add model
                    </button>
                  </div>

                  <select
                    value=""
                    onChange={(e) => addKnownModel(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-400"
                  >
                    <option value="">Quick add an iPhone model...</option>
                    {IPHONE_MODELS.map((model) => (
                      <option
                        key={model}
                        value={model}
                        disabled={formData.variants.some(
                          (v) => v.model.trim().toLowerCase() === model.toLowerCase(),
                        )}
                      >
                        {model}
                      </option>
                    ))}
                  </select>
                  <datalist id="phone-model-suggestions">
                    {IPHONE_MODELS.map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>

                  {formData.variants.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.variants.map((variant, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            list="phone-model-suggestions"
                            placeholder="e.g. iPhone 13"
                            value={variant.model}
                            onChange={(e) =>
                              updateVariant(index, "model", e.target.value)
                            }
                            disabled={isSubmitting}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={String(variant.quantity)}
                            onChange={(e) =>
                              updateVariant(
                                index,
                                "quantity",
                                e.target.value === ""
                                  ? 0
                                  : parseInt(e.target.value, 10),
                              )
                            }
                            disabled={isSubmitting}
                            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            disabled={isSubmitting}
                            aria-label="Remove model"
                            className="rounded-lg px-2 py-2 text-slate-400 transition hover:bg-slate-200 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <p className="pt-1 text-xs text-slate-500">
                        Total stock: {variantsTotal}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">Select unit</option>
                  <option>Piece</option>
                  <option>Kg</option>
                  <option>Liter</option>
                  <option>Box</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              {/* Barcode Field with Scanner */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Barcode
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Enter barcode or scan"
                      value={formData.barcode}
                      onChange={(e) => handleChange("barcode", e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                    {formData.barcode && (
                      <button
                        type="button"
                        onClick={() => handleChange("barcode", "")}
                        disabled={isSubmitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Camera size={16} />
                    Scan
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Enter barcode manually or use camera to scan. New products
                  get a barcode generated automatically once saved.
                </p>

                {isEditMode && selectedProduct?.barcode && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={reprintBarcodeMutation.isPending}
                      onClick={async () => {
                        try {
                          await reprintBarcodeMutation.mutateAsync(
                            selectedProduct.id,
                          );
                          toast.success(
                            "Barcode ready to print again from the Barcode Labels tab.",
                          );
                        } catch (error) {
                          console.error("Reprint barcode error:", error);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      Reprint Label
                    </button>
                    <button
                      type="button"
                      disabled={regenerateBarcodeMutation.isPending}
                      onClick={async () => {
                        const confirmed = window.confirm(
                          "This will invalidate the current printed sticker for this product and assign a brand new barcode. Any old stickers still in the field will be flagged as retired when scanned. Continue?",
                        );
                        if (!confirmed) return;

                        try {
                          const result: any =
                            await regenerateBarcodeMutation.mutateAsync(
                              selectedProduct.id,
                            );
                          const newBarcode =
                            result?.data?.barcode ?? result?.barcode;
                          if (newBarcode) {
                            handleChange("barcode", newBarcode);
                          }
                        } catch (error) {
                          console.error("Regenerate barcode error:", error);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw size={14} />
                      Regenerate Barcode
                    </button>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Write a short description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
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
                  "Update Product"
                ) : (
                  "Save Product"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
        buttonLabel="Scan Product Barcode"
      />

      {/* Cost Price Change Dialog */}
      {showCostPriceDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
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
                Cost Price Changed
              </h3>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              The cost price has been changed from{" "}
              <span className="font-semibold text-slate-900">
                NPR {originalCostPrice.toFixed(2)}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                NPR {Number(formData.cost_price).toFixed(2)}
              </span>
              . How would you like to proceed?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCreateNewBatch}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Create New Batch with Updated Price
              </button>

              <button
                onClick={handleUpdateWithCostPriceChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Update Product with New Cost Price
              </button>

              <button
                onClick={handleCostPriceDialogCancel}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel and Revert Cost Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      {showBatchModal && selectedProduct && (
        <BatchModal
          closeModal={handleBatchModalClose}
          productId={selectedProduct.id}
          defaultCostPrice={Number(formData.cost_price)}
          defaultSalePrice={Number(formData.sale_price)}
        />
      )}

      {showCategoryModal && (
        <CategoriesModal closeModal={() => setShowCategoryModal(false)} />
      )}
    </>
  );
}

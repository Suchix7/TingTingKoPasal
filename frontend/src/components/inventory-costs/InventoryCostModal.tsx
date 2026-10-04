"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  DollarSign,
  Archive,
  Package,
  Shield,
  AlertTriangle,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import type { InventoryCostFormData } from "@/components/tabs/InventorycostsTab";
import { useProducts } from "@/hooks/useProducts";
import { useDebounced } from "@/hooks/useDebounced";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";
import ProductModal from "../product/modal";

type InventoryCostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  formData: InventoryCostFormData;
  setFormData: (data: InventoryCostFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
};

export default function InventoryCostModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  isEditMode,
}: InventoryCostModalProps) {
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const debouncedSearch = useDebounced(productSearchTerm, 500);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  const { data: productsData, isLoading } = useProducts({
    page: 1,
    limit: 50,
    search: debouncedSearch,
  });

  const selectedProduct = productsData?.data?.find(
    (p) => p.id === formData.product_id,
  );

  const totalCost =
    (formData.holding_cost_per_unit || 0) +
    (formData.storage_cost || 0) +
    (formData.insurance_cost || 0);

  const handleChange = (field: keyof InventoryCostFormData, value: string) => {
    const numValue = field === "product_id" ? value : parseFloat(value) || 0;
    setFormData({ ...formData, [field]: numValue });
  };

  const handleProductSelect = (productId: string) => {
    setFormData({ ...formData, product_id: productId });
    setIsDropdownOpen(false);
    setProductSearchTerm("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="max-h-[90vh] overflow-y-auto relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="z-100 bg-white sticky top-0 flex items-center justify-between border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditMode ? "Edit Inventory Cost" : "Add Inventory Cost"}
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditMode
                    ? "Update cost information for this product"
                    : "Record cost details for a product"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-6 p-6">
            {/* Product Selection with Search */}
            <div ref={dropdownRef} className="relative">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Product
                </label>
                <DropdownWithSearch
                  options={
                    productsData?.data?.map((product) => ({
                      id: product.id,
                      label: product.product_name,
                      sublabel: `SKU: ${product.sku || "N/A"} | Stock: ${product.stock_quantity || 0} ${product.unit || "units"}`,
                      metadata: product,
                    })) || []
                  }
                  selectedId={formData.product_id}
                  onSelect={(option) => {
                    setFormData({ ...formData, product_id: String(option?.id || "") });
                  }}
                  isLoading={isLoading}
                  placeholder="Select a product"
                  searchPlaceholder="Search products by name or SKU..."
                  emptyMessage="No products found"
                  disabled={isEditMode}
                  onSearch={(searchTerm) => {
                    setProductSearchTerm(searchTerm);
                  }}
                  showAddNew={true}
                  addNewLabel="Add New Product"
                  onAddNew={() => setShowProductModal(true)}
                />
              </div>

              {/* Product Info Card (when selected) */}
              {selectedProduct && !isDropdownOpen && (
                <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  <div className="flex items-start gap-2">
                    <Package className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-medium">
                        Current Inventory Status
                      </div>
                      <div className="text-xs text-blue-600">
                        Stock Quantity: {selectedProduct.stock_quantity || 0}{" "}
                        {selectedProduct.unit || "units"} | Cost Price:{" "}
                        {new Intl.NumberFormat("en-NP", {
                          style: "currency",
                          currency: "NPR",
                        }).format(selectedProduct.cost_price || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Holding Cost */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Archive className="h-4 w-4 text-slate-400" />
                Holding Cost per Unit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  NPR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.holding_cost_per_unit || ""}
                  onChange={(e) =>
                    handleChange("holding_cost_per_unit", e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-14 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Cost of holding one unit in inventory (e.g., capital cost,
                obsolescence)
              </p>
            </div>

            {/* Storage Cost */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Package className="h-4 w-4 text-slate-400" />
                Storage Cost
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  NPR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.storage_cost || ""}
                  onChange={(e) => handleChange("storage_cost", e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-14 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Warehouse, utilities, and handling costs
              </p>
            </div>

            {/* Insurance Cost */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Shield className="h-4 w-4 text-slate-400" />
                Insurance Cost
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  NPR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.insurance_cost || ""}
                  onChange={(e) =>
                    handleChange("insurance_cost", e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-14 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Insurance premium for inventory protection
              </p>
            </div>

            {/* Spoilage Rate */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                Spoilage Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.spoilage_rate || ""}
                  onChange={(e) =>
                    handleChange("spoilage_rate", e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-12 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Expected percentage of inventory lost to spoilage/damage
              </p>
            </div>

            {/* Total Cost Preview */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Total Cost
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {new Intl.NumberFormat("en-NP", {
                    style: "currency",
                    currency: "NPR",
                    maximumFractionDigits: 2,
                  }).format(totalCost)}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Sum of holding, storage, and insurance costs
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 p-6">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !formData.product_id}
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </span>
              ) : isEditMode ? (
                "Update Cost"
              ) : (
                "Add Cost"
              )}
            </button>
          </div>
        </div>
      </div>

      {showProductModal && (
        <ProductModal closeModal={() => setShowProductModal(false)} />
      )}
    </>
  );
}

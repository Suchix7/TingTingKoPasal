"use client";

import React, { useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Calendar,
  Settings,
} from "lucide-react";
import {
  useInventory,
  useUpdateInventory,
  useRestockInventory,
  useDeductInventory,
  useUpdateProductBatch,
  useRestockProductBatch,
  useDeductProductBatch,
  type Inventory,
  type ProductBatch,
} from "@/hooks/useInventory";
import { useDebounced } from "@/hooks/useDebounced";
import InventoryModal from "@/components/inventory/InventoryModal";
import RestockModal from "@/components/inventory/RestockModal";
import DeductModal from "@/components/inventory/DeductModal";
import BatchRestockModal from "@/components/inventory/BatchRestockModal";
import BatchDeductModal from "@/components/inventory/BatchDeductModal";
import BatchManageModal from "@/components/inventory/BatchManageModal";
import Pagination from "@/components/layout/Pagination";

export type InventoryFormData = {
  product_id: number | "";
  current_stock: number;
  reorder_level: number;
  reorder_quantity: number;
};

export type RestockFormData = {
  product_id: number | "";
  quantity: number;
};

export type DeductFormData = {
  product_id: number | "";
  quantity: number;
};

export type BatchRestockFormData = {
  batch_id: number | "";
  quantity: number;
};

export type BatchDeductFormData = {
  batch_id: number | "";
  quantity: number;
};

export type BatchManageFormData = {
  batch_id: number | "";
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
};

const initialInventoryFormData: InventoryFormData = {
  product_id: "",
  current_stock: 0,
  reorder_level: 10,
  reorder_quantity: 20,
};

const initialRestockFormData: RestockFormData = {
  product_id: "",
  quantity: 0,
};

const initialDeductFormData: DeductFormData = {
  product_id: "",
  quantity: 0,
};

const initialBatchRestockFormData: BatchRestockFormData = {
  batch_id: "",
  quantity: 0,
};

const initialBatchDeductFormData: BatchDeductFormData = {
  batch_id: "",
  quantity: 0,
};

const initialBatchManageFormData: BatchManageFormData = {
  batch_id: "",
  batch_number: "",
  quantity: 0,
  cost_price: 0,
  sale_price: 0,
};

const STOCK_STATUS = {
  OUT_OF_STOCK: { label: "Out of Stock", color: "rose" },
  CRITICAL: { label: "Critical", color: "amber" },
  LOW: { label: "Low Stock", color: "orange" },
  HEALTHY: { label: "Healthy", color: "emerald" },
} as const;

type StockStatusKey = keyof typeof STOCK_STATUS;

const getStockStatus = (
  currentStock: number,
  reorderLevel: number,
): StockStatusKey => {
  if (currentStock === 0) return "OUT_OF_STOCK";
  if (currentStock <= 5) return "CRITICAL";
  if (currentStock <= reorderLevel) return "LOW";
  return "HEALTHY";
};

const getStatusStyles = (status: StockStatusKey) => {
  const styles = {
    OUT_OF_STOCK: {
      badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-300",
      progress: "bg-rose-500",
      icon: AlertTriangle,
      iconColor: "text-rose-500",
    },
    CRITICAL: {
      badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300",
      progress: "bg-amber-500",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    LOW: {
      badge: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-300",
      progress: "bg-orange-500",
      icon: TrendingDown,
      iconColor: "text-orange-500",
    },
    HEALTHY: {
      badge:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-300",
      progress: "bg-emerald-500",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
    },
  };
  return styles[status];
};

const getStockPercentage = (current: number, reorder: number) => {
  const max = Math.max(reorder * 2, current, 1);
  return Math.min((current / max) * 100, 100);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatusKey | "ALL">(
    "ALL",
  );
  const [sortBy, setSortBy] = useState<
    "stock_asc" | "stock_desc" | "name_asc" | "name_desc" | "updated_desc"
  >("updated_desc");
  const debouncedSearchValue = useDebounced(search, 300);

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showBatchRestockModal, setShowBatchRestockModal] = useState(false);
  const [showBatchDeductModal, setShowBatchDeductModal] = useState(false);
  const [showBatchManageModal, setShowBatchManageModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(
    null,
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [selectedBatch, setSelectedBatch] = useState<ProductBatch | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(
    new Set(),
  );

  const [inventoryFormData, setInventoryFormData] = useState<InventoryFormData>(
    initialInventoryFormData,
  );
  const [restockFormData, setRestockFormData] = useState<RestockFormData>(
    initialRestockFormData,
  );
  const [deductFormData, setDeductFormData] = useState<DeductFormData>(
    initialDeductFormData,
  );
  const [batchRestockFormData, setBatchRestockFormData] =
    useState<BatchRestockFormData>(initialBatchRestockFormData);
  const [batchDeductFormData, setBatchDeductFormData] =
    useState<BatchDeductFormData>(initialBatchDeductFormData);
  const [batchManageFormData, setBatchManageFormData] =
    useState<BatchManageFormData>(initialBatchManageFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const {
    data: inventoryData,
    isLoading,
    error,
  } = useInventory(page, limit, debouncedSearchValue, statusFilter, sortBy);

  const updateInventoryMutation = useUpdateInventory();
  const restockInventoryMutation = useRestockInventory();
  const deductInventoryMutation = useDeductInventory();
  const updateProductBatchMutation = useUpdateProductBatch();
  const restockProductBatchMutation = useRestockProductBatch();
  const deductProductBatchMutation = useDeductProductBatch();

  const inventory = inventoryData?.data || [];

  const totalPages = inventoryData?.totalPages || 1;

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  const toggleProductExpansion = (productId: number) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleUpdateInventory = (inv: Inventory) => {
    setSelectedInventory(inv);
    setInventoryFormData({
      product_id: inv.product_id,
      current_stock: inv.total_stock,
      reorder_level: inv.reorder_level,
      reorder_quantity: inv.reorder_quantity,
    });
    setShowInventoryModal(true);
  };

  const handleRestock = (productId: number) => {
    setSelectedProductId(productId);
    setRestockFormData({ product_id: productId, quantity: 0 });
    setShowRestockModal(true);
  };

  const handleDeduct = (productId: number) => {
    setSelectedProductId(productId);
    setDeductFormData({ product_id: productId, quantity: 0 });
    setShowDeductModal(true);
  };

  const handleBatchRestock = (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setBatchRestockFormData({
      batch_id: batch.id,
      quantity: 0,
    });
    setShowBatchRestockModal(true);
  };

  const handleBatchDeduct = (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setBatchDeductFormData({
      batch_id: batch.id,
      quantity: 0,
    });
    setShowBatchDeductModal(true);
  };

  const handleBatchManage = (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setBatchManageFormData({
      batch_id: batch.id,
      batch_number: batch.batch_number,
      quantity: batch.quantity,
      cost_price: batch.cost_price,
      sale_price: batch.sale_price,
    });
    setShowBatchManageModal(true);
  };

  const closeModals = () => {
    setShowInventoryModal(false);
    setShowRestockModal(false);
    setShowDeductModal(false);
    setShowBatchRestockModal(false);
    setShowBatchDeductModal(false);
    setShowBatchManageModal(false);
    setSelectedInventory(null);
    setSelectedProductId(null);
    setSelectedBatch(null);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedInventory) return;

    setIsSubmitting(true);
    try {
      await updateInventoryMutation.mutateAsync({
        id: selectedInventory.inventory_id || selectedInventory.product_id,
        current_stock: inventoryFormData.current_stock,
        reorder_level: inventoryFormData.reorder_level,
        reorder_quantity: inventoryFormData.reorder_quantity,
      });
      closeModals();
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = async () => {
    if (!selectedProductId || restockFormData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await restockInventoryMutation.mutateAsync({
        product_id: selectedProductId,
        quantity: restockFormData.quantity,
      });
      closeModals();
    } catch (error) {
      console.error("Restock failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeductSubmit = async () => {
    if (!selectedProductId || deductFormData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await deductInventoryMutation.mutateAsync({
        product_id: selectedProductId,
        quantity: deductFormData.quantity,
      });
      closeModals();
    } catch (error) {
      console.error("Deduction failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchRestockSubmit = async () => {
    if (!selectedBatch || batchRestockFormData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await restockProductBatchMutation.mutateAsync({
        id: selectedBatch.id,
        quantity: batchRestockFormData.quantity,
      });
      closeModals();
    } catch (error) {
      console.error("Batch restock failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDeductSubmit = async () => {
    if (!selectedBatch || batchDeductFormData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      await deductProductBatchMutation.mutateAsync({
        id: selectedBatch.id,
        quantity: batchDeductFormData.quantity,
      });
      closeModals();
    } catch (error) {
      console.error("Batch deduction failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchManageSubmit = async () => {
    if (!selectedBatch) return;

    setIsSubmitting(true);
    try {
      await updateProductBatchMutation.mutateAsync({
        id: selectedBatch.id,
        quantity: batchManageFormData.quantity,
        cost_price: batchManageFormData.cost_price,
        sale_price: batchManageFormData.sale_price,
      });
      closeModals();
    } catch (error) {
      console.error("Batch update failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const BatchDetails = ({ batches }: { batches: ProductBatch[] }) => {
    if (!batches || batches.length === 0) {
      return (
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500">No batches available</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Layers className="h-4 w-4" />
          <span>Product Batches ({batches.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Batch Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-slate-700">
                      {batch.batch_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">
                      {batch.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500">
                      {formatDate(batch.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBatchRestock(batch)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg cursor-pointer border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Restock
                      </button>
                      <button
                        onClick={() => handleBatchDeduct(batch)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrendingDown className="h-3.5 w-3.5" />
                        Deduct
                      </button>
                      <button
                        onClick={() => handleBatchManage(batch)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile batch cards */}
        <div className="lg:hidden space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono font-medium text-slate-700">
                  {batch.batch_number}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  Qty: {batch.quantity}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Created: {formatDate(batch.created_at)}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleBatchRestock(batch)}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center cursor-pointer justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Restock
                </button>
                <button
                  onClick={() => handleBatchDeduct(batch)}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center cursor-pointer justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  Deduct
                </button>
                <button
                  onClick={() => handleBatchManage(batch)}
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center cursor-pointer gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-4 sm:p-6 lg:p-8">
        <div>
          <div className="rounded-3xl border border-rose-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50">
              <AlertTriangle className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900">
              Failed to Load Inventory
            </h3>
            <p className="mt-3 text-sm text-slate-500">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-6">
        <div className=" space-y-6">
          <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-slate-900 p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Inventory
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Track stock levels and manage inventory movements
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-72"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StockStatusKey | "ALL")
                  }
                  className="w-full outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="HEALTHY">Healthy</option>
                  <option value="LOW">Low Stock</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full outline-none"
                >
                  <option value="updated_desc">Last Updated</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                  <option value="stock_asc">Stock Low-High</option>
                  <option value="stock_desc">Stock High-Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2.5">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total Products
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {inventoryData?.stats?.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                    Healthy Stock
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {inventoryData?.stats?.healthy}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500 p-2.5">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
                    Low Stock
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {(inventoryData?.stats?.lowStock || 0) +
                      (inventoryData?.stats?.critical || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-500 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-rose-600">
                    Out of Stock
                  </p>
                  <p className="mt-1 text-2xl font-bold text-rose-700">
                    {inventoryData?.stats?.outOfStock}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : inventory.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {search || statusFilter !== "ALL"
                    ? "No matching inventory found"
                    : "No inventory data"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search || statusFilter !== "ALL"
                    ? "Try adjusting your search or filters."
                    : "Inventory records will appear here once available."}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Stock Level
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Batches
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventory.map((item) => {
                        const stockStatus = getStockStatus(
                          item.total_stock,
                          item.reorder_level,
                        );
                        const statusStyle = getStatusStyles(stockStatus);
                        const stockPercentage = getStockPercentage(
                          item.total_stock,
                          item.reorder_level,
                        );
                        const StatusIcon = statusStyle.icon;
                        const isExpanded = expandedProducts.has(
                          item.product_id,
                        );

                        return (
                          <React.Fragment key={item.inventory_id}>
                            <tr
                              key={item.inventory_id || item.product_id}
                              className="transition hover:bg-slate-50/50 cursor-pointer"
                              onClick={() =>
                                toggleProductExpansion(item.product_id)
                              }
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleProductExpansion(item.product_id);
                                    }}
                                    className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-slate-200 transition"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-slate-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-slate-500" />
                                    )}
                                  </button>
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                                    <StatusIcon
                                      className={`h-5 w-5 ${statusStyle.iconColor}`}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">
                                      {item.product_name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-900">
                                      {item.total_stock}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {item.unit}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${statusStyle.progress}`}
                                      style={{ width: `${stockPercentage}%` }}
                                    />
                                  </div>
                                  <div className="flex gap-2 text-xs text-slate-400">
                                    <span>Std: {item.standard_stock}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                  <Layers className="h-3 w-3" />
                                  {item.batches?.length || 0} batches
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusStyle.badge}`}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {STOCK_STATUS[stockStatus].label}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestock(item.product_id);
                                    }}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center cursor-pointer gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Restock
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeduct(item.product_id);
                                    }}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <TrendingDown className="h-3.5 w-3.5" />
                                    Deduct
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateInventory(item);
                                    }}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Manage
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr
                                key={`${item.product_id}-batches`}
                                className="bg-slate-50/30"
                              >
                                <td colSpan={6} className="px-6 py-4">
                                  <BatchDetails batches={item.batches} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 p-4 lg:hidden">
                  {inventory.map((item) => {
                    const stockStatus = getStockStatus(
                      item.total_stock,
                      item.reorder_level,
                    );
                    const statusStyle = getStatusStyles(stockStatus);
                    const stockPercentage = getStockPercentage(
                      item.total_stock,
                      item.reorder_level,
                    );
                    const StatusIcon = statusStyle.icon;
                    const isExpanded = expandedProducts.has(item.product_id);

                    return (
                      <div
                        key={item.inventory_id || item.product_id}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <button
                          onClick={() =>
                            toggleProductExpansion(item.product_id)
                          }
                          className="flex items-start justify-between gap-4 w-full"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                              <StatusIcon
                                className={`h-6 w-6 ${statusStyle.iconColor}`}
                              />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-slate-900">
                                {item.product_name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle.badge}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {STOCK_STATUS[stockStatus].label}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">
                                Stock Level
                              </span>
                              <span className="font-semibold text-slate-900">
                                {item.total_stock} {item.unit}
                              </span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${statusStyle.progress}`}
                                style={{ width: `${stockPercentage}%` }}
                              />
                            </div>
                            <div className="mt-2 flex gap-2 text-xs text-slate-400">
                              <span>Std: {item.standard_stock}</span>
                              <span>Batch: {item.batch_stock}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500">Batches</p>
                              <p className="font-medium text-slate-900">
                                {item.batches?.length || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Last Updated</p>
                              <p className="font-medium text-slate-900">
                                {formatDate(item.updated_at)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4">
                            <BatchDetails batches={item.batches} />
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleRestock(item.product_id)}
                            disabled={isSubmitting}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50"
                          >
                            <TrendingUp className="h-4 w-4" />
                            Restock
                          </button>
                          <button
                            onClick={() => handleDeduct(item.product_id)}
                            disabled={isSubmitting}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"
                          >
                            <TrendingDown className="h-4 w-4" />
                            Deduct
                          </button>
                          <button
                            onClick={() => handleUpdateInventory(item)}
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <Pagination
              page={page}
              totalPages={totalPages}
              goToPage={goToPage}
              pageNumbers={pageNumbers}
            />
          </div>
        </div>
      </div>

      {showInventoryModal && (
        <InventoryModal
          closeModal={closeModals}
          formData={inventoryFormData}
          setFormData={setInventoryFormData}
          onSubmit={handleUpdateSubmit}
          isSubmitting={isSubmitting}
          isEditMode={true}
        />
      )}

      {showRestockModal && (
        <RestockModal
          closeModal={closeModals}
          formData={restockFormData}
          setFormData={setRestockFormData}
          onSubmit={handleRestockSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {showDeductModal && (
        <DeductModal
          closeModal={closeModals}
          formData={deductFormData}
          setFormData={setDeductFormData}
          onSubmit={handleDeductSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {showBatchRestockModal && (
        <BatchRestockModal
          closeModal={closeModals}
          formData={batchRestockFormData}
          setFormData={setBatchRestockFormData}
          onSubmit={handleBatchRestockSubmit}
          isSubmitting={isSubmitting}
          batchNumber={selectedBatch?.batch_number}
        />
      )}

      {showBatchDeductModal && (
        <BatchDeductModal
          closeModal={closeModals}
          formData={batchDeductFormData}
          setFormData={setBatchDeductFormData}
          onSubmit={handleBatchDeductSubmit}
          isSubmitting={isSubmitting}
          batchNumber={selectedBatch?.batch_number}
        />
      )}

      {showBatchManageModal && (
        <BatchManageModal
          closeModal={closeModals}
          formData={batchManageFormData}
          setFormData={setBatchManageFormData}
          onSubmit={handleBatchManageSubmit}
          isSubmitting={isSubmitting}
          batchNumber={selectedBatch?.batch_number}
        />
      )}
    </>
  );
}

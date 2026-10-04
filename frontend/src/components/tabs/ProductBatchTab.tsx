// app/product-batches/page.tsx (Updated version with modal integration)
"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  Package,
  DollarSign,
  Filter,
  X,
  Layers,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useProductBatches,
  useCreateProductBatch,
  useUpdateProductBatch,
  useDeleteProductBatch,
  type ProductBatch,
} from "@/hooks/useProductBatch";
import { useProducts } from "@/hooks/useProducts";
import { useDebounced } from "@/hooks/useDebounced";
import BatchModal from "@/components/product-batch/modal";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import Pagination from "@/components/layout/Pagination";

export type BatchFormData = {
  product_id: string | "";
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
};

export const initialBatchFormData: BatchFormData = {
  product_id: "",
  batch_number: "",
  quantity: 0,
  cost_price: 0,
  sale_price: 0,
};

const LIMIT = 10;

const money = (value?: number | null) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  icon: typeof Package;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          ) : null}
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last
              month
            </p>
          )}
        </div>
        <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function ProductBatchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [open, setOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProductBatch | null>(null);

  const { data, isLoading, isFetching } = useProductBatches(
    page,
    LIMIT,
    debouncedSearch,
  );
  const { data: productsData } = useProducts({
    page: 1,
    limit: 100,
  });
  const deleteProductBatch = useDeleteProductBatch();

  const batches = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  const products = productsData?.data || [];

  // Filter batches by selected product (client-side since API only supports search)
  const filteredBatches = useMemo(() => {
    if (!selectedProduct) return batches;
    return batches.filter(
      (batch) => String(batch.product_id) === selectedProduct,
    );
  }, [batches, selectedProduct]);

  // Calculate stats from all batches (not filtered)
  const stats = useMemo(() => {
    const totalBatches = batches.length;
    const totalQuantity = batches.reduce(
      (sum, batch) => sum + (batch.quantity || 0),
      0,
    );
    const totalValue = batches.reduce(
      (sum, batch) => sum + (batch.quantity || 0) * (batch.cost_price || 0),
      0,
    );
    const uniqueProducts = new Set(batches.map((b) => b.product_id)).size;

    // Count batches with low quantity (≤5)
    const lowQuantityBatches = batches.filter(
      (b) => b.quantity <= 5 && b.quantity > 0,
    ).length;
    const zeroQuantityBatches = batches.filter((b) => b.quantity === 0).length;

    return {
      totalBatches,
      totalQuantity,
      totalValue,
      uniqueProducts,
      lowQuantityBatches,
      zeroQuantityBatches,
    };
  }, [batches]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openAddModal = () => {
    setSelectedBatch(null);
    setOpen(true);
  };

  const openEditModal = (batch: ProductBatch) => {
    setSelectedBatch(batch);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedBatch(null);
  };

  const clearFilters = () => {
    setSelectedProduct("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Batches</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track batch numbers, quantities, and pricing for better inventory
            management.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />
          Add Batch
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Batches"
          value={stats.totalBatches}
          icon={Layers}
          subtitle={`Across ${stats.uniqueProducts} products`}
        />
        <StatCard
          title="Total Quantity"
          value={stats.totalQuantity}
          icon={Hash}
          subtitle="Sum of all batch quantities"
        />
        <StatCard
          title="Total Value"
          value={money(stats.totalValue)}
          icon={DollarSign}
          subtitle="Quantity × Cost Price"
        />
        <StatCard
          title="Low Quantity"
          value={stats.lowQuantityBatches + stats.zeroQuantityBatches}
          icon={Package}
          subtitle={`${stats.lowQuantityBatches} low (≤5), ${stats.zeroQuantityBatches} zero`}
          trend={{ value: 12, isPositive: false }}
        />
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by batch number or product name..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                showFilters || selectedProduct
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter size={16} />
              Filters
              {selectedProduct && (
                <span className="ml-1 rounded-full bg-gray-700 px-1.5 py-0.5 text-xs text-white">
                  1
                </span>
              )}
            </button>

            {(selectedProduct || search) && (
              <button
                onClick={clearFilters}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid gap-3 pt-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                >
                  <option value="">All Products</option>
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">All Batches</h2>
            <p className="text-sm text-gray-500">
              {selectedProduct
                ? `${filteredBatches.length} of ${totalCount} records filtered`
                : `${totalCount} total records`}
            </p>
          </div>
          {isFetching ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">S.N.</th>
                <th className="px-5 py-3">Batch Number</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Quantity</th>
                <th className="px-5 py-3">Cost Price</th>
                <th className="px-5 py-3">Sale Price</th>
                <th className="px-5 py-3">Total Value</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                    Loading batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Package className="mx-auto mb-3 text-gray-300" size={48} />
                    <h3 className="text-base font-semibold text-gray-900">
                      No batches found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search || selectedProduct
                        ? "Try adjusting your filters"
                        : "Add your first batch to start tracking inventory"}
                    </p>
                    {!search && !selectedProduct && (
                      <button
                        onClick={openAddModal}
                        className="mt-4 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        <Plus size={16} />
                        Add Batch
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, index) => {
                  const isLowQuantity = batch.quantity <= 5;
                  const batchTotalValue = batch.quantity * batch.cost_price;
                  const margin =
                    batch.cost_price > 0
                      ? ((batch.sale_price - batch.cost_price) /
                          batch.cost_price) *
                        100
                      : 0;

                  return (
                    <tr key={batch.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {(page - 1) * LIMIT + index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <code className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {batch.batch_number || "-"}
                        </code>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {batch.product_name ||
                              `Product #${batch.product_id}`}
                          </p>
                          {batch.barcode && (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {batch.barcode}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`text-sm font-medium ${
                            isLowQuantity
                              ? "text-amber-600"
                              : batch.quantity === 0
                                ? "text-red-600"
                                : "text-gray-900"
                          }`}
                        >
                          {batch.quantity}
                        </span>
                        {isLowQuantity && batch.quantity > 0 && (
                          <p className="text-xs text-amber-600">Low stock</p>
                        )}
                        {batch.quantity === 0 && (
                          <p className="text-xs text-red-600">Out of stock</p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {money(batch.cost_price)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {money(batch.sale_price)}
                        </p>
                        {batch.cost_price > 0 && (
                          <p className="text-xs text-green-600">
                            Margin: {margin.toFixed(2)}%
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {money(batchTotalValue)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(batch)}
                            className="rounded-xl cursor-pointer p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                            aria-label="Edit batch"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(batch)}
                            className="rounded-xl cursor-pointer p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete batch"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            goToPage={setPage}
            pageNumbers={Array.from({ length: totalPages }, (_, i) => i + 1)}
          />
        )}
      </div>

      {/* Batch Modal */}
      {open && (
        <BatchModal closeModal={closeModal} selectedBatch={selectedBatch} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          invoiceNo={deleteConfirm.batch_number}
          label="batch"
          isPending={deleteProductBatch.isPending}
          onConfirm={async () => {
            try {
              await deleteProductBatch.mutateAsync(deleteConfirm.id);
              toast.success("Batch deleted successfully");
              setDeleteConfirm(null);
            } catch (error: any) {
              console.error(error);
              toast.error(error.message || "Failed to delete batch");
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

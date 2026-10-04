// app/products/page.tsx (Updated with batches)
"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  Package,
  AlertCircle,
  DollarSign,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
} from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useDebounced } from "@/hooks/useDebounced";
import ProductModal from "@/components/product/modal";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import Pagination from "@/components/layout/Pagination";
import Link from "next/link";

export type ProductVariantInput = { model: string; quantity: number };

export type ProductFormData = {
  product_name: string;
  category_id: string | "";
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  unit: string;
  status: string;
  barcode: string;
  description: string;
  variants: ProductVariantInput[];
};

export const initialFormData: ProductFormData = {
  product_name: "",
  category_id: "",
  cost_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  unit: "",
  status: "Active",
  barcode: "",
  description: "",
  variants: [],
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

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Active: "bg-green-100 text-green-700 border-green-200",
    Inactive: "bg-gray-100 text-gray-700 border-gray-200",
    Discontinued: "bg-red-100 text-red-700 border-red-200",
  };

  const className =
    styles[status as keyof typeof styles] ||
    "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  // Track which products have expanded batches
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set(),
  );

  const { data, isLoading, isFetching } = useProducts({
    page,
    limit: LIMIT,
    search: debouncedSearch,
    category: selectedCategory || undefined,
    status: selectedStatus || undefined,
  });
  const { data: categoriesData } = useCategories(1, 100);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;
  const stats = data?.stats;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, selectedStatus]);

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setOpen(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      product_name: product.product_name || "",
      category_id: product.category_id || "",
      cost_price: product.cost_price ?? 0,
      sale_price: product.sale_price ?? 0,
      stock_quantity: product.stock_quantity ?? 0,
      unit: product.unit || "",
      status: product.status || "Active",
      barcode: product.barcode || "",
      description: product.description || "",
      variants: [],
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedProduct(null);
    setFormData(initialFormData);
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedStatus("");
    setSearch("");
    setPage(1);
  };

  const toggleExpandProduct = (productId: string) => {
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

  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  const categories = categoriesData?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage inventory, pricing, stock, and product details from one
            place.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={openAddModal}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={Package}
          subtitle="All products in inventory"
        />
        <StatCard
          title="Inventory Value"
          value={money(stats?.inventoryValue)}
          icon={DollarSign}
          subtitle="Total stock value at cost"
        />
        <StatCard
          title="Low Stock"
          value={stats?.lowStockProducts || 0}
          icon={AlertCircle}
          subtitle="Products with stock ≤ 5"
          trend={{ value: 12, isPositive: false }}
        />
        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockProducts || 0}
          icon={AlertCircle}
          subtitle="Products with zero stock"
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
                placeholder="Search by name, barcode, or description..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                showFilters || selectedCategory || selectedStatus
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter size={16} />
              Filters
              {(selectedCategory || selectedStatus) && (
                <span className="ml-1 rounded-full bg-gray-700 px-1.5 py-0.5 text-xs text-white">
                  {(selectedCategory ? 1 : 0) + (selectedStatus ? 1 : 0)}
                </span>
              )}
            </button>

            {(selectedCategory || selectedStatus || search) && (
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
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">All Products</h2>
            <p className="text-sm text-gray-500">{totalCount} total records</p>
          </div>
          {isFetching ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-5 py-3"></th>
                <th className="px-5 py-3">S.N.</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Barcode</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Models / Batches</th>
                <th className="px-5 py-3">Cost Price</th>
                <th className="px-5 py-3">Sale Price</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <Package className="mx-auto mb-3 text-gray-300" size={48} />
                    <h3 className="text-base font-semibold text-gray-900">
                      No products found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search || selectedCategory || selectedStatus
                        ? "Try adjusting your filters"
                        : "Add your first product to start managing inventory"}
                    </p>
                    {!search && !selectedCategory && !selectedStatus && (
                      <button
                        onClick={openAddModal}
                        className="mt-4 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        <Plus size={16} />
                        Add Product
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                products.map((product, index) => {
                  const batches = product.batches || [];
                  // Stock held on phone models / batches counts toward the total
                  const totalStock =
                    Number(product.stock_quantity) +
                    batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
                  const isLowStock = totalStock <= 5;
                  const category = categories.find(
                    (c) => c.id === product.category_id,
                  );
                  const isExpanded = expandedProducts.has(product.id);

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="transition hover:bg-gray-50">
                        <td className="px-5 py-4">
                          {batches.length > 0 && (
                            <button
                              onClick={() => toggleExpandProduct(product.id)}
                              className="rounded-lg p-1 cursor-pointer text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-500">
                          {(page - 1) * LIMIT + index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.product_name}
                            </p>
                            {product.description && (
                              <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <code className="text-xs text-gray-600">
                            {product.barcode || "-"}
                          </code>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-600">
                            {category?.category_name || "Uncategorized"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`text-sm font-medium ${
                              isLowStock
                                ? "text-amber-600"
                                : totalStock === 0
                                  ? "text-red-600"
                                  : "text-gray-900"
                            }`}
                          >
                            {totalStock} {product.unit || "units"}
                          </span>
                          {isLowStock && totalStock > 0 && (
                            <p className="text-xs text-amber-600">Low stock</p>
                          )}
                          {totalStock === 0 && (
                            <p className="text-xs text-red-600">Out of stock</p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {batches.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                              <Layers size={12} />
                              {batches.length}{" "}
                              {batches.length === 1 ? "model / batch" : "models / batches"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              None
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-500">
                          {money(product.cost_price)}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {money(product.sale_price)}
                          </p>
                          {product.cost_price && product.sale_price && (
                            <p className="text-xs text-green-600">
                              Margin:{" "}
                              {(
                                ((product.sale_price - product.cost_price) /
                                  product.cost_price) *
                                100
                              ).toFixed(2)}
                              %
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={product.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="rounded-xl cursor-pointer p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                              aria-label="Edit product"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product)}
                              className="rounded-xl cursor-pointer p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete product"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Batches Row */}
                      {isExpanded && batches.length > 0 && (
                        <tr key={`${product.id}-batches`}>
                          <td colSpan={11} className="bg-gray-50 px-0 py-0">
                            <div className="border-t border-gray-200 px-8 py-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-700">
                                  Batch Details for {product.product_name}
                                </h4>
                              </div>
                              <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="w-full text-xs">
                                  <thead className="bg-white">
                                    <tr className="border-b border-gray-200 text-left text-gray-600">
                                      <th className="px-4 py-2 font-medium">
                                        Batch Number
                                      </th>
                                      <th className="px-4 py-2 font-medium">
                                        Quantity
                                      </th>
                                      <th className="px-4 py-2 font-medium">
                                        Cost Price
                                      </th>
                                      <th className="px-4 py-2 font-medium">
                                        Sale Price
                                      </th>
                                      <th className="px-4 py-2 font-medium">
                                        Total Value
                                      </th>
                                      <th className="px-4 py-2 font-medium">
                                        Margin
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {batches.map((batch) => {
                                      const batchTotal =
                                        batch.quantity * batch.cost_price;
                                      const batchMargin =
                                        batch.cost_price > 0
                                          ? ((batch.sale_price -
                                              batch.cost_price) /
                                              batch.cost_price) *
                                            100
                                          : 0;
                                      const isLowBatch =
                                        batch.quantity <= 5 &&
                                        batch.quantity > 0;

                                      return (
                                        <tr
                                          key={batch.id}
                                          className="bg-white hover:bg-gray-50"
                                        >
                                          <td className="px-4 py-2">
                                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">
                                              {batch.batch_number}
                                            </code>
                                          </td>
                                          <td className="px-4 py-2">
                                            <span
                                              className={`font-medium ${
                                                isLowBatch
                                                  ? "text-amber-600"
                                                  : batch.quantity === 0
                                                    ? "text-red-600"
                                                    : "text-gray-700"
                                              }`}
                                            >
                                              {batch.quantity}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-gray-600">
                                            {money(batch.cost_price)}
                                          </td>
                                          <td className="px-4 py-2 text-gray-900">
                                            {money(batch.sale_price)}
                                          </td>
                                          <td className="px-4 py-2 font-medium text-gray-900">
                                            {money(batchTotal)}
                                          </td>
                                          <td className="px-4 py-2">
                                            <span className="text-green-600">
                                              {batchMargin.toFixed(2)}%
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {batches.length > 0 && (
                                <div className="mt-3 flex gap-6 text-xs text-gray-500">
                                  <span>
                                    Total Batches:{" "}
                                    <strong>{batches.length}</strong>
                                  </span>
                                  <span>
                                    Total Quantity:{" "}
                                    <strong>
                                      {batches.reduce(
                                        (sum, b) => sum + b.quantity,
                                        0,
                                      )}
                                    </strong>
                                  </span>
                                  <span>
                                    Total Value:{" "}
                                    <strong>
                                      {money(
                                        batches.reduce(
                                          (sum, b) =>
                                            sum + b.quantity * b.cost_price,
                                          0,
                                        ),
                                      )}
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

      {/* Product Modal */}
      {open && (
        <ProductModal
          closeModal={closeModal}
          selectedProduct={selectedProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          invoiceNo={deleteConfirm.product_name}
          label="product"
          isPending={deleteProduct.isPending}
          onConfirm={async () => {
            try {
              await deleteProduct.mutateAsync(deleteConfirm.id);
              toast.success("Product deleted successfully");
              setDeleteConfirm(null);
            } catch {
              toast.error("Failed to delete product");
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

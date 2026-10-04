"use client";

import { useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  DollarSign,
  Search,
  Calculator,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Archive,
  Shield,
  Trash2,
  Plus,
  Edit3,
  RefreshCw,
} from "lucide-react";
import {
  useInventoryCosts,
  useCreateInventoryCost,
  useUpdateInventoryCost,
  useDeleteInventoryCost,
  type InventoryCost,
} from "@/hooks/useInventoryCosts";
import { useProducts } from "@/hooks/useProducts";
import { useDebounced } from "@/hooks/useDebounced";
import InventoryCostModal from "@/components/inventory-costs/InventoryCostModal";
import Pagination from "@/components/layout/Pagination";

export type InventoryCostFormData = {
  product_id: string | "";
  holding_cost_per_unit: number;
  storage_cost: number;
  insurance_cost: number;
  spoilage_rate: number;
};

const initialFormData: InventoryCostFormData = {
  product_id: "",
  holding_cost_per_unit: 0,
  storage_cost: 0,
  insurance_cost: 0,
  spoilage_rate: 0,
};

const COST_RATING = {
  HIGH: { label: "High Cost", color: "rose", threshold: 1000 },
  MEDIUM: { label: "Medium Cost", color: "amber", threshold: 500 },
  LOW: { label: "Low Cost", color: "emerald", threshold: 0 },
} as const;

type CostRatingKey = keyof typeof COST_RATING;

const getCostRating = (totalCost: number): CostRatingKey => {
  if (totalCost >= COST_RATING.HIGH.threshold) return "HIGH";
  if (totalCost >= COST_RATING.MEDIUM.threshold) return "MEDIUM";
  return "LOW";
};

const getRatingStyles = (rating: CostRatingKey) => {
  const styles = {
    HIGH: {
      badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-300",
      progress: "bg-rose-500",
      icon: TrendingUp,
      iconColor: "text-rose-500",
      barColor: "bg-rose-500",
    },
    MEDIUM: {
      badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300",
      progress: "bg-amber-500",
      icon: TrendingDown,
      iconColor: "text-amber-500",
      barColor: "bg-amber-500",
    },
    LOW: {
      badge:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-300",
      progress: "bg-emerald-500",
      icon: Shield,
      iconColor: "text-emerald-500",
      barColor: "bg-emerald-500",
    },
  };
  return styles[rating];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const formatPercentage = (value: number) => {
  return `${(value || 0).toFixed(2)}%`;
};

export default function InventoryCostsPage() {
  const [search, setSearch] = useState("");
  const [costFilter, setCostFilter] = useState<CostRatingKey | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<
    | "total_asc"
    | "total_desc"
    | "name_asc"
    | "name_desc"
    | "spoilage_desc"
    | "updated_desc"
  >("updated_desc");
  const [page, setPage] = useState(1);
  const debouncedSearchValue = useDebounced(search, 300);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<InventoryCost | null>(null);
  const [formData, setFormData] =
    useState<InventoryCostFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    data: costsData,
    isLoading,
    error,
    refetch,
  } = useInventoryCosts(
    page,
    limit,
    debouncedSearchValue,
    costFilter === "ALL" ? "" : costFilter,
    sortBy,
  );
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });

  const createMutation = useCreateInventoryCost();
  const updateMutation = useUpdateInventoryCost();
  const deleteMutation = useDeleteInventoryCost();

  const inventoryCosts = costsData?.data || [];
  const totalCount = costsData?.totalCount || 0;
  const products = productsData?.data || [];

  const productMap = useMemo(() => {
    const map = new Map<number, any>();
    products.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [products]);

  const totalPages = Math.ceil(totalCount / limit);

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

  const handleCreate = () => {
    setSelectedCost(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEdit = (cost: any) => {
    setSelectedCost(cost);
    setFormData({
      product_id: cost.product_id,
      holding_cost_per_unit: cost.holding_cost_per_unit,
      storage_cost: cost.storage_cost,
      insurance_cost: cost.insurance_cost,
      spoilage_rate: cost.spoilage_rate,
    });
    setShowModal(true);
  };

  const handleDelete = async (productId: string) => {
    setDeleteConfirmId(productId);
    try {
      await deleteMutation.mutateAsync(productId);
      toast.success("Inventory cost deleted successfully");
    } catch (error) {
      toast.error("Failed to delete inventory cost");
      console.error("Delete failed:", error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.product_id) {
      toast.error("Please select a product");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedCost) {
        await updateMutation.mutateAsync({
          id: selectedCost.id,
          product_id: formData.product_id as string,
          holding_cost_per_unit: formData.holding_cost_per_unit,
          storage_cost: formData.storage_cost,
          insurance_cost: formData.insurance_cost,
          spoilage_rate: formData.spoilage_rate,
        });
        toast.success("Inventory cost updated successfully");
      } else {
        await createMutation.mutateAsync({
          product_id: formData.product_id as string,
          holding_cost_per_unit: formData.holding_cost_per_unit,
          storage_cost: formData.storage_cost,
          insurance_cost: formData.insurance_cost,
          spoilage_rate: formData.spoilage_rate,
        });
        toast.success("Inventory cost created successfully");
      }
      setShowModal(false);
    } catch (error) {
      toast.error(
        selectedCost
          ? "Failed to update inventory cost"
          : "Failed to create inventory cost",
      );
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50">
              <AlertTriangle className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900">
              Failed to Load Inventory Costs
            </h3>
            <p className="mt-3 text-sm text-slate-500">
              Please check your connection and try again.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-6 ">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-slate-900 p-3">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Inventory Costs
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Track holding, storage, insurance costs and spoilage rates
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 items-start">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by product name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
                  <select
                    value={costFilter}
                    onChange={(e) =>
                      setCostFilter(e.target.value as CostRatingKey | "ALL")
                    }
                    className="w-full outline-none"
                  >
                    <option value="ALL">All Cost Levels</option>
                    <option value="HIGH">High Cost</option>
                    <option value="MEDIUM">Medium Cost</option>
                    <option value="LOW">Low Cost</option>
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
                    <option value="total_asc">Total Cost Low-High</option>
                    <option value="total_desc">Total Cost High-Low</option>
                    <option value="spoilage_desc">Highest Spoilage</option>
                  </select>
                </div>

                <button
                  onClick={handleCreate}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Cost
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
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
                    {costsData?.stats?.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500 p-2.5">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total Costs
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(costsData?.stats?.totalCosts || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500 p-2.5">
                  <Archive className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Avg. Spoilage
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatPercentage(costsData?.stats?.avgSpoilage || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500 p-2.5">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Insurance Total
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(costsData?.stats?.totalInsurance || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Holding Costs
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-900">
                    {formatCurrency(costsData?.stats?.totalHolding || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500 p-3">
                  <Archive className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Storage Costs
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">
                    {formatCurrency(costsData?.stats?.totalStorage || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-500 p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">
                    Insurance Costs
                  </p>
                  <p className="mt-1 text-2xl font-bold text-purple-900">
                    {formatCurrency(costsData?.stats?.totalInsurance || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-500 p-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : inventoryCosts.length === 0 ? (
              <div className="p-12 text-center">
                <Calculator className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {search || costFilter !== "ALL"
                    ? "No matching costs found"
                    : "No inventory costs recorded"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search || costFilter !== "ALL"
                    ? "Try adjusting your search or filters."
                    : "Add cost information for your products to get started."}
                </p>
                {!search && costFilter === "ALL" && (
                  <button
                    onClick={handleCreate}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Cost Entry
                  </button>
                )}
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
                          Holding Cost/Unit
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Storage Cost
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Insurance
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Spoilage Rate
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Total Cost
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryCosts.map((item) => {
                        const rating = getCostRating(
                          item.holding_cost_per_unit +
                            item.storage_cost +
                            item.insurance_cost,
                        );
                        const ratingStyle = getRatingStyles(rating);
                        const RatingIcon = ratingStyle.icon;
                        const maxCost = Math.max(
                          ...inventoryCosts.map(
                            (c) =>
                              c.holding_cost_per_unit +
                              c.storage_cost +
                              c.insurance_cost,
                          ),
                          1,
                        );
                        const costPercentage =
                          ((item.holding_cost_per_unit +
                            item.storage_cost +
                            item.insurance_cost) /
                            maxCost) *
                          100;

                        return (
                          <tr
                            key={item.id}
                            className="transition hover:bg-slate-50/50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                                  <RatingIcon
                                    className={`h-5 w-5 ${ratingStyle.iconColor}`}
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
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(item.holding_cost_per_unit)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(item.storage_cost)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(item.insurance_cost)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                    item.spoilage_rate > 10
                                      ? "bg-rose-50 text-rose-700"
                                      : item.spoilage_rate > 5
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {formatPercentage(item.spoilage_rate)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="flex flex-col gap-1 items-center justify-between">
                                  <span className="font-bold text-slate-900">
                                    {formatCurrency(
                                      item.holding_cost_per_unit +
                                        item.storage_cost +
                                        item.insurance_cost,
                                    )}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${ratingStyle.badge}`}
                                  >
                                    {COST_RATING[rating].label}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${ratingStyle.barColor}`}
                                    style={{
                                      width: `${costPercentage}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  disabled={isSubmitting}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(item.product_id)}
                                  disabled={
                                    isSubmitting ||
                                    deleteConfirmId === item.product_id
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {deleteConfirmId === item.product_id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    goToPage={goToPage}
                    pageNumbers={pageNumbers}
                  />
                </div>

                {/* Mobile Cards */}
                <div className="grid gap-4 p-4 lg:hidden">
                  {inventoryCosts.map((item) => {
                    const rating = getCostRating(
                      item.holding_cost_per_unit +
                        item.storage_cost +
                        item.insurance_cost,
                    );
                    const ratingStyle = getRatingStyles(rating);
                    const RatingIcon = ratingStyle.icon;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                              <RatingIcon
                                className={`h-6 w-6 ${ratingStyle.iconColor}`}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {item.product_name}
                              </h3>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ratingStyle.badge}`}
                          >
                            <RatingIcon className="h-3 w-3" />
                            {COST_RATING[rating].label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500">
                              Holding Cost/Unit
                            </p>
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(item.holding_cost_per_unit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">
                              Storage Cost
                            </p>
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(item.storage_cost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Insurance</p>
                            <p className="font-semibold text-slate-900">
                              {formatCurrency(item.insurance_cost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">
                              Spoilage Rate
                            </p>
                            <p className="font-semibold text-slate-900">
                              {formatPercentage(item.spoilage_rate)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                          <div>
                            <p className="text-xs text-slate-500">Total Cost</p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(
                                item.holding_cost_per_unit +
                                  item.storage_cost +
                                  item.insurance_cost,
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              disabled={isSubmitting}
                              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.product_id)}
                              disabled={
                                isSubmitting ||
                                deleteConfirmId === item.product_id
                              }
                              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    goToPage={goToPage}
                    pageNumbers={pageNumbers}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <InventoryCostModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEditMode={!!selectedCost}
        />
      )}
    </>
  );
}

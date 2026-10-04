"use client";

import { useMemo, useState } from "react";
import {
  Package,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Filter,
  ArrowUpDown,
  AlertCircle,
  Zap,
  XCircle,
  FileWarning,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useEoq,
  formatEoqResult,
  isEoqArray,
  type EoqCalculation,
  type EoqStats,
} from "@/hooks/useEoq";
import { useDebounced } from "@/hooks/useDebounced";
import Pagination from "@/components/layout/Pagination";

type SortField =
  | "product_name"
  | "yearly_demand"
  | "eoq"
  | "total_inventory_cost"
  | "missing_data";
type SortOrder = "asc" | "desc";

type AlertType = "MISSING_COST_DATA" | "HIGH_DEMAND" | "URGENT_REORDER";

interface ProductAlert {
  productId: number;
  productName: string;
  type: AlertType;
  message: string;
  severity: "high" | "medium" | "low";
}

interface ExtendedEoqCalculation extends EoqCalculation {
  current_stock?: number;
}

export default function EoqPlanningPage() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("total_inventory_cost");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterMissingCost, setFilterMissingCost] = useState(false);
  const [filterHighDemand, setFilterHighDemand] = useState(false);
  const [filterUrgentReorder, setFilterUrgentReorder] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading, error, refetch } = useEoq(
    null,
    page,
    limit,
    sortField,
    sortOrder,
    filterMissingCost,
    filterHighDemand,
    filterUrgentReorder,
    debouncedSearch,
  );

  // Extract alerts from backend data
  const backendAlerts = useMemo((): ProductAlert[] => {
    if (!data?.data || !isEoqArray(data.data)) return [];

    const alertsList: ProductAlert[] = [];

    data.data.forEach((product: ExtendedEoqCalculation) => {
      // Use backend-provided alerts
      if (product.alerts && product.alerts.length > 0) {
        product.alerts.forEach((alert) => {
          let severity: "high" | "medium" | "low" = "low";

          switch (alert.type) {
            case "URGENT_REORDER":
              severity = "high";
              break;
            case "MISSING_COST_DATA":
              severity = "high";
              break;
            case "HIGH_DEMAND":
              severity = "medium";
              break;
          }

          alertsList.push({
            productId: product.product_id,
            productName: product.product_name,
            type: alert.type,
            message: alert.message,
            severity,
          });
        });
      }
    });

    // Sort alerts by severity (high first, then medium, then low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alertsList.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return alertsList;
  }, [data]);

  // Group alerts by product for better display
  const groupedAlerts = useMemo(() => {
    const groups = new Map<number, ProductAlert[]>();

    backendAlerts.forEach((alert) => {
      const existing = groups.get(alert.productId) || [];
      existing.push(alert);
      groups.set(alert.productId, existing);
    });

    return groups;
  }, [backendAlerts]);

  const totalPages = data?.totalPages || 1;
  const stats = data?.stats;

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

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case "MISSING_COST_DATA":
        return FileWarning;
      case "HIGH_DEMAND":
        return TrendingUp;
      case "URGENT_REORDER":
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const getAlertColors = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const handleFilterClick = (filter: string) => {
    switch (filter) {
      case "missingCost":
        setFilterMissingCost(!filterMissingCost);
        setPage(1);
        break;
      case "highDemand":
        setFilterHighDemand(!filterHighDemand);
        setPage(1);
        break;
      case "urgentReorder":
        setFilterUrgentReorder(!filterUrgentReorder);
        setPage(1);
        break;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100/50 p-4 sm:p-6 lg:p-8">
        <div className="rounded-3xl border border-red-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-slate-900">
            Failed to Load EOQ Data
          </h3>
          <p className="mt-3 text-sm text-slate-500">
            Please check your connection and try again.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  EOQ & Inventory Planning
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Economic Order Quantity recommendations and stock optimization
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-72"
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-900 p-2.5">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Total Products
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {stats.totalProducts}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="cursor-pointer rounded-2xl border border-red-200 bg-red-50/50 p-5"
                onClick={() => handleFilterClick("missingCost")}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-500 p-2.5">
                    <FileWarning className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-red-600">
                      Missing Cost Data
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {stats.missingCostData}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="cursor-pointer rounded-2xl border border-yellow-200 bg-yellow-50/50 p-5"
                onClick={() => handleFilterClick("highDemand")}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-500 p-2.5">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-yellow-600">
                      High Demand
                    </p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700">
                      {stats.highDemandProducts}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="cursor-pointer rounded-2xl border border-amber-200 bg-amber-50/50 p-5"
                onClick={() => handleFilterClick("urgentReorder")}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500 p-2.5">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
                      Urgent Reorder
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">
                      {stats.urgentReorder}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500 p-2.5">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                      Avg. EOQ
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">
                      {Math.ceil(stats.averageEoq || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expandable Alerts Section */}
          {backendAlerts.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Action Required ({backendAlerts.length})
                  </h2>
                </div>
                <button
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="flex items-center gap-1 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  {showAllAlerts ? (
                    <>
                      Show Less
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show All ({backendAlerts.length})
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-3">
                {backendAlerts
                  .slice(0, showAllAlerts ? backendAlerts.length : 5)
                  .map((alert, idx) => {
                    const AlertIcon = getAlertIcon(alert.type);
                    return (
                      <div
                        key={`${alert.productId}-${alert.type}-${idx}`}
                        className={`flex items-center gap-3 rounded-xl border p-4 transition-transform hover:scale-[1.01] cursor-pointer ${getAlertColors(
                          alert.severity,
                        )}`}
                        onClick={() => setSelectedProductId(alert.productId)}
                      >
                        <AlertIcon className="h-5 w-5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium">{alert.productName}</p>
                          <p className="text-sm opacity-90">{alert.message}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductId(alert.productId);
                          }}
                          className="rounded-lg bg-white/50 cursor-pointer border border-current px-3 py-1.5 text-sm font-medium transition hover:bg-white"
                        >
                          View Details
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value as SortField);
                  setPage(1);
                }}
                className="text-sm font-medium outline-none"
              >
                <option value="total_inventory_cost">Total Cost</option>
                <option value="yearly_demand">Annual Demand</option>
                <option value="eoq">EOQ</option>
                <option value="product_name">Product Name</option>
                <option value="missing_data">Missing Data</option>
              </select>
              <button
                onClick={() => {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  setPage(1);
                }}
                className="rounded p-1 hover:bg-slate-100"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleFilterClick("missingCost")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filterMissingCost
                    ? "bg-red-500 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Missing Cost
              </button>
              <button
                onClick={() => handleFilterClick("highDemand")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filterHighDemand
                    ? "bg-yellow-500 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                High Demand
              </button>
              <button
                onClick={() => handleFilterClick("urgentReorder")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filterUrgentReorder
                    ? "bg-amber-500 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Urgent Reorder
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : !data?.data ||
              (isEoqArray(data.data) && data.data.length === 0) ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  No products found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Annual Demand
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Costs
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          EOQ
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Order Frequency
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Recommendation
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isEoqArray(data.data) &&
                        data.data.map((product: ExtendedEoqCalculation) => {
                          const formatted = formatEoqResult(product);
                          const hasAlerts =
                            product.alerts && product.alerts.length > 0;
                          const hasMissingCostData = product.alerts?.some(
                            (alert) => alert.type === "MISSING_COST_DATA",
                          );
                          const hasUrgentReorder = product.alerts?.some(
                            (alert) => alert.type === "URGENT_REORDER",
                          );

                          return (
                            <tr
                              key={product.product_id}
                              className="cursor-pointer transition hover:bg-slate-50/50"
                              onClick={() =>
                                setSelectedProductId(product.product_id)
                              }
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {product.product_name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    SKU: {product.sku}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">
                                    {formatted.formatted_yearly_demand}
                                  </span>
                                  {product.alerts?.some(
                                    (alert) => alert.type === "HIGH_DEMAND",
                                  ) && (
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1 text-sm">
                                  <p>
                                    Order: {formatted.formatted_ordering_cost}
                                  </p>
                                  <p>
                                    Hold: {formatted.formatted_holding_cost}
                                  </p>
                                  <p>Unit: {formatted.formatted_unit_cost}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-xl font-bold text-slate-900">
                                    {formatted.formatted_eoq}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    units
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">
                                    {formatted.orders_per_year}/year
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Every {formatted.order_interval_days} days
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {hasMissingCostData ? (
                                  <div className="flex items-center gap-2 text-red-600">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-sm">
                                      Missing cost data
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {hasUrgentReorder ? (
                                      <>
                                        <p className="font-semibold text-amber-600">
                                          Reorder now
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Stock {product.current_stock} /
                                          Reorder at {product.reorder_point}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="font-semibold text-emerald-600">
                                          Stock level is safe
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Reorder at{" "}
                                          {product.reorder_point ?? 0} units
                                        </p>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {hasMissingCostData ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                                    <FileWarning className="h-3 w-3" />
                                    Missing Data
                                  </span>
                                ) : hasUrgentReorder ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                    <AlertTriangle className="h-3 w-3" />
                                    Reorder Soon
                                  </span>
                                ) : hasAlerts ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                                    <AlertCircle className="h-3 w-3" />
                                    Has Alerts
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Optimized
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid gap-4 p-4 lg:hidden">
                  {isEoqArray(data.data) &&
                    data.data.map((product: ExtendedEoqCalculation) => {
                      const formatted = formatEoqResult(product);
                      const hasMissingCostData = product.alerts?.some(
                        (alert) => alert.type === "MISSING_COST_DATA",
                      );
                      const hasUrgentReorder = product.alerts?.some(
                        (alert) => alert.type === "URGENT_REORDER",
                      );

                      return (
                        <div
                          key={product.product_id}
                          className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5"
                          onClick={() =>
                            setSelectedProductId(product.product_id)
                          }
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {product.product_name}
                              </h3>
                              <p className="text-sm text-slate-500">
                                SKU: {product.sku}
                              </p>
                            </div>
                            {hasMissingCostData ? (
                              <FileWarning className="h-5 w-5 text-red-500" />
                            ) : hasUrgentReorder ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                          </div>

                          {product.alerts && product.alerts.length > 0 && (
                            <div className="mb-3 space-y-1">
                              {product.alerts.map((alert, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {alert.type === "MISSING_COST_DATA" && (
                                    <FileWarning className="h-3 w-3 text-red-500" />
                                  )}
                                  {alert.type === "URGENT_REORDER" && (
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  )}
                                  {alert.type === "HIGH_DEMAND" && (
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                  )}
                                  <span className="text-slate-600">
                                    {alert.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500">Annual Demand</p>
                              <p className="font-semibold">
                                {formatted.formatted_yearly_demand}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">EOQ</p>
                              <p className="text-xl font-bold text-slate-900">
                                {formatted.formatted_eoq}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Orders/Year</p>
                              <p>{formatted.orders_per_year}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Order Interval</p>
                              <p>{formatted.order_interval_days} days</p>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3">
                            <p className="mb-1 text-xs text-slate-500">Costs</p>
                            <div className="flex gap-3 text-xs">
                              <span>
                                Order: {formatted.formatted_ordering_cost}
                              </span>
                              <span>
                                Hold: {formatted.formatted_holding_cost}
                              </span>
                              <span>Unit: {formatted.formatted_unit_cost}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  goToPage={goToPage}
                  pageNumbers={pageNumbers}
                />
              </>
            )}
          </div>

          {/* Recommendation Summary */}
          {stats && (
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-500 p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Quick Recommendations
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        Priority Reorder
                      </p>
                      <p className="text-sm text-slate-600">
                        {stats.urgentReorder || 0} products need immediate
                        attention
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        Data Completeness
                      </p>
                      <p className="text-sm text-slate-600">
                        {stats.missingCostData || 0} products missing cost data
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        Optimal Order Quantity
                      </p>
                      <p className="text-sm text-slate-600">
                        {stats.totalProducts - (stats.missingCostData || 0)}{" "}
                        products have EOQ calculated
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </>
  );
}

// Product Detail Modal Component
function ProductDetailModal({
  productId,
  onClose,
}: {
  productId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = useEoq(productId);

  if (!productId) return null;

  const product =
    !isLoading && data?.data && !Array.isArray(data.data)
      ? formatEoqResult(data.data as EoqCalculation)
      : null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Product Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-slate-100"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : product ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {product.product_name}
                </h3>
                <p className="text-sm text-slate-500">SKU: {product.sku}</p>
              </div>

              {/* Display alerts in modal */}
              {product.alerts && product.alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">
                    Alerts
                  </h4>
                  {product.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 rounded-xl border p-4 ${
                        alert.type === "URGENT_REORDER"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : alert.type === "MISSING_COST_DATA"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {alert.type === "URGENT_REORDER" && (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                      {alert.type === "MISSING_COST_DATA" && (
                        <FileWarning className="h-5 w-5" />
                      )}
                      {alert.type === "HIGH_DEMAND" && (
                        <TrendingUp className="h-5 w-5" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{alert.type}</p>
                        <p className="text-sm opacity-90">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Annual Demand</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {product.formatted_yearly_demand}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-600">Recommended EOQ</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {product.formatted_eoq} units
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Ordering Cost</p>
                  <p className="text-xl font-semibold">
                    {product.formatted_ordering_cost}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Holding Cost/Unit</p>
                  <p className="text-xl font-semibold">
                    {product.formatted_holding_cost}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Unit Cost</p>
                  <p className="text-xl font-semibold">
                    {product.formatted_unit_cost}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Orders Per Year</p>
                  <p className="text-xl font-semibold">
                    {product.orders_per_year} times
                  </p>
                </div>
              </div>

              {product.reorder_point && (
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-700">
                    Reorder Point
                  </p>
                  <p className="text-lg font-semibold text-amber-800">
                    {product.reorder_point} units
                  </p>
                </div>
              )}

              {product.total_inventory_cost ? (
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <p className="text-sm opacity-80">
                    Total Annual Inventory Cost
                  </p>
                  <p className="text-2xl font-bold">
                    {product.formatted_total_cost}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">Product data not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

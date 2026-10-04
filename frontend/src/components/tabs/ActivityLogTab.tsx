"use client";

import { useState } from "react";
import { History, Loader2, Search } from "lucide-react";

import { useActivityLogs, type ActivityLog } from "@/hooks/useActivityLogs";
import { useDebounced } from "@/hooks/useDebounced";
import Pagination from "@/components/layout/Pagination";
import { dateTime } from "@/utils/nepaliTime";

const LIMIT = 20;

const actionStyles: Record<string, string> = {
  SALE_CREATED: "bg-green-100 text-green-700",
  SALE_REVOKED: "bg-amber-100 text-amber-700",
  SALE_CANCELLED: "bg-red-100 text-red-700",
  SALE_RETURNED: "bg-purple-100 text-purple-700",
  SALE_DELETED: "bg-red-100 text-red-700",
  SALE_UPDATED: "bg-blue-100 text-blue-700",
  PRODUCT_CREATED: "bg-green-100 text-green-700",
  PRODUCT_UPDATED: "bg-blue-100 text-blue-700",
  PRODUCT_DELETED: "bg-red-100 text-red-700",
};

const label = (action: string) =>
  action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function Details({ log }: { log: ActivityLog }) {
  if (!log.details) return null;
  const entries = Object.entries(log.details).filter(
    ([, v]) =>
      v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
      {entries.map(([key, value]) => (
        <span key={key}>
          <span className="text-gray-400">{key.replace(/_/g, " ")}:</span>{" "}
          {Array.isArray(value)
            ? value
                .map((v) => (typeof v === "object" ? JSON.stringify(v) : v))
                .join(", ")
            : String(value)}
        </span>
      ))}
    </div>
  );
}

export default function ActivityLogTab() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 400);

  const { data, isLoading, isFetching } = useActivityLogs(
    page,
    LIMIT,
    entityType,
    debouncedSearch,
  );

  const logs = data?.data ?? [];
  const totalPages = Math.max(Math.ceil((data?.totalCount ?? 0) / LIMIT), 1);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => Math.abs(n - page) <= 2 || n === 1 || n === totalPages,
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
          <History size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500">
            What happened and when: sales, revokes and product changes.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search the log (invoice number, product...)"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-400"
        >
          <option value="">All activity</option>
          <option value="Sale">Sales</option>
          <option value="Product">Products</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            Nothing logged yet.
          </div>
        ) : (
          <ul
            className={`divide-y divide-gray-100 ${isFetching ? "opacity-70" : ""}`}
          >
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="shrink-0 text-xs text-gray-500 sm:w-44">
                  {dateTime(log.created_at)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        actionStyles[log.action] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {label(log.action)}
                    </span>
                    <span className="text-sm text-gray-900">{log.summary}</span>
                  </div>
                  <Details log={log} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          goToPage={(n: number) =>
            setPage(Math.min(Math.max(n, 1), totalPages))
          }
          pageNumbers={pageNumbers}
        />
      </div>
    </div>
  );
}

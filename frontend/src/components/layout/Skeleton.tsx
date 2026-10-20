"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Loading placeholders shared by every admin screen, so a slow load always
// looks like content on its way rather than a blank or broken page.

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-gray-200/80 ${className}`}
    />
  );
}

// Rows for the inside of a <tbody>. Bars get varied widths so it reads as a table.
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3", "w-3/5"];
export function TableRowsSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-4">
              <Skeleton
                className={`h-4 ${WIDTHS[(r + c) % WIDTHS.length]} ${
                  c === 0 ? "max-w-[2.5rem]" : ""
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// A stack of card-like rows (mobile lists, side panels)
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}

// Same footprint as the StatCard components used across the screens
export function StatCardsSkeleton({
  count = 4,
  className = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-11 w-11 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 8,
  className = "grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className = "h-64" }: { className?: string }) {
  const bars = [40, 65, 50, 80, 55, 90, 70, 45];
  return (
    <div
      aria-hidden
      className={`flex items-end gap-2 rounded-xl bg-gray-50 p-4 ${className}`}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-full animate-pulse rounded-t-md bg-gray-200/80"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// Loading with a spinner, for panels and small waits
export function InlineLoader({
  label,
  className = "py-10",
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useLang();
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-2 text-sm text-gray-500 ${className}`}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {label ?? t("Loading...")}
    </div>
  );
}

// Whole-screen skeleton for a page that has nothing to show yet
export function PageSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="space-y-6 p-6" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {stats > 0 && <StatCardsSkeleton count={stats} />}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-5">
          <Skeleton className="h-5 w-40" />
        </div>
        <table className="w-full">
          <tbody>
            <TableRowsSkeleton rows={6} cols={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// After a few seconds say why it is taking long (the free host is waking up)
export function SlowNotice({ loading }: { loading: boolean }) {
  const { t } = useLang();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading]);
  if (!loading || !slow) return null;
  return (
    <p className="mt-3 max-w-xs text-center text-xs text-gray-500">
      {t(
        "Still working... the server may be waking up, this can take up to a minute.",
      )}
    </p>
  );
}

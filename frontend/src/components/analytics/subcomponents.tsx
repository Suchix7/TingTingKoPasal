import type { AnalyticsPreset } from "@/hooks/useAnalytics";
import type { ReactNode } from "react";

export function AnalyticsHeader({
  preset,
  setPreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: {
  preset: AnalyticsPreset;
  setPreset: (value: AnalyticsPreset) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
}) {
  const today = new Date().toLocaleDateString("en-NP", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
          Analytics
        </h1>

        <p className="mt-1 text-sm text-neutral-400">
          Overview of your shop performance
        </p>

        <p className="mt-2 text-xs font-bold text-neutral-900">{today}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-neutral-100 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-500">
            Date Filter
          </label>

          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as AnalyticsPreset)}
            className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="all">All Time</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {preset === "custom" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-6 border border-gray-200">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        {action}
      </div>

      {children}
    </div>
  );
}

export function ListCard({
  title,
  icon,
  actionLabel,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${className} h-full rounded-xl bg-white p-6 border border-gray-200`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-neutral-500">{icon}</span>}

          <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        </div>

        {actionLabel && <Badge label={actionLabel} />}
      </div>

      {children}
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 text-center border border-gray-200">
      <p className="text-xl font-bold text-neutral-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-neutral-400">{label}</p>
    </div>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
      {label}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-neutral-50 text-center">
      <p className="text-sm font-medium text-neutral-400">{message}</p>
    </div>
  );
}

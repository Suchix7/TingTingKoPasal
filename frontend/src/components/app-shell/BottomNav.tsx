"use client";

import {
  DollarSign,
  LayoutDashboard,
  Menu,
  Package,
  Store,
} from "lucide-react";
import type { MainTab } from "./SidebarTabs";
import { useDashboardOverview } from "@/hooks/useDashboard";
import { useLang } from "@/lib/i18n";

// Phones only: the most used pages one thumb-tap away. Everything else is
// under "More", which opens the full menu.
const ITEMS: { tab: MainTab; name: string; icon: React.ElementType }[] = [
  { tab: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { tab: "pos", name: "POS", icon: Store },
  { tab: "sales", name: "Sales", icon: DollarSign },
  { tab: "products", name: "Products", icon: Package },
];

export default function BottomNav({
  activeTab,
  setActiveTab,
  onMore,
}: {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  onMore: () => void;
}) {
  const { t } = useLang();
  const { data } = useDashboardOverview({ chartDays: 7, topLimit: 5 });
  // same count as the red badge on Inventory in the menu
  const outOfStock =
    (data?.data.lowStockItems?.filter((i) => Number(i.current_stock) <= 0)
      .length || 0) +
    (data?.data.lowStockBatches?.filter((b) => Number(b.quantity) <= 0)
      .length || 0);
  const moreActive = !ITEMS.some((i) => i.tab === activeTab);

  const item = (
    key: string,
    label: string,
    Icon: React.ElementType,
    active: boolean,
    onClick: () => void,
    dot = false,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-w-0 flex-1 flex-col items-center justify-center h-14 gap-0.5 text-[11px] font-medium transition-colors active:bg-gray-100 ${
        active ? "text-gray-900" : "text-gray-500"
      }`}
    >
      {active && (
        <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gray-900" />
      )}
      <span className="relative">
        <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
        {dot && (
          <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </span>
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );

  return (
    <nav
      aria-label={t("Main")}
      className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map((i) =>
        item(i.tab, t(i.name), i.icon, activeTab === i.tab, () =>
          setActiveTab(i.tab),
        ),
      )}
      {item("more", t("More"), Menu, moreActive, onMore, outOfStock > 0)}
    </nav>
  );
}

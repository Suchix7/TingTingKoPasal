"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  X,
  DollarSign,
  Shield,
  Boxes,
  Store,
  Warehouse,
  Package,
  ArrowLeftRight,
  TrendingDown,
  BookOpenText,
  PackageOpen,
  Tag,
  LayoutDashboard,
  Calculator,
  LogOut,
  History,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/auth.store";

export type MainTab =
  | "dashboard"
  | "analytics"
  | "customers"
  | "sales"
  | "quick-sales"
  | "expenses"
  | "daybook"
  | "categories"
  | "products"
  | "pos"
  | "inventory"
  | "inventory-transactions"
  | "inventory-costs"
  | "purchase-orders"
  | "suppliers"
  | "eoq"
  | "payment-methods"
  | "security"
  | "payment-methods-transactions"
  | "product-batches"
  | "barcode-labels"
  | "store-info"
  | "activity-log";

type SidebarTabsProps = {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  // Off-canvas drawer state on small screens - distinct from `isOpen` below,
  // which only ever controls the icon-rail-vs-labeled width on desktop.
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const SIDEBAR_LINKS: {
  section: string;
  links: {
    name: string;
    tab: MainTab;
    icon: React.ElementType;
  }[];
}[] = [
  {
    section: "Overview",
    links: [{ name: "Dashboard", tab: "dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Billing",
    links: [
      { name: "POS", tab: "pos", icon: Store },
      { name: "Sales", tab: "sales", icon: DollarSign },
    ],
  },
  {
    section: "Inventory",
    links: [
      { name: "Products", tab: "products", icon: Package },
      { name: "Categories", tab: "categories", icon: Boxes },
      { name: "Product Batches", tab: "product-batches", icon: PackageOpen },
      { name: "Barcode Labels", tab: "barcode-labels", icon: Tag },
      { name: "Inventory", tab: "inventory", icon: Warehouse },
      {
        name: "Inventory Transactions",
        tab: "inventory-transactions",
        icon: ArrowLeftRight,
      },
      { name: "Reorder Planning (EOQ)", tab: "eoq", icon: Calculator },
    ],
  },
  {
    section: "Finance",
    links: [
      { name: "Expenses", tab: "expenses", icon: TrendingDown },
      { name: "Daybook", tab: "daybook", icon: BookOpenText },
      { name: "Activity Log", tab: "activity-log", icon: History },
    ],
  },
  {
    section: "Settings",
    links: [
      {
        name: "Payment Methods",
        tab: "payment-methods",
        icon: DollarSign,
      },
      { name: "Security", tab: "security", icon: Shield },
    ],
  },
];

export default function SidebarTabs({
  activeTab,
  setActiveTab,
  mobileOpen,
  onMobileClose,
}: SidebarTabsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const logout = useAuthStore((state) => state.logout);
  const { data: dashboardData } = useDashboardOverview({
    chartDays: 7,
    topLimit: 5,
  });

  // Calculate out of stock items count (products)
  const outOfStockItemsCount =
    dashboardData?.data.lowStockItems?.filter(
      (item) => Number(item.current_stock) <= 0,
    ).length || 0;

  // Calculate out of stock batches count
  const outOfStockBatchesCount =
    dashboardData?.data.lowStockBatches?.filter(
      (batch) => Number(batch.quantity) <= 0,
    ).length || 0;

  // Total out of stock count (items + batches)
  const totalOutOfStockCount = outOfStockItemsCount + outOfStockBatchesCount;

  useEffect(() => {
    const handleResize = () => {
      setIsOpen(window.innerWidth >= 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Shared nav content, rendered into two independent <aside>s below
  // (desktop static rail + mobile drawer) rather than one element whose
  // position/transform is toggled across breakpoints - a fixed element
  // stuck with a stale `-translate-x-full` (e.g. from a CSS cache/HMR
  // gap not picking up the `md:` override) would otherwise vanish at
  // every viewport size, not just mobile.
  const navContent = (showLabelsHere: boolean, onToggle: () => void) => (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="p-4 focus:outline-none w-full flex justify-end hover:bg-gray-800 cursor-pointer"
      >
        {showLabelsHere ? <X /> : <ArrowRight />}
      </button>

      <div className="mt-4 space-y-6">
        {SIDEBAR_LINKS.map((section) => (
          <div key={section.section}>
            {showLabelsHere && (
              <h2 className="px-4 text-gray-400 text-sm uppercase">
                {section.section}
              </h2>
            )}

            <div className="mt-2 space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = activeTab === link.tab;
                const showNotificationBadge =
                  link.tab === "inventory" && totalOutOfStockCount > 0;

                return (
                  <button
                    key={link.tab}
                    type="button"
                    onClick={() => setActiveTab(link.tab)}
                    className={`w-full cursor-pointer px-4 py-2 flex items-center text-left hover:bg-gray-800 transition-colors relative ${
                      isActive ? "bg-gray-700" : ""
                    }`}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5 shrink-0" />

                      {/* Notification Badge on Icon (when sidebar is collapsed) */}
                      {showNotificationBadge && !showLabelsHere && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-gray-900">
                          {totalOutOfStockCount > 9
                            ? "9+"
                            : totalOutOfStockCount}
                        </span>
                      )}
                    </div>

                    {showLabelsHere && (
                      <span className="ml-2 flex-1 flex items-center justify-between">
                        <span>{link.name}</span>

                        {/* Notification Badge (when sidebar is open) */}
                        {showNotificationBadge && (
                          <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {totalOutOfStockCount > 99
                              ? "99+"
                              : totalOutOfStockCount}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 mb-4 border-t border-gray-800 pt-4">
        <button
          type="button"
          onClick={logout}
          title="Log out"
          className="w-full cursor-pointer px-4 py-2 flex items-center text-left text-red-300 hover:bg-gray-800 hover:text-red-200 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {showLabelsHere && <span className="ml-2">Log out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: always in normal flow, collapsible rail. Simply absent
          below md - no positioning/transform tricks involved. */}
      <aside
        className={`hidden md:block h-screen shrink-0 overflow-y-auto bg-gray-900 text-white transition-all duration-300 ${
          isOpen ? "w-64" : "w-16"
        }`}
      >
        {navContent(isOpen, () => setIsOpen((prev) => !prev))}
      </aside>

      {/* Mobile: off-canvas drawer, only ever mounted while open. */}
      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 h-screen w-64 overflow-y-auto bg-gray-900 text-white">
            {navContent(true, onMobileClose)}
          </aside>
        </div>
      )}
    </>
  );
}

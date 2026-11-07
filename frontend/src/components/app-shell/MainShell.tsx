"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import SidebarTabs, { MainTab, SIDEBAR_LINKS } from "./SidebarTabs";
import BottomNav from "./BottomNav";
import LanguageToggle from "./LanguageToggle";
import ActivityBar from "@/components/layout/ActivityBar";
import { useLang } from "@/lib/i18n";

import DashboardTab from "@/components/tabs/DashboardTab";
import SalesTab from "@/components/tabs/SalesTab";
import ExpensesTab from "@/components/tabs/ExpensesTab";
import DaybookTab from "@/components/tabs/DaybookTab";
import CategoriesTab from "@/components/tabs/CategoriesTab";
import ProductsTab from "@/components/tabs/ProductTab";
import PosTab from "@/components/tabs/PosTab";
import InventoryTab from "@/components/tabs/InventoryTab";
import InventoryTransactionsTab from "@/components/tabs/InventorytransactionsTab";
import PaymentMethodsTab from "@/components/tabs/PaymentmethodsTab";
import SecurityTab from "@/components/tabs/SecurityTab";
import EoqTab from "@/components/tabs/EoqTab";
import ProductBatchesPage from "../tabs/ProductBatchTab";
import BarcodeLabelsTab from "../tabs/BarcodeLabelsTab";
import ActivityLogTab from "../tabs/ActivityLogTab";
import StoreInfoTab from "../tabs/StoreInfoTab";

const tabName = (tab: MainTab) =>
  SIDEBAR_LINKS.flatMap((s) => s.links).find((l) => l.tab === tab)?.name ??
  "Ting Ting ko pasal";

export default function MainShell() {
  const [activeTab, setActiveTabState] = useState<MainTab>("pos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLang();

  // Selecting a tab always dismisses the mobile drawer, otherwise the menu
  // would sit open over the page the user just navigated to.
  const setActiveTab = (tab: MainTab) => {
    setActiveTabState(tab);
    setMobileMenuOpen(false);
    // a new page starts at its top, not where the last one was scrolled to
    document.querySelector("main")?.scrollTo({ top: 0 });
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-100">
      <ActivityBar />
      <SidebarTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label={t("Open menu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* phones: which page this is */}
          <span className="flex min-w-0 items-center gap-2 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 rounded-full"
            />
            <span className="truncate text-base font-semibold text-gray-900">
              {t(tabName(activeTab))}
            </span>
          </span>
          <div className="ml-auto">
            <LanguageToggle />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === "dashboard" && (
            <DashboardTab setActiveTab={setActiveTab} />
          )}
          {activeTab === "sales" && <SalesTab />}
          {activeTab === "expenses" && <ExpensesTab />}
          {activeTab === "daybook" && <DaybookTab />}
          {activeTab === "activity-log" && <ActivityLogTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "products" && <ProductsTab />}
          {activeTab === "product-batches" && <ProductBatchesPage />}
          {activeTab === "barcode-labels" && <BarcodeLabelsTab />}
          {activeTab === "pos" && <PosTab />}
          {activeTab === "eoq" && <EoqTab />}

          {activeTab === "inventory" && <InventoryTab />}
          {activeTab === "inventory-transactions" && (
            <InventoryTransactionsTab />
          )}

          {activeTab === "payment-methods" && <PaymentMethodsTab />}
          {activeTab === "store-info" && <StoreInfoTab />}
          {activeTab === "security" && <SecurityTab />}
        </main>

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onMore={() => setMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import SidebarTabs, { MainTab } from "./SidebarTabs";

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

export default function MainShell() {
  const [activeTab, setActiveTabState] = useState<MainTab>("pos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Selecting a tab always dismisses the mobile drawer, otherwise the menu
  // would sit open over the page the user just navigated to.
  const setActiveTab = (tab: MainTab) => {
    setActiveTabState(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <SidebarTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            Ting Ting ko pasal
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {activeTab === "dashboard" && (
            <DashboardTab setActiveTab={setActiveTab} />
          )}
          {activeTab === "sales" && <SalesTab />}
          {activeTab === "expenses" && <ExpensesTab />}
          {activeTab === "daybook" && <DaybookTab />}
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
          {activeTab === "security" && <SecurityTab />}
        </main>
      </div>
    </div>
  );
}

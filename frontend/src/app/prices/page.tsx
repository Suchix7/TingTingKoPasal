import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";

export const metadata: Metadata = {
  title: "Prices - Ting Ting ko pasal",
  robots: { index: false, follow: false },
};

// the shop with selling prices, for the signed-in price viewer
export default function PricesPage() {
  return <CatalogPage priceView />;
}

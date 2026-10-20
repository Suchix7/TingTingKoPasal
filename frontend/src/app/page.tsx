import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";

export const metadata: Metadata = {
  title: "Phone Covers - Ting Ting ko pasal",
  description: "Browse phone covers and find the one for your phone.",
};

export default function HomePage() {
  return <CatalogPage />;
}

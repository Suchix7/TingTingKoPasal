import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";

export const metadata: Metadata = {
  title: "Mobile Cases - Ting Ting ko pasal",
  description: "Browse mobile cases and find the one for your phone.",
};

export default function HomePage() {
  return <CatalogPage />;
}

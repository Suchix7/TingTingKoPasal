import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";

export const metadata: Metadata = {
  title: "Ting Ting ko pasal",
  description:
    "Phone cases, caps, gloves and more. See what's in stock at Ting Ting ko pasal.",
};

export default function HomePage() {
  return <CatalogPage />;
}

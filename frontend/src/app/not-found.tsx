import type { Metadata } from "next";
import LostPage from "@/components/catalog/LostPage";

export const metadata: Metadata = {
  title: "Page not found - Ting Ting ko pasal",
  robots: { index: false, follow: false },
};

// any address that doesn't exist: a playful page that walks back to the shop
export default function NotFound() {
  return <LostPage />;
}

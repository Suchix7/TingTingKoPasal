"use client";

import { useLang } from "@/lib/i18n";

// A product or category name, in Chinese when the panel is in Chinese and a
// Chinese name has been set.
export default function Tn({ v }: { v?: string | null }) {
  const { tn } = useLang();
  return <>{v ? tn(v) : v}</>;
}

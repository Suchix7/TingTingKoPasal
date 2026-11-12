"use client";

import { ImageIcon } from "lucide-react";
import { coverImage } from "@/components/catalog/image";
import type { SaleItem } from "@/hooks/useSales";

// Small photos of what was sold in a sale (the sold colour's photo when there
// is one), a few side by side and "+N" for the rest.
export default function SaleItemThumbs({
  items,
  max = 4,
  size = "md",
}: {
  items?: SaleItem[];
  max?: number;
  size?: "sm" | "md";
}) {
  if (!items?.length) return null;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  const box = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((item, i) => (
        <div
          key={`${item.product_id}-${item.batch_id ?? ""}-${i}`}
          className={`relative ${box} shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100`}
          title={`${item.product_name}${item.batch_number ? ` — ${item.batch_number}` : ""} ×${item.quantity}`}
        >
          {item.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage(item.photo_url, 160)}
              alt={item.product_name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-4 w-4 text-gray-300" />
            </div>
          )}
          {item.quantity > 1 && (
            <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/65 px-1 text-[10px] font-semibold leading-4 text-white">
              ×{item.quantity}
            </span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <span
          className={`flex ${box} shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

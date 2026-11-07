"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { Cover } from "@/hooks/useCatalog";
import { pcs } from "./format";
import MediaGallery from "./MediaGallery";

type Props = {
  cover: Cover;
  // phone cases: tell shoppers to ask in store when no model is listed
  isCase: boolean;
  onClose: () => void;
};

// Full-screen view of one cover with the phone models it fits. Swiping only
// moves between this cover's own photos and videos, never to another product.
export default function CoverViewer({ cover, isCase, onClose }: Props) {
  const availableModels = cover.models.filter((m) => m.quantity > 0);
  const media = cover.media?.length
    ? cover.media
    : [{ type: "image" as const, url: cover.photo_url, poster: cover.photo_url }];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // keep the page behind from scrolling
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-end px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2.5 text-white active:bg-white/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <MediaGallery key={cover.id} items={media} dimmed={!cover.in_stock} />

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {!cover.in_stock && (
          <p className="mb-3 text-center">
            <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
              Out of stock
            </span>
          </p>
        )}
        {cover.models.length > 0 ? (
          // Only the models that are actually available; sold-out ones are
          // left out entirely (the "Out of stock" badge covers a sold-out cover)
          availableModels.length > 0 && (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/60">
                Phone models
              </p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {availableModels.map((m) => (
                  <span
                    key={m.model}
                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900"
                  >
                    {m.model} · {pcs(m.quantity)}
                  </span>
                ))}
              </div>
            </>
          )
        ) : cover.in_stock ? (
          <p className="text-center text-sm font-medium text-white">
            {pcs(cover.quantity)} in stock
            {isCase && (
              <span className="mt-1 block text-xs font-normal text-white/60">
                Ask in store for your phone model
              </span>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

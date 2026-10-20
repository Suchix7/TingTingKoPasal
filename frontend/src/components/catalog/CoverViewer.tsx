"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { Cover } from "@/hooks/useCatalog";
import { coverImage } from "./image";

type Props = {
  covers: Cover[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

// Full-screen view of one cover with the phone models it fits.
// Swipe, arrow keys or the side buttons move between covers.
export default function CoverViewer({
  covers,
  index,
  onIndexChange,
  onClose,
}: Props) {
  const cover = covers[index];
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const hasPrev = index > 0;
  const hasNext = index < covers.length - 1;
  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < covers.length) onIndexChange(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onIndexChange, onClose]);

  // keep the page behind from scrolling
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // warm the neighbours so swiping feels instant
  useEffect(() => {
    [covers[index - 1], covers[index + 1]].forEach((c) => {
      if (c) new window.Image().src = coverImage(c.photo_url, 1200);
    });
  }, [covers, index]);

  if (!cover) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const s = touchStart.current;
        touchStart.current = null;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          go(dx < 0 ? 1 : -1);
        }
      }}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-sm text-white/70">
          {index + 1} / {covers.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2.5 text-white active:bg-white/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={cover.id}
          src={coverImage(cover.photo_url, 1200)}
          alt="Phone cover"
          className="max-h-full max-w-full select-none object-contain"
          draggable={false}
        />
        {hasPrev && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 hidden rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:block"
            aria-label="Previous cover"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 hidden rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:block"
            aria-label="Next cover"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {cover.models.length > 0 ? (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/60">
              Available for
            </p>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {cover.models.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900"
                >
                  {m}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-xs text-white/60">
            Ask in store for your phone model
          </p>
        )}
      </div>
    </div>
  );
}

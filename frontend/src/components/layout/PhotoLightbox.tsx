"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { coverImage } from "@/components/catalog/image";
import { useLang } from "@/lib/i18n";

type Props = {
  url: string;
  title?: string;
  onClose: () => void;
};

// Full-screen photo so the design can be seen properly on a phone.
export default function PhotoLightbox({ url, title, onClose }: Props) {
  const { t } = useLang();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex h-dvh flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2.5 text-white active:bg-white/20"
          aria-label={t("Close photo")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage(url, 1200)}
          alt={title ?? ""}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full select-none rounded-lg object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export default function BlackFridayBanner({
  onShopSlippers,
  isSlipperCategory = false,
}: {
  onShopSlippers: () => void;
  isSlipperCategory?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    phase: "bf" | "cm";
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    // Black Friday deadline: Friday Nov 27 23:59:59 (+05:45)
    // Cyber Monday deadline: Monday Nov 30 23:59:59 (+05:45)
    const bfDeadline = new Date("2026-11-27T23:59:59+05:45").getTime();
    const cmDeadline = new Date("2026-11-30T23:59:59+05:45").getTime();

    const update = () => {
      const now = Date.now();
      const isBF = now < bfDeadline;
      const deadline = isBF ? bfDeadline : cmDeadline;
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, phase: "cm", isExpired: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, phase: isBF ? "bf" : "cm", isExpired: false });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft || timeLeft.isExpired) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <aside
      aria-label="Promotional offer banner"
      onClick={onShopSlippers}
      className="group cursor-pointer select-none transition-colors hover:brightness-105"
      title="Click to view all slippers on deal"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2">
        {/* Left: Event badge & core offer */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/30 shadow-xs">
            {timeLeft.phase === "bf" ? "Black Friday" : "Cyber Monday"}
          </span>
          <span className="truncate text-xs sm:text-sm font-medium text-white">
            Offer on Slippers:{" "}
            <span className="font-extrabold text-amber-200">Flat Rs. 999</span>
          </span>
          <span className="hidden lg:inline text-xs text-rose-100">
            · Black Friday & Cyber Monday Deals
          </span>
        </div>

        {/* Right: Highlighted countdown & Buy Now button */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-rose-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-200">
              Ends in
            </span>
            <div className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums text-white">
              {timeLeft.days > 0 && (
                <>
                  <span className="rounded-md bg-black/20 ring-1 ring-white/20 px-1.5 py-0.5">
                    {pad(timeLeft.days)}d
                  </span>
                  <span className="text-white/60">:</span>
                </>
              )}
              <span className="rounded-md bg-black/20 ring-1 ring-white/20 px-1.5 py-0.5">
                {pad(timeLeft.hours)}h
              </span>
              <span className="text-white/60">:</span>
              <span className="rounded-md bg-black/20 ring-1 ring-white/20 px-1.5 py-0.5">
                {pad(timeLeft.minutes)}m
              </span>
              <span className="text-white/60">:</span>
              <span className="rounded-md bg-white text-rose-700 px-1.5 py-0.5 font-extrabold shadow-sm">
                {pad(timeLeft.seconds)}s
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShopSlippers();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-50 active:scale-95 shrink-0"
          >
            <span>{isSlipperCategory ? "View Deals" : "Buy Now"}</span>
            <ArrowRight className="h-3 w-3 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </aside>
  );
}

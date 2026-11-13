"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  // the shop answered: play the exit and get out of the way
  ready: boolean;
  // gave up after retrying; offer to try again
  error: boolean;
  onRetry: () => void;
  // translates the words (the price page in Chinese)
  t?: (text: string) => string;
};

// Shown only for the first visit's wait. A warm server answers in well under
// a second, so the splash just blinks the logo and fades; a sleeping one can
// take up to a minute, so after a few seconds it explains what's going on.
const WAKING_AFTER_MS = 2500;
// never flash: once shown, stay at least this long
const MIN_VISIBLE_MS = 700;
const EXIT_MS = 650;

const STEPS = [
  "Unlocking the doors",
  "Turning on the lights",
  "Arranging the shelves",
  "Dusting off the products",
  "Counting what's in stock",
  "Almost there",
];
const STEP_MS = 6000;

export default function ShopSplash({ ready, error, onRetry, t = (s) => s }: Props) {
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // clock for the messages and the progress bar
  useEffect(() => {
    if (ready || error) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    return () => clearInterval(id);
  }, [ready, error]);

  // exit: finish the bar, then fade out and unmount
  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(MIN_VISIBLE_MS - (Date.now() - startedAt.current), 0);
    const t1 = setTimeout(() => setLeaving(true), wait);
    const t2 = setTimeout(() => setGone(true), wait + EXIT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ready]);

  // keep the page behind still while the splash covers it
  useEffect(() => {
    if (gone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gone]);

  if (gone) return null;

  const waking = elapsed >= WAKING_AFTER_MS;
  // eases towards 95% over about a minute; jumps to 100% when ready
  const progress = ready ? 100 : 95 * (1 - Math.exp(-elapsed / 18000));
  const step = Math.min(
    Math.floor(Math.max(elapsed - WAKING_AFTER_MS, 0) / STEP_MS),
    STEPS.length - 1,
  );

  const retry = () => {
    startedAt.current = Date.now();
    setElapsed(0);
    onRetry();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`splash fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden px-6 transition-opacity ease-out ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${EXIT_MS}ms` }}
    >
      {/* soft drifting colour behind everything */}
      <div aria-hidden className="splash-aura splash-aura-red" />
      <div aria-hidden className="splash-aura splash-aura-navy" />

      <div
        className={`relative flex flex-col items-center transition-transform ease-out ${
          leaving ? "scale-[1.06]" : "scale-100"
        }`}
        style={{ transitionDuration: `${EXIT_MS}ms` }}
      >
        <div className="relative h-40 w-40 sm:h-44 sm:w-44">
          <div aria-hidden className="splash-glow absolute inset-2 rounded-full" />
          {!error && <div aria-hidden className="splash-ring absolute inset-0 rounded-full" />}
          <div className="absolute inset-[6px] rounded-full bg-[#fbf6ec] shadow-[0_10px_40px_-10px_rgba(44,62,92,0.45)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ting Ting ko pasal"
            width={176}
            height={176}
            className={`absolute inset-[10px] h-[calc(100%-20px)] w-[calc(100%-20px)] rounded-full ${
              error ? "" : "splash-breathe"
            }`}
            draggable={false}
          />
        </div>

        <div className="mt-8 flex min-h-[5.5rem] w-full max-w-xs flex-col items-center text-center">
          {error ? (
            <div className="splash-rise">
              <p className="text-lg font-semibold tracking-tight text-[#2c3e5c]">
                {t("Couldn't reach the shop")}
              </p>
              <p className="mt-1 text-sm text-[#2c3e5c]/70">
                {t("Check your internet connection and try again.")}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 rounded-full bg-[#c8423b] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#c8423b]/30 transition active:scale-95"
              >
                {t("Try again")}
              </button>
            </div>
          ) : (
            <>
              <p
                key={waking ? "waking" : "opening"}
                className="splash-rise text-lg font-semibold tracking-tight text-[#2c3e5c]"
              >
                {t(waking ? "Waking up the shop" : "Opening the shop")}
                <span className="splash-dots" aria-hidden>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </p>

              <div className="mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-[#2c3e5c]/10">
                <div
                  className="splash-bar relative h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(progress, 4)}%` }}
                />
              </div>

              {waking && (
                <>
                  <p
                    key={step}
                    className="splash-rise mt-3 text-sm font-medium text-[#c8423b]"
                  >
                    {t(STEPS[step])}
                  </p>
                  <p className="splash-rise mt-3 text-xs leading-relaxed text-[#2c3e5c]/60">
                    The shop was resting, so the first visit can take up to a
                    minute. It opens by itself, no need to refresh.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift,
  Glasses,
  Hand,
  Heart,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Watch,
  type LucideIcon,
} from "lucide-react";

// seconds before we walk the visitor back to the shop
const WAIT = 12;

// a bit of everything the shop sells: cases, gloves, clothes, gifts...
const GOODS: { Icon: LucideIcon; c: string }[] = [
  { Icon: Smartphone, c: "text-sky-500" },
  { Icon: Hand, c: "text-amber-500" },
  { Icon: Shirt, c: "text-violet-500" },
  { Icon: Gift, c: "text-rose-500" },
  { Icon: Glasses, c: "text-emerald-500" },
  { Icon: Watch, c: "text-orange-500" },
  { Icon: Heart, c: "text-pink-500" },
];

// drifting up the background: icon, left %, size, duration, delay, colour
const FLOATERS = [
  { Icon: ShoppingBag, x: 5, s: 28, d: 13, w: 0, c: "text-rose-400" },
  { Icon: Shirt, x: 17, s: 22, d: 11, w: 3, c: "text-violet-400" },
  { Icon: Smartphone, x: 29, s: 22, d: 15, w: 6, c: "text-sky-400" },
  { Icon: Star, x: 41, s: 14, d: 10, w: 1.5, c: "text-amber-400" },
  { Icon: Hand, x: 53, s: 22, d: 14, w: 8, c: "text-amber-400" },
  { Icon: Gift, x: 65, s: 24, d: 12, w: 4.5, c: "text-rose-400" },
  { Icon: Glasses, x: 77, s: 22, d: 16, w: 2, c: "text-emerald-400" },
  { Icon: Sparkles, x: 90, s: 18, d: 9, w: 6.5, c: "text-orange-400" },
];

const BAG_COLOURS = ["#f43f5e", "#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981"];

type Burst = { id: number; parts: { x: number; y: number; r: number; g: number }[] };

export default function LostPage() {
  const router = useRouter();
  const [left, setLeft] = useState(WAIT);
  const [stayed, setStayed] = useState(false);
  const [taps, setTaps] = useState(0);
  const [hop, setHop] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);

  // count down, then back to the shop (unless they chose to stay)
  useEffect(() => {
    if (stayed) return;
    if (left <= 0) {
      router.replace("/");
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, stayed, router]);

  // tapping the bag: it hops, a handful of goods fly out, new bag colour
  const poke = () => {
    setTaps((n) => n + 1);
    setHop((n) => n + 1);
    const id = ++burstId.current;
    const parts = Array.from({ length: 7 }, (_, i) => {
      // mostly upwards, fanned out
      const a = -Math.PI / 2 + ((i - 3) / 3) * 1.25 + (Math.random() - 0.5) * 0.3;
      const dist = 80 + Math.random() * 45;
      return {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        r: Math.random() * 80 - 40,
        g: (i + id) % GOODS.length,
      };
    });
    setBursts((b) => [...b, { id, parts }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
  };

  const bag = BAG_COLOURS[taps % BAG_COLOURS.length];
  const happy = taps > 0;
  const progress = stayed ? 0 : left / WAIT;
  const R = 22;
  const C = 2 * Math.PI * R;

  return (
    <main className="lost-bg relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center">
      {/* drifting shop things */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {FLOATERS.map(({ Icon, x, s, d, w, c }, i) => (
          <Icon
            key={i}
            className={`lost-float absolute bottom-[-3rem] ${c}`}
            style={{
              left: `${x}%`,
              width: s,
              height: s,
              animationDuration: `${d}s`,
              animationDelay: `-${w}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <Link href="/" aria-label="Ting Ting ko pasal home" className="lost-bob mb-3 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ting Ting ko pasal"
            width={72}
            height={72}
            className="h-16 w-16 rounded-full shadow-lg ring-4 ring-white sm:h-[4.5rem] sm:w-[4.5rem]"
          />
        </Link>

        {/* 4 [shopping bag] 4 */}
        <div className="flex items-end justify-center gap-2 pt-10 sm:gap-4" aria-label="404">
          <span aria-hidden className="lost-digit lost-hop text-[6.5rem] font-black leading-none sm:text-[8.5rem]">
            4
          </span>

          <button
            type="button"
            onClick={poke}
            aria-label="Tap the shopping bag"
            className="relative mx-1 h-[7.2rem] w-[6.2rem] shrink-0 touch-manipulation outline-none sm:h-[8.6rem] sm:w-[7.4rem]"
          >
            <span key={hop} aria-hidden className={`absolute inset-0 ${hop ? "lost-jump" : "lost-wobble"}`}>
              {/* goods peeking out of the top */}
              <span className="absolute inset-x-0 -top-7 flex justify-center gap-0.5 sm:-top-8">
                {[GOODS[0], GOODS[2], GOODS[3]].map(({ Icon, c }, i) => (
                  <span
                    key={i}
                    className="lost-peek flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md sm:h-10 sm:w-10"
                    style={{ animationDelay: `${i * 0.25}s`, rotate: `${(i - 1) * 14}deg` }}
                  >
                    <Icon className={`h-5 w-5 ${c}`} />
                  </span>
                ))}
              </span>

              {/* handle */}
              <span
                className="absolute left-1/2 top-[-0.2rem] h-8 w-12 -translate-x-1/2 rounded-t-full border-[5px] border-b-0 transition-colors duration-300 sm:w-14"
                style={{ borderColor: bag }}
              />

              {/* the bag */}
              <span
                className="absolute inset-x-0 bottom-0 top-5 flex flex-col items-center justify-center rounded-b-[1.6rem] rounded-t-lg shadow-xl transition-colors duration-300"
                style={{ backgroundColor: bag }}
              >
                <span className="absolute inset-x-0 top-0 h-3 rounded-t-lg bg-black/10" />
                {/* face */}
                <span className="mt-2 flex gap-4">
                  {happy ? (
                    <>
                      <span className="text-xl font-black leading-none text-white">^</span>
                      <span className="text-xl font-black leading-none text-white">^</span>
                    </>
                  ) : (
                    <>
                      <span className="lost-blink h-3 w-3 rounded-full bg-white" />
                      <span className="lost-blink h-3 w-3 rounded-full bg-white" />
                    </>
                  )}
                </span>
                <span
                  className={`mt-2 border-white ${
                    happy
                      ? "h-3 w-7 rounded-b-full border-[3px] border-t-0"
                      : "h-3.5 w-3.5 rounded-full border-[3px]"
                  }`}
                />
                <span className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-white/40" />
                <span className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-white/40" />
              </span>
            </span>

            {/* goods flying out on a tap */}
            {bursts.map((b) =>
              b.parts.map((p, i) => {
                const { Icon, c } = GOODS[p.g];
                return (
                  <span
                    key={`${b.id}-${i}`}
                    aria-hidden
                    className="lost-burst absolute left-1/2 top-6 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-md"
                    style={
                      {
                        "--bx": `${p.x}px`,
                        "--by": `${p.y}px`,
                        "--br": `${p.r}deg`,
                      } as CSSProperties
                    }
                  >
                    <Icon className={`h-4.5 w-4.5 ${c}`} />
                  </span>
                );
              }),
            )}
          </button>

          <span
            aria-hidden
            className="lost-digit lost-hop text-[6.5rem] font-black leading-none sm:text-[8.5rem]"
            style={{ animationDelay: "0.35s" }}
          >
            4
          </span>
        </div>
        {/* its shadow on the floor */}
        <span aria-hidden className="lost-shadow mt-2 h-3 w-32 rounded-full bg-black/10 blur-[2px]" />

        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
          Oops! This page wandered off the shelf.
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600 sm:text-base">
          We checked every shelf, every rack and every shopping bag in the shop.
          This page isn&apos;t here, but plenty of lovely things are.
        </p>
        <p className="mt-2 h-5 text-xs font-medium text-rose-500" aria-live="polite">
          {taps === 0
            ? "Psst… tap the bag."
            : taps < 5
              ? `Look what fell out! (${taps})`
              : "You found the secret. Time to go shopping 🛍️"}
        </p>

        {/* countdown back to the shop */}
        <div className="mt-6 flex w-full flex-col items-center gap-3">
          <Link
            href="/"
            replace
            className="lost-cta group relative flex h-14 w-full max-w-xs items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gray-900 px-6 text-base font-semibold text-white shadow-lg active:scale-[0.98]"
          >
            <ShoppingBag className="h-5 w-5 transition-transform group-hover:-rotate-12" />
            Take me to the shop
            {!stayed && (
              <span className="relative ml-1 flex h-9 w-9 items-center justify-center">
                <svg viewBox="0 0 50 50" className="absolute inset-0 -rotate-90">
                  <circle cx="25" cy="25" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle
                    cx="25"
                    cy="25"
                    r={R}
                    fill="none"
                    stroke="#fb7185"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - progress)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span className="text-xs font-bold tabular-nums">{left}</span>
              </span>
            )}
          </Link>
          <p className="text-xs text-gray-500" aria-live="polite">
            {stayed ? (
              "No rush. The shop is one tap away whenever you're ready."
            ) : (
              <>
                Heading back to the shop in {left}s ·{" "}
                <button
                  type="button"
                  onClick={() => setStayed(true)}
                  className="font-semibold text-gray-700 underline underline-offset-2"
                >
                  stay here
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

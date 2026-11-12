"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

import { coverImage, fullImage, videoSources, type MediaItem } from "./image";
import SoldOutMark from "./SoldOutMark";

type Props = {
  items: MediaItem[];
  alt?: string;
  // dims the photos, e.g. for a sold-out item
  dimmed?: boolean;
  // slides showing something sold out: stamped "Sold out" (colours kept)
  soldOut?: (index: number) => boolean;
  labels?: { previous: string; next: string };
  // jump to this slide when it changes (e.g. a colour was picked)
  index?: number;
  // told whenever the shown slide changes
  onIndexChange?: (index: number) => void;
};

// Height of the native video control bar: swipes that start there are left
// to the video (scrubbing), not used to change slides.
const VIDEO_CONTROLS_HEIGHT = 72;

// Swipeable photos and videos of a single product: the slide follows the
// finger, then snaps to the next or previous one. Arrow keys, the side
// buttons and the thumbnail strip work too. It never leaves the product.
export default function MediaGallery({
  items,
  alt = "",
  dimmed = false,
  soldOut,
  labels = { previous: "Previous photo", next: "Next photo" },
  index: wanted,
  onIndexChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  // slides already shown stay loaded; the rest load when next to the current one
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1]));
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const thumbs = useRef<HTMLDivElement | null>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  const count = items.length;
  const multiple = count > 1;

  const go = (next: number) => {
    const i = Math.min(Math.max(next, 0), count - 1);
    setIndex(i);
    setSeen((prev) => new Set(prev).add(i - 1).add(i).add(i + 1));
    onIndexChange?.(i);
  };

  useEffect(() => {
    if (wanted === undefined || wanted < 0 || wanted >= count) return;
    setIndex(wanted);
    setSeen((prev) => new Set(prev).add(wanted - 1).add(wanted).add(wanted + 1));
  }, [wanted, count]);

  useEffect(() => {
    if (!multiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // a video that is swiped away stops playing
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (v && i !== index && !v.paused) v.pause();
    });
  }, [index]);

  // keep the active thumbnail in view
  useEffect(() => {
    const el = thumbs.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!multiple) return;
    const t = e.touches[0];
    const video = (e.target as HTMLElement).closest("video");
    if (video) {
      const rect = video.getBoundingClientRect();
      if (t.clientY > rect.bottom - VIDEO_CONTROLS_HEIGHT) return;
    }
    start.current = { x: t.clientX, y: t.clientY, horizontal: null };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // decide once whether this is a sideways swipe or a vertical gesture
    if (s.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      s.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!s.horizontal) return;
    setDragging(true);
    // resist at the first and last slide
    const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    setDrag(atEdge ? dx / 3 : dx);
  };

  const onTouchEnd = () => {
    const s = start.current;
    start.current = null;
    if (!s?.horizontal) return;
    const width = track.current?.offsetWidth || window.innerWidth;
    const threshold = Math.min(80, width / 5);
    if (drag < -threshold) go(index + 1);
    else if (drag > threshold) go(index - 1);
    setDrag(0);
    setDragging(false);
  };

  if (count === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={track}
        className="relative min-h-0 flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{ touchAction: multiple ? "pan-y" : undefined }}
      >
        <div
          className={`flex h-full ${dragging ? "" : "transition-transform duration-300 ease-out"}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
        >
          {items.map((item, i) => (
            <div
              key={`${item.url}-${i}`}
              className="relative flex h-full w-full shrink-0 items-center justify-center px-2"
              aria-hidden={i !== index}
            >
              {seen.has(i) &&
                (item.type === "video" ? (
                  <video
                    ref={(el) => {
                      videos.current[i] = el;
                    }}
                    controls
                    playsInline
                    preload="metadata"
                    poster={fullImage(item.poster)}
                    className="max-h-full max-w-full rounded-lg bg-black"
                  >
                    {videoSources(item.url).map((s) => (
                      <source key={s.src} src={s.src} type={s.type} />
                    ))}
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fullImage(item.url)}
                    alt={i === index ? alt : ""}
                    className={`max-h-full max-w-full select-none object-contain ${
                      dimmed ? "opacity-60 grayscale" : ""
                    }`}
                    draggable={false}
                  />
                ))}
              {soldOut?.(i) && <SoldOutMark size="lg" />}
            </div>
          ))}
        </div>

        {multiple && index > 0 && (
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:block"
            aria-label={labels.previous}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {multiple && index < count - 1 && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:block"
            aria-label={labels.next}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {multiple && (
          <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
            {index + 1} / {count}
          </span>
        )}
      </div>

      {multiple && (
        <div
          ref={thumbs}
          className="flex shrink-0 justify-start gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none] sm:justify-center"
        >
          {items.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => go(i)}
              aria-label={`${i + 1} / ${count}`}
              aria-current={i === index}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === index ? "opacity-100 ring-white" : "opacity-50 ring-transparent hover:opacity-80"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage(item.poster, 160)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
                draggable={false}
              />
              {item.type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, ZoomOut } from "lucide-react";

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
  // the sold-out stamp in Chinese
  zh?: boolean;
  // jump to this slide when it changes (e.g. a colour was picked)
  index?: number;
  // told whenever the shown slide changes
  onIndexChange?: (index: number) => void;
};

// Height of the native video control bar: swipes that start there are left
// to the video (scrubbing), not used to change slides.
const VIDEO_CONTROLS_HEIGHT = 72;

// photo zoom: pinch, double-tap / double-click and the mouse wheel
const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;
type Zoom = { scale: number; x: number; y: number };
const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };

// Swipeable photos and videos of a single product: the slide follows the
// finger, then snaps to the next or previous one. Arrow keys, the side
// buttons and the thumbnail strip work too. It never leaves the product.
// Photos zoom with a pinch, a double-tap / double-click or the mouse wheel;
// a zoomed photo is dragged around instead of swiped.
export default function MediaGallery({
  items,
  alt = "",
  dimmed = false,
  soldOut,
  labels = { previous: "Previous photo", next: "Next photo" },
  zh = false,
  index: wanted,
  onIndexChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  // slides already shown stay loaded; the rest load when next to the current one
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1]));
  // full-size photos that have arrived (until then the card-size one shows)
  const [sharp, setSharp] = useState<Set<number>>(() => new Set());
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const thumbs = useRef<HTMLDivElement | null>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  // zoom of the shown photo; back to 1x on another slide
  const [zoom, setZoom] = useState<Zoom>(NO_ZOOM);
  const zoomRef = useRef(zoom);
  // a pinch or drag is under way: the photo follows the fingers without easing
  const [gesture, setGesture] = useState(false);
  const pinch = useRef<{ dist: number; mid: { x: number; y: number }; from: Zoom } | null>(null);
  const pan = useRef<{ x: number; y: number; from: Zoom; moved: boolean } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);

  const count = items.length;
  const multiple = count > 1;
  const zoomed = zoom.scale > 1;
  const isPhoto = (i: number) => !!items[i] && items[i].type !== "video";

  const applyZoom = (z: Zoom) => {
    zoomRef.current = z;
    setZoom(z);
  };

  // keep a zoomed photo covering the frame: no dragging past its edges
  const clampZoom = (z: Zoom): Zoom => {
    const scale = Math.min(Math.max(z.scale, 1), MAX_ZOOM);
    if (scale <= 1.01) return NO_ZOOM;
    const w = track.current?.offsetWidth || window.innerWidth;
    const h = track.current?.offsetHeight || window.innerHeight;
    const mx = ((scale - 1) * w) / 2;
    const my = ((scale - 1) * h) / 2;
    return {
      scale,
      x: Math.min(Math.max(z.x, -mx), mx),
      y: Math.min(Math.max(z.y, -my), my),
    };
  };
  // zoom to `scale`, keeping the point under (px, py) where it is on screen
  const zoomAt = (from: Zoom, scale: number, px: number, py: number): Zoom => {
    const rect = track.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const ix = (px - cx - from.x) / from.scale;
    const iy = (py - cy - from.y) / from.scale;
    return clampZoom({ scale, x: px - cx - ix * scale, y: py - cy - iy * scale });
  };
  const toggleZoomAt = (px: number, py: number) => {
    if (!isPhoto(index)) return;
    const z = zoomRef.current;
    applyZoom(z.scale > 1 ? NO_ZOOM : zoomAt(z, TAP_ZOOM, px, py));
  };

  const go = (next: number) => {
    const i = Math.min(Math.max(next, 0), count - 1);
    if (i !== index) applyZoom(NO_ZOOM);
    setIndex(i);
    setSeen((prev) => new Set(prev).add(i - 1).add(i).add(i + 1));
    onIndexChange?.(i);
  };

  useEffect(() => {
    if (wanted === undefined || wanted < 0 || wanted >= count) return;
    zoomRef.current = NO_ZOOM;
    setZoom(NO_ZOOM);
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

  // the mouse wheel zooms the photo under the pointer (a native listener, so
  // the page doesn't scroll at the same time)
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!isPhoto(index)) return;
      e.preventDefault();
      const z = zoomRef.current;
      applyZoom(zoomAt(z, z.scale * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
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

  // a zoomed photo is dragged around with the mouse
  const onMouseDown = (e: React.MouseEvent) => {
    if (!zoomed || e.button !== 0) return;
    e.preventDefault();
    const from = zoomRef.current;
    const x = e.clientX;
    const y = e.clientY;
    setGesture(true);
    const move = (ev: MouseEvent) =>
      applyZoom(clampZoom({ ...from, x: from.x + ev.clientX - x, y: from.y + ev.clientY - y }));
    const up = () => {
      setGesture(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    // two fingers on a photo: pinch to zoom (a swipe under way stops)
    if (e.touches.length === 2 && isPhoto(index)) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinch.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
        mid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
        from: zoomRef.current,
      };
      start.current = null;
      pan.current = null;
      setGesture(true);
      setDrag(0);
      setDragging(false);
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    // kept to drag a zoomed photo, and to spot the taps of a double-tap
    pan.current = { x: t.clientX, y: t.clientY, from: zoomRef.current, moved: false };
    if (zoomed) {
      setGesture(true);
      return;
    }
    if (!multiple) return;
    const video = (e.target as HTMLElement).closest("video");
    if (video) {
      const rect = video.getBoundingClientRect();
      if (t.clientY > rect.bottom - VIDEO_CONTROLS_HEIGHT) return;
    }
    start.current = { x: t.clientX, y: t.clientY, horizontal: null };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const pz = pinch.current;
    if (pz) {
      if (e.touches.length !== 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mid = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      // grow around where the pinch started, and follow the fingers as they move
      const z = zoomAt(pz.from, pz.from.scale * (dist / pz.dist), pz.mid.x, pz.mid.y);
      applyZoom(clampZoom({ ...z, x: z.x + mid.x - pz.mid.x, y: z.y + mid.y - pz.mid.y }));
      return;
    }
    const p = pan.current;
    if (p && e.touches.length === 1) {
      const t = e.touches[0];
      if (Math.abs(t.clientX - p.x) > 8 || Math.abs(t.clientY - p.y) > 8) p.moved = true;
      if (zoomed) {
        applyZoom(clampZoom({ ...p.from, x: p.from.x + t.clientX - p.x, y: p.from.y + t.clientY - p.y }));
        return;
      }
    }
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

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinch.current) {
      if (e.touches.length >= 2) return;
      pinch.current = null;
      // one finger still down on a zoomed photo: carry on dragging with it
      if (e.touches.length === 1 && zoomRef.current.scale > 1) {
        const t = e.touches[0];
        pan.current = { x: t.clientX, y: t.clientY, from: zoomRef.current, moved: true };
      } else {
        setGesture(false);
      }
      return;
    }
    const p = pan.current;
    pan.current = null;
    setGesture(false);
    // a quick second tap in the same spot zooms in (or back out)
    if (p && !p.moved && e.changedTouches.length === 1 && isPhoto(index)) {
      const t = e.changedTouches[0];
      const prev = lastTap.current;
      const now = Date.now();
      if (prev && now - prev.at < 300 && Math.hypot(t.clientX - prev.x, t.clientY - prev.y) < 30) {
        lastTap.current = null;
        start.current = null;
        toggleZoomAt(t.clientX, t.clientY);
        return;
      }
      lastTap.current = { at: now, x: t.clientX, y: t.clientY };
    }
    const s = start.current;
    start.current = null;
    if (!s?.horizontal || zoomed) return;
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
        onMouseDown={onMouseDown}
        onDoubleClick={(e) => toggleZoomAt(e.clientX, e.clientY)}
        // the browser never pinch-zooms the page here: the gallery does it
        style={{
          touchAction: zoomed ? "none" : "pan-y",
          cursor: zoomed ? (gesture ? "grabbing" : "grab") : isPhoto(index) ? "zoom-in" : undefined,
        }}
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
                  <div
                    className={`absolute inset-0 ${gesture ? "" : "transition-transform duration-200 ease-out"}`}
                    style={
                      i === index && zoomed
                        ? { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }
                        : undefined
                    }
                  >
                    {/* the card-size photo (usually already loaded) shows at
                        once; the sharp one fades in over it when it arrives */}
                    {!sharp.has(i) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverImage(item.poster || item.url, 480)}
                        alt=""
                        aria-hidden
                        className={`absolute inset-y-0 left-2 right-2 h-full w-[calc(100%-1rem)] select-none object-contain ${
                          dimmed ? "opacity-60 grayscale" : ""
                        }`}
                        draggable={false}
                      />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fullImage(item.url)}
                      alt={i === index ? alt : ""}
                      decoding="async"
                      fetchPriority={i === index ? "high" : "low"}
                      onLoad={() => setSharp((prev) => new Set(prev).add(i))}
                      className={`absolute inset-y-0 left-2 right-2 h-full w-[calc(100%-1rem)] select-none object-contain transition-opacity duration-300 ${
                        sharp.has(i) ? "opacity-100" : "opacity-0"
                      } ${dimmed ? "!opacity-60 grayscale" : ""}`}
                      draggable={false}
                    />
                  </div>
                ))}
              {/* the stamp steps aside while the photo is looked at closely */}
              {soldOut?.(i) && !(i === index && zoomed) && <SoldOutMark size="lg" zh={zh} />}
            </div>
          ))}
        </div>

        {multiple && index > 0 && !zoomed && (
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:block"
            aria-label={labels.previous}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {multiple && index < count - 1 && !zoomed && (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:block"
            aria-label={labels.next}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {zoomed && (
          <button
            type="button"
            onClick={() => applyZoom(NO_ZOOM)}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" /> 1×
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

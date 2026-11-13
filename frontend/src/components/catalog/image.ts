import type React from "react";

// Cloudinary can resize on the fly; small thumbnails keep the grid fast on
// mobile data. Non-Cloudinary URLs are returned untouched.
export function coverImage(url: string, width: number): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_limit,q_auto,f_auto/`);
}

// A tiny blurred copy (well under 1 KB) shown behind a photo while it loads,
// so a card is never an empty grey box. Pass the result as the img's style;
// clearBlur (onLoad) removes it once the real photo is in, so it can't show
// through transparent photos.
export function blurBehind(url: string | null | undefined): React.CSSProperties | undefined {
  if (!url || !url.includes("/upload/")) return undefined;
  const tiny = url.replace("/upload/", "/upload/w_32,q_30,e_blur:300,f_auto/");
  return {
    backgroundImage: `url("${tiny}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export const clearBlur = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.backgroundImage = "none";
};

// Full-screen photos: as wide as this screen can actually show (sharp on
// high-density phones), in steps of 400px so Cloudinary can reuse what it
// already made. A phone gets ~1200px instead of 2000, so it opens much faster.
function fullWidth(): number {
  if (typeof window === "undefined") return 1600;
  const px = window.innerWidth * Math.min(window.devicePixelRatio || 1, 3);
  return Math.min(2000, Math.max(800, Math.ceil(px / 400) * 400));
}

export function fullImage(url: string): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${fullWidth()},c_limit,q_auto,f_auto/`);
}

// Start fetching a full-screen photo early (e.g. as a card is pressed), so it
// is already on its way when the viewer opens.
export function preloadFull(url: string | null | undefined) {
  if (!url || typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = fullImage(url);
}

// Same rendition the backend asks Cloudinary to prepare right after upload
// (VIDEO_EAGER in backend/src/utils/media.js): H.264 MP4 up to 1080p, which
// every phone can play. The original file is the fallback while it is being
// prepared.
const VIDEO_TRANSFORM = "c_limit,h_1920,q_auto:best,w_1920";

export function videoSources(url: string): { src: string; type?: string }[] {
  if (!url.includes("/video/upload/")) return [{ src: url }];
  const mp4 = url
    .replace("/video/upload/", `/video/upload/${VIDEO_TRANSFORM}/`)
    .replace(/\.[a-z0-9]+(\?.*)?$/i, ".mp4");
  return [{ src: mp4, type: "video/mp4" }, { src: url }];
}

export type MediaItem = {
  type: "image" | "video";
  url: string;
  // still picture: the photo itself, or a frame from the video
  poster: string;
};

// Picture for one stock line of a product: the photo tagged with the line's
// colour/style when there is one, otherwise the product's cover photo.
export function linePhoto(
  product: {
    photo_url?: string | null;
    photos?: { poster: string; variant?: string; size_guide?: boolean }[];
  },
  batch?: { variant?: string } | null,
): string | null {
  return variantPhoto(product, batch) ?? (product.photo_url || null);
}

// The photo tagged with this line's colour, or null when there is none
export function variantPhoto(
  product: { photos?: { poster: string; variant?: string; size_guide?: boolean }[] },
  batch?: { variant?: string } | null,
): string | null {
  const variant = batch?.variant?.trim().toLowerCase();
  if (!variant) return null;
  return (
    product.photos?.find(
      (p) => !p.size_guide && p.variant?.trim().toLowerCase() === variant,
    )?.poster ?? null
  );
}

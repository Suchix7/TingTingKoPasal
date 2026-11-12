// Cloudinary can resize on the fly; small thumbnails keep the grid fast on
// mobile data. Non-Cloudinary URLs are returned untouched.
export function coverImage(url: string, width: number): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_limit,q_auto,f_auto/`);
}

// Full-screen photos: sharp enough for high-density phone screens, in the
// best automatic quality.
export function fullImage(url: string): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/w_2000,c_limit,q_auto:best,f_auto/");
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

// Shared rules for product photos and videos stored on Cloudinary.

export const PRODUCT_MEDIA_FOLDER = "byapardesk/products";
export const MAX_PRODUCT_MEDIA = 10;

// Videos are re-encoded once, right after upload, to an H.264 MP4 capped at
// 1080p in the best automatic quality, so every phone can play them. The
// customer site asks for exactly this rendition (keep the two in sync with
// frontend/src/components/catalog/image.ts).
export const VIDEO_EAGER = "c_limit,h_1920,q_auto:best,w_1920/mp4";

// Still frame used wherever a picture is needed for a video (grid, POS, ...)
export function videoPoster(url) {
  if (!url || !url.includes("/video/upload/")) return url;
  return url
    .replace("/video/upload/", "/video/upload/so_0/")
    .replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg");
}

// A product's photos and videos in display order. Products saved before
// multi-photo support only have photoUrl; that one shows up as "legacy".
export function productMedia(obj) {
  if (obj?.photos?.length) {
    return obj.photos.map((p) => {
      const type = p.type === "video" ? "video" : "image";
      return {
        id: String(p._id),
        type,
        url: p.url,
        poster: type === "video" ? videoPoster(p.url) : p.url,
        publicId: p.publicId || null,
      };
    });
  }
  if (obj?.photoUrl) {
    return [
      {
        id: "legacy",
        type: "image",
        url: obj.photoUrl,
        poster: obj.photoUrl,
        publicId: obj.photoPublicId || null,
      },
    ];
  }
  return [];
}

// Cloudinary can resize on the fly; small thumbnails keep the grid fast on
// mobile data. Non-Cloudinary URLs are returned untouched.
export function coverImage(url: string, width: number): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_limit,q_auto,f_auto/`);
}

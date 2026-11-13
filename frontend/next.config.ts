import type { NextConfig } from "next";

// API calls go to the same origin as the site and are proxied to the backend.
// This keeps the session cookie first-party, which Safari/iOS requires.
const backendUrl = (
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://tingtingkopasal.onrender.com"
    : "http://localhost:5000")
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    // photos are resized by Cloudinary itself (components/catalog/image.ts), so
    // Next's own image server isn't needed: faster, and nothing to attack
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        // only the shop's own Cloudinary account, not anyone's
        pathname: "/xwugf7xm/**",
      },
    ],
  },
  // basic protection on every page: no framing by other sites (clickjacking),
  // no content-type guessing, and no full page addresses sent to other sites
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

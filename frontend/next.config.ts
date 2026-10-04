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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  logging: {
    incomingRequests: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "wow.zamimg.com" },
      { protocol: "https", hostname: "render-eu.worldofwarcraft.com" },
      { protocol: "https", hostname: "render-us.worldofwarcraft.com" },
      { protocol: "https", hostname: "assets.raider.io" },
    ],
  },
};

export default nextConfig;

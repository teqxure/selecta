import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Scaleway Object Storage buckets serve product images from *.scw.cloud.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.scw.cloud",
      },
    ],
  },
};

export default nextConfig;

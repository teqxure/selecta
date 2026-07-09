import type { NextConfig } from "next";

/**
 * Product images are served from Cloudflare R2's public URL — a custom
 * domain or the bucket's `*.r2.dev` URL, set via `R2_PUBLIC_URL`. Falls
 * back to the generic r2.dev wildcard if the env var isn't available at
 * build time, so a build never fails over image config alone.
 */
function resolveR2Hostname(): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    try {
      return new URL(publicUrl).hostname;
    } catch {
      // fall through to default below
    }
  }
  return "*.r2.dev";
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: resolveR2Hostname(),
      },
    ],
  },
};

export default nextConfig;

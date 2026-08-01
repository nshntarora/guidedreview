import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Dev-only reverse proxy for PostHog (matches production Worker at /i/*).
// Must not be present during `next build` with `output: "export"` — Next warns
// that rewrites/redirects/headers are ignored on static export. Production
// uses the Cloudflare Worker already routed on guidedreview.dev/i/*.
const posthogDevRewrites =
  process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          return [
            {
              source: "/i/static/:path*",
              destination: "https://us-assets.i.posthog.com/static/:path*",
            },
            {
              source: "/i/array/:path*",
              destination: "https://us-assets.i.posthog.com/array/:path*",
            },
            {
              source: "/i/:path*",
              destination: "https://us.i.posthog.com/:path*",
            },
          ];
        },
      }
    : {};

const nextConfig: NextConfig = {
  // Required for workspace source package (TS/TSX under packages/ui)
  transpilePackages: ["@guided-review/ui"],
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    // Rust MDX compiler — Turbopack-compatible. GFM enables tables, strikethrough, etc.
    // JS-based rehype/remark plugins are not supported with mdxRs.
    mdxRs: {
      mdxType: "gfm",
    },
  },
  // Static HTML export for Cloudflare Pages (no Node server at runtime).
  output: "export",
  // next/image optimizer needs a server; site uses plain <img> / public assets.
  images: { unoptimized: true },
  ...posthogDevRewrites,
};

const withMDX = createMDX({});

export default withMDX(nextConfig);

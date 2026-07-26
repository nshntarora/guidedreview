import type { NextConfig } from "next";
import createMDX from "@next/mdx";

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
};

const withMDX = createMDX({});

export default withMDX(nextConfig);

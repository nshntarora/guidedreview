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
  // Uncomment only when hosting is pure-static and no Next server features are needed:
  // output: "export",
  // images: { unoptimized: true },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);

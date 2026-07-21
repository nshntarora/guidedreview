import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for workspace source package (TS/TSX under packages/ui)
  transpilePackages: ["@guided-review/ui"],
  // Uncomment only when hosting is pure-static and no Next server features are needed:
  // output: "export",
  // images: { unoptimized: true },
};

export default nextConfig;

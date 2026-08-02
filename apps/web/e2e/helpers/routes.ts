import { DOCS_PAGES } from "@web/config/docs";

/** Static marketing + legal routes (always present). */
const STATIC_ROUTES = ["/", "/docs", "/privacy", "/terms", "/cookies"] as const;

/** Production origin used in metadataBase / absolute site links. */
export const PRODUCTION_ORIGIN = "https://guidedreview.dev";

/** Public assets that must ship even if not currently linked from UI. */
export const PUBLIC_ASSETS = [
  "/favicon.ico",
  "/product-preview/thumbnail.webp",
  "/product-preview/demo.webm",
  "/mitchell-hashimoto-tweet.png",
  "/opengraph-image",
] as const;

/** Path for a docs slug (`""` → `/docs`). */
export function docsPath(slug: string): string {
  return slug === "" ? "/docs" : `/docs/${slug}`;
}

/** Union of static + docs routes (deduped, stable order). */
export function allRoutes(): string[] {
  return [...new Set([...STATIC_ROUTES, ...DOCS_PAGES.map((page) => docsPath(page.slug))])];
}

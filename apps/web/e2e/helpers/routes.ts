import { DOCS_PAGES, docsPath } from "@web/config/docs";
import { GUIDES } from "@web/config/guides";
import { COMPARISONS } from "@web/config/compare";
export { docsPath } from "@web/config/docs";

/** Static marketing + legal routes (always present). */
const STATIC_ROUTES = [
  "/",
  "/docs",
  "/compare",
  "/guides",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

const configuredProductionOrigin = process.env.NEXT_PUBLIC_SITE_URL;

if (!configuredProductionOrigin) {
  throw new Error("NEXT_PUBLIC_SITE_URL is required for website E2E tests.");
}

/** Production origin used in metadataBase / absolute site links. */
export const PRODUCTION_ORIGIN = new URL(configuredProductionOrigin).origin;

/** Public assets that must ship even if not currently linked from UI. */
export const PUBLIC_ASSETS = [
  "/favicon.ico",
  "/product-preview/thumbnail.webp",
  "/mitchell-hashimoto-tweet.png",
  "/opengraph-image",
] as const;

/** Union of static + docs routes (deduped, stable order). */
export function allRoutes(): string[] {
  return [
    ...new Set([
      ...STATIC_ROUTES,
      ...DOCS_PAGES.map((page) => docsPath(page.slug)),
      ...GUIDES.map((article) => article.path),
      ...COMPARISONS.map((article) => article.path),
    ]),
  ];
}

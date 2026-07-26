import { helpNavigation } from "../../config/help-navigation";
import { helpPages } from "../../config/help-pages";

/** Static marketing + legal routes (always present). */
export const STATIC_ROUTES = ["/", "/docs", "/privacy", "/terms", "/cookies"] as const;

/** Production origin used in metadataBase / absolute site links. */
export const PRODUCTION_ORIGIN = "https://guidedreview.dev";

/** Public assets that must ship even if not currently linked from UI. */
export const PUBLIC_ASSETS = [
  "/favicon.ico",
  "/product-preview/thumbnail.png",
  "/product-preview/demo.webm",
  "/mitchell-hashimoto-tweet.png",
  "/opengraph-image",
] as const;

export type NavPage = { slug: string; title: string };

/** Non-heading entries from docs sidebar config. */
export function navPages(): NavPage[] {
  return helpNavigation
    .filter((item): item is { slug: string; title: string } => item.type !== "heading")
    .map((item) => ({ slug: item.slug, title: item.title }));
}

/** Path for a docs nav slug (`""` → `/docs`). */
export function docsPath(slug: string): string {
  return slug === "" ? "/docs" : `/docs/${slug}`;
}

/** All docs routes from help navigation. */
export function docRoutesFromNav(): string[] {
  return navPages().map((p) => docsPath(p.slug));
}

/** Docs slug keys registered in helpPages (excludes intro `/docs`). */
export function helpPageSlugs(): string[] {
  return Object.keys(helpPages);
}

/** Union of static + docs routes (deduped, stable order). */
export function allRoutes(): string[] {
  const set = new Set<string>([...STATIC_ROUTES, ...docRoutesFromNav()]);
  for (const slug of helpPageSlugs()) {
    set.add(docsPath(slug));
  }
  return [...set];
}

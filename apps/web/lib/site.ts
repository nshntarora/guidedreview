/**
 * Canonical production origin for the marketing site.
 * Single source for metadataBase, robots, sitemap, and JSON-LD — do not hardcode elsewhere.
 */
export const SITE_URL = "https://guidedreview.dev";

export const SITE_NAME = "Guided Review";

/** Default document description (root layout + pages that do not override). */
export const DEFAULT_DESCRIPTION =
  "A better way for humans to review AI generated code. Clustered changes, summaries, keyboard-first — free, open source, bring your own LLM key.";

/** Homepage-specific description (≤160 chars for SERP snippets). */
export const HOME_DESCRIPTION =
  "Chrome extension that clusters GitHub PR diffs into review units with summaries. Free, open source, bring your own LLM key.";

/** Shared Open Graph fields — page-level `openGraph` can replace the root object, so re-spread these. */
export const openGraphSite = {
  siteName: SITE_NAME,
  locale: "en_US",
} as const;

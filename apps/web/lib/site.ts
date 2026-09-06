/**
 * Canonical production origin for the marketing site.
 * Single source for metadataBase, robots, sitemap, and JSON-LD — do not hardcode elsewhere.
 */
export const SITE_URL = "https://guidedreview.dev";

export const SITE_NAME = "Guided Review";

/** Default document description (root layout + pages that do not override). */
export const DEFAULT_DESCRIPTION =
  "Review AI-generated code before you sign your name to it. Structured review units for GitHub PRs and local diffs — free, open source, bring your own LLM key.";

/** Homepage-specific description (≤160 chars for SERP snippets). */
export const HOME_DESCRIPTION =
  "Turn your commits into a structured review that helps you catch AI-code issues before your teammates do. Free, open source, BYO LLM key.";

/** Shared Open Graph fields — page-level `openGraph` can replace the root object, so re-spread these. */
export const openGraphSite = {
  siteName: SITE_NAME,
  locale: "en_US",
} as const;

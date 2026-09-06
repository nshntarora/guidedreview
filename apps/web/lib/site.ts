const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!configuredSiteUrl) {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL is required (for example, https://guidedreview.dev in production).",
  );
}

/** Canonical origin shared by metadata, robots, sitemap, JSON-LD, and tests. */
export const SITE_URL = new URL(configuredSiteUrl).origin;

export const SITE_NAME = "Guided Review";

/** Default document description (root layout + pages that do not override). */
export const DEFAULT_DESCRIPTION =
  "Review AI-generated code before you sign your name to it. Structured review units for GitHub PRs and local diffs — free, open source, bring your own LLM key.";

/** Homepage-specific description (≤160 chars for SERP snippets). */
export const HOME_DESCRIPTION =
  "Turn your commits into a structured review that helps you catch AI-code issues before your teammates do. Free, open source, BYO LLM key.";

export const SOCIAL_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Guided Review — review AI-generated code before you sign your name to it",
  type: "image/png",
} as const;

/** Shared Open Graph fields — page-level `openGraph` can replace the root object, so re-spread these. */
export const openGraphSite = {
  siteName: SITE_NAME,
  locale: "en_US",
  images: [SOCIAL_IMAGE],
};

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

/** Homepage-specific search description. */
export const HOME_DESCRIPTION =
  "A Chrome extension for GitHub PRs and a CLI for local diffs. AI clusters the change into review units. You still read the code. Free, open source, your API key.";

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

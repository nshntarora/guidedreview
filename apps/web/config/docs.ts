import type React from "react";

/** Heading entry exported as `toc` by each MDX page. */
export type TocEntry = { id: string; label: string; level: 2 | 3 };

export type DocsPage = {
  /** URL slug under /docs. The empty slug is the /docs index itself. */
  slug: string;
  title: string;
  /** Meta description and social card text. Full sentence. */
  description: string;
  /** Short, dry blurb for the docs index listing. Sentence fragment. */
  blurb?: string;
  /** Sidebar group heading. Pages sharing a section must be adjacent. */
  section: string;
  /**
   * MDX loader for /docs/[slug]. The index page has none — `app/docs/page.tsx`
   * imports `content/help/index.mdx` directly.
   */
  load?: () => Promise<{ default: React.ComponentType; toc?: TocEntry[] }>;
};

/**
 * Every docs page, in sidebar and prev/next order. This is the only place the
 * docs table of contents is written down: sidebar, breadcrumbs, pager, route
 * generation, page metadata, and the index listing all read from here.
 */
export const DOCS_PAGES: DocsPage[] = [
  {
    slug: "",
    section: "Getting Started",
    title: "Introduction",
    description:
      "What Guided Review is, how it turns a GitHub PR into an ordered walkthrough, and where to start in the docs.",
  },
  {
    slug: "install",
    section: "Getting Started",
    title: "Install the extension",
    description:
      "Install Guided Review from the Chrome Web Store or load an unpacked build for development.",
    blurb: "Chrome Web Store or load unpacked for development",
    load: () => import("@/content/help/install.mdx"),
  },
  {
    slug: "first-review",
    section: "Getting Started",
    title: "Your first review",
    description:
      "Open a GitHub PR, start Guided Review, walk review units, and leave comments from Guided Review.",
    blurb: "from a PR page to walking units",
    load: () => import("@/content/help/first-review.mdx"),
  },
  {
    slug: "configure-provider",
    section: "Setup",
    title: "Configure AI provider",
    description:
      "Add your Anthropic, OpenAI, or Grok API key, pick a model, and test the connection in options.",
    blurb: "API keys, models, and connection checks",
    load: () => import("@/content/help/configure-provider.mdx"),
  },
  {
    slug: "connect-github",
    section: "Setup",
    title: "Connect GitHub",
    description:
      "Optionally connect GitHub with device flow so you can submit reviews and line comments from Guided Review.",
    blurb: "optional auth for submitting reviews from Guided Review",
    load: () => import("@/content/help/connect-github.mdx"),
  },
  {
    slug: "how-it-works",
    section: "Product",
    title: "How a review plan works",
    description:
      "How Guided Review parses a PR diff, chunks large changes, and builds validated review units.",
    blurb: "units, chunking, and what the model is allowed to invent",
    load: () => import("@/content/help/how-it-works.mdx"),
  },
  {
    slug: "leave-comments",
    section: "Product",
    title: "Leave line comments",
    description:
      "Draft multi-line GitHub comments in Guided Review while you walk the review plan.",
    blurb: "comment mode, drafts, multi-line ranges",
    load: () => import("@/content/help/leave-comments.mdx"),
  },
  {
    slug: "submit-review",
    section: "Product",
    title: "Submit a review",
    description:
      "Post drafted comments and Comment, Approve, or Request Changes without leaving Guided Review.",
    blurb: "Comment / Approve / Request Changes from Guided Review",
    load: () => import("@/content/help/submit-review.mdx"),
  },
  {
    slug: "keyboard-shortcuts",
    section: "Product",
    title: "Keyboard shortcuts",
    description:
      "Keyboard-first shortcuts for review navigation, diff view, comments, and submitting a review.",
    blurb: "navigate, comment, and submit without leaving the keyboard",
    load: () => import("@/content/help/keyboard-shortcuts.mdx"),
  },
  {
    slug: "troubleshooting",
    section: "Help",
    title: "Troubleshooting",
    description:
      "Fixes for a missing Start Guided Review button, provider errors, plan failures, and GitHub auth issues.",
    blurb: "common failures and fixes",
    load: () => import("@/content/help/troubleshooting.mdx"),
  },
  {
    slug: "faq",
    section: "Help",
    title: "FAQ",
    description:
      "Answers about how Guided Review works, privacy, pricing, AI providers, and whether AI approves PRs.",
    blurb: "free, tracking, what the AI does and doesn’t do",
    load: () => import("@/content/help/faq.mdx"),
  },
  {
    slug: "privacy-and-data",
    section: "Trust",
    title: "Privacy & data",
    description:
      "What the extension sends to GitHub and your AI provider, what stays local, and website analytics.",
    blurb: "what leaves your machine and what doesn’t",
    load: () => import("@/content/help/privacy-and-data.mdx"),
  },
];

/** Path for a docs slug (`""` → `/docs`). */
export function docsPath(slug: string): string {
  return slug ? `/docs/${slug}` : "/docs";
}

export function findDocsPage(slug: string): DocsPage | undefined {
  return DOCS_PAGES.find((page) => page.slug === slug);
}

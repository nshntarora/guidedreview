import type React from "react";

/** Heading entry exported as `toc` by each MDX page. */
export type TocEntry = { id: string; label: string; level: 2 | 3 };

export type DocsPage = {
  /** URL slug under /docs. The empty slug is the /docs index itself. */
  slug: string;
  title: string;
  /** Meta description and social card text. Full sentence. */
  description: string;
  /** ISO date for TechArticle metadata and sitemap freshness. */
  lastModified: string;
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
      "Learn what Guided Review does across GitHub pull requests and local git diffs, how it creates an ordered walkthrough, and where to start.",
    lastModified: "2026-09-06",
  },
  {
    slug: "why",
    section: "Getting Started",
    title: "Why",
    description:
      "Why Guided Review helps engineers read AI-generated code with context and taste, instead of outsourcing judgment or approving changes blindly.",
    lastModified: "2026-09-06",
    blurb: "why reading code matters more when AI writes it",
    load: () => import("@web/content/help/why.mdx"),
  },
  {
    slug: "install",
    section: "Getting Started",
    title: "Install",
    description:
      "Install Guided Review for GitHub pull requests or local git diffs, then choose the Chrome extension or CLI workflow that fits your review.",
    lastModified: "2026-09-06",
    blurb: "CLI or Chrome extension — same engine, pick a host",
    load: () => import("@web/content/help/install.mdx"),
  },
  {
    slug: "chrome-extension",
    section: "Apps",
    title: "Chrome Extension",
    description:
      "Install the Guided Review Chrome extension from the Web Store, then start an ordered review on any pull request hosted at github.com.",
    lastModified: "2026-09-06",
    blurb: "Install from the Web Store, then Start Guided Review on a PR",
    load: () => import("@web/content/help/chrome-extension.mdx"),
  },
  {
    slug: "cli",
    section: "Apps",
    title: "CLI",
    description:
      "Run Guided Review from your terminal on a local branch, commit, or working tree. The CLI serves the same walkthrough in the browser.",
    lastModified: "2026-09-06",
    blurb: "npx @guided-review/cli for local branch, commit, or working-tree diffs",
    load: () => import("@web/content/help/cli.mdx"),
  },
  {
    slug: "configure-provider",
    section: "Setup",
    title: "Configure AI provider",
    description:
      "Configure Anthropic, OpenAI, or Grok for Guided Review, add your API key in the extension or CLI, choose a model, and understand usage costs.",
    lastModified: "2026-09-06",
    blurb: "API keys for extension and CLI, models, and usage cost",
    load: () => import("@web/content/help/configure-provider.mdx"),
  },
  {
    slug: "connect-github",
    section: "Setup",
    title: "Connect GitHub",
    description:
      "Connect Guided Review to GitHub with device flow so you can submit reviews and line comments from the Chrome extension when you choose.",
    lastModified: "2026-09-06",
    blurb: "optional auth for submitting reviews from the extension",
    load: () => import("@web/content/help/connect-github.mdx"),
  },
  {
    slug: "first-review",
    section: "Product",
    title: "Your first review",
    description:
      "Start your first Guided Review on a GitHub pull request, walk ordered review units, search the diff, leave comments, and resume later.",
    lastModified: "2026-09-06",
    blurb: "from a PR page to walking and searching units",
    load: () => import("@web/content/help/first-review.mdx"),
  },
  {
    slug: "reading-the-overlay",
    section: "Product",
    title: "Reading the overlay",
    description:
      "Learn the Guided Review overlay: review units sidebar, context panel, real diff pane, change summary, PR description, and header actions.",
    lastModified: "2026-09-06",
    blurb: "layout of the review UI for extension and CLI",
    load: () => import("@web/content/help/reading-the-overlay.mdx"),
  },
  {
    slug: "how-it-works",
    section: "Product",
    title: "How a review plan works",
    description:
      "See how Guided Review parses diffs, chunks large changes, validates review units, and falls back file by file when no AI provider is configured.",
    lastModified: "2026-09-06",
    blurb: "units, chunking, no-AI fallback, and what the model may invent",
    load: () => import("@web/content/help/how-it-works.mdx"),
  },
  {
    slug: "images-and-binaries",
    section: "Product",
    title: "Images & binary files",
    description:
      "See how Guided Review handles image previews, binary files, and elided diffs across the Chrome extension and local review CLI.",
    lastModified: "2026-09-06",
    blurb: "image previews, binary empty state, comments and search",
    load: () => import("@web/content/help/images-and-binaries.mdx"),
  },
  {
    slug: "leave-comments",
    section: "Product",
    title: "Leave line comments",
    description:
      "Draft GitHub-style line comments while walking Guided Review units, edit or remove them locally, then submit through the extension.",
    lastModified: "2026-09-06",
    blurb: "comment mode, drafts, multi-line ranges",
    load: () => import("@web/content/help/leave-comments.mdx"),
  },
  {
    slug: "generate-prompt",
    section: "Product",
    title: "Generate Prompt",
    description:
      "Turn local Guided Review notes into a focused coding-agent prompt, copy it from the CLI, and keep review decisions in human hands.",
    lastModified: "2026-09-06",
    blurb: "clipboard prompt from local notes for a coding agent",
    load: () => import("@web/content/help/generate-prompt.mdx"),
  },
  {
    slug: "submit-review",
    section: "Product",
    title: "Submit a review",
    description:
      "Submit drafted line comments and a Comment, Approve, or Request Changes decision from Guided Review through the GitHub API.",
    lastModified: "2026-09-06",
    blurb: "Comment / Approve / Request Changes from the extension",
    load: () => import("@web/content/help/submit-review.mdx"),
  },
  {
    slug: "keyboard-shortcuts",
    section: "Product",
    title: "Keyboard shortcuts",
    description:
      "Keyboard-first shortcuts for review navigation, diff search, unified/split view, comments, submit, and the local CLI UI.",
    lastModified: "2026-09-06",
    blurb: "navigate, search, comment, submit, and CLI extras",
    load: () => import("@web/content/help/keyboard-shortcuts.mdx"),
  },
  {
    slug: "troubleshooting",
    section: "Help",
    title: "Troubleshooting",
    description:
      "Fix missing Guided Review buttons, provider and API-key errors, failed plans, GitHub connection problems, and local CLI issues.",
    lastModified: "2026-09-06",
    blurb: "common failures and fixes for extension and CLI",
    load: () => import("@web/content/help/troubleshooting.mdx"),
  },
  {
    slug: "faq",
    section: "Help",
    title: "FAQ",
    description:
      "Answers about Guided Review setup, privacy, provider costs, GitHub access, the Chrome extension, local CLI, and what the AI does.",
    lastModified: "2026-09-06",
    blurb: "free, cost, tracking, extension vs CLI, what the AI does",
    load: () => import("@web/content/help/faq.mdx"),
  },
  {
    slug: "privacy-and-data",
    section: "Trust",
    title: "Privacy & data",
    description:
      "What the extension and CLI send to GitHub and your AI provider, what stays local, how to clear keys or disconnect, and website analytics.",
    lastModified: "2026-09-06",
    blurb: "what leaves your machine, what stays, and how to clear it",
    load: () => import("@web/content/help/privacy-and-data.mdx"),
  },
];

/** Path for a docs slug (`""` → `/docs`). */
export function docsPath(slug: string): string {
  return slug ? `/docs/${slug}` : "/docs";
}

export function findDocsPage(slug: string): DocsPage | undefined {
  return DOCS_PAGES.find((page) => page.slug === slug);
}

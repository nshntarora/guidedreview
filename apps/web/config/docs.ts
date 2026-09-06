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
      "What Guided Review is — Chrome extension for GitHub PRs and CLI for local diffs — how it turns a change into an ordered walkthrough, and where to start in the docs.",
  },
  {
    slug: "why",
    section: "Getting Started",
    title: "Why",
    description:
      "Why Guided Review exists — AI made writing code easy, reading and reviewing it with taste is still on you, and tools should help you read rather than approve blindly.",
    blurb: "why reading code matters more when AI writes it",
    load: () => import("@web/content/help/why.mdx"),
  },
  {
    slug: "install",
    section: "Getting Started",
    title: "Install Guided Review",
    description:
      "Install the Chrome extension from the Web Store (or load unpacked), or run the CLI with npx for local git reviews.",
    blurb: "Chrome extension or CLI (npx @guided-review/cli)",
    load: () => import("@web/content/help/install.mdx"),
  },
  {
    slug: "first-review",
    section: "Getting Started",
    title: "Your first review",
    description:
      "Open a GitHub PR, start Guided Review from the button or toolbar, walk units, search the diff, and leave comments.",
    blurb: "from a PR page to walking and searching units",
    load: () => import("@web/content/help/first-review.mdx"),
  },
  {
    slug: "local-review",
    section: "Getting Started",
    title: "Review local changes",
    description:
      "Run Guided Review from your terminal on a local branch, commit, or working tree. The CLI serves the same walkthrough in the browser.",
    blurb: "CLI for local branch, commit, or working-tree diffs",
    load: () => import("@web/content/help/local-review.mdx"),
  },
  {
    slug: "configure-provider",
    section: "Setup",
    title: "Configure AI provider",
    description:
      "Add your Anthropic, OpenAI, or Grok API key in the extension or CLI, pick a model, and understand annotate cost.",
    blurb: "API keys for extension and CLI, models, and usage cost",
    load: () => import("@web/content/help/configure-provider.mdx"),
  },
  {
    slug: "connect-github",
    section: "Setup",
    title: "Connect GitHub",
    description:
      "Optionally connect GitHub with device flow so you can submit reviews and line comments from the Chrome extension.",
    blurb: "optional auth for submitting reviews from the extension",
    load: () => import("@web/content/help/connect-github.mdx"),
  },
  {
    slug: "how-it-works",
    section: "Product",
    title: "How a review plan works",
    description:
      "How Guided Review parses a diff, chunks large changes, builds validated review units, and falls back file-by-file without a provider — shared by extension and CLI.",
    blurb: "units, chunking, no-AI fallback, and what the model may invent",
    load: () => import("@web/content/help/how-it-works.mdx"),
  },
  {
    slug: "leave-comments",
    section: "Product",
    title: "Leave line comments",
    description:
      "Draft multi-line comments while you walk the review plan — submit from the extension, or Generate Prompt from the CLI.",
    blurb: "comment mode, drafts, multi-line ranges",
    load: () => import("@web/content/help/leave-comments.mdx"),
  },
  {
    slug: "submit-review",
    section: "Product",
    title: "Submit a review",
    description:
      "Post drafted comments and Comment, Approve, or Request Changes from the Chrome extension without leaving Guided Review.",
    blurb: "Comment / Approve / Request Changes from the extension",
    load: () => import("@web/content/help/submit-review.mdx"),
  },
  {
    slug: "keyboard-shortcuts",
    section: "Product",
    title: "Keyboard shortcuts",
    description:
      "Keyboard-first shortcuts for review navigation, diff search, unified/split view, comments, submit, and the local CLI UI.",
    blurb: "navigate, search, comment, submit, and CLI extras",
    load: () => import("@web/content/help/keyboard-shortcuts.mdx"),
  },
  {
    slug: "troubleshooting",
    section: "Help",
    title: "Troubleshooting",
    description:
      "Fixes for a missing Start Guided Review button, provider errors, plan failures, CLI issues, and GitHub auth.",
    blurb: "common failures and fixes for extension and CLI",
    load: () => import("@web/content/help/troubleshooting.mdx"),
  },
  {
    slug: "faq",
    section: "Help",
    title: "FAQ",
    description:
      "Answers about how Guided Review works (extension and CLI), privacy, cost, AI providers, and whether AI approves PRs.",
    blurb: "free, cost, tracking, extension vs CLI, what the AI does",
    load: () => import("@web/content/help/faq.mdx"),
  },
  {
    slug: "privacy-and-data",
    section: "Trust",
    title: "Privacy & data",
    description:
      "What the extension and CLI send to GitHub and your AI provider, what stays local, and website analytics.",
    blurb: "what leaves your machine and what doesn’t",
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

import type { Article } from "@web/config/articles";

export const GUIDES: Article[] = [
  {
    slug: "review-ai-generated-pull-request",
    path: "/guides/review-ai-generated-pull-request",
    title: "How to review an AI-generated pull request",
    description:
      "Read intent, walk related hunks, inspect production changes and tests separately, and check summaries against the diff before deciding on an AI-written PR.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/guides/review-ai-generated-pull-request.mdx"),
  },
  {
    slug: "review-local-changes-before-pr",
    path: "/guides/review-local-changes-before-pr",
    title: "Review local git changes before opening a PR",
    description:
      "Walk a branch, working tree, or commit before gh pr create. Use the local CLI, opt into AI structuring, and turn your own notes into a coding-agent prompt.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/guides/review-local-changes-before-pr.mdx"),
  },
  {
    slug: "github-pr-review-extension",
    path: "/guides/github-pr-review-extension",
    title: "A Chrome extension to review GitHub pull requests",
    description:
      "Read github.com pull requests as ordered review units in a Chrome overlay. Bring your own provider key, draft line comments, and choose what to submit.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/guides/github-pr-review-extension.mdx"),
  },
  {
    slug: "byo-key-code-review",
    path: "/guides/byo-key-code-review",
    title: "Bring your own key to code review",
    description:
      "Understand provider choice, diff traffic, local key storage, and usage costs when you bring an Anthropic, OpenAI, or Grok key to a human review walkthrough.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/guides/byo-key-code-review.mdx"),
  },
  {
    slug: "code-review-without-auto-approve",
    path: "/guides/code-review-without-auto-approve",
    title: "AI code review that does not auto-approve",
    description:
      "Use AI to structure a diff while keeping the review decision yours. Learn what a human-driven walkthrough does, what it leaves out, and when it fits.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/guides/code-review-without-auto-approve.mdx"),
  },
];

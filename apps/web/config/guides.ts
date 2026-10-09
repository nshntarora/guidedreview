import type { Article } from "@web/config/articles";

export const GUIDES: Article[] = [
  {
    slug: "review-ai-generated-pull-request",
    path: "/guides/review-ai-generated-pull-request",
    title: "How to review an AI-generated pull request",
    description:
      "An agent renames timeout to timeoutMs. Is it a rename, a conversion, or a compatibility change? Follow the value before approving the PR.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/guides/review-ai-generated-pull-request.mdx"),
  },
  {
    slug: "review-local-changes-before-pr",
    path: "/guides/review-local-changes-before-pr",
    title: "Review local git changes before opening a PR",
    description:
      "A branch diff can miss the test still in your working tree. Pick the right local scope, read the change, and check what you are about to publish.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/guides/review-local-changes-before-pr.mdx"),
  },
  {
    slug: "github-pr-review-extension",
    path: "/guides/github-pr-review-extension",
    title: "A Chrome extension to review GitHub pull requests",
    description:
      "Follow a GitHub PR across types, callers, and tests in a Chrome overlay. Your provider key, the real diff, and comments you choose to submit.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/guides/github-pr-review-extension.mdx"),
  },
  {
    slug: "byo-key-code-review",
    path: "/guides/byo-key-code-review",
    title: "Bring your own key to code review",
    description:
      "Your key tells you who pays for inference. Follow where Guided Review sends the diff, what stays local, and which actions make a model call.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/guides/byo-key-code-review.mdx"),
  },
  {
    slug: "code-review-without-auto-approve",
    path: "/guides/code-review-without-auto-approve",
    title: "AI code review that does not auto-approve",
    description:
      "A summary says invalid input is rejected. Which input? Read the condition and its test before choosing whether to approve.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/guides/code-review-without-auto-approve.mdx"),
  },
];

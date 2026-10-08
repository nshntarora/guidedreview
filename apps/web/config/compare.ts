import type { Article } from "@web/config/articles";

export const COMPARISONS: Article[] = [
  {
    slug: "coderabbit-alternative",
    tool: "CodeRabbit",
    path: "/compare/coderabbit-alternative",
    title: "A CodeRabbit alternative for reading the diff yourself",
    description:
      "Compare CodeRabbit PR feedback with a walkthrough you drive. See where Guided Review fits, where CodeRabbit fits, and why neither choice removes human judgment.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/compare/coderabbit-alternative.mdx"),
  },
  {
    slug: "graphite-diamond-alternative",
    tool: "Graphite Diamond",
    path: "/compare/graphite-diamond-alternative",
    title: "A Graphite Diamond alternative for a human walkthrough",
    description:
      "Looking for a Diamond alternative? Compare Graphite's current AI Reviews product with an ordered diff walkthrough, including when Guided Review is the worse fit.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/compare/graphite-diamond-alternative.mdx"),
  },
  {
    slug: "copilot-code-review-alternative",
    tool: "GitHub Copilot",
    path: "/compare/copilot-code-review-alternative",
    title: "A Copilot code review alternative for reading the change",
    description:
      "Compare GitHub Copilot code review with a BYO-key diff walkthrough. Understand comments, human decisions, and when keeping Copilot is the more useful choice.",
    lastModified: "2026-10-08",
    load: () => import("@web/content/compare/copilot-code-review-alternative.mdx"),
  },
];

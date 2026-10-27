import type { Article } from "@web/config/articles";

export const COMPARISONS: Article[] = [
  {
    slug: "coderabbit-alternative",
    tool: "CodeRabbit",
    toolLogo: "/assets/compare/coderabbit.svg",
    path: "/compare/coderabbit-alternative",
    title: "CodeRabbit alternative for reading the diff yourself",
    seoTitle: "CodeRabbit alternative for reading the diff yourself | Guided Review",
    description:
      "A CodeRabbit alternative for engineers who want to read the diff themselves. Compare walkthroughs, automated feedback, data paths, and worse fits.",
    lastModified: "2026-10-21",
    load: () => import("@web/content/compare/coderabbit-alternative.mdx"),
  },
  {
    slug: "graphite-diamond-alternative",
    tool: "Graphite Diamond",
    toolLogo: "/assets/compare/graphite.svg",
    path: "/compare/graphite-diamond-alternative",
    title: "Graphite Diamond alternative for a human-driven walkthrough",
    seoTitle: "Graphite Diamond alternative | Guided Review",
    description:
      "A Graphite Diamond alternative for a reviewer-driven walkthrough. Compare the current AI Reviews product, workflows, data paths, and worse fits.",
    lastModified: "2026-10-21",
    load: () => import("@web/content/compare/graphite-diamond-alternative.mdx"),
  },
  {
    slug: "copilot-code-review-alternative",
    tool: "GitHub Copilot",
    toolLogo: "/assets/compare/github-copilot.svg",
    path: "/compare/copilot-code-review-alternative",
    title: "Copilot code review alternative for a reviewer-driven walkthrough",
    seoTitle: "Copilot code review alternative | Guided Review",
    description:
      "A Copilot code review alternative for engineers who want a walkthrough. Compare human decisions, generated comments, data paths, and worse fits.",
    lastModified: "2026-10-21",
    load: () => import("@web/content/compare/copilot-code-review-alternative.mdx"),
  },
];

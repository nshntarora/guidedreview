import type { Article } from "@web/config/articles";

export const COMPARISONS: Article[] = [
  {
    slug: "coderabbit-alternative",
    tool: "CodeRabbit",
    path: "/compare/coderabbit-alternative",
    title: "Guided Review vs CodeRabbit: reading or automated feedback (2026)",
    seoTitle: "Guided Review vs CodeRabbit for engineers (2026)",
    description:
      "Guided Review vs CodeRabbit in 2026 for engineers: compare diff reading, automated feedback, costs, setup, and when to keep CodeRabbit.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/compare/coderabbit-alternative.mdx"),
  },
  {
    slug: "graphite-diamond-alternative",
    tool: "Graphite Diamond",
    path: "/compare/graphite-diamond-alternative",
    title: "Guided Review vs Graphite: a walkthrough or team review tools (2026)",
    seoTitle: "Guided Review vs Graphite for engineers (2026)",
    description:
      "Guided Review vs Graphite in 2026 for engineers: compare diff reading, AI feedback, pricing, setup, and when Graphite is the better fit.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/compare/graphite-diamond-alternative.mdx"),
  },
  {
    slug: "copilot-code-review-alternative",
    tool: "GitHub Copilot",
    path: "/compare/copilot-code-review-alternative",
    title: "Guided Review vs GitHub Copilot: reading or review comments (2026)",
    seoTitle: "Guided Review vs GitHub Copilot for engineers (2026)",
    description:
      "Guided Review vs GitHub Copilot in 2026 for engineers: compare diff reading, review comments, pricing, setup, and who should keep Copilot.",
    lastModified: "2026-10-09",
    load: () => import("@web/content/compare/copilot-code-review-alternative.mdx"),
  },
];

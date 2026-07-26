import type React from "react";

export const helpPages: Record<
  string,
  () => Promise<{ default: React.ComponentType; toc?: TocEntry[] }>
> = {
  install: () => import("@/content/help/install.mdx"),
  "first-review": () => import("@/content/help/first-review.mdx"),
  "configure-provider": () => import("@/content/help/configure-provider.mdx"),
  "connect-github": () => import("@/content/help/connect-github.mdx"),
  "how-it-works": () => import("@/content/help/how-it-works.mdx"),
  "keyboard-shortcuts": () => import("@/content/help/keyboard-shortcuts.mdx"),
  "privacy-and-data": () => import("@/content/help/privacy-and-data.mdx"),
};

export type TocEntry = { id: string; label: string; level: 2 | 3 };

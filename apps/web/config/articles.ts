import type { ComponentType } from "react";

export type Article = {
  slug: string;
  path: string;
  title: string;
  seoTitle?: string;
  tool?: string;
  description: string;
  lastModified: string;
  load: () => Promise<{ default: ComponentType }>;
};

/** Formats an ISO calendar date for the guides byline without a day. */
export function formatArticleMonthYear(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

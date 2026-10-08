import type { Metadata } from "next";
import { ArticleIndex } from "@web/components/ArticleIndex";
import { COMPARISONS } from "@web/config/compare";
import { openGraphSite } from "@web/lib/site";

const title = "Compare code review tools";
const description =
  "Choose around the review work you need to do. Compare Guided Review with CodeRabbit, Graphite Diamond, and GitHub Copilot, including where each workflow fits.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { ...openGraphSite, type: "website", url: "/compare" },
};

export default function Page() {
  return (
    <ArticleIndex title={title} description={description} path="/compare" articles={COMPARISONS} />
  );
}

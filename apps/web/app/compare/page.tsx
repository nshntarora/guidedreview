import type { Metadata } from "next";
import { ArticleIndex } from "@web/components/ArticleIndex";
import { COMPARISONS } from "@web/config/compare";
import { openGraphSite } from "@web/lib/site";

const title = "Compare code review tools";
const description =
  "Guided Review, CodeRabbit, Graphite, and GitHub Copilot. Compare the work each tool does, the costs, and the reasons to keep what you already use.";

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

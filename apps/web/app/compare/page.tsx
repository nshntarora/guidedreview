import type { Metadata } from "next";
import { ArticleIndex } from "@web/components/ArticleIndex";
import { COMPARISONS } from "@web/config/compare";
import { openGraphSite } from "@web/lib/site";
import Content from "@web/content/compare/index.mdx";

const title = "Compare AI code review tools";
const description =
  "Compare AI code review tools by workflow, setup, cost, and where code goes. Choose a human walkthrough, automated findings, or both.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { ...openGraphSite, type: "website", url: "/compare" },
};

export default function Page() {
  return (
    <ArticleIndex title={title} description={description} path="/compare" articles={COMPARISONS}>
      <div className="[&_table]:min-w-3xl">
        <Content />
      </div>
    </ArticleIndex>
  );
}

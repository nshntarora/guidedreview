import type { Metadata } from "next";
import { ArticleIndex } from "@web/components/ArticleIndex";
import { GUIDES } from "@web/config/guides";
import { openGraphSite } from "@web/lib/site";

const title = "Guides";
const description =
  "Practical ways to review AI-generated code, read local changes, and keep the review decision yours. Worked examples, tradeoffs, and workflows you can use on your next diff.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: { ...openGraphSite, type: "website", url: "/guides" },
};

export default function Page() {
  return <ArticleIndex title={title} description={description} path="/guides" articles={GUIDES} />;
}

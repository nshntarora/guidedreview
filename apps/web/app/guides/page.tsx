import type { Metadata } from "next";
import { ArticleIndex } from "@web/components/ArticleIndex";
import { GUIDES } from "@web/config/guides";
import { openGraphSite } from "@web/lib/site";

const title = "Guides";
const description =
  "An agent wrote the change. You still have to read it. Guides to following the diff, checking tests, and reviewing local work before opening a PR.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: { ...openGraphSite, type: "website", url: "/guides" },
};

export default function Page() {
  return <ArticleIndex title={title} description={description} path="/guides" articles={GUIDES} />;
}

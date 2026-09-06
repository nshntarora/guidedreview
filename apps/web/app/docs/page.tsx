import type { Metadata } from "next";
import Content from "@web/content/help/index.mdx";
import { DocsPageWrapper } from "@web/components/docs/DocsPageWrapper";
import { JsonLd } from "@web/components/JsonLd";
import { findDocsPage } from "@web/config/docs";
import { openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

const docsPage = findDocsPage("");

if (!docsPage) throw new Error("The docs index must be registered in DOCS_PAGES.");

const DOCS_DESCRIPTION = docsPage.description;

export const metadata: Metadata = {
  title: "Documentation",
  description: DOCS_DESCRIPTION,
  alternates: { canonical: "/docs" },
  openGraph: { ...openGraphSite, type: "website", url: "/docs" },
};

const docsIndexSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: `Documentation · ${SITE_NAME}`,
  description: DOCS_DESCRIPTION,
  url: `${SITE_URL}/docs`,
  dateModified: docsPage.lastModified,
  isPartOf: { "@type": "WebSite", url: SITE_URL, name: SITE_NAME },
};

export default function DocsPage() {
  return (
    <DocsPageWrapper slug="">
      <JsonLd data={docsIndexSchema} />
      <Content />
    </DocsPageWrapper>
  );
}

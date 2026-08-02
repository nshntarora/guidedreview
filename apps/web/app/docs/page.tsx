import type { Metadata } from "next";
import Content from "@web/content/help/index.mdx";
import { DocsPageWrapper } from "@web/components/docs/DocsPageWrapper";
import { JsonLd } from "@web/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

const DOCS_DESCRIPTION =
  "Learn how to install Guided Review, configure your AI provider, and walk through GitHub pull requests with structured review plans.";

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

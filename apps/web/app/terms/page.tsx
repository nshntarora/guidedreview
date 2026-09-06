import type { Metadata } from "next";
import Content from "@web/content/legal/terms.mdx";
import { LegalDocument } from "@web/components/LegalDocument";
import { JsonLd } from "@web/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

const TITLE = "Terms of Service";
const DESCRIPTION =
  "Read the terms governing Guided Review's website, Chrome extension, local CLI, provider connections, acceptable use, and legal responsibilities.";
const LAST_MODIFIED = "2026-09-06";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    ...openGraphSite,
    type: "article",
    url: "/terms",
    modifiedTime: LAST_MODIFIED,
  },
};

const pageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: TITLE,
  description: DESCRIPTION,
  url: `${SITE_URL}/terms`,
  dateModified: LAST_MODIFIED,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd data={pageSchema} />
      <LegalDocument
        title={TITLE}
        meta={
          <>
            Effective date: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
            <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
          </>
        }
      >
        <Content />
      </LegalDocument>
    </>
  );
}

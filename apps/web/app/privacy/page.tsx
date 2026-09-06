import type { Metadata } from "next";
import Content from "@web/content/legal/privacy.mdx";
import { LegalDocument } from "@web/components/LegalDocument";
import { JsonLd } from "@web/components/JsonLd";
import { openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "Read how Guided Review collects, uses, stores, and protects personal data across its website, Chrome extension, local CLI, and connected providers.";
const LAST_MODIFIED = "2026-09-06";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    ...openGraphSite,
    type: "article",
    url: "/privacy",
    modifiedTime: LAST_MODIFIED,
  },
};

const pageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: TITLE,
  description: DESCRIPTION,
  url: `${SITE_URL}/privacy`,
  dateModified: LAST_MODIFIED,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={pageSchema} />
      <LegalDocument
        title={TITLE}
        meta={
          <>
            Last updated: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
            <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
          </>
        }
      >
        <Content />
      </LegalDocument>
    </>
  );
}

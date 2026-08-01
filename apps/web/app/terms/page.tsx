import type { Metadata } from "next";
import Content from "@/content/legal/terms.mdx";
import { LegalDocument } from "@/components/LegalDocument";
import { openGraphSite } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the Guided Review Chrome extension and website.",
  alternates: { canonical: "/terms" },
  openGraph: { ...openGraphSite, url: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      meta={
        <>
          Effective date: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
        </>
      }
    >
      <Content />
    </LegalDocument>
  );
}

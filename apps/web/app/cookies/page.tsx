import type { Metadata } from "next";
import Content from "@/content/legal/cookies.mdx";
import { LegalDocument } from "@/components/LegalDocument";
import { openGraphSite } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description: "How Guided Review uses cookies and similar technologies on the marketing website.",
  alternates: { canonical: "/cookies" },
  openGraph: { ...openGraphSite, url: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookies Policy"
      meta={
        <>
          Last updated: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
        </>
      }
    >
      <Content />
    </LegalDocument>
  );
}

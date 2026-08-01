import type { Metadata } from "next";
import Content from "@/content/legal/privacy.mdx";
import { LegalDocument } from "@/components/LegalDocument";
import { openGraphSite } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Guided Review collects, uses, and protects personal data across the website and Chrome extension.",
  alternates: { canonical: "/privacy" },
  openGraph: { ...openGraphSite, url: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
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

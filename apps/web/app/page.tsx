import type { Metadata } from "next";
import { Hero } from "@web/components/Hero";
import { Install } from "@web/components/Install";
import { FeatureGrid } from "@web/components/FeatureGrid";
import { TrustBand } from "@web/components/TrustBand";
import { InstallCta } from "@web/components/InstallCta";
import { JsonLd } from "@web/components/JsonLd";
import { CHROME_WEB_STORE_URL, NPM_PACKAGE_URL } from "@web/lib/links";
import { HOME_DESCRIPTION, openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

export const metadata: Metadata = {
  title: "Guided Review — review AI-generated code before you sign your name to it",
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    ...openGraphSite,
    type: "website",
    url: "/",
  },
};

const homeSchema = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: HOME_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} for Chrome`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Chrome",
    description:
      "Chrome extension that clusters GitHub PR diffs into review units with summaries. Free, open source, bring your own LLM key.",
    url: SITE_URL,
    downloadUrl: CHROME_WEB_STORE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} CLI`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows",
    description:
      "CLI that reviews local git branch, commit, or working-tree diffs in the browser. Free, open source, bring your own LLM key.",
    url: `${SITE_URL}/docs/cli`,
    installUrl: NPM_PACKAGE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeSchema} />
      <Hero />
      <Install />
      <FeatureGrid />
      <TrustBand />
      <InstallCta />
    </>
  );
}

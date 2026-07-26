import type { Metadata } from "next";
import { Hero } from "../components/Hero";
import { Why } from "../components/Why";
import { FeatureGrid } from "../components/FeatureGrid";
import { TrustBand } from "../components/TrustBand";
import { Faqs } from "../components/Faqs";
import { InstallCta } from "../components/InstallCta";
import { JsonLd } from "../components/JsonLd";
import { getGitHubStarCount } from "../lib/github";
import { CHROME_WEB_STORE_URL } from "../lib/links";
import { HOME_DESCRIPTION, openGraphSite, SITE_NAME, SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Guided Review — a better way to review AI generated code",
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
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Chrome",
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    downloadUrl: CHROME_WEB_STORE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
];

export default async function HomePage() {
  const starCount = await getGitHubStarCount();

  return (
    <>
      <JsonLd data={homeSchema} />
      <Hero />
      <Why />
      <FeatureGrid />
      <TrustBand starCount={starCount} />
      <Faqs />
      <InstallCta />
    </>
  );
}

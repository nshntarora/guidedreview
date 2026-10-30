import type { Metadata } from "next";
import { Hero } from "@web/components/Hero";
import { Install } from "@web/components/Install";
import { FeatureGrid } from "@web/components/FeatureGrid";
import { TrustBand } from "@web/components/TrustBand";
import { InstallCta } from "@web/components/InstallCta";
import { AgentHandoff } from "@web/components/AgentHandoff";
import { ReviewWalkthrough } from "@web/components/ReviewWalkthrough";
import { sampleDiff, samplePlan } from "@web/components/preview/sample";
import { JsonLd } from "@web/components/JsonLd";
import { CHROME_WEB_STORE_URL, NPM_PACKAGE_URL } from "@web/lib/links";
import { HOME_DESCRIPTION, openGraphSite, SITE_NAME, SITE_URL } from "@web/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Guided Review | Review AI-generated code before you approve it" },
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
    featureList: [
      "Ordered review units from GitHub PR diffs",
      "Keyboard-first navigation and diff search",
      "Bring your own AI provider key",
      "Human-submitted GitHub reviews",
    ],
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
      "CLI that shows a local branch, commit, or working-tree diff as review units in your browser. You read the code and decide. Free, open source, your provider key.",
    url: `${SITE_URL}/docs/cli`,
    installUrl: NPM_PACKAGE_URL,
    featureList: [
      "Local branch, commit, and working-tree review",
      "Optional AI structuring with your provider",
      "Local line notes and coding-agent prompt export",
      "File-by-file walkthrough without an API key",
    ],
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
      <ReviewWalkthrough
        files={sampleDiff.files.map((file) => file.path).sort()}
        units={samplePlan.units.map((unit) => ({
          title: unit.title,
        }))}
        lines={sampleDiff.files
          .find((file) => file.path === "src/retry/backoff.ts")!
          .hunks.flatMap((hunk) => hunk.lines)
          .filter((line) => line.newLine !== undefined && line.newLine >= 9 && line.newLine <= 11)
          .map((line) => ({ number: line.newLine!, content: line.content }))}
      />
      <Install />
      <FeatureGrid />
      <AgentHandoff />
      <TrustBand />
      <InstallCta />
    </>
  );
}

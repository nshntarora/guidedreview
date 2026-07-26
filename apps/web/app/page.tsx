import type { Metadata } from "next";
import { Hero } from "../components/Hero";
import { Why } from "../components/Why";
import { FeatureGrid } from "../components/FeatureGrid";
import { TrustBand } from "../components/TrustBand";
import { Faqs } from "../components/Faqs";
import { InstallCta } from "../components/InstallCta";
import { getGitHubStarCount } from "../lib/github";

export const metadata: Metadata = {
  title: "Guided Review — AI-structured PR reviews",
  description:
    "Turn a GitHub pull request diff into an ordered, AI-structured review plan. Schema first, then logic, call-sites, and tests.",
};

export default async function HomePage() {
  const starCount = await getGitHubStarCount();

  return (
    <>
      <Hero />
      <Why />
      <FeatureGrid />
      <TrustBand starCount={starCount} />
      <Faqs />
      <InstallCta />
    </>
  );
}

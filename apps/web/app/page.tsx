import type { Metadata } from "next";
import { Hero } from "../components/Hero";
import { Why } from "../components/Why";
import { FeatureGrid } from "../components/FeatureGrid";
import { TrustBand } from "../components/TrustBand";
import { Faqs } from "../components/Faqs";
import { InstallCta } from "../components/InstallCta";
import { getGitHubStarCount } from "../lib/github";

export const metadata: Metadata = {
  title: "Guided Review — a better way to review AI generated code",
  description:
    "A Chrome extension that clusters a GitHub pull request into review units with summaries, so you can actually read the code an agent wrote. Free, open source, bring your own LLM key.",
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

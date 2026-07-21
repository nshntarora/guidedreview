import type { Metadata } from "next";
import { Hero } from "../components/Hero";
import { FeatureGrid } from "../components/FeatureGrid";
import { InstallCta } from "../components/InstallCta";

export const metadata: Metadata = {
  title: "Guided Review — AI-structured PR reviews",
  description:
    "Turn a GitHub pull request diff into an ordered, AI-structured review plan. Schema first, then logic, call-sites, and tests.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <InstallCta />
    </>
  );
}

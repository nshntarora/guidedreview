import type { Metadata } from "next";
import Content from "@/content/help/index.mdx";
import { DocsPageWrapper } from "@/components/docs/DocsPageWrapper";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to install Guided Review, configure your AI provider, and walk through GitHub pull requests with structured review plans.",
  alternates: { canonical: "/docs" },
  openGraph: { type: "website", url: "/docs" },
};

export default function DocsPage() {
  return (
    <DocsPageWrapper slug="">
      <Content />
    </DocsPageWrapper>
  );
}

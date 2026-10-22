import { notFound } from "next/navigation";
import { DOCS_PAGES, findDocsPage } from "@web/config/docs";
import { DocsContentPage, docsPageMetadata } from "@web/components/docs/DocsContentPage";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DOCS_PAGES.filter((page) => page.load).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const page = findDocsPage((await params).slug);
  if (!page?.load) notFound();
  return docsPageMetadata(page);
}

export default async function DocsSlugPage({ params }: Props) {
  const page = findDocsPage((await params).slug);
  if (!page?.load) notFound();
  return <DocsContentPage page={page} />;
}

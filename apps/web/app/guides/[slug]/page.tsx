import { notFound } from "next/navigation";
import { GUIDES } from "@web/config/guides";
import { ArticlePage, articleMetadata } from "@web/components/ArticlePage";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = GUIDES.find((article) => article.slug === slug);
  if (!article) notFound();
  return articleMetadata(article);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const article = GUIDES.find((article) => article.slug === slug);
  if (!article) notFound();
  return <ArticlePage article={article} section="Guides" sectionPath="/guides" />;
}

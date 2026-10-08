import { notFound } from "next/navigation";
import { COMPARISONS } from "@web/config/compare";
import { ArticlePage, articleMetadata } from "@web/components/ArticlePage";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = COMPARISONS.find((article) => article.slug === slug);
  if (!article) notFound();
  return articleMetadata(article);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const article = COMPARISONS.find((article) => article.slug === slug);
  if (!article) notFound();
  return <ArticlePage article={article} section="Comparisons" sectionPath="/compare" />;
}

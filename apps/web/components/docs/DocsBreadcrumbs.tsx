import Link from "next/link";
import { helpNavigation } from "@/config/help-navigation";

type DocsBreadcrumbsProps = {
  slug: string;
  basePath?: "/docs";
};

export function DocsBreadcrumbs({ slug, basePath = "/docs" }: DocsBreadcrumbsProps) {
  let sectionTitle = "";
  let pageTitle = "";

  let currentHeading = "";
  for (const item of helpNavigation) {
    if (item.type === "heading") {
      currentHeading = item.title;
    } else if (item.slug === slug) {
      sectionTitle = currentHeading;
      pageTitle = item.title;
      break;
    }
  }

  if (!slug) {
    pageTitle =
      (
        helpNavigation.find((i) => i.type !== "heading" && i.slug === "") as
          { title: string } | undefined
      )?.title ?? "Introduction";
    sectionTitle = helpNavigation[0]?.type === "heading" ? helpNavigation[0].title : "";
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-opt-muted">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        <li>
          <Link
            href={basePath}
            className="border-b-0 text-opt-muted no-underline hover:border-b-transparent hover:text-opt-text"
          >
            Docs
          </Link>
        </li>
        {sectionTitle ? (
          <>
            <li aria-hidden="true" className="text-opt-muted/60">
              /
            </li>
            <li>
              <span>{sectionTitle}</span>
            </li>
          </>
        ) : null}
        {pageTitle ? (
          <>
            <li aria-hidden="true" className="text-opt-muted/60">
              /
            </li>
            <li>
              <span className="font-medium text-opt-text" aria-current="page">
                {pageTitle}
              </span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

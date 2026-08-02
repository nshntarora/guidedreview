import Link from "next/link";
import { findDocsPage } from "@web/config/docs";

export function DocsBreadcrumbs({ slug }: { slug: string }) {
  const page = findDocsPage(slug);

  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        <li>
          <Link
            href="/docs"
            className="border-b-0 text-muted no-underline hover:border-b-transparent hover:text-foreground"
          >
            Docs
          </Link>
        </li>
        {page ? (
          <>
            <li aria-hidden="true" className="text-muted/60">
              /
            </li>
            <li>
              <span>{page.section}</span>
            </li>
            <li aria-hidden="true" className="text-muted/60">
              /
            </li>
            <li>
              <span className="font-medium text-foreground" aria-current="page">
                {page.title}
              </span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

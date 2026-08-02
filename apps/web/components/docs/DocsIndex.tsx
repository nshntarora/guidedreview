import Link from "next/link";
import { DOCS_PAGES, docsPath } from "@web/config/docs";

/**
 * The docs table of contents, rendered from `config/docs.ts` so the index page
 * cannot drift from the sidebar. Used by `content/help/index.mdx`.
 */
export function DocsIndex() {
  const sections = [...new Set(DOCS_PAGES.map((p) => p.section))];

  return (
    <>
      {sections.map((section) => {
        const pages = DOCS_PAGES.filter((p) => p.section === section && p.slug);
        if (pages.length === 0) return null;

        return (
          <div key={section}>
            <p>
              <strong>{section}</strong>
            </p>
            <ul>
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link href={docsPath(page.slug)}>
                    <strong>{page.title}</strong>
                  </Link>
                  {" — "}
                  {page.blurb ?? page.description}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

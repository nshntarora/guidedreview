import type { ReactNode } from "react";
import { DocsBreadcrumbs } from "@/components/docs/DocsBreadcrumbs";
import { DocsPager } from "@/components/docs/DocsPager";
import { TableOfContents, type TocEntry } from "@/components/docs/TableOfContents";

type DocsPageWrapperProps = {
  children: ReactNode;
  toc?: TocEntry[];
  slug: string;
  basePath?: "/docs";
  showBreadcrumbs?: boolean;
};

export function DocsPageWrapper({
  children,
  toc = [],
  slug,
  basePath = "/docs",
  showBreadcrumbs = true,
}: DocsPageWrapperProps) {
  return (
    <div className="flex w-full gap-10">
      <div className="min-w-0 max-w-3xl flex-1">
        {showBreadcrumbs ? <DocsBreadcrumbs slug={slug} basePath={basePath} /> : null}
        {children}
        <DocsPager slug={slug} basePath={basePath} />
      </div>

      {toc.length > 0 ? (
        <aside className="ml-auto hidden w-44 shrink-0 xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto pt-2">
            <TableOfContents toc={toc} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}

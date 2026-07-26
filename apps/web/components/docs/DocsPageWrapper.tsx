import type { ReactNode } from "react";
import { DocsBreadcrumbs } from "@/components/docs/DocsBreadcrumbs";
import { DocsPager } from "@/components/docs/DocsPager";

type DocsPageWrapperProps = {
  children: ReactNode;
  slug: string;
  basePath?: "/docs";
  showBreadcrumbs?: boolean;
};

export function DocsPageWrapper({
  children,
  slug,
  basePath = "/docs",
  showBreadcrumbs = true,
}: DocsPageWrapperProps) {
  return (
    <div className="min-w-0 max-w-3xl flex-1">
      {showBreadcrumbs ? <DocsBreadcrumbs slug={slug} basePath={basePath} /> : null}
      {children}
      <DocsPager slug={slug} basePath={basePath} />
    </div>
  );
}

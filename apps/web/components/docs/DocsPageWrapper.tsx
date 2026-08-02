import type { ReactNode } from "react";
import { DocsBreadcrumbs } from "@web/components/docs/DocsBreadcrumbs";
import { DocsPager } from "@web/components/docs/DocsPager";

export function DocsPageWrapper({ children, slug }: { children: ReactNode; slug: string }) {
  return (
    <div className="min-w-0 max-w-3xl flex-1">
      <DocsBreadcrumbs slug={slug} />
      {children}
      <DocsPager slug={slug} />
    </div>
  );
}

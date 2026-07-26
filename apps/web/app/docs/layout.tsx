"use client";

import { DocsMobileNav } from "@/components/docs/DocsMobileNav";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <DocsMobileNav />

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        <div className="flex gap-8">
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto py-8 pr-4">
              <DocsSidebar />
            </div>
          </aside>

          <div className="docs-content min-w-0 flex-1 py-8 lg:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

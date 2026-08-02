"use client";

import { useEffect, useId, useState } from "react";
import { buttonClassName, cn } from "@guided-review/ui";
import { DocsSidebar } from "@web/components/docs/DocsSidebar";

export function DocsMobileNav() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="sticky top-[3.6rem] z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
      <button
        type="button"
        className={cn(buttonClassName({ variant: "ghost", size: "sm" }), "gap-2")}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="docs-mobile-drawer"
      >
        Menu
      </button>
      <span className="text-sm text-muted">Documentation</span>

      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 border-0 bg-foreground/30"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id="docs-mobile-drawer"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p id={titleId} className="m-0 text-sm font-semibold text-foreground">
                Docs
              </p>
              <button
                type="button"
                className={buttonClassName({ variant: "ghost", size: "sm" })}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DocsSidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

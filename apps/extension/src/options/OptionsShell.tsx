import type { ReactNode } from "react";
import { cn } from "@guided-review/ui";
import type { OptionsRoute } from "./routes";

const DOCS_URL = "https://guidedreview.dev/docs";

const NAV_ITEM_CLASS =
  "rounded-md border-b-0 px-3 py-1.5 text-base font-medium no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent";

const NAV: { route: OptionsRoute; href: string; label: string }[] = [
  { route: "settings", href: "#settings", label: "Settings" },
  { route: "about", href: "#about", label: "About" },
];

export interface OptionsShellProps {
  route: OptionsRoute;
  children: ReactNode;
}

/**
 * Shared chrome for the options page: sticky brand header + Settings/About/Docs nav.
 * Matches marketing/overlay page chrome without importing those apps.
 */
export function OptionsShell({ route, children }: OptionsShellProps) {
  const logoUrl = chrome.runtime.getURL("logo.svg");

  return (
    <div className="relative min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-opt-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-opt-accent-on"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-gr-border bg-gr-chrome/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
          <img
            src={logoUrl}
            alt="Guided Review"
            width={350}
            height={49}
            className="block h-6 w-auto shrink-0 sm:h-7"
          />

          <nav className="flex shrink-0 items-center gap-1" aria-label="Options">
            {NAV.map((item) => {
              const active = route === item.route;
              return (
                <a
                  key={item.route}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    NAV_ITEM_CLASS,
                    active
                      ? "bg-opt-subtle text-opt-text"
                      : "text-opt-muted hover:bg-opt-subtle/60 hover:text-opt-text",
                  )}
                >
                  {item.label}
                </a>
              );
            })}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                NAV_ITEM_CLASS,
                "text-opt-muted hover:bg-opt-subtle/60 hover:text-opt-text",
              )}
            >
              Docs
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6">{children}</div>
    </div>
  );
}

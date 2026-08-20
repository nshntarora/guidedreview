import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@guided-review/ui";
import { About } from "./About";
import { Options } from "./Options";

const DOCS_URL = "https://guidedreview.dev/docs";

/**
 * The options page's two views, switched via URL hash (`#settings` / `#about`)
 * so each is linkable without a second HTML entry. This array is the only
 * place a route is declared — nav, title, and the union type all derive from it.
 */
const ROUTES = [
  { id: "settings", label: "Settings", title: "Guided Review — Settings" },
  { id: "about", label: "About", title: "Guided Review — About" },
] as const;

export type OptionsRoute = (typeof ROUTES)[number]["id"];

function parseHash(hash: string): OptionsRoute {
  const path = hash.replace(/^#\/?/, "").toLowerCase();
  return path === "about" ? "about" : "settings";
}

function useHashRoute(): OptionsRoute {
  const [route, setRoute] = useState<OptionsRoute>(() =>
    typeof window !== "undefined" ? parseHash(window.location.hash) : "settings",
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

const NAV_LINK_CLASS = "text-foreground hover:text-primary";

/**
 * Sticky brand header + Settings/About/Docs nav. Matches marketing/overlay page
 * chrome without importing those apps.
 */
export function OptionsShell({ route, children }: { route: OptionsRoute; children: ReactNode }) {
  const logoUrl = chrome.runtime.getURL("logo.svg");

  return (
    <div className="relative min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
          <img
            src={logoUrl}
            alt="Guided Review"
            width={350}
            height={49}
            className="block h-6 w-auto shrink-0 sm:h-7"
          />

          <nav
            className="flex shrink-0 items-center gap-2 text-base sm:gap-3 md:gap-5"
            aria-label="Options"
          >
            {ROUTES.map((item) => {
              const active = route === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(NAV_LINK_CLASS, active && "text-primary")}
                >
                  {item.label}
                </a>
              );
            })}
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={NAV_LINK_CLASS}>
              Docs
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6">{children}</div>
    </div>
  );
}

export function App() {
  const route = useHashRoute();

  useEffect(() => {
    document.title = ROUTES.find((r) => r.id === route)!.title;
  }, [route]);

  return <OptionsShell route={route}>{route === "about" ? <About /> : <Options />}</OptionsShell>;
}

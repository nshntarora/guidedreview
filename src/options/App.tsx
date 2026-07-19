import { useEffect, useState } from "react";
import { About } from "./About";
import { Options } from "./Options";

export type OptionsRoute = "settings" | "about";

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

const TITLES: Record<OptionsRoute, string> = {
  settings: "Guided Review — Settings",
  about: "Guided Review — About",
};

/**
 * Options entry shell: Settings (default) and About, switched via URL hash
 * (`#settings` / `#about`) so each view is linkable without a second HTML entry.
 */
export function App() {
  const route = useHashRoute();

  useEffect(() => {
    document.title = TITLES[route];
  }, [route]);

  return route === "about" ? <About /> : <Options />;
}

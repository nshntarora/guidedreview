export type AppRoute = "review" | "settings" | "about";

export function parseAppHash(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, "").toLowerCase();
  if (path === "settings" || path === "about") return path;
  return "review";
}

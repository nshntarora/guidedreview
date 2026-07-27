import type { AnalyticsConfig } from "./types";

const DEFAULT_PROXY_PATH = "/i";

function trim(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProxyPath(path: string): string {
  if (!path) return DEFAULT_PROXY_PATH;
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.replace(/\/+$/, "") || DEFAULT_PROXY_PATH;
}

/**
 * Build-time analytics config. Fail closed: only enables when the master
 * switch is exactly "true" and a project key is present.
 *
 * NEXT_PUBLIC_* must be referenced as static property access so Next can
 * inline them into the client bundle at build time.
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  const enabled = trim(process.env.NEXT_PUBLIC_ANALYTICS_ENABLED) === "true";
  if (!enabled) {
    return { enabled: false };
  }

  const apiKey = trim(process.env.NEXT_PUBLIC_ANALYTICS_KEY);
  if (!apiKey) {
    return { enabled: false };
  }

  const apiHost = normalizeProxyPath(
    trim(process.env.NEXT_PUBLIC_ANALYTICS_PROXY_PATH) || DEFAULT_PROXY_PATH,
  );

  return {
    enabled: true,
    apiKey,
    apiHost,
  };
}

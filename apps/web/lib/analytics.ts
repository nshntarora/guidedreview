/**
 * Marketing-site analytics (PostHog). One module: config, events, client.
 * Fail closed — disabled unless env is explicitly set.
 */

const DEFAULT_PROXY_PATH = "/i";
const UI_HOST = "https://us.posthog.com";

// ---- Events -----------------------------------------------------------------

/**
 * Named marketing-site events. Prefer these constants over string literals
 * so providers stay consistent and refactors stay greppable.
 */
export const AnalyticsEvents = {
  INSTALL_EXTENSION_CLICK: "install_extension_click",
  GITHUB_STAR_CLICK: "github_star_click",
} as const;

/**
 * Known CTA placement ids. Free-form strings are also allowed so new surfaces
 * do not require a type change.
 */
export type CtaLocation = "header" | "hero" | "install_cta" | "keyboard" | (string & {});

/**
 * Base properties every CTA click should include. Callers may attach any extra
 * fields (size, compact, section, experiment, …) as a custom object.
 */
export type CtaEventProperties = {
  location: CtaLocation;
} & Record<string, unknown>;

// ---- Config -----------------------------------------------------------------

export type AnalyticsConfig =
  | { enabled: false }
  | {
      enabled: true;
      /** Project API key */
      apiKey: string;
      /** First-party proxy path used as the SDK api_host (e.g. /i) */
      apiHost: string;
    };

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

// ---- Client -----------------------------------------------------------------

export interface AnalyticsClient {
  init(): void;
  capturePageview(url: string): void;
  capture(event: string, properties?: Record<string, unknown>): void;
}

const NOOP_CLIENT: AnalyticsClient = {
  init() {},
  capturePageview() {},
  capture() {},
};

type PostHogJs = typeof import("posthog-js").default;

/**
 * PostHog client for marketing web analytics.
 * Loads posthog-js dynamically so disabled analytics does not pay the cost.
 * Queues capture calls until init finishes.
 */
function createPostHogClient(apiKey: string, apiHost: string): AnalyticsClient {
  let posthog: PostHogJs | null = null;
  let initStarted = false;
  const pending: Array<(ph: PostHogJs) => void> = [];

  function withClient(fn: (ph: PostHogJs) => void) {
    if (posthog) {
      fn(posthog);
      return;
    }
    pending.push(fn);
  }

  function flushPending(ph: PostHogJs) {
    while (pending.length > 0) {
      const fn = pending.shift();
      fn?.(ph);
    }
  }

  return {
    init() {
      if (typeof window === "undefined" || initStarted) return;
      initStarted = true;

      void import("posthog-js").then((mod) => {
        const ph = mod.default;
        if (!ph.__loaded) {
          ph.init(apiKey, {
            api_host: apiHost,
            ui_host: UI_HOST,
            // Manual pageviews so App Router client navigations are tracked.
            capture_pageview: false,
            capture_pageleave: true,
            // Anonymous visitors: no person profiles unless we identify later.
            person_profiles: "identified_only",
            autocapture: false,
            // Web analytics only — no session recording.
            disable_session_recording: true,
          });
        }
        posthog = ph;
        flushPending(ph);
      });
    },

    capturePageview(url: string) {
      withClient((ph) => {
        ph.capture("$pageview", { $current_url: url });
      });
    },

    capture(event: string, properties?: Record<string, unknown>) {
      withClient((ph) => {
        ph.capture(event, properties);
      });
    },
  };
}

export function createAnalyticsClient(
  config: AnalyticsConfig = getAnalyticsConfig(),
): AnalyticsClient {
  if (!config.enabled) {
    return NOOP_CLIENT;
  }
  return createPostHogClient(config.apiKey, config.apiHost);
}

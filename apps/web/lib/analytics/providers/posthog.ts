import type { AnalyticsClient } from "../types";

/** PostHog app host for toolbar / dashboard links (not used for ingest). */
const UI_HOST = "https://us.posthog.com";

type PostHogConfig = {
  apiKey: string;
  apiHost: string;
};

type PostHogJs = typeof import("posthog-js").default;

/**
 * PostHog client for marketing web analytics.
 * Loads posthog-js dynamically so disabled analytics does not pay the cost
 * until this factory runs. Queues capture calls until init finishes.
 */
export function createPostHogClient(config: PostHogConfig): AnalyticsClient {
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
          ph.init(config.apiKey, {
            api_host: config.apiHost,
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

    capturePageleave() {
      withClient((ph) => {
        ph.capture("$pageleave");
      });
    },

    capture(event: string, properties?: Record<string, unknown>) {
      withClient((ph) => {
        ph.capture(event, properties);
      });
    },

    shutdown() {
      pending.length = 0;
      posthog?.reset();
      posthog = null;
    },
  };
}

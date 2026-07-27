import { getAnalyticsConfig } from "./config";
import { createNoopClient } from "./noop";
import { createPostHogClient } from "./providers/posthog";
import type { AnalyticsClient, AnalyticsConfig } from "./types";

export function createAnalyticsClient(
  config: AnalyticsConfig = getAnalyticsConfig(),
): AnalyticsClient {
  if (!config.enabled) {
    return createNoopClient();
  }

  return createPostHogClient({
    apiKey: config.apiKey,
    apiHost: config.apiHost,
  });
}

import type { AnalyticsClient } from "./types";

export function createNoopClient(): AnalyticsClient {
  return {
    init() {},
    capturePageview() {},
    capture() {},
  };
}

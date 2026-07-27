/**
 * Analytics surface for the marketing site.
 */

export type AnalyticsConfig =
  | { enabled: false }
  | {
      enabled: true;
      /** Project API key */
      apiKey: string;
      /** First-party proxy path used as the SDK api_host (e.g. /i) */
      apiHost: string;
    };

export interface AnalyticsClient {
  init(): void;
  capturePageview(url: string): void;
  capturePageleave(): void;
  capture(event: string, properties?: Record<string, unknown>): void;
  shutdown?(): void;
}

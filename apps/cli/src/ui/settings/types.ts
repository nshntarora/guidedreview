import type { ProviderId } from "@guided-review/core";

/** GET /api/settings — never includes the secret. */
export interface PublicSettings {
  provider: ProviderId;
  model: string;
  hasKey: boolean;
  last4: string | null;
  codingAgent: string | null;
  configPath: string;
}

export interface PublicAgent {
  id: string;
  displayName: string;
  provider: ProviderId;
  installed: boolean;
  usable: boolean;
  reason: string | null;
}

export type SettingsRoute = "settings" | "about";

export type ActionStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

export function apiUrl(path: string, token: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("token", token);
  return url.toString();
}

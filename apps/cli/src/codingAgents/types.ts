import type { ProviderId } from "@guided-review/core";

export const CODING_AGENT_IDS = ["claude-code", "codex", "grok"] as const;

export type CodingAgentId = (typeof CODING_AGENT_IDS)[number];

export function isCodingAgentId(value: string | undefined): value is CodingAgentId {
  return CODING_AGENT_IDS.includes(value as CodingAgentId);
}

/** Coding agent whose store we read for a given provider. */
export function agentIdForProvider(provider: ProviderId): CodingAgentId {
  switch (provider) {
    case "anthropic":
      return "claude-code";
    case "openai":
      return "codex";
    case "grok":
      return "grok";
  }
}

export interface AgentAuth {
  provider: ProviderId;
  model?: string;
  secret: string;
  kind: "api_key" | "oauth";
  /** Adapter decides whether this credential can be sent to our provider client. */
  usableForReview: boolean;
  reason?: string;
  extraHeaders?: Record<string, string>;
  authScheme?: "api-key" | "bearer";
}

export interface DetectedAgent {
  id: CodingAgentId;
  displayName: string;
  provider: ProviderId;
  auth: AgentAuth;
}

export interface CodingAgentAdapter {
  id: CodingAgentId;
  displayName: string;
  provider: ProviderId;
  detect(io: AgentIo): Promise<DetectedAgent | null>;
  resolveAuth(io: AgentIo): Promise<AgentAuth>;
}

export interface AgentIo {
  homedir(): string;
  env(name: string): string | undefined;
  platform(): NodeJS.Platform;
  which(command: string): Promise<string | null>;
  readFile(path: string): Promise<string | null>;
  fileExists(path: string): Promise<boolean>;
  readKeychainPassword(service: string): Promise<string | null>;
}

export function unusableAuth(
  provider: ProviderId,
  reason: string,
  extras?: Partial<Omit<AgentAuth, "provider" | "usableForReview" | "reason">>,
): AgentAuth {
  return {
    secret: "",
    kind: extras?.kind ?? "api_key",
    ...extras,
    provider,
    usableForReview: false,
    reason,
  };
}

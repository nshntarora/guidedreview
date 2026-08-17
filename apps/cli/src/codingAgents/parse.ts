import type { AgentAuth, AgentIo, CodingAgentAdapter, DetectedAgent } from "./types";

export function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function detectIfInstalled(
  adapter: Pick<CodingAgentAdapter, "id" | "displayName" | "provider"> & {
    resolveAuth(io: AgentIo): Promise<AgentAuth>;
  },
  io: AgentIo,
  isInstalled: (io: AgentIo) => Promise<boolean>,
): Promise<DetectedAgent | null> {
  if (!(await isInstalled(io))) return null;
  return {
    id: adapter.id,
    displayName: adapter.displayName,
    provider: adapter.provider,
    auth: await adapter.resolveAuth(io),
  };
}

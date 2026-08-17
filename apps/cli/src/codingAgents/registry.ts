import type { ProviderSettings } from "@guided-review/core";
import { normalizeProviderSettings } from "@guided-review/core";
import { claudeCodeAdapter } from "./claudeCode";
import { codexAdapter } from "./codex";
import { grokAdapter } from "./grok";
import { promptForAgent } from "./prompt";
import type { AgentIo, CodingAgentAdapter, CodingAgentId, DetectedAgent } from "./types";
import { isCodingAgentId } from "./types";

export const CODING_AGENTS: readonly CodingAgentAdapter[] = [
  claudeCodeAdapter,
  codexAdapter,
  grokAdapter,
];

export function adapterFor(id: CodingAgentId): CodingAgentAdapter {
  const found = CODING_AGENTS.find((agent) => agent.id === id);
  if (!found) throw new Error(`Unknown coding agent ${id}.`);
  return found;
}

export async function detectAll(io: AgentIo): Promise<DetectedAgent[]> {
  const found: DetectedAgent[] = [];
  for (const agent of CODING_AGENTS) {
    const detected = await agent.detect(io);
    if (detected) found.push(detected);
  }
  return found;
}

export function parseCodingAgentFlag(value: string | undefined): CodingAgentId | undefined {
  if (value === undefined) return undefined;
  if (isCodingAgentId(value)) return value;
  throw new Error(`Unknown --agent ${value}. Use claude-code, codex, or grok.`);
}

export function settingsFromAuth(
  auth: DetectedAgent["auth"],
  modelOverride?: string,
): ProviderSettings {
  const requested = modelOverride ?? auth.model;
  const normalized = normalizeProviderSettings({
    provider: auth.provider,
    model: requested,
    apiKey: auth.secret,
  });
  return {
    ...normalized,
    // Keep the agent's configured model even if it is not in our catalog yet.
    model: modelOverride || !auth.model ? normalized.model : auth.model,
    ...(auth.authScheme ? { authScheme: auth.authScheme } : {}),
    ...(auth.extraHeaders ? { extraHeaders: auth.extraHeaders } : {}),
  };
}

export function formatUnusable(detected: DetectedAgent[]): string {
  const names = detected.map((agent) => agent.displayName);
  const list =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  const reasons = detected
    .filter((agent) => agent.auth.reason)
    .map((agent) => `${agent.displayName}: ${agent.auth.reason}`)
    .join("\n");
  const header = `Found ${list}, but none have a key Guided Review can use yet.`;
  return reasons ? `${header}\n${reasons}` : header;
}

export async function pickAgent(options: {
  detected: DetectedAgent[];
  preferred?: CodingAgentId;
  requested?: CodingAgentId;
  isTTY?: boolean;
  prompt?: (agents: DetectedAgent[]) => Promise<CodingAgentId | null>;
  log?: (message: string) => void;
}): Promise<DetectedAgent | null> {
  const log = options.log ?? ((message) => process.stderr.write(`${message}\n`));
  const usable = options.detected.filter((agent) => agent.auth.usableForReview);

  if (options.requested) {
    const found = options.detected.find((agent) => agent.id === options.requested);
    if (!found) {
      const name = adapterFor(options.requested).displayName;
      throw new Error(`${name} is not installed.`);
    }
    if (!found.auth.usableForReview) {
      throw new Error(found.auth.reason ?? `${found.displayName} has no usable key.`);
    }
    return found;
  }

  if (usable.length === 0) {
    if (options.detected.length > 0) log(formatUnusable(options.detected));
    return null;
  }

  if (usable.length === 1) return usable[0]!;

  const isTTY = options.isTTY ?? Boolean(process.stdin.isTTY);
  if (!isTTY) {
    log("Multiple coding agents found. Pass --agent claude-code, --agent codex, or --agent grok.");
    return null;
  }

  const preferred =
    options.preferred && usable.some((agent) => agent.id === options.preferred)
      ? options.preferred
      : undefined;

  const prompt = options.prompt ?? ((agents) => promptForAgent(agents, { preferred }));
  const chosen = await prompt(usable);
  return usable.find((agent) => agent.id === chosen) ?? null;
}

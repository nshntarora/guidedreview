import { homedir } from "node:os";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  defaultModelFor,
  normalizeProviderSettings,
  type ProviderId,
  type ProviderSettings,
} from "@guided-review/core";
import {
  createDefaultAgentIo,
  detectAll,
  parseCodingAgentFlag,
  pickAgent,
  settingsFromAuth,
  type AgentIo,
  type CodingAgentId,
  type DetectedAgent,
} from "./codingAgents";

export interface CliConfigFile {
  provider?: ProviderId;
  model?: string;
  apiKey?: string;
  codingAgent?: CodingAgentId;
}

export interface ResolvedCliSettings {
  settings: ProviderSettings;
  codingAgent: CodingAgentId | null;
}

export function configDir(): string {
  if (process.env.GUIDED_REVIEW_CONFIG_DIR) return process.env.GUIDED_REVIEW_CONFIG_DIR;
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return path.join(xdg, "guided-review");
  return path.join(homedir(), ".config", "guided-review");
}

export function configPath(): string {
  return path.join(configDir(), "config.json");
}

function envKeyFor(provider: ProviderId): string | undefined {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "grok":
      return process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  }
}

export async function readConfigFile(): Promise<CliConfigFile> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return JSON.parse(raw) as CliConfigFile;
  } catch {
    return {};
  }
}

export async function writeConfigFile(next: CliConfigFile): Promise<void> {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  await writeFile(configPath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
}

export async function patchConfigFile(partial: Partial<CliConfigFile>): Promise<void> {
  const current = await readConfigFile();
  await writeConfigFile({ ...current, ...partial });
}

export async function resolveSettings(flags: {
  provider?: string;
  model?: string;
  agent?: string;
  io?: AgentIo;
  pickAgent?: (agents: DetectedAgent[]) => Promise<CodingAgentId | null>;
  persist?: boolean;
  isTTY?: boolean;
  log?: (message: string) => void;
}): Promise<ResolvedCliSettings> {
  const file = await readConfigFile();
  const envProvider = process.env.GUIDED_REVIEW_PROVIDER;
  const provider = flags.provider ?? envProvider ?? file.provider ?? "anthropic";
  const model = flags.model ?? process.env.GUIDED_REVIEW_MODEL ?? file.model;
  const normalized = normalizeProviderSettings({
    provider,
    model,
    apiKey: file.apiKey ?? "",
  });
  const envKey = envKeyFor(normalized.provider);
  const settings: ProviderSettings = {
    ...normalized,
    apiKey:
      flags.provider || flags.model ? (envKey ?? normalized.apiKey) : (envKey ?? file.apiKey ?? ""),
    model: flags.model ?? normalized.model ?? defaultModelFor(normalized.provider),
  };

  if (settings.apiKey) {
    return { settings, codingAgent: null };
  }

  const requested = parseCodingAgentFlag(flags.agent);
  const io = flags.io ?? createDefaultAgentIo();
  const persist = flags.persist ?? true;
  const log = flags.log ?? ((message) => process.stderr.write(`${message}\n`));

  let detected = await detectAll(io);
  if ((flags.provider || envProvider) && !requested) {
    detected = detected.filter((agent) => agent.provider === settings.provider);
  }

  const chosen = await pickAgent({
    detected,
    preferred: file.codingAgent,
    requested,
    isTTY: flags.isTTY,
    prompt: flags.pickAgent,
    log,
  });

  if (!chosen) {
    return { settings, codingAgent: null };
  }

  const fromAgent = settingsFromAuth(chosen.auth, flags.model ?? process.env.GUIDED_REVIEW_MODEL);
  if (persist) {
    await patchConfigFile({
      provider: fromAgent.provider,
      model: fromAgent.model,
      codingAgent: chosen.id,
    });
  }
  log(`Using ${chosen.displayName} for summaries.`);
  return { settings: fromAgent, codingAgent: chosen.id };
}

export function publicSettings(
  settings: ProviderSettings,
  codingAgent?: CodingAgentId | null,
): {
  provider: ProviderId;
  model: string;
  hasKey: boolean;
  last4: string | null;
  codingAgent: CodingAgentId | null;
} {
  const key = settings.apiKey;
  return {
    provider: settings.provider,
    model: settings.model,
    hasKey: Boolean(key),
    last4: key ? key.slice(-4) : null,
    codingAgent: codingAgent ?? null,
  };
}

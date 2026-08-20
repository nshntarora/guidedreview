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
  CODING_AGENTS,
  createDefaultAgentIo,
  detectAll,
  parseCodingAgentFlag,
  pickAgent,
  settingsFromAuth,
  type AgentIo,
  type CodingAgentId,
  type DetectedAgent,
} from "./codingAgents";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface CliConfigFile {
  provider?: ProviderId;
  model?: string;
  apiKey?: string;
  codingAgent?: CodingAgentId;
}

export type ConfigPatch = Omit<Partial<CliConfigFile>, "codingAgent" | "apiKey"> & {
  codingAgent?: CodingAgentId | null;
  apiKey?: string | null;
};

export interface PublicCliSettings {
  provider: ProviderId;
  model: string;
  hasKey: boolean;
  last4: string | null;
  codingAgent: CodingAgentId | null;
  configPath: string;
}

export interface PublicCodingAgent {
  id: CodingAgentId;
  displayName: string;
  provider: ProviderId;
  installed: boolean;
  usable: boolean;
  reason: string | null;
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
  let raw: string;
  try {
    raw = await readFile(configPath(), "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return {};
    throw error;
  }
  try {
    return JSON.parse(raw) as CliConfigFile;
  } catch {
    throw new ConfigError(
      `Could not parse ${configPath()}. Fix or delete that file and try again.`,
    );
  }
}

export async function writeConfigFile(next: CliConfigFile): Promise<void> {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  await writeFile(configPath(), `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
}

export async function patchConfigFile(partial: ConfigPatch): Promise<void> {
  const current = await readConfigFile();
  const { codingAgent, apiKey, ...rest } = partial;
  const next: CliConfigFile = { ...current, ...rest };
  if (codingAgent === null) delete next.codingAgent;
  else if (codingAgent !== undefined) next.codingAgent = codingAgent;
  if (apiKey === null) delete next.apiKey;
  else if (apiKey !== undefined) next.apiKey = apiKey;
  await writeConfigFile(next);
}

/**
 * Apply a settings-panel PATCH. A blank/missing apiKey keeps the in-memory
 * secret and agent auth fields; only a pasted key is persisted.
 */
export function applyProviderSettings(
  current: ProviderSettings,
  codingAgent: CodingAgentId | null,
  body: Partial<Pick<ProviderSettings, "provider" | "model" | "apiKey">>,
): {
  settings: ProviderSettings;
  codingAgent: CodingAgentId | null;
  persist: ConfigPatch;
} {
  const hasNewKey = typeof body.apiKey === "string" && body.apiKey.length > 0;
  const requestedModel = body.model ?? current.model;
  const normalized = normalizeProviderSettings({
    provider: body.provider ?? current.provider,
    model: requestedModel,
    apiKey: hasNewKey ? body.apiKey : current.apiKey,
    authScheme: hasNewKey ? undefined : current.authScheme,
    extraHeaders: hasNewKey ? undefined : current.extraHeaders,
  });
  const settings: ProviderSettings = {
    ...normalized,
    // Keep a coding-agent model that is not in the catalog yet.
    model: requestedModel || normalized.model,
  };
  return {
    settings,
    codingAgent: hasNewKey ? null : codingAgent,
    persist: {
      provider: settings.provider,
      model: settings.model,
      ...(hasNewKey ? { apiKey: settings.apiKey, codingAgent: null } : {}),
    },
  };
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
    apiKey: envKey ?? file.apiKey ?? "",
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
  return { settings: fromAgent, codingAgent: chosen.id };
}

export function publicSettings(
  settings: ProviderSettings,
  codingAgent?: CodingAgentId | null,
): PublicCliSettings {
  const key = settings.apiKey;
  return {
    provider: settings.provider,
    model: settings.model,
    hasKey: Boolean(key),
    last4: key ? key.slice(-4) : null,
    codingAgent: codingAgent ?? null,
    configPath: configPath(),
  };
}

export function publicAgents(detected: DetectedAgent[]): PublicCodingAgent[] {
  return CODING_AGENTS.map((adapter) => {
    const found = detected.find((agent) => agent.id === adapter.id);
    if (!found) {
      return {
        id: adapter.id,
        displayName: adapter.displayName,
        provider: adapter.provider,
        installed: false,
        usable: false,
        reason: `${adapter.displayName} is not installed.`,
      };
    }
    return {
      id: found.id,
      displayName: found.displayName,
      provider: found.provider,
      installed: true,
      usable: found.auth.usableForReview,
      reason: found.auth.usableForReview
        ? null
        : (found.auth.reason ?? `${found.displayName} has no usable key.`),
    };
  });
}

/**
 * Switch the in-memory provider to a detected coding agent. Persists the
 * preference and provider/model — never the agent's secret.
 */
export function applyDetectedAgent(
  agent: DetectedAgent,
  modelOverride?: string,
): {
  settings: ProviderSettings;
  codingAgent: CodingAgentId;
  persist: ConfigPatch;
} {
  if (!agent.auth.usableForReview) {
    throw new ConfigError(agent.auth.reason ?? `${agent.displayName} has no usable key.`);
  }
  const settings = settingsFromAuth(agent.auth, modelOverride);
  return {
    settings,
    codingAgent: agent.id,
    persist: {
      provider: settings.provider,
      model: settings.model,
      codingAgent: agent.id,
      apiKey: null,
    },
  };
}

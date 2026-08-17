import { homedir } from "node:os";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  defaultModelFor,
  normalizeProviderSettings,
  type ProviderId,
  type ProviderSettings,
} from "@guided-review/core";

export interface CliConfigFile {
  provider?: ProviderId;
  model?: string;
  apiKey?: string;
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

export async function resolveSettings(flags: {
  provider?: string;
  model?: string;
}): Promise<ProviderSettings> {
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
  return {
    ...normalized,
    apiKey:
      flags.provider || flags.model ? (envKey ?? normalized.apiKey) : (envKey ?? file.apiKey ?? ""),
    model: flags.model ?? normalized.model ?? defaultModelFor(normalized.provider),
  };
}

export function publicSettings(settings: ProviderSettings): {
  provider: ProviderId;
  model: string;
  hasKey: boolean;
  last4: string | null;
} {
  const key = settings.apiKey;
  return {
    provider: settings.provider,
    model: settings.model,
    hasKey: Boolean(key),
    last4: key ? key.slice(-4) : null,
  };
}

/**
 * Canonical registry of AI providers and models for Guided Review.
 *
 * UI labels, icons, key placeholders, and model lists all come from here.
 * Adding a model is a single MODELS row. Adding a provider also requires a
 * client in this package (`providers/`).
 */

export type ProviderId = "anthropic" | "openai" | "grok";

interface ProviderDefinition {
  id: ProviderId;
  /** Human-readable label shown in the provider dropdown. */
  displayName: string;
  /** Example key format for the API key input. */
  keyPlaceholder: string;
  /**
   * Path under the extension root (public/) for the provider icon.
   * Resolve with chrome.runtime.getURL(iconSrc) in extension pages.
   */
  iconSrc: string;
  /** Default model id when this provider is selected. */
  defaultModelId: string;
  /** Example value shown as the Base URL field's placeholder. */
  baseUrlPlaceholder: string;
}

interface ModelDefinition {
  /** Exact string passed to the provider API. */
  id: string;
  /** Human-readable label shown in the model dropdown. */
  displayName: string;
  provider: ProviderId;
}

/** Providers keyed by id. Key order is display order. */
export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  anthropic: {
    id: "anthropic",
    displayName: "Claude (Anthropic)",
    keyPlaceholder: "sk-ant-…",
    iconSrc: "providers/claude.svg",
    defaultModelId: "claude-haiku-5-5",
    baseUrlPlaceholder: "https://api.anthropic.com",
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    keyPlaceholder: "sk-…",
    iconSrc: "providers/openai.svg",
    defaultModelId: "gpt-6-luna",
    baseUrlPlaceholder: "https://api.openai.com/v1",
  },
  grok: {
    id: "grok",
    displayName: "Grok (xAI)",
    keyPlaceholder: "xai-…",
    iconSrc: "providers/grok.svg",
    defaultModelId: "grok-4.7",
    baseUrlPlaceholder: "https://api.x.ai/v1",
  },
};

/** Providers in display order, for dropdowns. */
export const PROVIDER_LIST: readonly ProviderDefinition[] = Object.values(PROVIDERS);

/**
 * Text-generation models available for PR review annotation.
 * Keep in sync with known provider API model ids as they ship or retire.
 */
export const MODELS: readonly ModelDefinition[] = [
  // --- Anthropic ---
  { id: "claude-opus-5-5", displayName: "Claude Opus 5.5", provider: "anthropic" },
  { id: "claude-fable-5-1", displayName: "Claude Fable 5.1", provider: "anthropic" },
  { id: "claude-sonnet-5-5", displayName: "Claude Sonnet 5.5", provider: "anthropic" },
  { id: "claude-haiku-5-5", displayName: "Claude Haiku 5.5", provider: "anthropic" },

  // --- OpenAI ---
  { id: "gpt-6-astra", displayName: "GPT-6 Astra", provider: "openai" },
  { id: "gpt-6.1-sol", displayName: "GPT-6.1 Sol", provider: "openai" },
  { id: "gpt-6-luna", displayName: "GPT-6 Luna", provider: "openai" },

  // --- Grok (xAI) ---
  { id: "grok-4.7", displayName: "Grok 4.7", provider: "grok" },
  { id: "grok-4.3", displayName: "Grok 4.3", provider: "grok" },
] as const;

export function getProvider(id: ProviderId): ProviderDefinition {
  return PROVIDERS[id];
}

export function modelsForProvider(id: ProviderId): ModelDefinition[] {
  return MODELS.filter((m) => m.provider === id);
}

export function defaultModelFor(id: ProviderId): string {
  return getProvider(id).defaultModelId;
}

/**
 * Normalize partially stored settings against the catalog (unknown provider →
 * anthropic; unknown/stale model → provider default).
 */
export function normalizeProviderSettings(stored: {
  provider?: string;
  model?: string;
  apiKey?: string;
  authScheme?: "api-key" | "bearer";
  extraHeaders?: Record<string, string>;
  baseUrl?: string;
}): {
  provider: ProviderId;
  model: string;
  apiKey: string;
  authScheme?: "api-key" | "bearer";
  extraHeaders?: Record<string, string>;
  baseUrl?: string;
} {
  const provider =
    stored.provider && stored.provider in PROVIDERS ? (stored.provider as ProviderId) : "anthropic";
  // Keep the stored model only if it still exists for this provider.
  const model = MODELS.find((m) => m.id === stored.model && m.provider === provider);
  return {
    provider,
    model: model?.id ?? defaultModelFor(provider),
    apiKey: stored.apiKey ?? "",
    ...(stored.authScheme ? { authScheme: stored.authScheme } : {}),
    ...(stored.extraHeaders ? { extraHeaders: stored.extraHeaders } : {}),
    ...(stored.baseUrl ? { baseUrl: stored.baseUrl } : {}),
  };
}

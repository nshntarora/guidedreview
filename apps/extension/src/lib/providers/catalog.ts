/**
 * Canonical registry of AI providers and models for Guided Review.
 *
 * UI labels, icons, key placeholders, and model lists all come from here.
 * Adding a model is a single MODELS row. Adding a provider also requires a
 * background client in src/background/providers/.
 */

export type ProviderId = "anthropic" | "openai" | "grok";

export interface ProviderDefinition {
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
}

export interface ModelDefinition {
  /** Exact string passed to the provider API. */
  id: string;
  /** Human-readable label shown in the model dropdown. */
  displayName: string;
  provider: ProviderId;
}

/** Providers in display order. */
export const PROVIDERS: readonly ProviderDefinition[] = [
  {
    id: "anthropic",
    displayName: "Claude (Anthropic)",
    keyPlaceholder: "sk-ant-…",
    iconSrc: "providers/claude.svg",
    defaultModelId: "claude-opus-4-8",
  },
  {
    id: "openai",
    displayName: "OpenAI",
    keyPlaceholder: "sk-…",
    iconSrc: "providers/openai.svg",
    defaultModelId: "gpt-4.1",
  },
  {
    id: "grok",
    displayName: "Grok (xAI)",
    keyPlaceholder: "xai-…",
    iconSrc: "providers/grok.svg",
    defaultModelId: "grok-4",
  },
] as const;

/**
 * Text-generation models available for PR review annotation.
 * Keep in sync with known provider API model ids as they ship or retire.
 */
export const MODELS: readonly ModelDefinition[] = [
  // --- Anthropic ---
  { id: "claude-opus-4-8", displayName: "Claude Opus 4.8", provider: "anthropic" },
  { id: "claude-opus-4-7", displayName: "Claude Opus 4.7", provider: "anthropic" },
  { id: "claude-sonnet-5", displayName: "Claude Sonnet 5", provider: "anthropic" },
  { id: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", displayName: "Claude Haiku 4.5", provider: "anthropic" },

  // --- OpenAI ---
  { id: "gpt-5", displayName: "GPT-5", provider: "openai" },
  { id: "gpt-5-mini", displayName: "GPT-5 Mini", provider: "openai" },
  { id: "gpt-4.1", displayName: "GPT-4.1", provider: "openai" },
  { id: "gpt-4.1-mini", displayName: "GPT-4.1 Mini", provider: "openai" },
  { id: "gpt-4o", displayName: "GPT-4o", provider: "openai" },
  { id: "o3", displayName: "o3", provider: "openai" },
  { id: "o4-mini", displayName: "o4 Mini", provider: "openai" },

  // --- Grok (xAI) ---
  { id: "grok-4", displayName: "Grok 4", provider: "grok" },
  { id: "grok-3", displayName: "Grok 3", provider: "grok" },
  { id: "grok-3-mini", displayName: "Grok 3 Mini", provider: "grok" },
] as const;

export function getProvider(id: ProviderId): ProviderDefinition {
  const found = PROVIDERS.find((p) => p.id === id);
  if (!found) {
    // Exhaustiveness: ProviderId is always in PROVIDERS; keep a safe fallback.
    return PROVIDERS[0];
  }
  return found;
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
}): { provider: ProviderId; model: string; apiKey: string } {
  const provider = PROVIDERS.find((p) => p.id === stored.provider)?.id ?? "anthropic";
  // Keep the stored model only if it still exists for this provider.
  const model = MODELS.find((m) => m.id === stored.model && m.provider === provider);
  return {
    provider,
    model: model?.id ?? defaultModelFor(provider),
    apiKey: stored.apiKey ?? "",
  };
}

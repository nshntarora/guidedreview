import type { ProviderId } from "../../lib/types";
import type { ProviderClient } from "./types";
import { anthropicProvider } from "./anthropic";
import { createOpenAICompatibleProvider } from "./openaiCompatible";

const openaiProvider = createOpenAICompatibleProvider("https://api.openai.com/v1", "OpenAI");
const grokProvider = createOpenAICompatibleProvider("https://api.x.ai/v1", "Grok");

export function getProviderClient(provider: ProviderId): ProviderClient {
  switch (provider) {
    case "anthropic":
      return anthropicProvider;
    case "openai":
      return openaiProvider;
    case "grok":
      return grokProvider;
  }
}

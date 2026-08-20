import type { ProviderId } from "@guided-review/core";

/** Browser-safe display names for coding agents chosen at CLI start. */
export function codingAgentLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  switch (id) {
    case "claude-code":
      return "Claude Code";
    case "codex":
      return "Codex";
    case "grok":
      return "Grok";
    default:
      return id;
  }
}

/** Short name for the "using …" caption under Structure with AI. */
export function structureWithLabel(
  codingAgent: string | null | undefined,
  provider: ProviderId,
): string {
  const agent = codingAgentLabel(codingAgent);
  if (agent) return agent;
  switch (provider) {
    case "anthropic":
      return "Claude";
    case "openai":
      return "OpenAI";
    case "grok":
      return "Grok";
  }
}

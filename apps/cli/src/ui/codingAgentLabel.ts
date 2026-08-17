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

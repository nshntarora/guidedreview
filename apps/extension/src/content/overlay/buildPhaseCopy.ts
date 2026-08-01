import type { BuildPhase } from "./store";

/** Primary loading line while the review plan is being built. */
export const BUILD_PLAN_PRIMARY = "Building a review plan";

/** Subtext for the active pipeline phase. */
export function buildPhaseDetail(phase: BuildPhase, providerLabel: string | null): string {
  switch (phase) {
    case "extracting_diff":
      return "Extracting the diff…";
    case "processing_diff":
      return "Processing the diff…";
    case "sent_to_provider":
      return `Sent it to ${providerLabel ?? "your AI provider"}…`;
    case "waiting_for_tokens":
      return "Waiting for tokens…";
    case "tokens_streaming":
      return "Tokens are streaming…";
  }
}

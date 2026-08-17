import { createInterface } from "node:readline/promises";
import type { CodingAgentId, DetectedAgent } from "./types";

export async function promptForAgent(
  agents: DetectedAgent[],
  options?: {
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
    isTTY?: boolean;
    /** Pre-selected agent (e.g. last used). Enter accepts it. */
    preferred?: CodingAgentId;
  },
): Promise<CodingAgentId | null> {
  const isTTY = options?.isTTY ?? Boolean(process.stdin.isTTY);
  if (!isTTY || agents.length === 0) return null;
  if (agents.length === 1) return agents[0]!.id;

  const output = options?.output ?? process.stderr;
  const input = options?.input ?? process.stdin;
  const preferredIndex = options?.preferred
    ? agents.findIndex((agent) => agent.id === options.preferred)
    : -1;
  const hasPreferred = preferredIndex >= 0;

  output.write("Which coding agent should Guided Review use to generate the review?\n\n");
  agents.forEach((agent, index) => {
    const mark = hasPreferred && index === preferredIndex ? "  (last used)" : "";
    output.write(`  ${index + 1}. ${agent.displayName}${mark}\n`);
  });
  output.write("\n");

  const question = hasPreferred
    ? `Enter a number (default ${preferredIndex + 1}), or press Enter to keep last used: `
    : "Enter a number (or press Enter to skip): ";

  const rl = createInterface({ input, output, terminal: Boolean(isTTY) });
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const answer = (await rl.question(question)).trim();
      if (!answer) return hasPreferred ? agents[preferredIndex]!.id : null;
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= agents.length) {
        return agents[n - 1]!.id;
      }
      output.write(
        hasPreferred
          ? `Choose 1–${agents.length}, or press Enter for ${agents[preferredIndex]!.displayName}.\n`
          : `Choose 1–${agents.length}, or press Enter to skip.\n`,
      );
    }
  } finally {
    rl.close();
  }
  return null;
}

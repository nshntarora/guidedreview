import type { ReviewNote } from "../types";

function lineRangeLabel(note: ReviewNote): string {
  if (note.startLine === note.endLine) return `L${note.startLine}`;
  return `L${note.startLine}–L${note.endLine}`;
}

function formatNoteSection(note: ReviewNote): string {
  const body = note.body.trim();
  const code = note.selectedCode?.trim() ?? "";
  const lines = [`### \`${note.filePath}\` (${lineRangeLabel(note)})`, ""];

  if (code) {
    lines.push("Selected code:", "", "```", code, "```", "");
  }

  lines.push("Feedback:", "", body);
  return lines.join("\n");
}

/**
 * Format local review notes as a coding-agent prompt: instructions plus
 * each comment with file, line range, and selected code when available.
 */
export function formatAgentPrompt(notes: ReviewNote[]): string {
  if (notes.length === 0) return "";

  const sections = [
    "# Review feedback to apply",
    "",
    "Fix or resolve the feedback below in this repository. If a comment asks a question, answer it and propose an approach to improve the code before (or as part of) making changes.",
    "",
    "## Comments",
    "",
    notes.map(formatNoteSection).join("\n\n"),
  ];

  return `${sections.join("\n")}\n`;
}

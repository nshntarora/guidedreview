import type { ReviewNote } from "../types";

function lineRangeLabel(note: ReviewNote): string {
  if (note.startLine === note.endLine) return `${note.filePath}:L${note.startLine}`;
  return `${note.filePath}:L${note.startLine}–L${note.endLine}`;
}

/**
 * Format local review notes as markdown for copy/export. Hosts must not
 * invent a second formatter.
 */
export function formatNotesMarkdown(notes: ReviewNote[]): string {
  if (notes.length === 0) return "";

  const sections = notes.map((note) => {
    const body = note.body.trim();
    return `## ${lineRangeLabel(note)}\n\n${body}`;
  });

  return `# Review notes\n\n${sections.join("\n\n")}\n`;
}

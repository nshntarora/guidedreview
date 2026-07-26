import type { DiffFile, ParsedDiff, PRContext } from "../types";

export const SYSTEM_PROMPT = `You are an expert senior engineer helping a human review a pull request that may have been written by an AI coding agent. You do not write or rewrite code — you plan how a human should walk through an existing diff, and explain it.

Follow these review-structuring conventions:
1. Order review units so schema/data-model changes come first, then the core logic that depends on them, then consumers/call-sites, then tests and generated/config files last (model-changes-first ordering).
2. Group related hunks — possibly spanning multiple files — into one logical "review unit" per coherent change, rather than one unit per file.
3. For each unit, explain why the change was made — infer the intent behind it from the PR title/description and the diff. Assume the reviewer already understands the surrounding code; give them the context of the change, not instructions on what to inspect or verify.

Never invent code that isn't in the diff. Every fileId and hunkId you reference must come from the diff exactly as given.`;

/**
 * Render a parsed diff into a compact, LLM-readable text form, with hunk ids
 * annotated so the model can reference them exactly in its structured output.
 */
export function renderDiffForPrompt(diff: ParsedDiff): string {
  return diff.files.map(renderFile).join("\n\n");
}

/**
 * Rendering is pure per file, and chunkDiffByFile measures every file before
 * buildUserPrompt renders the same files again — cache so a large diff is
 * only walked once.
 */
const renderedFiles = new WeakMap<DiffFile, string>();

function renderFile(file: DiffFile): string {
  const cached = renderedFiles.get(file);
  if (cached !== undefined) return cached;
  const rendered = renderFileUncached(file);
  renderedFiles.set(file, rendered);
  return rendered;
}

function renderFileUncached(file: DiffFile): string {
  const statusLabel =
    file.status === "renamed" ? `renamed from ${file.previousPath} to ${file.path}` : file.status;

  const header = `### File: ${file.path} (${statusLabel})`;

  if (file.isBinaryOrElided) {
    return `${header}\n(binary or elided — no textual diff available)`;
  }

  const hunks = file.hunks
    .map((hunk) => {
      const body = hunk.lines
        .map((line) => {
          const marker = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
          return `${marker}${line.content}`;
        })
        .join("\n");
      return `[hunk id: ${hunk.id}] ${hunk.header}\n${body}`;
    })
    .join("\n\n");

  return `${header}\n${hunks}`;
}

/** Rough token-avoidance heuristic: ~4 chars/token, keep chunks well under context limits. */
const DEFAULT_MAX_CHARS_PER_CHUNK = 60_000;

/**
 * Split a diff into file-aligned chunks so a single LLM call never receives
 * more than roughly `maxChars` of diff text. Never splits a file's hunks
 * across chunks.
 */
export function chunkDiffByFile(
  diff: ParsedDiff,
  maxChars: number = DEFAULT_MAX_CHARS_PER_CHUNK,
): ParsedDiff[] {
  const chunks: ParsedDiff[] = [];
  let current: DiffFile[] = [];
  let currentSize = 0;

  for (const file of diff.files) {
    const size = renderFile(file).length;
    if (current.length > 0 && currentSize + size > maxChars) {
      chunks.push({ files: current });
      current = [];
      currentSize = 0;
    }
    current.push(file);
    currentSize += size;
  }

  if (current.length > 0) chunks.push({ files: current });
  return chunks.length > 0 ? chunks : [{ files: [] }];
}

export function buildUserPrompt(diff: ParsedDiff, prContext: PRContext): string {
  const title = prContext.title.trim();
  const description = prContext.description.trim();
  return [
    title ? `PR title: ${title}` : "PR title: (none provided)",
    description ? `PR description:\n${description}` : "PR description: (none provided)",
    prContext.baseRef && prContext.headRef
      ? `Merging ${prContext.headRef} into ${prContext.baseRef}.`
      : "",
    "",
    "Diff:",
    renderDiffForPrompt(diff),
  ]
    .filter(Boolean)
    .join("\n\n");
}

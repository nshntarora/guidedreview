import { imageMimeType, isImagePath } from "@guided-review/core";
import type { DiffFile } from "@guided-review/ui/review/types";

/**
 * Rebuild old/new file text from hunks. Incomplete when the patch is a
 * partial hunk (no `<svg` root) — callers must check `looksLikeSvg`.
 */
export function reconstructSides(file: DiffFile): {
  oldText: string | null;
  newText: string | null;
} {
  if (file.hunks.length === 0) return { oldText: null, newText: null };

  const oldLines: string[] = [];
  const newLines: string[] = [];
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type !== "add") oldLines.push(line.content);
      if (line.type !== "del") newLines.push(line.content);
    }
  }

  const oldText = oldLines.length > 0 ? oldLines.join("\n") : null;
  const newText = newLines.length > 0 ? newLines.join("\n") : null;

  if (file.status === "added") return { oldText: null, newText };
  if (file.status === "removed") return { oldText, newText: null };
  return { oldText, newText };
}

export function looksLikeSvg(text: string): boolean {
  return /<svg(\s|>|$)/i.test(text);
}

/** `data:` URL so `<img>` renders SVG regardless of GitHub serving it as text/plain. */
export function svgDataUrl(text: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
}

/**
 * Immediate preview srcs from the patch itself. Only SVG (text) can be
 * reconstructed; binary images need a host fetch.
 */
export function reconstructedImageSrcs(file: DiffFile): {
  oldSrc: string | null;
  newSrc: string | null;
} {
  if (!isImagePath(file.path) || imageMimeType(file.path) !== "image/svg+xml") {
    return { oldSrc: null, newSrc: null };
  }
  const { oldText, newText } = reconstructSides(file);
  return {
    oldSrc: oldText && looksLikeSvg(oldText) ? svgDataUrl(oldText) : null,
    newSrc: newText && looksLikeSvg(newText) ? svgDataUrl(newText) : null,
  };
}

export function imageSidesForStatus(status: DiffFile["status"]): {
  showOld: boolean;
  showNew: boolean;
} {
  return {
    showOld: status === "removed" || status === "modified" || status === "renamed",
    showNew: status === "added" || status === "modified" || status === "renamed",
  };
}

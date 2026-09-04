import { imageMimeType, isImagePath } from "@guided-review/core";
import { buildRawFileUrl, isSafeGitHubPath, isSafeGitHubRef } from "./prUrls";

/** Keep data URLs well under chrome.runtime message limits. */
export const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

export interface FetchRawFileInput {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}

/**
 * Fetch a blob at `{ref}:{path}` through github.com/raw (cookie session, so
 * private repos work) and return a `data:` URL the overlay can put in `<img>`.
 *
 * Same reason as `fetchPRDiff`: the URL redirects to raw.githubusercontent.com
 * with no CORS headers, so this has to run in the background worker.
 */
export async function fetchRawFilePreview(input: FetchRawFileInput): Promise<string> {
  if (!isSafeGitHubPath(input.path) || !isSafeGitHubRef(input.ref) || !isImagePath(input.path)) {
    throw new Error("That file path is not valid.");
  }

  const url = buildRawFileUrl({ owner: input.owner, repo: input.repo }, input.ref, input.path);

  let response: Response;
  try {
    response = await fetch(url, { credentials: "include" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Network error fetching ${input.path}: ${detail}`, { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Could not fetch ${input.path} (HTTP ${response.status}).`);
  }

  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (Number.isFinite(length) && length > MAX_PREVIEW_BYTES) {
      throw new Error(`${input.path} is too large to preview.`);
    }
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_PREVIEW_BYTES) {
    throw new Error(`${input.path} is too large to preview.`);
  }

  const mime = mimeForPreview(input.path, response.headers.get("content-type"));
  if (!mime) {
    throw new Error(`Could not preview ${input.path}.`);
  }

  return bytesToDataUrl(bytes, mime);
}

/**
 * Prefer the path's image MIME so GitHub serving SVG as `text/plain` still
 * renders. Reject HTML (login wall / error page).
 */
export function mimeForPreview(path: string, contentType: string | null): string | null {
  const raw = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (raw === "text/html" || raw === "application/json" || raw === "text/json") return null;
  const fromPath = imageMimeType(path);
  if (fromPath) return fromPath;
  if (raw.startsWith("image/")) return raw;
  return null;
}

export function bytesToDataUrl(bytes: ArrayBuffer, mime: string): string {
  const bin = new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bin.length; i += chunk) {
    binary += String.fromCharCode(...bin.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

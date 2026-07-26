import type { APIRequestContext } from "@playwright/test";
import { PRODUCTION_ORIGIN } from "./routes";

const SKIP_SCHEMES = /^(mailto:|tel:|javascript:|data:)/i;

/** True if href should never be HTTP-fetched. */
export function isSkippableScheme(href: string): boolean {
  return SKIP_SCHEMES.test(href.trim());
}

/**
 * Resolve an href against a page URL, rewriting the production origin to the
 * local base so absolute site URLs are checked against the build under test.
 */
export function resolveHref(
  href: string,
  pageUrl: string,
  baseURL: string,
): { kind: "skip" } | { kind: "external"; url: URL } | { kind: "internal"; url: URL } {
  const trimmed = href.trim();
  if (!trimmed || isSkippableScheme(trimmed)) {
    return { kind: "skip" };
  }

  let url: URL;
  try {
    url = new URL(trimmed, pageUrl);
  } catch {
    return { kind: "skip" };
  }

  // Map production absolute URLs onto the local static server.
  if (url.origin === PRODUCTION_ORIGIN || url.hostname === "guidedreview.dev") {
    const local = new URL(baseURL);
    url.protocol = local.protocol;
    url.host = local.host;
  }

  const base = new URL(baseURL);
  if (url.origin !== base.origin) {
    return { kind: "external", url };
  }

  return { kind: "internal", url };
}

/** Path + search only (stable key for dedupe of internal resources). */
export function resourceKey(url: URL): string {
  return `${url.pathname}${url.search}`;
}

/** Path without trailing slash (except root), for route comparisons. */
export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

export async function assertStatusOk(
  request: APIRequestContext,
  url: string,
  label?: string,
): Promise<void> {
  const response = await request.get(url, { maxRedirects: 5 });
  const status = response.status();
  if (status >= 400) {
    throw new Error(
      `${label ?? "GET"} ${url} returned ${status}${response.statusText() ? ` ${response.statusText()}` : ""}`,
    );
  }
}

export async function fetchOk(
  request: APIRequestContext,
  url: string,
): Promise<{ status: number; body: Buffer }> {
  const response = await request.get(url, { maxRedirects: 5 });
  const status = response.status();
  const body = Buffer.from(await response.body());
  return { status, body };
}

/** PNG signature. */
export function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

/**
 * Read width/height from PNG IHDR (first chunk after 8-byte signature).
 * Throws if the buffer is not a minimal valid PNG.
 */
export function pngSize(buffer: Buffer): { width: number; height: number } {
  if (!isPng(buffer) || buffer.length < 24) {
    throw new Error("Not a PNG (missing signature or IHDR)");
  }
  // Bytes 8–11: chunk length; 12–15: "IHDR"; 16–23: width/height
  const type = buffer.subarray(12, 16).toString("ascii");
  if (type !== "IHDR") {
    throw new Error(`Expected IHDR chunk, got ${JSON.stringify(type)}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

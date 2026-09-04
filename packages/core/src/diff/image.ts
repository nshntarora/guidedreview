/**
 * Image files in a diff: the overlay renders a preview instead of (or above)
 * the textual patch. Keep this list to types `<img>` can display.
 */

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  tif: "image/tiff",
  tiff: "image/tiff",
};

function extensionOf(path: string): string | undefined {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return base.slice(dot + 1).toLowerCase();
}

/** MIME type for a path that the overlay can show as an image, else undefined. */
export function imageMimeType(path: string): string | undefined {
  const ext = extensionOf(path);
  return ext ? IMAGE_MIME_BY_EXT[ext] : undefined;
}

export function isImagePath(path: string): boolean {
  return imageMimeType(path) !== undefined;
}

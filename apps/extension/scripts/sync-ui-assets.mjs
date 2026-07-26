/**
 * Copy canonical brand assets from @guided-review/ui into this package's
 * public/ directory so MV3 can ship them at the extension root (manifest
 * icons, chrome.runtime.getURL, web_accessible_resources).
 *
 * Run via predev / prebuild. Not a CI ImageMagick dependency — sized icons
 * are committed under packages/ui and synced as-is.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");
const uiAssets = path.resolve(extensionRoot, "../../packages/ui/src/assets");
const publicDir = path.join(extensionRoot, "public");

const files = ["icon.png", "icon.svg", "logo.png", "logo.svg", "logomark.png", "logomark.svg"];

const iconFiles = ["icon16.png", "icon48.png", "icon128.png"];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (!fs.existsSync(uiAssets)) {
  console.error(`[sync-ui-assets] UI assets not found at ${uiAssets}`);
  process.exit(1);
}

for (const name of files) {
  const src = path.join(uiAssets, name);
  if (!fs.existsSync(src)) {
    console.error(`[sync-ui-assets] missing ${src}`);
    process.exit(1);
  }
  copyFile(src, path.join(publicDir, name));
}

for (const name of iconFiles) {
  const src = path.join(uiAssets, "icons", name);
  if (!fs.existsSync(src)) {
    console.error(`[sync-ui-assets] missing ${src}`);
    process.exit(1);
  }
  copyFile(src, path.join(publicDir, "icons", name));
}

console.log("[sync-ui-assets] synced brand assets from @guided-review/ui");

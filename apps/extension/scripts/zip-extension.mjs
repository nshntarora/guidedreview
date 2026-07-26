/**
 * Zip the built extension (contents of dist/) for Chrome Web Store upload
 * or distribution. Manifest must sit at the zip root — not nested under dist/.
 *
 * Run after vite build (see package.json "build").
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, "..");
const distDir = path.join(extensionRoot, "dist");

const pkg = JSON.parse(
  fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8"),
);
const version = pkg.version;
const zipName = `guided-review-${version}.zip`;
const zipPath = path.join(extensionRoot, zipName);

if (!fs.existsSync(distDir)) {
  console.error(`[zip-extension] dist/ not found at ${distDir} — run vite build first`);
  process.exit(1);
}

const entries = fs.readdirSync(distDir);
if (entries.length === 0) {
  console.error("[zip-extension] dist/ is empty");
  process.exit(1);
}

// Drop any prior build artifact so we don't ship a stale version-named zip.
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Zip from inside dist so paths in the archive are relative (manifest.json at root).
// Exclude nested .zip files if any leftover made it into dist/.
try {
  execFileSync(
    "zip",
    [
      "-r",
      "-q",
      zipPath,
      ".",
      "-x",
      "*.zip",
      "-x",
      "**/*.zip",
      "-x",
      "*.DS_Store",
      "-x",
      "**/.DS_Store",
    ],
    { cwd: distDir, stdio: "inherit" },
  );
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
  if (code === "ENOENT") {
    console.error(
      "[zip-extension] `zip` CLI not found. Install zip (e.g. apt install zip / brew install zip).",
    );
  } else {
    console.error("[zip-extension] zip failed:", err instanceof Error ? err.message : err);
  }
  process.exit(1);
}

const sizeKb = Math.round(fs.statSync(zipPath).size / 1024);
console.log(`[zip-extension] wrote ${zipName} (${sizeKb} KB)`);

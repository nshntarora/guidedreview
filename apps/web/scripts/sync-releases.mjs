import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

const snapshot = new URL("../data/releases.json", import.meta.url);
const endpoint = "https://api.github.com/repos/nshntarora/guidedreview/releases";

export function normalizeReleases(releases) {
  const versions = new Set();
  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .map((release) => {
      const version = release.tag_name.replace(/^v/, "");
      if (!/^\d+\.\d+\.\d+$/.test(version) || versions.has(version)) {
        throw new Error(`Invalid or duplicate release version: ${release.tag_name}`);
      }
      versions.add(version);
      const title = release.name?.trim();
      const titleParts = title?.match(/^v?(\d+\.\d+\.\d+)\s+(?:[-–—:]\s*)?(.+)$/);
      const body = release.body?.replace(/\r\n/g, "\n").trim();
      const description = body
        ?.split(/\n\s*\n/)[0]
        .replace(/\n/g, " ")
        .trim();
      if (
        !titleParts ||
        titleParts[1] !== version ||
        !titleParts[2].replace(/^[-–—:\s]+/, "") ||
        !description ||
        /^[-#*]/.test(description)
      ) {
        throw new Error(
          `${release.tag_name} needs a title beginning with its version followed by a description, and an opening summary paragraph. See .github/RELEASING.md.`,
        );
      }
      if (!release.published_at || !Number.isFinite(Date.parse(release.published_at))) {
        throw new Error(`${release.tag_name} has no valid publication date.`);
      }
      return {
        version,
        tag: release.tag_name,
        title,
        description,
        body,
        publishedAt: release.published_at,
        updatedAt: release.updated_at || release.published_at,
        url: `https://github.com/nshntarora/guidedreview/releases/tag/${encodeURIComponent(release.tag_name)}`,
      };
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function fetchReleases(fetcher = globalThis.fetch) {
  const releases = [];
  for (let page = 1; ; page++) {
    const response = await fetcher(`${endpoint}?per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      signal: globalThis.AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub releases request failed (${response.status}).`);
    const batch = await response.json();
    releases.push(...batch);
    if (batch.length < 100) return releases;
  }
}

async function sync() {
  try {
    const releases = normalizeReleases(await fetchReleases());
    await writeFile(snapshot, `${JSON.stringify(releases, null, 2)}\n`);
    console.log(`Synced ${releases.length} published releases from GitHub.`);
  } catch (error) {
    if (process.env.RELEASES_SYNC_REQUIRED === "true") throw error;
    // Local/offline builds remain usable; deployment must explicitly require a fresh sync.
    await readFile(snapshot, "utf8");
    console.warn(`Using saved release history: ${error.message}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await sync();

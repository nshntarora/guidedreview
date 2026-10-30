import assert from "node:assert/strict";
import test from "node:test";
import { fetchReleases, normalizeReleases } from "./sync-releases.mjs";

const release = {
  tag_name: "v0.3.2",
  name: "v0.3.2 — Custom provider URLs",
  body: "Use your own provider endpoint.\r\n\r\n## Improvements\r\n- Keep saved settings.",
  published_at: "2026-10-22T14:02:05Z",
  updated_at: "2026-10-31T10:00:00Z",
};

test("published release history preserves Markdown, uses version URLs, and excludes drafts and previews", () => {
  const older = {
    ...release,
    tag_name: "v0.3.0",
    name: "v0.3.0 — Review local changes",
    published_at: "2026-09-06T15:53:53Z",
  };
  const releases = normalizeReleases([
    older,
    release,
    { ...release, draft: true },
    { ...release, prerelease: true },
  ]);
  assert.deepEqual(
    releases.map(({ version }) => version),
    ["0.3.2", "0.3.0"],
  );
  assert.equal(releases[0].description, "Use your own provider endpoint.");
  assert.equal(releases[0].title, "v0.3.2 — Custom provider URLs");
  assert.equal(releases[0].body, release.body.replace(/\r\n/g, "\n"));
  assert.equal(releases[0].url, "https://github.com/nshntarora/guidedreview/releases/tag/v0.3.2");
  assert.equal(releases[0].updatedAt, release.updated_at);
  for (const invalid of [
    { ...release, name: "0.3.2" },
    { ...release, name: "Custom provider URLs" },
    { ...release, name: "v0.3.0 — Custom provider URLs" },
    { ...release, name: "v0.3.2 —" },
    { ...release, body: "## What's Changed\n- feat: some commit" },
    { ...release, body: "" },
    { ...release, tag_name: "../other-page" },
  ])
    assert.throws(() => normalizeReleases([invalid]));
  assert.throws(() => normalizeReleases([release, { ...release, tag_name: "0.3.2" }]));
});

test("release synchronization reads every page and reports GitHub errors instead of returning partial history", async () => {
  const requests = [];
  const fetched = await fetchReleases(async (url) => {
    requests.push(url);
    return {
      ok: true,
      json: async () => (requests.length === 1 ? Array(100).fill(release) : [release]),
    };
  });
  assert.equal(fetched.length, 101);
  assert.match(requests[1], /page=2$/);
  await assert.rejects(
    fetchReleases(async () => ({ ok: false, status: 403 })),
    /403/,
  );
});

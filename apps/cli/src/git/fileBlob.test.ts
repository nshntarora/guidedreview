import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { buildLocalReview } from "./localDiff";
import { readReviewImage } from "./fileBlob";

const execFileAsync = promisify(execFile);

const PNG_A = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_B = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const SVG_NEW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="blue"/></svg>\n';

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

async function makeImageRepo(): Promise<string> {
  const dir = await mkdir(path.join(os.tmpdir(), `gr-img-${Date.now()}-${Math.random()}`), {
    recursive: true,
  });
  const root = dir!;
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.email", "test@example.com"]);
  await git(root, ["config", "user.name", "Test"]);
  await writeFile(path.join(root, "logo.png"), PNG_A);
  await git(root, ["add", "logo.png"]);
  await git(root, ["commit", "-m", "initial"]);
  await git(root, ["checkout", "-b", "feat"]);
  await writeFile(path.join(root, "logo.png"), PNG_B);
  await writeFile(path.join(root, "icon.svg"), SVG_NEW);
  await git(root, ["add", "logo.png", "icon.svg"]);
  await git(root, ["commit", "-m", "update images"]);
  return root;
}

describe("readReviewImage", () => {
  it("reads old and new blobs for images in the current diff", async () => {
    const root = await makeImageRepo();
    const snapshot = await buildLocalReview({ cwd: root, scope: "branch" });

    const oldPng = await readReviewImage(snapshot, "logo.png", "old");
    const newPng = await readReviewImage(snapshot, "logo.png", "new");
    const newSvg = await readReviewImage(snapshot, "icon.svg", "new");
    const oldSvg = await readReviewImage(snapshot, "icon.svg", "old");

    expect(oldPng?.mime).toBe("image/png");
    expect(oldPng?.bytes.equals(PNG_A)).toBe(true);
    expect(newPng?.bytes.equals(PNG_B)).toBe(true);
    expect(newSvg?.mime).toBe("image/svg+xml");
    expect(newSvg?.bytes.toString("utf8")).toBe(SVG_NEW);
    expect(oldSvg).toBeNull();
    expect(await readReviewImage(snapshot, "missing.png", "new")).toBeNull();
  });
});

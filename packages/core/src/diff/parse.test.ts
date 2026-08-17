import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./parse";

describe("parseUnifiedDiff", () => {
  it("parses a simple modified file with one hunk", () => {
    const raw = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "index 1234567..89abcde 100644",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,3 +1,4 @@",
      " const a = 1;",
      "-const b = 2;",
      "+const b = 3;",
      "+const c = 4;",
      " export { a, b };",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);

    expect(diff.files).toHaveLength(1);
    const file = diff.files[0];
    expect(file.path).toBe("src/foo.ts");
    expect(file.status).toBe("modified");
    expect(file.isBinaryOrElided).toBe(false);
    expect(file.hunks).toHaveLength(1);

    const hunk = file.hunks[0];
    expect(hunk.id).toBe("src/foo.ts#0");
    expect(hunk.oldStart).toBe(1);
    expect(hunk.newStart).toBe(1);
    expect(hunk.lines).toEqual([
      { type: "context", content: "const a = 1;", oldLine: 1, newLine: 1 },
      { type: "del", content: "const b = 2;", oldLine: 2 },
      { type: "add", content: "const b = 3;", newLine: 2 },
      { type: "add", content: "const c = 4;", newLine: 3 },
      { type: "context", content: "export { a, b };", oldLine: 3, newLine: 4 },
    ]);
  });

  it("assigns sequential ids to multiple hunks in the same file", () => {
    const raw = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,2 +1,2 @@",
      "-a",
      "+A",
      " b",
      "@@ -10,2 +10,2 @@",
      "-c",
      "+C",
      " d",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    const hunks = diff.files[0].hunks;
    expect(hunks.map((h) => h.id)).toEqual(["src/foo.ts#0", "src/foo.ts#1"]);
  });

  it("marks a new file as added", () => {
    const raw = [
      "diff --git a/src/new.ts b/src/new.ts",
      "new file mode 100644",
      "index 0000000..1234567",
      "--- /dev/null",
      "+++ b/src/new.ts",
      "@@ -0,0 +1,2 @@",
      "+const x = 1;",
      "+export default x;",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    expect(diff.files[0].status).toBe("added");
    expect(diff.files[0].path).toBe("src/new.ts");
  });

  it("marks a deleted file as removed and keys hunk ids off the old path", () => {
    const raw = [
      "diff --git a/src/old.ts b/src/old.ts",
      "deleted file mode 100644",
      "index 1234567..0000000",
      "--- a/src/old.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-const x = 1;",
      "-export default x;",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    const file = diff.files[0];
    expect(file.status).toBe("removed");
    expect(file.path).toBe("src/old.ts");
    expect(file.hunks[0].id).toBe("src/old.ts#0");
  });

  it("captures the previous path on a rename", () => {
    const raw = [
      "diff --git a/src/old-name.ts b/src/new-name.ts",
      "similarity index 100%",
      "rename from src/old-name.ts",
      "rename to src/new-name.ts",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    const file = diff.files[0];
    expect(file.status).toBe("renamed");
    expect(file.path).toBe("src/new-name.ts");
    expect(file.previousPath).toBe("src/old-name.ts");
    expect(file.hunks).toHaveLength(0);
  });

  it("flags binary files and produces no hunks", () => {
    const raw = [
      "diff --git a/logo.png b/logo.png",
      "index 1234567..89abcde 100644",
      "Binary files a/logo.png and b/logo.png differ",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    expect(diff.files[0].isBinaryOrElided).toBe(true);
    expect(diff.files[0].hunks).toHaveLength(0);
  });

  it("ignores the 'no newline at end of file' marker", () => {
    const raw = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,1 +1,1 @@",
      "-a",
      "\\ No newline at end of file",
      "+b",
      "\\ No newline at end of file",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    expect(diff.files[0].hunks[0].lines).toEqual([
      { type: "del", content: "a", oldLine: 1 },
      { type: "add", content: "b", newLine: 1 },
    ]);
  });

  it("parses multiple files in one diff", () => {
    const raw = [
      "diff --git a/a.ts b/a.ts",
      "--- a/a.ts",
      "+++ b/a.ts",
      "@@ -1,1 +1,1 @@",
      "-1",
      "+2",
      "diff --git a/b.ts b/b.ts",
      "--- a/b.ts",
      "+++ b/b.ts",
      "@@ -1,1 +1,1 @@",
      "-3",
      "+4",
    ].join("\n");

    const diff = parseUnifiedDiff(raw);
    expect(diff.files.map((f) => f.path)).toEqual(["a.ts", "b.ts"]);
  });

  it("returns no files for an empty diff", () => {
    expect(parseUnifiedDiff("")).toEqual({ files: [] });
  });

  describe("ambiguous and quoted paths", () => {
    it("keeps the real path for a filename containing a space", () => {
      const raw = [
        "diff --git a/src/my file.ts b/src/my file.ts",
        "--- a/src/my file.ts",
        "+++ b/src/my file.ts",
        "@@ -1,1 +1,1 @@",
        "-1",
        "+2",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].path).toBe("src/my file.ts");
      expect(diff.files[0].hunks[0].id).toBe("src/my file.ts#0");
    });

    // A greedy `a/(.+) b/(.+)` split reports "y.ts" here — a path that does not
    // exist — letting a PR author show the reviewer the wrong filename.
    it("does not let a filename containing ' b/' spoof the displayed path", () => {
      const raw = [
        "diff --git a/x b/y.ts b/x b/y.ts",
        "--- a/x b/y.ts",
        "+++ b/x b/y.ts",
        "@@ -1,1 +1,1 @@",
        "-1",
        "+2",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].path).toBe("x b/y.ts");
      expect(diff.files[0].hunks[0].id).toBe("x b/y.ts#0");
    });

    it("falls back to the agreeing header split when there are no ---/+++ lines", () => {
      const raw = [
        "diff --git a/x b/y.png b/x b/y.png",
        "index 1234567..89abcde 100644",
        "Binary files a/x b/y.png and b/x b/y.png differ",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].path).toBe("x b/y.png");
      expect(diff.files[0].isBinaryOrElided).toBe(true);
    });

    it("decodes git's quoted path form", () => {
      const raw = [
        'diff --git "a/src/wei\\303\\237.ts" "b/src/wei\\303\\237.ts"',
        '--- "a/src/wei\\303\\237.ts"',
        '+++ "b/src/wei\\303\\237.ts"',
        "@@ -1,1 +1,1 @@",
        "-1",
        "+2",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].path).toBe("src/weiß.ts");
    });

    it("uses rename to/from for renames with no content change", () => {
      const raw = [
        "diff --git a/old name.ts b/new name.ts",
        "similarity index 100%",
        "rename from old name.ts",
        "rename to new name.ts",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].status).toBe("renamed");
      expect(diff.files[0].path).toBe("new name.ts");
      expect(diff.files[0].previousPath).toBe("old name.ts");
    });

    it("uses the old path for a deleted file (+++ is /dev/null)", () => {
      const raw = [
        "diff --git a/src/gone.ts b/src/gone.ts",
        "deleted file mode 100644",
        "--- a/src/gone.ts",
        "+++ /dev/null",
        "@@ -1,1 +0,0 @@",
        "-1",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].path).toBe("src/gone.ts");
      expect(diff.files[0].status).toBe("removed");
    });

    it("uses the new path for an added file (--- is /dev/null)", () => {
      const raw = [
        "diff --git a/src/new.ts b/src/new.ts",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/src/new.ts",
        "@@ -0,0 +1,1 @@",
        "+1",
      ].join("\n");

      const diff = parseUnifiedDiff(raw);
      expect(diff.files[0].path).toBe("src/new.ts");
      expect(diff.files[0].status).toBe("added");
    });
  });
});

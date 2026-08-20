import { describe, expect, it } from "vitest";
import { formatBanner, PRODUCT_MARK } from "./banner";

const status = {
  url: "http://127.0.0.1:7182/",
  files: 173,
  scope: "branch",
  headRef: "feat",
  baseRef: "main",
  provider: "grok",
  model: "grok-4.6",
  agent: "grok",
  hasKey: true,
  lastPullAt: new Date(2026, 0, 2, 0, 40, 53),
  diffFresh: "up to date" as const,
};

describe("formatBanner", () => {
  it("renders the mark, URL, diff, model, and last pull", () => {
    const text = formatBanner(status);
    expect(text).toContain(PRODUCT_MARK);
    expect(text).toContain("Guided Review");
    expect(text).toContain("http://127.0.0.1:7182/");
    expect(text).toContain("173 files");
    expect(text).toContain("feat vs main");
    expect(text).toContain("branch");
    expect(text).toContain("grok/grok-4.6");
    expect(text).toContain("agent grok");
    expect(text).toContain("key yes");
    expect(text).toContain("last pull 00:40:53");
    expect(text).toContain("up to date");
    expect(text.split("\n")).toHaveLength(6);
  });

  it("shows a changed diff and placeholders for missing fields", () => {
    const text = formatBanner({ files: 1, diffFresh: "changed" });
    expect(text).toContain("1 file · — · —");
    expect(text).toContain("last pull — · changed");
    expect(text).not.toContain("agent");
    expect(text).not.toContain("key ");
  });
});

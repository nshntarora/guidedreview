import { describe, expect, it } from "vitest";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  it("defaults to cwd, open, and untracked", () => {
    const args = parseArgs([]);
    expect(args.open).toBe(true);
    expect(args.includeUntracked).toBe(true);
    expect(args.staged).toBe(false);
    expect(args.port).toBe(7182);
  });

  it("parses flags", () => {
    const args = parseArgs([
      "/tmp/repo",
      "--base",
      "develop",
      "--port",
      "0",
      "--no-open",
      "--staged",
      "--no-untracked",
      "--provider",
      "grok",
      "--agent",
      "codex",
    ]);
    expect(args.cwd).toBe("/tmp/repo");
    expect(args.base).toBe("develop");
    expect(args.port).toBe(0);
    expect(args.open).toBe(false);
    expect(args.staged).toBe(true);
    expect(args.includeUntracked).toBe(false);
    expect(args.provider).toBe("grok");
    expect(args.agent).toBe("codex");
  });

  it("requires a value after flags that take one", () => {
    expect(() => parseArgs(["--base"])).toThrow(/--base requires a value/);
    expect(() => parseArgs(["--base", "--port", "0"])).toThrow(/--base requires a value/);
    expect(() => parseArgs(["--provider"])).toThrow(/--provider requires a value/);
    expect(() => parseArgs(["--port"])).toThrow(/--port requires a value/);
  });
});

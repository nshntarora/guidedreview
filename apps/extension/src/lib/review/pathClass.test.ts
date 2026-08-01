import { describe, expect, it } from "vitest";
import { isTestPath, roleForPath } from "./pathClass";

describe("isTestPath", () => {
  it.each([
    ["src/foo.test.ts", true],
    ["src/foo.spec.tsx", true],
    ["tests/helpers.ts", true],
    ["test/unit/bar.ts", true],
    ["__tests__/widget.tsx", true],
    ["packages/app/src/spec/util.ts", true],
    ["src/foo.ts", false],
    ["src/testing/notes.md", false],
    ["src/contest/foo.ts", false],
  ])("%s → %s", (path, expected) => {
    expect(isTestPath(path)).toBe(expected);
  });
});

describe("roleForPath", () => {
  it.each([
    ["src/auth.test.ts", "test"],
    ["__tests__/store.ts", "test"],
    ["package-lock.json", "config_or_generated"],
    ["yarn.lock", "config_or_generated"],
    ["pnpm-lock.yaml", "config_or_generated"],
    ["go.sum", "config_or_generated"],
    ["Cargo.lock", "config_or_generated"],
    ["tsconfig.json", "config_or_generated"],
    ["config.yaml", "config_or_generated"],
    ["settings.toml", "config_or_generated"],
    ["app.config.ts", "config_or_generated"],
    ["vite.config.js", "config_or_generated"],
    ["src/auth.ts", "core_logic"],
    ["packages/ui/src/Button.tsx", "core_logic"],
  ] as const)("%s → %s", (path, role) => {
    expect(roleForPath(path)).toBe(role);
  });
});

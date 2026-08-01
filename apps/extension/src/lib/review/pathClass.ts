import type { FileRole } from "../types";

/** Paths that belong in `kind: "tests"` units (role `test`). */
export const TEST_PATH = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[jt]sx?$/i;

/** Lockfiles and obvious config/generated paths (role `config_or_generated`). */
export const CONFIG_PATH =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|Cargo\.lock)$|\.(json|ya?ml|toml|ini|lock)$|\.config\.[jt]s$/i;

export function isTestPath(path: string): boolean {
  return TEST_PATH.test(path);
}

/**
 * Deterministic path → role heuristic used by the no-provider fallback and
 * by validation (force test paths to role `test` so mixed units can be split).
 */
export function roleForPath(path: string): FileRole {
  if (isTestPath(path)) return "test";
  if (CONFIG_PATH.test(path)) return "config_or_generated";
  return "core_logic";
}

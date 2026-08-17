import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { AgentIo } from "./types";

const execFileAsync = promisify(execFile);

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function whichOnPath(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Promise<string | null> {
  const pathEnv = env.PATH ?? env.Path ?? "";
  const sep = platform === "win32" ? ";" : ":";
  const exts = platform === "win32" ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  for (const dir of pathEnv.split(sep)) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = path.join(dir, `${command}${ext}`);
      if (await pathExists(candidate)) return candidate;
    }
  }
  return null;
}

export function createDefaultAgentIo(): AgentIo {
  return {
    homedir: () => homedir(),
    env: (name) => process.env[name],
    platform: () => process.platform,
    which: (command) => whichOnPath(command),
    async readFile(filePath) {
      try {
        return await readFile(filePath, "utf8");
      } catch {
        return null;
      }
    },
    fileExists: pathExists,
    async readKeychainPassword(service) {
      if (process.platform !== "darwin") return null;
      try {
        const { stdout } = await execFileAsync("security", [
          "find-generic-password",
          "-s",
          service,
          "-w",
        ]);
        const value = stdout.trim();
        return value || null;
      } catch {
        return null;
      }
    },
  };
}

export function createMemoryIo(options: {
  home?: string;
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
  binaries?: string[];
  files?: Record<string, string>;
  keychain?: Record<string, string>;
}): AgentIo {
  const home = options.home ?? "/home/test";
  const files = options.files ?? {};
  const binaries = new Set(options.binaries ?? []);
  const env = options.env ?? {};
  const platform = options.platform ?? "linux";
  const keychain = options.keychain ?? {};

  return {
    homedir: () => home,
    env: (name) => env[name],
    platform: () => platform,
    async which(command) {
      return binaries.has(command) ? `/bin/${command}` : null;
    },
    async readFile(filePath) {
      return files[filePath] ?? null;
    },
    async fileExists(filePath) {
      return filePath in files;
    },
    async readKeychainPassword(service) {
      return keychain[service] ?? null;
    },
  };
}

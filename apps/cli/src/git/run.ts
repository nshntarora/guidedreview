import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}

export async function runGit(
  args: string[],
  cwd: string,
  options?: { allowExitCodes?: number[] },
): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch (error: unknown) {
    const err = error as {
      code?: string | number;
      status?: number;
      stderr?: string;
      stdout?: string;
    };
    if (err.code === "ENOENT") {
      throw new GitError("git is not on PATH. Install git and try again.");
    }
    const allowed = options?.allowExitCodes ?? [];
    const exitCode = typeof err.status === "number" ? err.status : err.code;
    if (typeof exitCode === "number" && allowed.includes(exitCode)) {
      return err.stdout ?? "";
    }
    const detail = (err.stderr || err.stdout || "").trim();
    throw new GitError(detail || `git ${args.join(" ")} failed.`);
  }
}

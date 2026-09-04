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
    return handleGitError(error, args, options);
  }
}

/** Same as `runGit` but returns a Buffer so binary blobs are not utf-8 decoded. */
export async function runGitBuffer(
  args: string[],
  cwd: string,
  options?: { allowExitCodes?: number[] },
): Promise<Buffer> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      encoding: "buffer",
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch (error: unknown) {
    const text = handleGitError(error, args, options);
    return Buffer.from(text);
  }
}

function handleGitError(
  error: unknown,
  args: string[],
  options?: { allowExitCodes?: number[] },
): string {
  const err = error as {
    code?: string | number;
    status?: number;
    stderr?: string | Buffer;
    stdout?: string | Buffer;
  };
  if (err.code === "ENOENT") {
    throw new GitError("git is not on PATH. Install git and try again.");
  }
  const allowed = options?.allowExitCodes ?? [];
  const exitCode = typeof err.status === "number" ? err.status : err.code;
  if (typeof exitCode === "number" && allowed.includes(exitCode)) {
    return bufferToString(err.stdout);
  }
  const detail = (bufferToString(err.stderr) || bufferToString(err.stdout)).trim();
  throw new GitError(detail || `git ${args.join(" ")} failed.`);
}

function bufferToString(value: string | Buffer | undefined): string {
  if (value == null) return "";
  return typeof value === "string" ? value : value.toString("utf8");
}

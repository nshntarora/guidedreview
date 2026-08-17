export interface CliArgs {
  cwd: string;
  base?: string;
  port?: number;
  open: boolean;
  staged: boolean;
  includeUntracked: boolean;
  provider?: string;
  model?: string;
  agent?: string;
  help: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    cwd: process.cwd(),
    open: true,
    staged: false,
    includeUntracked: true,
    help: false,
  };

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--no-open") {
      args.open = false;
      continue;
    }
    if (token === "--staged") {
      args.staged = true;
      continue;
    }
    if (token === "--no-untracked") {
      args.includeUntracked = false;
      continue;
    }
    if (token === "--base") {
      args.base = argv[++i];
      continue;
    }
    if (token === "--port") {
      const raw = argv[++i];
      const port = Number(raw);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error(`Invalid --port ${raw}. Use an integer 0–65535.`);
      }
      args.port = port;
      continue;
    }
    if (token === "--provider") {
      args.provider = argv[++i];
      continue;
    }
    if (token === "--model") {
      args.model = argv[++i];
      continue;
    }
    if (token === "--agent") {
      args.agent = argv[++i];
      continue;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown flag ${token}. Run guided-review --help.`);
    }
    positional.push(token);
  }

  if (positional[0]) args.cwd = positional[0];
  return args;
}

export const HELP = `Usage: npm run review -- [dir] [options]

Review local changes against the main branch. Opens a browser UI.
(Workspace CLI: @guided-review/cli. Not the npm package named guided-review.)

  --base <ref>       Base branch (default: origin/HEAD, then main, then master)
  --port <n>         Listen port (default: first free port)
  --no-open          Print the URL without opening a browser
  --staged           Only staged changes vs the merge-base
  --no-untracked     Skip untracked files
  --provider <id>    anthropic | openai | grok
  --model <id>       Provider model id
  --agent <id>       claude-code | codex | grok (reuse that coding agent's key)
  -h, --help         Show this help
`;

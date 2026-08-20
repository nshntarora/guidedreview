export const PRODUCT_MARK = "//!?";

export type DiffFreshness = "up to date" | "changed";

export type CliStatus = {
  url?: string;
  files?: number;
  scope?: string;
  headRef?: string;
  baseRef?: string;
  provider?: string;
  model?: string;
  agent?: string | null;
  hasKey?: boolean;
  lastPullAt?: Date | null;
  diffFresh?: DiffFreshness;
};

const LIME = "\x1b[38;2;202;255;87m";
const RESET = "\x1b[0m";

function clock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function filesLine(status: CliStatus): string {
  const files =
    status.files === undefined ? "—" : `${status.files} file${status.files === 1 ? "" : "s"}`;
  const vs = status.headRef && status.baseRef ? `${status.headRef} vs ${status.baseRef}` : "—";
  return `${files} · ${vs} · ${status.scope ?? "—"}`;
}

function modelLine(status: CliStatus): string {
  const model = status.provider && status.model ? `${status.provider}/${status.model}` : "—";
  const agent = status.agent ? ` · agent ${status.agent}` : "";
  const key = status.hasKey === undefined ? "" : ` · key ${status.hasKey ? "yes" : "no"}`;
  return `${model}${agent}${key}`;
}

function pullLine(status: CliStatus): string {
  const pulled = status.lastPullAt ? clock(status.lastPullAt) : "—";
  return `last pull ${pulled} · ${status.diffFresh ?? "—"}`;
}

/** Fixed 6-line banner so a TTY sticky header does not jump. */
export function formatBanner(status: CliStatus, options?: { color?: boolean }): string {
  const mark = options?.color ? `${LIME}${PRODUCT_MARK}${RESET}` : PRODUCT_MARK;
  const url = status.url ?? "—";
  return [
    `  ${mark}  Guided Review`,
    `        ${url}`,
    "",
    `  ${filesLine(status)}`,
    `  ${modelLine(status)}`,
    `  ${pullLine(status)}`,
  ].join("\n");
}

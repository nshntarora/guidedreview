import { parseUnifiedDiff, type ReviewContext, type ReviewPlan } from "@guided-review/core";

// Frozen source for a fictional package. The review plan never supplies rendered code.
const changes = [
  {
    path: "src/options.ts",
    before: `export interface RequestOptions {
  headers?: Record<string, string>;
}
`,
    after: `export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  retry?: Partial<RetryOptions>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function resolveRetry(options: Partial<RetryOptions> = {}): RetryOptions {
  const retry = { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 5000, ...options };
  if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }
  if (!Number.isFinite(retry.baseDelayMs) || retry.baseDelayMs < 0 ||
      !Number.isFinite(retry.maxDelayMs) || retry.maxDelayMs < retry.baseDelayMs) {
    throw new RangeError("Retry delays must be finite, non-negative, and ordered");
  }
  return retry;
}
`,
  },
  {
    path: "test/options.test.ts",
    after: `import { describe, expect, it } from "vitest";
import { resolveRetry } from "../src/options";

describe("retry options", () => {
  it("merges overrides without mutating defaults", () => {
    expect(resolveRetry({ maxAttempts: 1 })).toEqual({
      maxAttempts: 1, baseDelayMs: 200, maxDelayMs: 5000,
    });
    expect(resolveRetry().maxAttempts).toBe(3);
  });
  it("rejects invalid attempts and delay ranges", () => {
    expect(() => resolveRetry({ maxAttempts: 0 })).toThrow(RangeError);
    expect(() => resolveRetry({ baseDelayMs: 6000 })).toThrow(RangeError);
    expect(() => resolveRetry({ maxDelayMs: Infinity })).toThrow(RangeError);
  });
});
`,
  },
  {
    path: "src/retry-policy.ts",
    after: `const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function canRetry(method: string, status: number): boolean {
  return SAFE_METHODS.has(method.toUpperCase()) && RETRYABLE_STATUS.has(status);
}

export function retryAfterMs(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}
`,
  },
  {
    path: "test/retry-policy.test.ts",
    after: `import { expect, it } from "vitest";
import { canRetry, retryAfterMs } from "../src/retry-policy";

it("retries transient failures only for safe methods", () => {
  expect(canRetry("get", 503)).toBe(true);
  expect(canRetry("POST", 503)).toBe(false);
  expect(canRetry("GET", 401)).toBe(false);
});

it("accepts Retry-After seconds and HTTP dates", () => {
  expect(retryAfterMs("2")).toBe(2000);
  expect(retryAfterMs("Thu, 01 Jan 1970 00:00:05 GMT", 1000)).toBe(4000);
  expect(retryAfterMs("tomorrow")).toBeNull();
});
`,
  },
  {
    path: "src/backoff.ts",
    after: `import type { RetryOptions } from "./options";

export function backoffMs(
  attempt: number,
  options: RetryOptions,
  retryAfter: number | null,
  random = Math.random,
): number {
  const ceiling = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt);
  const jitter = Math.floor(random() * ceiling);
  return Math.min(options.maxDelayMs, Math.max(jitter, retryAfter ?? 0));
}
`,
  },
  {
    path: "test/backoff.test.ts",
    after: `import { expect, it } from "vitest";
import { backoffMs } from "../src/backoff";

const options = { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 5000 };

it("uses full jitter with an exponential ceiling", () => {
  expect(backoffMs(0, options, null, () => 0.5)).toBe(100);
  expect(backoffMs(2, options, null, () => 0.5)).toBe(400);
  expect(backoffMs(10, options, null, () => 0.5)).toBe(2500);
});

it("waits at least as long as a short Retry-After", () => {
  expect(backoffMs(0, options, 2000, () => 0)).toBe(2000);
});
`,
  },
  {
    path: "src/sleep.ts",
    after: `export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      cleanup();
      reject(signal?.reason);
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
`,
  },
  {
    path: "test/sleep.test.ts",
    after: `import { expect, it, vi } from "vitest";
import { sleep } from "../src/sleep";

it("cancels a pending wait and removes its timer", async () => {
  vi.useFakeTimers();
  try {
    const controller = new AbortController();
    const waiting = sleep(5000, controller.signal);
    const result = expect(waiting).rejects.toThrow("cancelled");
    controller.abort(new Error("cancelled"));
    await result;
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
`,
  },
  {
    path: "src/client.ts",
    before: `import type { RequestOptions } from "./options";

export async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  return fetch(url, { headers: options.headers });
}
`,
    after: `import { resolveRetry, type RequestOptions } from "./options";
import { canRetry, retryAfterMs } from "./retry-policy";
import { backoffMs } from "./backoff";
import { sleep } from "./sleep";

export async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const retry = resolveRetry(options.retry);
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 30_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    const response = await fetch(url, { headers: options.headers, signal });
    if (!canRetry("GET", response.status) || attempt + 1 >= retry.maxAttempts) {
      return response;
    }
    const delay = backoffMs(attempt, retry, retryAfterMs(response.headers.get("Retry-After")));
    await response.body?.cancel();
    await sleep(delay, signal);
  }
}
`,
  },
  {
    path: "test/client.test.ts",
    before: `import { expect, it } from "vitest";
import { request } from "../src/client";

it("exports a request function", () => {
  expect(typeof request).toBe("function");
});
`,
    after: `import { expect, it, vi } from "vitest";
import { request } from "../src/client";

it("retries a busy server and returns the eventual response", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response("busy", { status: 503 }))
    .mockResolvedValueOnce(new Response("ready", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  try {
    const response = await request("https://example.test", { retry: { baseDelayMs: 0 } });
    expect(await response.text()).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally {
    vi.unstubAllGlobals();
  }
});
`,
  },
  {
    path: "src/index.ts",
    before: `export { request } from "./client";
export type { RequestOptions } from "./options";
`,
    after: `export { request } from "./client";
export type { RequestOptions, RetryOptions } from "./options";
`,
  },
  {
    path: "README.md",
    before: `# Parcel HTTP

A small fetch wrapper for Node.js 22 and modern browsers.
`,
    after: `# Parcel HTTP

A small fetch wrapper for Node.js 22 and modern browsers.

## Retries

GET requests retry transient HTTP failures up to three attempts total.
Network errors are returned to the caller without retrying.
Set retry.maxAttempts to 1 to disable retries.

Retries use exponential backoff with full jitter and honor Retry-After.
The default delay cap is five seconds. A thirty-second deadline covers
the entire request, including waits between attempts.

Pass an AbortSignal to cancel both the active request and pending waits.
The final HTTP response is returned even if it is still an error response.
`,
  },
];

export const sampleDiffText =
  changes
    .map(({ path, before = "", after }) => {
      const oldLines = before
        .trimEnd()
        .split("\n")
        .filter(() => before.length > 0);
      const newLines = after.trimEnd().split("\n");
      return [
        `diff --git a/${path} b/${path}`,
        ...(before ? [] : ["new file mode 100644"]),
        before ? `--- a/${path}` : "--- /dev/null",
        `+++ b/${path}`,
        `@@ -${before ? 1 : 0},${oldLines.length} +1,${newLines.length} @@`,
        ...oldLines.map((line) => `-${line}`),
        ...newLines.map((line) => `+${line}`),
      ].join("\n");
    })
    .join("\n") + "\n";

export const sampleDiff = parseUnifiedDiff(sampleDiffText);

export const sampleContext: ReviewContext = {
  source: "github",
  owner: "parcel-example",
  repo: "parcel-http",
  number: 42,
  title: "Add bounded retries and cancellation to Parcel HTTP",
  author: "sample-author",
  baseRef: "main",
  headRef: "feat/retry-requests",
  description: `This fictional change adds retry options, safe-method eligibility, jittered backoff, and cancellation to a small HTTP package.

The public request function now makes up to three attempts for transient HTTP failures. One deadline spans the entire operation. Implementation and tests are grouped into five review units below.

Review focus: compare the Retry-After promise with the delay cap, and check whether the client tests cover cancellation and attempt exhaustion.`,
};

export const sampleLocalContext: ReviewContext = {
  source: "local",
  title: "feat/retry-requests",
  baseRef: "main",
  headRef: "feat/retry-requests",
  description: `Add bounded retries and cancellation to Parcel HTTP.

The branch adds retry options, safe-method eligibility, jittered backoff, and cancellation. Review the Retry-After boundary and whether the client tests cover cancellation and attempt exhaustion.`,
};

const units = [
  [
    "options",
    "Define the retry contract",
    "Start with the public configuration: maxAttempts includes the first request, and delays must be finite and ordered. Check how partial options interact with defaults and whether callers can explicitly pass undefined.",
    ["src/options.ts", "test/options.test.ts"],
  ],
  [
    "policy",
    "Decide which responses can be retried",
    "Eligibility is limited to safe methods and selected transient HTTP statuses. Retry-After accepts seconds or an HTTP date. Check malformed and negative header values; the current tests cover the common inputs only.",
    ["src/retry-policy.ts", "test/retry-policy.test.ts"],
  ],
  [
    "backoff",
    "Schedule retries with jitter",
    "Backoff grows exponentially and adds jitter to spread concurrent clients. Review the final Math.min carefully: a Retry-After longer than maxDelayMs is shortened, despite the README promising to honor it. The short-header test does not exercise that boundary.",
    ["src/backoff.ts", "test/backoff.test.ts"],
  ],
  [
    "cancel",
    "Make pending waits cancellable",
    "The wait helper removes its abort listener on completion and clears the timer on cancellation. Follow both cleanup paths and the already-aborted fast path. The shared deadline is connected by the client in the next unit.",
    ["src/sleep.ts", "test/sleep.test.ts"],
  ],
  [
    "integration",
    "Connect retries to the public client",
    "The client combines caller cancellation with one overall deadline, releases discarded response bodies, and returns the last HTTP response when attempts are exhausted. The integration test covers recovery after one failure; consider cancellation during a wait, exhausted attempts, and the documented Retry-After guarantee before approving.",
    ["src/client.ts", "test/client.test.ts", "src/index.ts", "README.md"],
  ],
] as const;

export const samplePlan: ReviewPlan = {
  units: units.map(([id, title, context, paths]) => ({
    id,
    title,
    context,
    kind: "change",
    files: paths.map((fileId) => {
      const file = sampleDiff.files.find((file) => file.path === fileId);
      if (!file) throw new Error(`Sample review references missing file: ${fileId}`);
      return {
        fileId,
        hunkIds: file.hunks.map((hunk) => hunk.id),
        role: fileId.startsWith("test/") ? "test" : "core_logic",
      };
    }),
  })),
};

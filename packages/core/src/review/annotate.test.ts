import { describe, expect, it, vi } from "vitest";
import type { AnnotateReviewStreamEvent, DiffFile, ReviewUnit } from "../types";
import type {
  AnnotateReviewInput as ProviderAnnotateInput,
  AnnotateStreamEvent,
} from "../providers/types";
import { annotateReview } from "./annotate";

const provider = vi.hoisted(() => ({
  deltasByFirstFilePath: new Map<string, string[]>(),
  gate: null as Promise<void> | null,
}));

vi.mock("../providers", () => ({
  getProviderClient: () => ({
    testConnection: async () => {},
    async *annotateReviewStream(
      { diff }: ProviderAnnotateInput,
      options?: { signal?: AbortSignal },
    ): AsyncGenerator<AnnotateStreamEvent, void, unknown> {
      const deltas = provider.deltasByFirstFilePath.get(diff.files[0]?.path ?? "") ?? [];
      for (const text of deltas) {
        if (provider.gate) await provider.gate;
        if (options?.signal?.aborted) return;
        yield { type: "text_delta", text };
      }
      yield { type: "done" };
    },
  }),
}));

function oversizedFile(path: string): DiffFile {
  return {
    path,
    status: "modified",
    isBinaryOrElided: false,
    hunks: [
      {
        id: `${path}#0`,
        header: "@@ -1 +1 @@",
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1,
        lines: [{ type: "add", content: "x".repeat(60_000), newLine: 1 }],
      },
    ],
  };
}

function twoHunkFile(path: string): DiffFile {
  return {
    path,
    status: "modified",
    isBinaryOrElided: false,
    hunks: [0, 1].map((i) => ({
      id: `${path}#${i}`,
      header: "@@ -1 +1 @@",
      oldStart: 1,
      oldLines: 1,
      newStart: 1,
      newLines: 1,
      lines: [{ type: "add" as const, content: `line ${i}`, newLine: 1 }],
    })),
  };
}

function unitJsonForHunks(id: string, fileId: string, hunkIds: string[]): string {
  return JSON.stringify({
    id,
    title: `Unit ${id}`,
    context: "Why",
    files: [{ fileId, hunkIds, role: "core_logic" }],
  });
}

function unitJson(id: string, fileId: string): string {
  return JSON.stringify({
    id,
    title: `Unit ${id}`,
    context: "Why",
    files: [{ fileId, hunkIds: [], role: "core_logic" }],
  });
}

function planJson(units: string[]): string {
  return `{"units":[${units.join(",")}]}`;
}

const settings = { provider: "anthropic" as const, model: "claude-sonnet-4-5", apiKey: "k" };
const context = {
  source: "github" as const,
  title: "A change",
  description: "",
  baseRef: "main",
  headRef: "feat",
};

async function collect(
  diff: { files: DiffFile[] },
  signal?: AbortSignal,
): Promise<AnnotateReviewStreamEvent[]> {
  const events: AnnotateReviewStreamEvent[] = [];
  for await (const event of annotateReview({ diff, context, settings, signal })) {
    events.push(event);
  }
  return events;
}

const unitIds = (events: AnnotateReviewStreamEvent[]): string[] =>
  events.flatMap((e) => (e.type === "UNIT" ? [e.unit.id] : []));

const donePlan = (events: AnnotateReviewStreamEvent[]): ReviewUnit[] | undefined =>
  events.find((e) => e.type === "DONE")?.plan.units;

describe("annotateReview", () => {
  beforeEach(() => {
    provider.deltasByFirstFilePath.clear();
    provider.gate = null;
  });

  it("namespaces unit ids per chunk so ids from different chunks cannot collide", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [planJson([unitJson("shared", "a.ts")])]);
    provider.deltasByFirstFilePath.set("b.ts", [planJson([unitJson("shared", "b.ts")])]);

    const events = await collect({ files: [oversizedFile("a.ts"), oversizedFile("b.ts")] });

    expect(unitIds(events)).toEqual(["c0-shared", "c1-shared"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-shared", "c1-shared"]);
  });

  it("posts waiting_for_tokens then tokens_streaming STATUS before units", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [planJson([unitJson("u1", "a.ts")])]);

    const events = await collect({ files: [oversizedFile("a.ts")] });

    const statusPhases = events
      .filter(
        (e): e is Extract<AnnotateReviewStreamEvent, { type: "STATUS" }> => e.type === "STATUS",
      )
      .map((e) => e.phase);
    expect(statusPhases).toEqual(["waiting_for_tokens", "tokens_streaming"]);
    const firstUnitIdx = events.findIndex((e) => e.type === "UNIT");
    const lastStatusIdx = events.map((e) => e.type).lastIndexOf("STATUS");
    expect(lastStatusIdx).toBeLessThan(firstUnitIdx);
  });

  it("drops units referencing a file the model was not given", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("real", "a.ts"), unitJson("ghost", "not-in-the-diff.ts")]),
    ]);

    const events = await collect({ files: [oversizedFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-real"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-real"]);
  });

  it("emits every unit exactly once when the model skips a required field", async () => {
    const malformed = JSON.stringify({ id: "u2", title: "No context or files" });
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([
        unitJsonForHunks("u1", "a.ts", ["a.ts#0"]),
        malformed,
        unitJsonForHunks("u3", "a.ts", ["a.ts#1"]),
      ]),
    ]);

    const events = await collect({ files: [twoHunkFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-u1", "c0-u3"]);
    expect(donePlan(events)?.map((u) => u.id)).toEqual(["c0-u1", "c0-u3"]);
  });

  it("drops a later unit that claims hunks an earlier unit already took", async () => {
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("u1", "a.ts"), unitJson("u3", "a.ts")]),
    ]);

    const events = await collect({ files: [oversizedFile("a.ts")] });

    expect(unitIds(events)).toEqual(["c0-u1"]);
  });

  it("stops yielding once the signal aborts", async () => {
    let openGate = (): void => {};
    provider.gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    provider.deltasByFirstFilePath.set("a.ts", [
      planJson([unitJson("u1", "a.ts")]),
      planJson([unitJson("u2", "a.ts")]),
    ]);

    const abort = new AbortController();
    const events: AnnotateReviewStreamEvent[] = [];
    const running = (async () => {
      for await (const event of annotateReview({
        diff: { files: [oversizedFile("a.ts")] },
        context,
        settings,
        signal: abort.signal,
      })) {
        events.push(event);
      }
    })();

    abort.abort();
    openGate();
    await running;

    expect(events.filter((e) => e.type === "DONE" || e.type === "UNIT")).toEqual([]);
  });
});

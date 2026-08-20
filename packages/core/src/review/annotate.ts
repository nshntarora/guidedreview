import type {
  AnnotateReviewStreamEvent,
  ParsedDiff,
  ProviderSettings,
  ReviewContext,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
} from "../types";
import { chunkDiffByFile } from "./buildPrompt";
import { parseReviewUnit, prefixChunkUnitId, stripDuplicateHunks } from "./reviewPlan";
import { StreamPlanParser } from "./streamPlanParser";
import { getProviderClient } from "../providers";
import { ProviderError, type ProviderClient } from "../providers/types";

export interface AnnotateReviewInput {
  diff: ParsedDiff;
  context: ReviewContext;
  settings: ProviderSettings;
  signal?: AbortSignal;
}

/**
 * Chunk the diff, stream each chunk through the configured provider, validate
 * every unit against the real files, and yield STATUS / UNIT / DONE / ERROR.
 * Hosts must not re-implement this loop.
 */
export async function* annotateReview(
  input: AnnotateReviewInput,
): AsyncGenerator<AnnotateReviewStreamEvent, void, unknown> {
  const { diff, context, settings, signal } = input;

  try {
    // Emit before chunking or the first provider call so the host can leave
    // "processing the diff" even when those steps take a while.
    yield { type: "STATUS", phase: "waiting_for_tokens" };

    const client = getProviderClient(settings.provider);
    const chunks = chunkDiffByFile(diff).filter((chunk) => chunk.files.length > 0);
    const allUnits: ReviewUnit[] = [];
    const seenHunkIds = new Set<string>();
    const streamStatus = { postedWaiting: true, postedStreaming: false };

    for (const [chunkIndex, chunk] of chunks.entries()) {
      if (signal?.aborted) return;

      for await (const event of streamChunkUnits(client, chunk, context, settings, {
        chunkIndex,
        seenHunkIds,
        signal,
      })) {
        if (signal?.aborted) return;
        if (event.type === "token") {
          if (!streamStatus.postedStreaming) {
            streamStatus.postedStreaming = true;
            yield { type: "STATUS", phase: "tokens_streaming" };
          }
          continue;
        }
        allUnits.push(event.unit);
        yield { type: "UNIT", unit: event.unit };
      }
    }

    if (signal?.aborted) return;

    const plan: ReviewPlan = { units: allUnits };
    yield { type: "DONE", plan };
  } catch (error) {
    if (signal?.aborted) return;
    yield { type: "ERROR", error: describeError(error) };
  }
}

/**
 * Stream one diff chunk through the provider and yield the review units that
 * survive validation, already deduplicated and namespaced by chunk.
 */
type ChunkEvent = { type: "token" } | { type: "unit"; unit: ReviewUnit };

async function* streamChunkUnits(
  client: ProviderClient,
  chunk: ParsedDiff,
  context: ReviewContext,
  settings: ProviderSettings,
  {
    chunkIndex,
    seenHunkIds,
    signal,
  }: {
    chunkIndex: number;
    seenHunkIds: Set<string>;
    signal?: AbortSignal;
  },
): AsyncGenerator<ChunkEvent, void, unknown> {
  const parser = new StreamPlanParser();
  const knownFiles = new Map(chunk.files.map((file) => [file.path, file]));
  let sawToken = false;

  for await (const event of client.annotateReviewStream(
    { diff: chunk, context, settings },
    { signal },
  )) {
    if (signal?.aborted) return;

    if (event.type === "heartbeat") {
      if (!sawToken) {
        sawToken = true;
        yield { type: "token" };
      }
      continue;
    }

    if (event.type === "text_delta" && !sawToken) {
      sawToken = true;
      yield { type: "token" };
    }

    const raw =
      event.type === "text_delta"
        ? parser.push(event.text)
        : event.type === "done"
          ? parser.finish()
          : [];

    for (const candidate of raw) {
      for (const cleaned of parseReviewUnit(candidate, knownFiles)) {
        if (signal?.aborted) return;
        const deduped = stripDuplicateHunks(cleaned, knownFiles, seenHunkIds);
        if (!deduped) continue;
        yield { type: "unit", unit: { ...deduped, id: prefixChunkUnitId(chunkIndex, deduped.id) } };
      }
    }
  }
}

export function describeError(error: unknown): ReviewErrorInfo {
  if (error instanceof ProviderError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    };
  }
  return { message: describeErrorMessage(error) };
}

export function describeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong while building the review.";
}

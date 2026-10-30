import type {
  AnnotateReviewStreamEvent,
  ParsedDiff,
  ProviderSettings,
  ReviewContext,
  ReviewErrorInfo,
  ReviewPlan,
  ReviewUnit,
  ReviewTokenUsage,
} from "../types";
import { buildUserPrompt, chunkDiffByFile, SYSTEM_PROMPT } from "./buildPrompt";
import { REVIEW_PLAN_JSON_SCHEMA } from "./reviewSchema";
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
    let postedStreaming = false;
    const chunkUsage: ReviewTokenUsage[] = [];

    for (const [chunkIndex, chunk] of chunks.entries()) {
      if (signal?.aborted) return;

      for await (const event of streamChunkUnits(client, chunk, context, settings, {
        chunkIndex,
        seenHunkIds,
        signal,
      })) {
        if (signal?.aborted) return;
        if (event.type === "usage") {
          chunkUsage[chunkIndex] = event.usage;
          yield {
            type: "USAGE",
            usage: {
              inputTokens: chunkUsage.reduce((sum, usage) => sum + usage.inputTokens, 0),
              outputTokens: chunkUsage.reduce((sum, usage) => sum + usage.outputTokens, 0),
              inputEstimated: chunkUsage.some((usage) => usage.inputEstimated),
              outputEstimated: chunkUsage.some((usage) => usage.outputEstimated),
            },
          };
          continue;
        }
        if (event.type === "token") {
          if (!postedStreaming) {
            postedStreaming = true;
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
type ChunkEvent =
  | { type: "token" }
  | { type: "unit"; unit: ReviewUnit }
  | { type: "usage"; usage: ReviewTokenUsage };

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
  const emittedIds = new Set<string>();
  // A character-based estimate keeps progress visible until provider usage arrives.
  // Include the schema because structured-output instructions also consume input.
  let usage: ReviewTokenUsage = {
    inputTokens: Math.ceil(
      (SYSTEM_PROMPT.length +
        buildUserPrompt(chunk, context).length +
        JSON.stringify(REVIEW_PLAN_JSON_SCHEMA).length) /
        4,
    ),
    outputTokens: 0,
    inputEstimated: true,
    outputEstimated: true,
  };
  let outputCharacters = 0;
  yield { type: "usage", usage };

  for await (const event of client.annotateReviewStream(
    { diff: chunk, context, settings },
    { signal },
  )) {
    if (signal?.aborted) return;

    if (event.type === "usage") {
      usage = {
        inputTokens: event.inputTokens ?? usage.inputTokens,
        outputTokens: event.outputTokens ?? usage.outputTokens,
        inputEstimated: event.inputTokens === undefined ? usage.inputEstimated : false,
        outputEstimated: event.outputTokens === undefined ? usage.outputEstimated : false,
      };
      yield { type: "usage", usage };
      continue;
    }

    if (event.type === "text_delta" || (event.type === "heartbeat" && event.text)) {
      outputCharacters += event.text?.length ?? 0;
      usage = {
        ...usage,
        outputTokens: Math.max(usage.outputTokens, Math.ceil(outputCharacters / 4)),
        outputEstimated: true,
      };
      yield { type: "usage", usage };
    }

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
        const baseId = prefixChunkUnitId(chunkIndex, deduped.id);
        let id = baseId;
        let suffix = 2;
        while (emittedIds.has(id)) id = `${baseId}-${suffix++}`;
        emittedIds.add(id);
        yield { type: "unit", unit: { ...deduped, id } };
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

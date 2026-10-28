import type { ReviewTokenUsage } from "@guided-review/core";

export function TokenUsage({ usage }: { usage: ReviewTokenUsage }) {
  const count = (value: number, estimated: boolean) =>
    `${estimated ? "≈" : ""}${value.toLocaleString()}`;

  return (
    <div className="text-xs text-muted" data-testid="review-token-usage">
      <dl className="m-0 grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <dt>Input tokens</dt>
          <dd
            className="m-0 font-mono text-sm tabular-nums text-muted"
            data-testid="review-input-tokens"
          >
            {count(usage.inputTokens, usage.inputEstimated)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <dt>Output tokens</dt>
          <dd
            className="m-0 font-mono text-sm tabular-nums text-muted"
            data-testid="review-output-tokens"
          >
            <span
              key={usage.outputTokens}
              className="inline-block motion-safe:animate-gr-token-count"
            >
              {count(usage.outputTokens, usage.outputEstimated)}
            </span>
          </dd>
        </div>
      </dl>
      {(usage.inputEstimated || usage.outputEstimated) && (
        <p className="mt-2">≈ Estimated until the provider reports usage.</p>
      )}
    </div>
  );
}

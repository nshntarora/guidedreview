import type { BuildPhase } from "@guided-review/ui/review/store";
import { buildPhaseDetail } from "@guided-review/ui/review/overlayCopy";
import type { ReviewTokenUsage } from "@guided-review/core";
import { cn, Spinner } from "@guided-review/ui";
import { TokenUsage } from "./TokenUsage";

/** A schematic of the request, never model-generated code or a progress estimate. */
export function TokenStream({
  phase,
  providerLabel,
  usage,
  generating,
  complete,
  className,
}: {
  phase: BuildPhase | null;
  providerLabel: string | null;
  usage: ReviewTokenUsage | null;
  generating: boolean;
  complete: boolean;
  className?: string;
}) {
  const streaming = generating && phase === "tokens_streaming";
  const sending =
    generating && (phase === "sent_to_provider" || phase === "waiting_for_tokens" || streaming);

  return (
    <div
      className={cn("mx-auto w-full max-w-52 px-2 pb-1 pt-2", className)}
      data-testid={generating ? "review-plan-progress" : undefined}
    >
      <svg
        viewBox="0 21 240 82"
        fill="none"
        className="block h-auto w-full opacity-60"
        aria-hidden="true"
        focusable="false"
      >
        {/* Input: a small diff, with deletions and additions. */}
        <rect x="0.5" y="24" width="61" height="62" rx="6" className="fill-surface stroke-border" />
        <path
          d="M9 37h7m-3.5-3.5v7m6-3.5h26M9 49h7m6 0h29M9 61h7m-3.5-3.5v7m6-3.5h20"
          className="stroke-faint"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M9 73h7m6 0h23" className="stroke-faint" strokeWidth="2" strokeLinecap="round" />

        {/* Token packets move along a directional connection, into the model. */}
        <path
          d="M63 55h27m-4-4 4 4-4 4M150 55h27m-4-4 4 4-4 4"
          className="stroke-border-strong"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {sending &&
          [0, 1, 2].map((index) => (
            <rect
              key={index}
              x="64"
              y="53"
              width="4"
              height="4"
              rx="1"
              className="fill-faint motion-safe:animate-gr-token-packet motion-reduce:hidden"
              style={{ animationDelay: `${index * -0.6}s` }}
            />
          ))}

        {/* The loader stays inside the model node while generation is active. */}
        <rect
          x="94"
          y="31"
          width="52"
          height="48"
          rx="12"
          className="fill-surface stroke-border-strong"
        />
        <path
          d="M105 28v-4m10 4v-4m10 4v-4m10 4v-4M105 82v4m10-4v4m10-4v4m10-4v4"
          className="stroke-border-strong"
          strokeLinecap="round"
        />
        <rect
          x="99"
          y="36"
          width="42"
          height="38"
          rx="8"
          className={`stroke-border ${generating ? "motion-safe:animate-gr-model-signal" : ""}`}
        />
        {complete && !generating ? (
          <path
            d="m112 55 5 5 11-11"
            className="stroke-faint"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <foreignObject x="110" y="45" width="20" height="20">
            <Spinner
              size={20}
              className={cn("block border-t-muted!", !generating && "animate-none")}
            />
          </foreignObject>
        )}

        {streaming &&
          [0, 1, 2].map((index) => (
            <rect
              key={index}
              x="151"
              y="53"
              width="4"
              height="4"
              rx="1"
              className="fill-faint motion-safe:animate-gr-token-packet motion-reduce:hidden"
              style={{ animationDelay: `${index * -0.6 - 0.3}s` }}
            />
          ))}

        {/* Output: code references above prose, arriving a line at a time. */}
        <rect
          x="180.5"
          y="24"
          width="59"
          height="62"
          rx="6"
          className="fill-surface stroke-border"
        />
        <g className={streaming || !generating ? "opacity-100" : "opacity-25"}>
          <g className={streaming ? "motion-safe:animate-gr-token-line" : ""}>
            <path
              d="m192 35-4 4 4 4m9-8 4 4-4 4m-4-9-2 10"
              className="stroke-faint"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M211 39h19" className="stroke-faint" strokeWidth="2" strokeLinecap="round" />
          </g>
          {[0, 1, 2].map((index) => (
            <path
              key={index}
              d={`M189 ${55 + index * 9}h${index === 2 ? 25 : 41}`}
              className={`stroke-muted ${streaming ? "motion-safe:animate-gr-token-line" : ""}`}
              strokeWidth="2"
              strokeLinecap="round"
              style={{ animationDelay: `${index * 0.25 + 0.25}s` }}
            />
          ))}
        </g>
        {usage && (
          <path d="M30 87v12m180-12v12" className="stroke-border-strong" strokeLinecap="round" />
        )}
      </svg>
      {usage && <TokenUsage usage={usage} />}
      {generating && (
        <p role="status" className="gr-sr-only">
          {phase ? buildPhaseDetail(phase, providerLabel) : "Generating review plan…"}
        </p>
      )}
    </div>
  );
}

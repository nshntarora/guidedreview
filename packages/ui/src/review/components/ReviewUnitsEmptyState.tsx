import { GENERATE_REVIEW_UNITS, RETRY_REVIEW_UNITS } from "@guided-review/ui/review/overlayCopy";
import { Button, buttonClassName } from "@guided-review/ui";
import { useReviewHost } from "@guided-review/ui/review/host";
import { ShortcutKeys } from "./ShortcutKeys";

/** The landing page's file-to-unit diagram, composed for the narrow sidebar. */
export function ReviewUnitsIllustration({
  className = "mx-auto block h-auto w-full max-w-64",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 260 170"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g className="font-mono text-[8px] fill-muted">
        <text x="8" y="17" letterSpacing="0.08em">
          CHANGED FILES
        </text>
        <text x="140" y="17" letterSpacing="0.08em">
          REVIEW UNITS
        </text>
      </g>
      <rect x="4" y="28" width="100" height="132" rx="8" className="fill-surface stroke-border" />
      {["api.ts", "db.sql", "form.tsx", "seed.ts", "tests.ts"].map((file, index) => (
        <g key={file}>
          <rect
            x="12"
            y={37 + index * 23}
            width="84"
            height="18"
            rx="4"
            className="fill-background stroke-border"
          />
          <text x="20" y={49 + index * 23} className="font-mono text-[8px] fill-muted">
            {file}
          </text>
        </g>
      ))}
      <path
        d="M111 96h20m-5-5 5 5-5 5"
        className="stroke-muted"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m121 70 2.5 6.5L130 79l-6.5 2.5L121 88l-2.5-6.5L112 79l6.5-2.5Z"
        className="fill-primary"
      />
      <rect x="138" y="28" width="118" height="132" rx="8" className="fill-surface stroke-border" />
      {[
        { title: "Data model", files: "db.sql · seed.ts" },
        { title: "Request flow", files: "api.ts · form.tsx" },
        { title: "Tests", files: "tests.ts" },
      ].map((unit, index) => (
        <g key={unit.title}>
          <rect
            x="146"
            y={36 + index * 40}
            width="102"
            height="34"
            rx="5"
            className={
              index === 0 ? "fill-primary-muted stroke-primary/60" : "fill-background stroke-border"
            }
          />
          <text
            x="153"
            y={50 + index * 40}
            className={`font-mono text-[8px] ${index === 0 ? "fill-primary" : "fill-foreground"}`}
          >
            {index + 1} {unit.title}
          </text>
          <text x="153" y={61 + index * 40} className="font-mono text-[7px] fill-muted">
            {unit.files}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ReviewUnitsEmptyState({
  needsProvider,
  retry = false,
  onGenerate,
}: {
  needsProvider: boolean;
  retry?: boolean;
  onGenerate?: () => void;
}) {
  const host = useReviewHost();

  return (
    <div className="px-1 py-3" data-testid="review-units-empty-state">
      <ReviewUnitsIllustration />
      <div className="mt-5 px-1">
        <h2 className="m-0 text-lg font-semibold leading-snug text-foreground">
          Follow the change, step by step
        </h2>
        <p className="mb-0 mt-2 text-sm leading-relaxed text-muted">
          A review unit groups related changes across files. AI puts them in a reading order, with a
          short explanation for each. You review the real diff and decide what needs work.
        </p>
        <div className="mt-4" data-testid={needsProvider ? "connect-provider-prompt" : undefined}>
          {retry && (
            <p className="mb-3 mt-0 text-sm leading-relaxed text-warning">
              The review plan couldn’t finish. Try again to generate review units.
            </p>
          )}
          {needsProvider ? (
            <>
              <Button
                size="sm"
                className="w-full"
                onClick={() => host.connectProvider()}
                data-testid="connect-provider-open-settings"
                aria-keyshortcuts="Meta+i Control+i"
                title="Connect AI provider (⌘/Ctrl+I)"
              >
                Connect AI Provider
                <ShortcutKeys keys={["mod", "I"]} join="chord" />
              </Button>
              <p className="mb-0 mt-2 text-xs leading-relaxed text-faint">
                Bring your own API key. Choose your provider in Settings.
              </p>
            </>
          ) : onGenerate ? (
            <Button
              size="sm"
              className="w-full"
              onClick={onGenerate}
              data-testid="generate-review-plan"
              aria-keyshortcuts="Meta+i Control+i"
              title={`${retry ? RETRY_REVIEW_UNITS : GENERATE_REVIEW_UNITS} (⌘/Ctrl+I)`}
            >
              {retry ? RETRY_REVIEW_UNITS : GENERATE_REVIEW_UNITS}
              <ShortcutKeys keys={["mod", "I"]} join="chord" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-3">
        {[
          {
            path: "/docs/how-it-works",
            label: "How review units work",
            tag: "Docs",
            id: "review-units-docs",
          },
          {
            path: "/guides/review-large-ai-generated-prs",
            label: "Review a large PR",
            tag: "Guide",
            id: "review-units-guide",
          },
          ...(needsProvider
            ? [
                {
                  path: "/docs/configure-provider",
                  label: "Connect your provider",
                  tag: "Setup",
                  id: "connect-provider-learn-more",
                },
              ]
            : []),
        ].map((link) => (
          <a
            key={link.path}
            href={`https://guidedreview.dev${link.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "w-full justify-between! gap-2! px-2! text-sm!",
            })}
            data-testid={link.id}
          >
            <span>{link.label}</span>
            <span className="shrink-0 font-mono text-xs text-faint">
              {link.tag} <span aria-hidden="true">↗</span>
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))}
      </div>
    </div>
  );
}

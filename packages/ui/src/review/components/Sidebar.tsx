import { useEffect, useId, useMemo, useRef } from "react";
import { Button, cn } from "@guided-review/ui";
import { useReviewStore } from "@guided-review/ui/review/store";
import { buildFileTree } from "@guided-review/ui/review/fileNavigation";
import { TestsUnitIcon } from "./TestsUnitIcon";
import { ReviewUnitsEmptyState } from "./ReviewUnitsEmptyState";
import { FileNavigation } from "./FileNavigation";
import { ShortcutKeys } from "./ShortcutKeys";
import { TokenStream } from "./TokenStream";

interface SidebarProps {
  onGenerate?: () => void;
  onSelect?: () => void;
}

export function Sidebar({ onGenerate, onSelect }: SidebarProps) {
  const state = useReviewStore();
  const { diff, plan, planSource, planComplete, navigationMode, selection, status, needsProvider } =
    state;
  const units = planSource === "ai" ? (plan?.units ?? []) : [];
  const tree = useMemo(() => buildFileTree(diff), [diff]);
  const id = useId();
  const navRef = useRef<HTMLElement>(null);
  const stillBuilding = status === "streaming" || (status === "loading" && !!diff);
  const hasFiles = !!diff?.files.length;
  const selectionId =
    selection.kind === "file"
      ? selection.path
      : selection.kind === "unit"
        ? selection.id
        : "summary";

  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selectionId, navigationMode]);

  return (
    <nav
      ref={navRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-background"
      aria-label="Browse changes"
      data-review-navigation
      data-testid="review-navigation"
    >
      <div className="shrink-0 border-b border-border p-3">
        <div
          role="tablist"
          aria-label="Navigate changes"
          className="flex gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {(["files", "units"] as const).map((mode) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              role="tab"
              id={`${id}-${mode}`}
              aria-controls={`${id}-${mode}-panel`}
              aria-selected={navigationMode === mode}
              aria-keyshortcuts={mode === "files" ? "1" : "2"}
              title={`${mode === "files" ? "Files" : "Review units"} (${mode === "files" ? "1" : "2"})`}
              tabIndex={navigationMode === mode ? 0 : -1}
              className={cn(
                "min-w-0 flex-auto gap-1! whitespace-nowrap px-1.5! py-1.5! text-sm!",
                navigationMode === mode
                  ? "border-border-strong! bg-surface-muted! text-foreground! shadow-sm"
                  : "text-muted",
              )}
              data-testid={`navigation-tab-${mode}`}
              onClick={() => state.setNavigationMode(mode)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "files"
                    : event.key === "End"
                      ? "units"
                      : mode === "files"
                        ? "units"
                        : "files";
                state.setNavigationMode(next);
                navRef.current?.querySelector<HTMLElement>(`[id="${id}-${next}"]`)?.focus();
              }}
            >
              <span className="truncate">{mode === "files" ? "Files" : "Review units"}</span>
              <ShortcutKeys keys={[mode === "files" ? "1" : "2"]} className="shrink-0" />
            </Button>
          ))}
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto p-3"
        role="tabpanel"
        id={`${id}-${navigationMode}-panel`}
        aria-labelledby={`${id}-${navigationMode}`}
        data-testid={navigationMode === "files" ? "review-files" : "review-units"}
      >
        {navigationMode === "files" ? (
          <>
            {!diff ? (
              <p className="p-2 text-muted">
                {status === "error" ? "Diff unavailable. Try again." : "Loading changed files…"}
              </p>
            ) : !hasFiles ? (
              <p className="p-2 text-muted">No changed files in this scope.</p>
            ) : (
              <FileNavigation directory={tree} onSelect={onSelect} />
            )}
          </>
        ) : (
          <>
            {units.map((unit, index) => {
              const active = selection.kind === "unit" && selection.id === unit.id;
              return (
                <Button
                  key={unit.id}
                  variant="ghost"
                  size="sm"
                  title={unit.title}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "mb-1.5 min-h-10 w-full items-start! justify-start! gap-2.5! px-2! py-2! text-left text-sm!",
                    active && "border-primary/30! bg-primary-muted! text-primary!",
                  )}
                  data-testid={`review-unit-${index + 1}`}
                  onClick={() => {
                    state.selectContent({ kind: "unit", id: unit.id });
                    onSelect?.();
                  }}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border font-mono text-xs tabular-nums",
                      active
                        ? "border-primary/30 bg-primary-muted text-primary"
                        : "border-border bg-surface-raised text-muted",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 self-center break-words leading-relaxed">
                    {unit.kind === "tests" && <TestsUnitIcon className="mr-1.5 inline-block" />}
                    {unit.title}
                  </span>
                </Button>
              );
            })}
            {stillBuilding ? null : !hasFiles ? (
              <p className="p-2 text-muted">
                {diff
                  ? "No changed files in this scope."
                  : "Load the diff to generate a review plan."}
              </p>
            ) : !planComplete && units.length === 0 ? (
              <ReviewUnitsEmptyState
                needsProvider={needsProvider}
                retry={status === "error" && !needsProvider}
                onGenerate={onGenerate}
              />
            ) : !planComplete ? (
              <div className="p-2">
                <p className="text-sm text-muted">
                  {units.length
                    ? "This review plan is incomplete. Retry to finish it; files remain available."
                    : "Group related changes into an ordered review. You still read the code."}
                </p>
                {onGenerate && (
                  <Button
                    size="sm"
                    className="w-full"
                    data-testid="generate-review-plan"
                    aria-keyshortcuts="Meta+i Control+i"
                    title="Generate review plan (⌘/Ctrl+I)"
                    onClick={onGenerate}
                  >
                    {status === "error" || units.length
                      ? "Retry review plan"
                      : "Generate review plan"}
                    <ShortcutKeys keys={["mod", "I"]} join="chord" />
                  </Button>
                )}
              </div>
            ) : units.length === 0 ? (
              <p className="p-2 text-muted">
                No review units were generated. Browse Files to review the changes.
              </p>
            ) : null}
            {(stillBuilding || state.tokenUsage || (planSource === "ai" && planComplete)) && (
              <TokenStream
                className={units.length > 0 ? "mt-8" : undefined}
                phase={state.buildPhase}
                providerLabel={state.providerLabel}
                usage={state.tokenUsage}
                generating={stillBuilding}
                complete={planSource === "ai" && planComplete}
              />
            )}
          </>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${id}-${navigationMode === "files" ? "units" : "files"}-panel`}
        aria-labelledby={`${id}-${navigationMode === "files" ? "units" : "files"}`}
        hidden
      />
    </nav>
  );
}

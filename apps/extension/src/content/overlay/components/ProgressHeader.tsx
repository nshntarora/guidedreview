import type { Ref } from "react";
import type { ParsedDiff } from "@extension/lib/types";
import type { ReviewContext } from "@guided-review/core";
import { summarizeDiff } from "@guided-review/core";
import { Kbd, Select, type SelectHandle, type SelectOption } from "@guided-review/ui";
import { useReviewHost } from "../host";
import {
  isCommitScopeId,
  limitCommitScopes,
  RECENT_COMMITS_GROUP,
  type LocalDiffControls,
  type LocalDiffScopeOption,
} from "../localReview";
import { DiffStatCounts } from "./DiffStatCounts";
import { ScopeIcon } from "./ScopeIcons";
import { ModEnterChord, ShortcutKeys } from "./ShortcutKeys";

interface ProgressHeaderProps {
  prContext: ReviewContext | null;
  diff: ParsedDiff | null;
  /** Id for the dialog title (overlay aria-labelledby). */
  titleId: string;
  /** Accessible / visible title text. */
  title: string;
  onExit: () => void;
  /** When false, hide Exit (local CLI — the process owns the window). */
  allowExit?: boolean;
  /** Opens the Submit Review modal or copies local notes. */
  onSubmitReview: () => void;
  /** When set, the primary action is copy-notes (no GitHub submit). */
  notesCount?: number;
  localDiff?: LocalDiffControls;
  scopeSelectRef?: Ref<SelectHandle | null>;
}

const headerBtn =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-base font-medium";

function ScopeMeta({ scope }: { scope: LocalDiffScopeOption }) {
  const stat = scope.stat;
  if (!stat || stat.files === 0) {
    return <span className="truncate font-mono text-xs text-muted">{scope.meta}</span>;
  }
  return (
    <DiffStatCounts
      prefix={scope.metaPrefix}
      files={stat.files}
      additions={stat.additions}
      deletions={stat.deletions}
      className="truncate font-mono text-xs"
    />
  );
}

function ScopeTrigger({ scope }: { scope: LocalDiffScopeOption }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ScopeIcon scope={scope} />
      <span className="truncate">{scope.label}</span>
    </span>
  );
}

function ScopeOption({ scope }: { scope: LocalDiffScopeOption }) {
  return (
    <span className="flex min-w-0 items-start gap-2.5">
      <ScopeIcon scope={scope} className="mt-0.5" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate">{scope.label}</span>
        <span className="truncate text-xs text-muted">{scope.description}</span>
        <ScopeMeta scope={scope} />
      </span>
    </span>
  );
}

function FileChangeStats({
  files,
  additions,
  deletions,
}: {
  files: number;
  additions: number;
  deletions: number;
}) {
  return (
    <span>
      {files} file{files === 1 ? "" : "s"} changed
      <span className="ml-1 text-diff-add"> +{additions}</span>
      <span className="ml-1 text-diff-del"> −{deletions}</span>
    </span>
  );
}

function LocalTitleCluster({
  titleId,
  title,
  localDiff,
  scopeSelectRef,
  scopeOptions,
  stats,
}: {
  titleId: string;
  title: string;
  localDiff?: LocalDiffControls;
  scopeSelectRef?: Ref<SelectHandle | null>;
  scopeOptions: SelectOption[];
  stats: { files: number; additions: number; deletions: number } | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 text-sm text-muted">
      <h1 id={titleId} className="gr-sr-only">
        {title}
      </h1>
      {localDiff && scopeOptions.length > 0 && (
        <Select
          aria-label="Diff to review"
          aria-keyshortcuts="d"
          selectRef={scopeSelectRef}
          className="w-auto min-w-[10rem] max-w-[16rem]"
          menuClassName="min-w-[20rem] max-w-[24rem]"
          value={localDiff.selectedScope}
          options={scopeOptions}
          disabled={localDiff.scopeBusy}
          onChange={localDiff.onSelectScope}
          trailing={<Kbd>d</Kbd>}
        />
      )}
      {stats && <FileChangeStats {...stats} />}
    </div>
  );
}

function GitHubTitleCluster({
  titleId,
  title,
  prContext,
  showPrNumber,
  stats,
}: {
  titleId: string;
  title: string;
  prContext: ReviewContext | null;
  showPrNumber: boolean;
  stats: { files: number; additions: number; deletions: number } | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 id={titleId} className="m-0 truncate text-lg font-semibold leading-snug">
          {title}
        </h1>
        {showPrNumber && (
          <span className="shrink-0 text-base text-muted">#{prContext!.number}</span>
        )}
      </div>
      {prContext && (prContext.author || prContext.baseRef || prContext.headRef || stats) && (
        <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted">
          {prContext.author && <span>@{prContext.author}</span>}
          {(prContext.baseRef || prContext.headRef) && (
            <span className="inline-block rounded-full border border-border bg-surface px-2.5 py-px font-mono text-xs text-foreground">
              {prContext.baseRef || "?"} ← {prContext.headRef || "?"}
            </span>
          )}
          {stats && <FileChangeStats {...stats} />}
        </div>
      )}
    </div>
  );
}

export function ProgressHeader({
  prContext,
  diff,
  titleId,
  title,
  onExit,
  allowExit = true,
  onSubmitReview,
  notesCount,
  localDiff,
  scopeSelectRef,
}: ProgressHeaderProps) {
  const host = useReviewHost();
  const stats = diff ? summarizeDiff(diff) : null;
  const logomarkUrl = host.assetUrl("logomark.svg");
  const showPrNumber = host.kind === "github" && prContext?.number != null;
  const primaryIsExport = !host.submit && Boolean(host.exportNotes);
  const primaryDisabled = primaryIsExport && (notesCount ?? 0) === 0;
  const isLocal = host.kind === "local";
  const scopeOptions = (localDiff ? limitCommitScopes(localDiff.scopes) : []).map((scope) => ({
    value: scope.id,
    label: scope.label,
    disabled: scope.empty,
    group: isCommitScopeId(scope.id) ? RECENT_COMMITS_GROUP : undefined,
    trigger: () => <ScopeTrigger scope={scope} />,
    content: () => <ScopeOption scope={scope} />,
  }));

  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-border bg-background px-5 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <img
            className="block h-4 w-8 shrink-0"
            src={logomarkUrl}
            alt=""
            width={32}
            height={16}
            aria-hidden="true"
          />
          {isLocal ? (
            <LocalTitleCluster
              titleId={titleId}
              title={title}
              localDiff={localDiff}
              scopeSelectRef={scopeSelectRef}
              scopeOptions={scopeOptions}
              stats={stats}
            />
          ) : (
            <GitHubTitleCluster
              titleId={titleId}
              title={title}
              prContext={prContext}
              showPrNumber={showPrNumber}
              stats={stats}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className={`${headerBtn} border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 [&_[data-slot=kbd]]:bg-[rgba(13,8,6,0.12)] [&_[data-slot=kbd]]:text-inherit`}
            onClick={onSubmitReview}
            disabled={primaryDisabled}
            data-testid="submit-review-button"
          >
            {primaryIsExport ? "Copy notes" : "Submit Review"}
            <ModEnterChord />
          </button>
          {isLocal && (
            <button
              type="button"
              className={`${headerBtn} gap-2 border-border bg-surface text-foreground hover:bg-surface-muted`}
              onClick={() => host.connectProvider()}
              aria-keyshortcuts="Meta+, Control+,"
              data-testid="open-settings"
            >
              Settings
              <ShortcutKeys keys={["mod", ","]} join="chord" />
            </button>
          )}
          {allowExit && (
            <button
              type="button"
              className={`${headerBtn} gap-2 border-border bg-surface text-foreground hover:bg-surface-muted`}
              onClick={onExit}
            >
              Exit
              <Kbd>Esc</Kbd>
            </button>
          )}
        </div>
      </div>
      {isLocal && localDiff?.stale && (
        <div
          role="status"
          className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground"
          data-testid="stale-diff-banner"
        >
          <span>The diff on disk has changed.</span>
          <button
            type="button"
            className={`${headerBtn} border-border bg-surface text-foreground hover:bg-background`}
            onClick={() => localDiff.onRefresh?.()}
          >
            Refresh
          </button>
        </div>
      )}
    </header>
  );
}

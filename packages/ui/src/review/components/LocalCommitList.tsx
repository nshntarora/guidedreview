import {
  MAX_SIDEBAR_COMMITS,
  type LocalCommitCard,
  type LocalDiffScopeOption,
} from "@guided-review/ui/review/localReview";
import { DiffStatCounts } from "./DiffStatCounts";

export function LocalCommitList({
  commits = [],
  totalCommits = commits.length,
  uncommitted,
}: {
  commits?: LocalCommitCard[];
  totalCommits?: number;
  uncommitted?: LocalDiffScopeOption;
}) {
  const recentCommits = commits.slice(0, MAX_SIDEBAR_COMMITS);
  const remainingCommits = totalCommits - recentCommits.length;
  const showUncommitted = uncommitted && !uncommitted.empty;
  if (!recentCommits.length && !showUncommitted) return null;
  return (
    <section aria-label="Commits" data-testid="sidebar-commits">
      <h2 className="mb-2 text-xs font-semibold tracking-[0.04em] text-muted uppercase">Commits</h2>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0" data-testid="commit-list">
        {showUncommitted ? <UncommittedCard scope={uncommitted} /> : null}
        {recentCommits.map((commit) => (
          <CommitCard key={commit.sha} commit={commit} />
        ))}
      </ol>
      {remainingCommits > 0 && (
        <p className="m-0 mt-2 text-xs text-muted" data-testid="more-commits">
          + {remainingCommits} more {remainingCommits === 1 ? "commit" : "commits"}
        </p>
      )}
    </section>
  );
}

function formatCommitDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function UncommittedCard({ scope }: { scope: LocalDiffScopeOption }) {
  return (
    <li
      className="rounded-md border border-border bg-background px-2.5 py-2"
      data-testid="uncommitted-card"
    >
      <h3 className="m-0 text-sm font-semibold leading-snug text-foreground">{scope.label}</h3>
      {scope.stat && scope.stat.files > 0 ? (
        <p className="m-0 mt-0.5 text-xs">
          <DiffStatCounts {...scope.stat} />
        </p>
      ) : scope.meta ? (
        <p className="m-0 mt-0.5 text-xs text-muted">{scope.meta}</p>
      ) : null}
      {scope.description ? (
        <p className="m-0 mt-1 text-xs leading-normal text-foreground">{scope.description}</p>
      ) : null}
    </li>
  );
}

function CommitCard({ commit }: { commit: LocalCommitCard }) {
  return (
    <li
      className="rounded-md border border-border bg-background px-2.5 py-2"
      data-testid="commit-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold leading-snug text-foreground">{commit.subject}</h3>
        <span className="shrink-0 font-mono text-xs text-muted">{commit.shortSha}</span>
      </div>
      <p className="m-0 mt-0.5 flex items-baseline justify-between gap-2 text-xs text-muted">
        <span>
          {[commit.author, formatCommitDate(commit.authoredAt)].filter(Boolean).join(" · ")}
        </span>
        {commit.stat && commit.stat.files > 0 ? (
          <DiffStatCounts
            additions={commit.stat.additions}
            deletions={commit.stat.deletions}
            className="shrink-0"
          />
        ) : null}
      </p>
      {commit.body ? (
        <p className="m-0 mt-1 text-xs leading-normal whitespace-pre-wrap text-foreground">
          {commit.body}
        </p>
      ) : null}
    </li>
  );
}

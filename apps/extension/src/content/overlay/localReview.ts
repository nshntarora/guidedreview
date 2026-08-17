/** Individual commit scopes and the Change summary list. Keep in sync with apps/cli/src/git/localDiff.ts. */
export const MAX_RECENT_COMMITS = 5;

export const RECENT_COMMITS_GROUP = "Last 5 commits";

const COMMIT_SCOPE_PREFIX = "commit:";

export function isCommitScopeId(id: string): boolean {
  return id.startsWith(COMMIT_SCOPE_PREFIX);
}

/** Keep working-tree scopes, then at most the last N commit scopes. */
export function limitCommitScopes<T extends { id: string }>(scopes: T[]): T[] {
  let commits = 0;
  return scopes.filter((scope) => {
    if (!isCommitScopeId(scope.id)) return true;
    if (commits >= MAX_RECENT_COMMITS) return false;
    commits += 1;
    return true;
  });
}

export interface DiffStat {
  files: number;
  additions: number;
  deletions: number;
}

/** Structured commit shown as a card in the local Change summary. */
export interface LocalCommitCard {
  sha: string;
  shortSha: string;
  subject: string;
  body: string;
  author: string;
  authoredAt: string;
  stat?: DiffStat;
}

export interface LocalDiffScopeOption {
  id: string;
  label: string;
  description: string;
  meta: string;
  /** Extra shown ahead of file/+− counts (commit count, short SHA). */
  metaPrefix?: string;
  stat?: DiffStat;
  empty: boolean;
}

/** CLI-only controls passed into the shared overlay. */
export interface LocalDiffControls {
  scopes: LocalDiffScopeOption[];
  selectedScope: string;
  commits: LocalCommitCard[];
  onSelectScope: (id: string) => void;
  onStructureReview: () => void;
  structuring: boolean;
  structured: boolean;
  scopeBusy?: boolean;
}

import type { SVGProps } from "react";
import { isCommitScopeId, type LocalDiffScopeOption } from "../localReview";

/**
 * Diff-scope marks for the local picker.
 *
 * Same canvas language as the landing-page illustrations: rounded panels,
 * recessed chips, code bars, lime only as the accent, green/red only on
 * added/removed lines. Dashed stroke means "not in the index."
 */

const SURFACE = "fill-[var(--color-surface-raised)] stroke-[var(--color-border)]";
const INSET = "fill-[var(--color-background)] stroke-[var(--color-border)]";
const ACCENT_WASH =
  "fill-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] stroke-[var(--color-primary)]";
const ADD_WASH = "fill-[color-mix(in_srgb,var(--color-success)_20%,transparent)]";
const DEL_WASH = "fill-[color-mix(in_srgb,var(--color-danger)_16%,transparent)]";

type Kind = "branch" | "uncommitted" | "staged" | "unstaged" | "commit";

export function scopeIconKind(scope: Pick<LocalDiffScopeOption, "id" | "label">): Kind {
  if (scope.id === "branch") return "branch";
  if (scope.id === "unstaged") return "unstaged";
  if (scope.id === "uncommitted") {
    return scope.label.startsWith("Staged") ? "staged" : "uncommitted";
  }
  if (isCommitScopeId(scope.id)) return "commit";
  return "commit";
}

function frame(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 20 20",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    width: 20,
    height: 20,
    ...props,
    className: ["size-5 shrink-0", props.className].filter(Boolean).join(" "),
  };
}

/** `+` / `−` used on diff lines in the landing-page summaries scene. */
function Plus({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y}h2.4M${x + 1.2} ${y - 1.2}v2.4`}
      className="stroke-[var(--color-success)]"
      strokeWidth="1.15"
      strokeLinecap="round"
    />
  );
}

function Minus({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y}h2.4`}
      className="stroke-[var(--color-danger)]"
      strokeWidth="1.15"
      strokeLinecap="round"
    />
  );
}

/** `{head} vs {base}` — a stack of commit cards; HEAD is the lime accent. */
function BranchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...frame(props)}>
      <rect
        x="2.25"
        y="1.5"
        width="15.5"
        height="5.25"
        rx="2"
        className={ACCENT_WASH}
        strokeWidth="1.2"
      />
      <rect
        x="4.25"
        y="3.2"
        width="9"
        height="1.8"
        rx="0.9"
        className="fill-[var(--color-primary)]"
        opacity="0.9"
      />
      <rect
        x="2.25"
        y="7.4"
        width="15.5"
        height="5.25"
        rx="2"
        className={SURFACE}
        strokeWidth="1.2"
      />
      <rect
        x="4.25"
        y="9.1"
        width="7.5"
        height="1.8"
        rx="0.9"
        className="fill-[var(--color-muted)]"
        opacity="0.45"
      />
      <rect
        x="2.25"
        y="13.25"
        width="15.5"
        height="5.25"
        rx="2"
        className={INSET}
        strokeWidth="1.2"
      />
      <rect
        x="4.25"
        y="14.95"
        width="6"
        height="1.8"
        rx="0.9"
        className="fill-[var(--color-muted)]"
        opacity="0.3"
      />
    </svg>
  );
}

/** Working tree vs HEAD — a solid hunk with add, context, and delete. */
function UncommittedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...frame(props)}>
      <rect
        x="1.6"
        y="1.6"
        width="16.8"
        height="16.8"
        rx="4"
        className={SURFACE}
        strokeWidth="1.2"
      />
      <rect x="3" y="3.4" width="14" height="4.1" rx="1.2" className={ADD_WASH} />
      <Plus x={4.15} y={5.45} />
      <rect
        x="7.6"
        y="4.65"
        width="7.8"
        height="1.6"
        rx="0.8"
        className="fill-[var(--color-success)]"
        opacity="0.85"
      />
      <rect
        x="4.15"
        y="9.2"
        width="10.5"
        height="1.55"
        rx="0.75"
        className="fill-[var(--color-muted)]"
        opacity="0.35"
      />
      <rect x="3" y="12.5" width="14" height="4.1" rx="1.2" className={DEL_WASH} />
      <Minus x={4.15} y={14.55} />
      <rect
        x="7.6"
        y="13.75"
        width="6.4"
        height="1.6"
        rx="0.8"
        className="fill-[var(--color-danger)]"
        opacity="0.85"
      />
    </svg>
  );
}

/** Index vs HEAD — the hunk sitting in a lime staging tray. */
function StagedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...frame(props)}>
      <rect
        x="1.5"
        y="13.25"
        width="17"
        height="5.25"
        rx="2.25"
        className={ACCENT_WASH}
        strokeWidth="1.2"
      />
      <rect x="3.1" y="1.6" width="13.8" height="14" rx="3" className={SURFACE} strokeWidth="1.2" />
      <rect x="4.35" y="3.35" width="11.3" height="4" rx="1.2" className={ADD_WASH} />
      <Plus x={5.4} y={5.35} />
      <rect
        x="8.7"
        y="4.55"
        width="5.4"
        height="1.55"
        rx="0.75"
        className="fill-[var(--color-success)]"
        opacity="0.85"
      />
      <rect x="4.35" y="8.85" width="11.3" height="4" rx="1.2" className={DEL_WASH} />
      <Minus x={5.4} y={10.85} />
      <rect
        x="8.7"
        y="10.05"
        width="4.5"
        height="1.55"
        rx="0.75"
        className="fill-[var(--color-danger)]"
        opacity="0.85"
      />
    </svg>
  );
}

/** Unstaged edits only — dashed card: not in the index. */
function UnstagedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...frame(props)}>
      <rect
        x="1.6"
        y="1.6"
        width="16.8"
        height="16.8"
        rx="4"
        className={SURFACE}
        strokeWidth="1.2"
        strokeDasharray="2.5 1.8"
      />
      <rect x="3.15" y="4.15" width="13.7" height="4.35" rx="1.2" className={ADD_WASH} />
      <Plus x={4.3} y={6.3} />
      <rect
        x="7.75"
        y="5.5"
        width="7.4"
        height="1.6"
        rx="0.8"
        className="fill-[var(--color-success)]"
        opacity="0.85"
      />
      <rect x="3.15" y="11.5" width="13.7" height="4.35" rx="1.2" className={DEL_WASH} />
      <Minus x={4.3} y={13.65} />
      <rect
        x="7.75"
        y="12.85"
        width="6"
        height="1.6"
        rx="0.8"
        className="fill-[var(--color-danger)]"
        opacity="0.85"
      />
    </svg>
  );
}

/** One commit — a single card with a hash chip and subject line. */
function CommitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...frame(props)}>
      <rect
        x="1.6"
        y="2.25"
        width="16.8"
        height="15.5"
        rx="3.5"
        className={SURFACE}
        strokeWidth="1.2"
      />
      <rect
        x="3.5"
        y="4.35"
        width="8.25"
        height="4.35"
        rx="1.75"
        className={INSET}
        strokeWidth="1.1"
      />
      <rect
        x="5"
        y="5.75"
        width="5.25"
        height="1.5"
        rx="0.75"
        className="fill-[var(--color-muted)]"
        opacity="0.6"
      />
      <rect
        x="3.5"
        y="10.85"
        width="12.4"
        height="2"
        rx="1"
        className="fill-[var(--color-foreground)]"
        opacity="0.55"
      />
      <rect
        x="3.5"
        y="14"
        width="8.25"
        height="1.55"
        rx="0.75"
        className="fill-[var(--color-muted)]"
        opacity="0.35"
      />
    </svg>
  );
}

const ICONS: Record<Kind, (props: SVGProps<SVGSVGElement>) => ReturnType<typeof BranchIcon>> = {
  branch: BranchIcon,
  uncommitted: UncommittedIcon,
  staged: StagedIcon,
  unstaged: UnstagedIcon,
  commit: CommitIcon,
};

export function ScopeIcon({
  scope,
  className,
}: {
  scope: Pick<LocalDiffScopeOption, "id" | "label">;
  className?: string;
}) {
  const Icon = ICONS[scopeIconKind(scope)];
  return <Icon className={className} />;
}

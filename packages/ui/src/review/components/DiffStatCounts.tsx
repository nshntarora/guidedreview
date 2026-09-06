import { cn } from "@guided-review/ui";

/** Green/red +/− counts, matching the Changes sidebar. */
export function DiffStatCounts({
  additions,
  deletions,
  files,
  prefix,
  className,
}: {
  additions: number;
  deletions: number;
  files?: number;
  prefix?: string;
  className?: string;
}) {
  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (files != null && files > 0) parts.push(`${files} file${files === 1 ? "" : "s"}`);

  return (
    <span className={cn("tabular-nums", className)}>
      {parts.map((part, i) => (
        <span key={part}>
          {i > 0 ? <span className="text-muted"> · </span> : null}
          <span className="text-muted">{part}</span>
        </span>
      ))}
      {parts.length > 0 ? <span className="text-muted"> · </span> : null}
      <span className="font-medium text-diff-add">+{additions}</span>{" "}
      <span className="font-medium text-diff-del">−{deletions}</span>
    </span>
  );
}

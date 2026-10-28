import { Button, cn } from "@guided-review/ui";
import { useReviewStore } from "@guided-review/ui/review/store";
import { FileIcon, FolderIcon } from "./FileIcon";
import type { FileDirectory } from "@guided-review/ui/review/fileNavigation";

export function FileNavigation({
  directory,
  onSelect,
}: {
  directory: FileDirectory;
  onSelect?: () => void;
}) {
  const selection = useReviewStore((s) => s.selection);
  const collapsed = useReviewStore((s) => s.collapsedDirectories);
  const toggleDirectory = useReviewStore((s) => s.toggleDirectory);
  const goToFile = useReviewStore((s) => s.goToFile);
  return (
    <ul
      className="m-0 list-none space-y-0.5 p-0"
      data-review-file-tree={directory.path === "" ? "" : undefined}
      aria-label={directory.path === "" ? "Changed files" : undefined}
    >
      {directory.directories.map((child) => (
        <li key={child.path}>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-8 w-full scroll-my-2 justify-start! gap-2! rounded-md! px-2! py-1! text-left text-sm! focus-visible:bg-surface-muted focus-visible:text-foreground focus-visible:-outline-offset-2!"
            data-file-path={child.path}
            data-file-parent={directory.path}
            aria-expanded={!collapsed[child.path]}
            title={child.path}
            data-testid={`file-directory-${child.path}`}
            onClick={() => toggleDirectory(child.path)}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={cn(
                "shrink-0 text-faint transition-transform duration-150 ease-gr-out",
                !collapsed[child.path] && "rotate-90",
              )}
              aria-hidden="true"
            >
              <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
            </svg>
            <FolderIcon open={!collapsed[child.path]} />
            <span className="truncate">{child.name}</span>
          </Button>
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-150 ease-gr-out",
              collapsed[child.path] ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
            )}
            inert={collapsed[child.path] || undefined}
            aria-hidden={collapsed[child.path] || undefined}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="ml-2 border-l border-border/60 pl-1">
                <FileNavigation directory={child} onSelect={onSelect} />
              </div>
            </div>
          </div>
        </li>
      ))}
      {directory.files.map((file) => {
        const active = selection.kind === "file" && selection.path === file.path;
        const lines = file.hunks.flatMap((hunk) => hunk.lines);
        const additions = lines.filter((line) => line.type === "add").length;
        const deletions = lines.filter((line) => line.type === "del").length;
        const label = file.previousPath ? `${file.previousPath} → ${file.path}` : file.path;
        return (
          <li key={file.path}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "min-h-8 w-full scroll-my-2 justify-start! gap-2! rounded-md! px-2! py-1! text-left text-sm! focus-visible:bg-surface-muted focus-visible:text-foreground focus-visible:-outline-offset-2!",
                active && "border-primary/30! bg-primary-muted! text-primary!",
              )}
              aria-current={active ? "true" : undefined}
              data-file-path={file.path}
              data-file-parent={directory.path}
              aria-label={`${label}, ${file.status}`}
              title={`${label}\n${file.status}${!file.isBinaryOrElided ? ` · +${additions} −${deletions}` : ""}`}
              data-testid={`review-file-${file.path}`}
              onClick={() => {
                goToFile(file.path);
                onSelect?.();
              }}
            >
              <FileIcon path={file.path} />
              <span className="min-w-0 flex-1 truncate font-normal">
                {file.path.split("/").pop()}
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs",
                  file.status === "added"
                    ? "text-diff-add"
                    : file.status === "removed"
                      ? "text-diff-del"
                      : file.status === "modified"
                        ? "text-warning"
                        : "text-syntax-entity",
                )}
                title={file.status}
              >
                {file.status === "modified"
                  ? "M"
                  : file.status === "removed"
                    ? "D"
                    : file.status === "renamed"
                      ? "R"
                      : "A"}
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

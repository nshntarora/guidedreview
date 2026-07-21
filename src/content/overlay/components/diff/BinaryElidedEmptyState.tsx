import { useEffect, useState } from "react";
import { buildPRFileDiffUrl } from "../../../../lib/github/prFileDiffUrl";
import { useReviewStore } from "../../store";

/**
 * Empty body for files with no textual diff (binary, LFS, elided patches).
 * Centers the message and, when PR context is available, links to that file
 * on GitHub's Files changed tab.
 */
export function BinaryElidedEmptyState({ filePath }: { filePath: string }) {
  const prContext = useReviewStore((s) => s.prContext);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!prContext) {
      setGithubUrl(null);
      return;
    }

    let cancelled = false;
    void buildPRFileDiffUrl(
      {
        owner: prContext.owner,
        repo: prContext.repo,
        number: prContext.number,
      },
      filePath,
    ).then((url) => {
      if (!cancelled) setGithubUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [prContext, filePath]);

  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      data-testid="binary-elided-empty"
    >
      <span className="font-mono text-base leading-relaxed text-gr-muted">
        (binary or elided — no textual diff available)
      </span>
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-medium text-gr-accent underline-offset-2 hover:underline"
          data-testid="binary-elided-github-link"
        >
          View File Diff on GitHub
        </a>
      )}
    </div>
  );
}

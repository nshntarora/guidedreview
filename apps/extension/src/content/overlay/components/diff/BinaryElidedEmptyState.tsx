import { useEffect, useState } from "react";
import { useReviewHost } from "@extension/content/overlay/host";
import { useReviewStore } from "@extension/content/overlay/store";

/** Empty body for binary/LFS/elided files; optional deep link to GitHub Files tab. */
export function BinaryElidedEmptyState({ filePath }: { filePath: string }) {
  const host = useReviewHost();
  const prContext = useReviewStore((s) => s.prContext);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!prContext || !host.fileDiffUrl) {
      setGithubUrl(null);
      return;
    }
    let cancelled = false;
    void host.fileDiffUrl(filePath, prContext).then((url) => {
      if (!cancelled) setGithubUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [host, prContext, filePath]);

  return (
    <div
      className="flex min-h-[8rem] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      data-testid="binary-elided-empty"
    >
      <span className="font-mono text-base leading-relaxed text-muted">
        (binary or elided — no textual diff available)
      </span>
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-medium text-primary underline-offset-2 hover:underline"
          data-testid="binary-elided-github-link"
        >
          View File Diff on GitHub
        </a>
      )}
    </div>
  );
}

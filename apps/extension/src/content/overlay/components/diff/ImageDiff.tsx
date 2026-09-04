import { useEffect, useState } from "react";
import { cn } from "@guided-review/ui";
import { isImagePath } from "@guided-review/core";
import type { DiffFile } from "@extension/lib/types";
import { useReviewHost } from "@extension/content/overlay/host";
import { useReviewStore } from "@extension/content/overlay/store";
import type { DiffViewMode } from "@extension/content/overlay/diffView";
import {
  imageSidesForStatus,
  reconstructedImageSrcs,
} from "@extension/content/overlay/imagePreview";
import { BinaryElidedEmptyState } from "./BinaryElidedEmptyState";

const CHECKER =
  "[background-image:repeating-conic-gradient(var(--color-surface-muted)_0%_25%,var(--color-surface)_0%_50%)] [background-size:16px_16px]";

type Side = "old" | "new";

function ImageFrame({
  src,
  filePath,
  tone,
  onError,
}: {
  src: string;
  filePath: string;
  tone: "add" | "del";
  onError: () => void;
}) {
  const name = filePath.split("/").pop() ?? filePath;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center p-4",
        tone === "add" ? "bg-diff-add-bg" : "bg-diff-del-bg",
        CHECKER,
      )}
      data-testid={tone === "add" ? "image-diff-new" : "image-diff-old"}
    >
      <img
        src={src}
        alt={name}
        className="max-h-[28rem] max-w-full object-contain"
        onError={onError}
      />
    </div>
  );
}

interface ImageDiffProps {
  file: DiffFile;
  viewMode: DiffViewMode;
  className?: string;
}

/**
 * Rendered preview for image files. SVG text patches paint immediately from
 * the hunks; binary images (png/jpg/…) load via the host. Falls back to the
 * binary empty state when nothing can be shown.
 */
export function ImageDiff({ file, viewMode, className }: ImageDiffProps) {
  const host = useReviewHost();
  const prContext = useReviewStore((s) => s.prContext);
  const reconstructed = reconstructedImageSrcs(file);
  const { showOld, showNew } = imageSidesForStatus(file.status);
  const [oldHostSrc, setOldHostSrc] = useState<string | null>(null);
  const [newHostSrc, setNewHostSrc] = useState<string | null>(null);
  const [oldFailed, setOldFailed] = useState(false);
  const [newFailed, setNewFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOldHostSrc(null);
    setNewHostSrc(null);
    setOldFailed(false);
    setNewFailed(false);
  }, [file.path, file.status, file.previousPath]);

  useEffect(() => {
    if (!host.filePreviewUrl || !prContext) return;
    if (!isImagePath(file.path)) return;

    let cancelled = false;
    const load = async (side: Side) => {
      const url = await host.filePreviewUrl?.({
        path: file.path,
        previousPath: file.previousPath,
        side,
        context: prContext,
      });
      return url ?? null;
    };

    setLoading(true);
    void Promise.all([
      showOld ? load("old") : Promise.resolve(null),
      showNew ? load("new") : Promise.resolve(null),
    ])
      .then(([nextOld, nextNew]) => {
        if (cancelled) return;
        if (nextOld) setOldHostSrc(nextOld);
        if (nextNew) setNewHostSrc(nextNew);
      })
      .catch(() => {
        // Host fetch is best-effort; reconstructed SVG / empty state remain.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [host, prContext, file.path, file.previousPath, file.status, showOld, showNew]);

  const oldSrc = showOld && !oldFailed ? (oldHostSrc ?? reconstructed.oldSrc) : null;
  const newSrc = showNew && !newFailed ? (newHostSrc ?? reconstructed.newSrc) : null;
  const hasAny = oldSrc != null || newSrc != null;

  if (!hasAny && !loading) {
    if (file.isBinaryOrElided) return <BinaryElidedEmptyState filePath={file.path} />;
    return null;
  }

  if (!hasAny && loading) {
    return (
      <div
        className={cn(
          "flex min-h-[8rem] items-center justify-center px-4 py-12 text-muted",
          className,
        )}
        data-testid="image-diff-loading"
      >
        Loading image preview…
      </div>
    );
  }

  const split = viewMode === "split" && oldSrc && newSrc;

  return (
    <div
      className={cn(split ? "flex flex-col sm:flex-row" : "flex flex-col", className)}
      data-testid="image-diff"
    >
      {oldSrc && (
        <ImageFrame
          src={oldSrc}
          filePath={file.previousPath ?? file.path}
          tone="del"
          onError={() => {
            if (oldHostSrc && reconstructed.oldSrc) setOldHostSrc(null);
            else setOldFailed(true);
          }}
        />
      )}
      {newSrc && (
        <ImageFrame
          src={newSrc}
          filePath={file.path}
          tone="add"
          onError={() => {
            if (newHostSrc && reconstructed.newSrc) setNewHostSrc(null);
            else setNewFailed(true);
          }}
        />
      )}
    </div>
  );
}

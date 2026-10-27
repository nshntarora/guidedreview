import { FileIcon as SymbolsFileIcon } from "@react-symbols/icons/utils";

export function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M2.5 15.5V5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h5A1.5 1.5 0 0 1 16.5 7v1" />
          <path d="M2.5 15.5 5 8.5h13l-2.5 7a1.5 1.5 0 0 1-1.4 1H4a1.5 1.5 0 0 1-1.5-1Z" />
        </>
      ) : (
        <path d="M2.5 15V5A1.5 1.5 0 0 1 4 3.5h4l2 2h6A1.5 1.5 0 0 1 17.5 7v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15Z" />
      )}
    </svg>
  );
}

/** Bundled SVGs: recognizable file marks with no fonts or network requests. */
export function FileIcon({ path }: { path: string }) {
  return (
    <SymbolsFileIcon
      fileName={path.split("/").pop() ?? path}
      autoAssign
      width={18}
      height={20}
      className="shrink-0 text-muted"
      aria-hidden="true"
      focusable="false"
    />
  );
}

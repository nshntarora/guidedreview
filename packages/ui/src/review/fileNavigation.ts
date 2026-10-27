import type { DiffFile, ParsedDiff } from "./types";

export interface FileDirectory {
  name: string;
  path: string;
  directories: FileDirectory[];
  files: DiffFile[];
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Directories precede leaves; the sidebar and Previous/Next share this order. */
export function buildFileTree(diff: ParsedDiff | null): FileDirectory {
  const root: FileDirectory = { name: "", path: "", directories: [], files: [] };
  for (const file of diff?.files ?? []) {
    const parts = file.path.split("/");
    let directory = root;
    for (const name of parts.slice(0, -1)) {
      const path = directory.path ? `${directory.path}/${name}` : name;
      let child = directory.directories.find((item) => item.path === path);
      if (!child) {
        child = { name, path, directories: [], files: [] };
        directory.directories.push(child);
      }
      directory = child;
    }
    directory.files.push(file);
  }
  const sort = (directory: FileDirectory) => {
    directory.directories.sort((a, b) => compare(a.name, b.name));
    directory.files.sort((a, b) => compare(a.path, b.path));
    directory.directories.forEach(sort);
  };
  sort(root);
  return root;
}

export function orderedFiles(diff: ParsedDiff | null): DiffFile[] {
  const flatten = (directory: FileDirectory): DiffFile[] => [
    ...directory.directories.flatMap(flatten),
    ...directory.files,
  ];
  return flatten(buildFileTree(diff));
}

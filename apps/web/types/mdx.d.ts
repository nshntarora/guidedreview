// Augment all MDX modules to allow the `toc` named export
// (exported from individual .mdx files for on-page table of contents)
declare module "*.mdx" {
  import type { ComponentType } from "react";

  export const toc: Array<{ id: string; label: string; level: 2 | 3 }> | undefined;

  const MDXComponent: ComponentType;
  export default MDXComponent;
}

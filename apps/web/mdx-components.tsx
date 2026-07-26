import type { MDXComponents } from "mdx/types";
import { Children, isValidElement, type HTMLAttributes, type ReactNode } from "react";
import type { TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Callout } from "@/components/docs/Callout";
import { CopyButton } from "@/components/docs/CopyButton";
import { TocCard } from "@/components/docs/TocCard";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    TocCard,

    // Blockquotes become Note callouts by default
    blockquote: ({ children }: { children?: ReactNode }) => (
      <Callout type="note">{children}</Callout>
    ),

    // Code blocks with copy button
    pre: ({ children, ...props }: HTMLAttributes<HTMLPreElement>) => {
      let code = "";
      const codeEl = (children as React.ReactElement<{ children?: ReactNode }>)?.props?.children;
      if (typeof codeEl === "string") code = codeEl;

      return (
        <div className="group relative">
          <pre {...props}>{children}</pre>
          {code ? (
            <CopyButton
              text={code}
              className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            />
          ) : null}
        </div>
      );
    },

    // Tables — MDX/GFM emits whitespace text nodes between tags. Those are invalid
    // direct children of <table>, <thead>, <tbody>, <tfoot>, and <tr> in HTML, and
    // cause React hydration errors. Keep only element children for those tags.
    table: ({ children, ...props }: HTMLAttributes<HTMLTableElement>) => {
      const validChildren = Children.toArray(children).filter(isValidElement);
      return (
        <div className="my-4 overflow-x-auto">
          <table {...props}>{validChildren}</table>
        </div>
      );
    },
    thead: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
      <thead {...props}>{Children.toArray(children).filter(isValidElement)}</thead>
    ),
    tbody: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
      <tbody {...props}>{Children.toArray(children).filter(isValidElement)}</tbody>
    ),
    tfoot: ({ children, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
      <tfoot {...props}>{Children.toArray(children).filter(isValidElement)}</tfoot>
    ),
    tr: ({ children, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
      <tr {...props}>{Children.toArray(children).filter(isValidElement)}</tr>
    ),
    th: ({ children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
      <th {...props}>{children}</th>
    ),
    td: ({ children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
      <td {...props}>{children}</td>
    ),
  };
}

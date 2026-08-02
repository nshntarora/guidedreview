import type { MDXComponents } from "mdx/types";
import { Children, isValidElement, type HTMLAttributes, type ReactNode } from "react";
import type { TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Callout } from "@web/components/docs/Callout";
import { DocsIndex } from "@web/components/docs/DocsIndex";
import { LegalContactBlock } from "@web/components/LegalDocument";
import { CopyButton } from "@web/components/docs/CopyButton";
import { TocCard } from "@web/components/docs/TocCard";

/** Flatten heading children to plain text for slug generation. */
function textFromChildren(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return textFromChildren(child.props.children);
      }
      return "";
    })
    .join("");
}

/**
 * Stable heading ids for in-page TOC and cross-doc deep links.
 * Keep in sync with `export const toc` ids in content/help/*.mdx.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/→/g, " to ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Heading({
  as: Tag,
  children,
  id,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as: "h1" | "h2" | "h3" | "h4" }) {
  const autoId = id ?? slugifyHeading(textFromChildren(children));
  return (
    <Tag id={autoId || undefined} {...props}>
      {children}
    </Tag>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    TocCard,
    DocsIndex,
    LegalContactBlock,
    // Lets MDX use <Callout type="tip" | "warning" | "danger"> directly;
    // blockquotes below map to the "note" variant.
    Callout,

    h1: (props: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h1" {...props} />,
    h2: (props: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h2" {...props} />,
    h3: (props: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h3" {...props} />,
    h4: (props: HTMLAttributes<HTMLHeadingElement>) => <Heading as="h4" {...props} />,

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

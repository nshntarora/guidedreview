import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@guided-review/ui";
import { ChromeIcon, TerminalIcon } from "@web/components/icons";
import { docsPath } from "@web/config/docs";

type AppCard = {
  slug: "cli" | "chrome-extension";
  title: string;
  tagline: string;
  body: string;
  cta: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const APPS: AppCard[] = [
  {
    slug: "chrome-extension",
    title: "Chrome Extension",
    tagline: "Pull requests on github.com",
    body: "Install from the Web Store, then Start Guided Review on any PR — comments and submit included.",
    cta: "Extension docs",
    Icon: ChromeIcon,
  },
  {
    slug: "cli",
    title: "CLI",
    tagline: "Local branch, commit, or working tree",
    body: "Run Guided Review from your terminal before a PR exists — same walkthrough in a localhost browser UI.",
    cta: "CLI docs",
    Icon: TerminalIcon,
  },
];

/**
 * Linked app cards for the Install docs page — Chrome / Terminal icons match
 * the homepage Install section.
 */
export function InstallAppCards() {
  return (
    <ul className="not-prose my-6 m-0 grid w-full list-none grid-cols-1 gap-4 p-0">
      {APPS.map(({ slug, title, tagline, body, cta, Icon }) => (
        <li key={slug} className="flex">
          <Link
            href={docsPath(slug)}
            className={cn(
              "group flex h-full w-full flex-col rounded-lg border border-border bg-surface-raised/50 p-4 no-underline transition-colors sm:p-5",
              "hover:border-primary/60 hover:bg-surface-raised",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <span className="block font-brand text-lg font-bold tracking-tight text-foreground">
                  {title}
                </span>
                <span className="block text-sm text-muted">{tagline}</span>
              </div>
            </div>
            <p className="mt-3 mb-0 flex-1 text-sm leading-relaxed text-muted">{body}</p>
            <span className="mt-4 text-sm font-medium text-primary group-hover:underline">
              {cta} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

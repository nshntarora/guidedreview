import { GITHUB_REPO_URL } from "@web/lib/links";
import { GitHubIcon } from "./icons";

export function TrustBand() {
  return (
    <section data-testid="trust-band" className="relative px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl font-brand">
          Your code never touches our infrastructure
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted text-balance sm:text-xl">
          The extension and CLI talk directly to your AI provider (and GitHub for PRs). We never see
          your diffs, your keys, or your code — because there&apos;s nothing on our end to see them
          with.
        </p>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-lg">
          <img
            src="/assets/landing/direct-provider-connection.webp"
            alt="Guided Review's extension and CLI run on your machine, keeping your key local and sending diffs directly to your AI provider without a Guided Review server."
            width={1536}
            height={1024}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-surface-raised"
          >
            <GitHubIcon className="h-4 w-4" />
            <span>Star on GitHub</span>
          </a>
          <a
            href="/docs/configure-provider"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-surface-raised"
          >
            Bring your own LLM key
          </a>
        </div>
      </div>
    </section>
  );
}

import { GITHUB_REPO_URL } from "../lib/links";
import { NoBackendIllustration } from "./FeatureIllustrations";
import { GitHubIcon } from "./icons";

type TrustBandProps = {
  /** GitHub stargazer count, or null if it couldn't be fetched. */
  starCount: number | null;
};

function formatStarCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(count % 1000 >= 100 ? 1 : 0)}k`;
}

export function TrustBand({ starCount }: TrustBandProps) {
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl font-brand">
          Your code never touches our infrastructure
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted text-balance sm:text-xl">
          The extension talks directly to your AI provider and GitHub. We never see your diffs, your
          keys, or your code — because there&apos;s nothing on our end to see them with.
        </p>

        <div className="mx-auto mt-10 flex items-center justify-center rounded-lg bg-background/60 p-6">
          <NoBackendIllustration className="h-auto w-full max-w-[480px]" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-surface-raised"
          >
            <GitHubIcon className="h-4 w-4" />
            {starCount !== null ? (
              <span>{formatStarCount(starCount)} stars on GitHub</span>
            ) : (
              <span>Open source on GitHub</span>
            )}
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

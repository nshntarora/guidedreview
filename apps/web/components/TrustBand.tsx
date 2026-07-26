import { GITHUB_REPO_URL } from "../lib/links";
import { CheckShieldIcon, GitHubIcon } from "./icons";

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
    <section className="relative overflow-hidden px-6 py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-24 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-opt-accent/6 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-opt-border bg-opt-subtle/60 px-4 py-1.5 text-sm text-opt-muted">
          <CheckShieldIcon className="h-4 w-4 text-opt-accent" />
          <span>No backend. No servers. Not even the serverless kind.</span>
        </div>

        <h2 className="m-0 mt-6 text-2xl font-bold tracking-tight sm:text-3xl font-brand">
          Your code never touches our infrastructure
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-opt-muted text-balance">
          The extension talks directly to your AI provider and GitHub. We never see your diffs, your
          keys, or your code — because there's nothing on our end to see them with.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-opt-border bg-opt-subtle/60 px-5 py-2.5 text-sm font-medium text-opt-text transition-colors hover:border-opt-accent/60 hover:bg-opt-subtle"
          >
            <GitHubIcon className="h-4 w-4" />
            {starCount !== null ? (
              <span>{formatStarCount(starCount)} stars on GitHub</span>
            ) : (
              <span>Open source on GitHub</span>
            )}
          </a>
          <span className="rounded-full border border-opt-border bg-opt-subtle/60 px-5 py-2.5 text-sm font-medium text-opt-text">
            Bring your own LLM key
          </span>
        </div>
      </div>
    </section>
  );
}

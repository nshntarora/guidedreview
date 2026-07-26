import { GITHUB_REPO_URL } from "../lib/links";
import { CheckShieldIcon, GitHubIcon } from "./icons";
import { WindowFrame } from "./WindowFrame";

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
    <section className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl font-brand">
          Your code never touches our infrastructure
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-serif text-lg italic text-opt-muted text-balance sm:text-xl">
          The extension talks directly to your AI provider and GitHub. We never see your diffs, your
          keys, or your code — because there&apos;s nothing on our end to see them with.
        </p>

        <WindowFrame label="network — zsh" className="mt-10 text-left" bodyClassName="p-0">
          <div className="space-y-3 p-6 font-mono text-sm leading-relaxed sm:p-8">
            <p className="m-0 text-opt-muted">
              <span className="text-opt-accent">$</span> curl -s api.guidedreview.com/telemetry
            </p>
            <p className="m-0 pl-4 text-opt-error">
              curl: (6) Could not resolve host: api.guidedreview.com
            </p>
            <p className="m-0 pl-4 text-opt-muted">
              <span className="inline-flex items-center gap-1.5 text-opt-ok">
                <CheckShieldIcon className="h-4 w-4" />
                no backend. no servers. not even the serverless kind.
              </span>
            </p>
            <p className="m-0 pt-3 text-opt-muted">
              <span className="text-opt-accent">$</span> gh repo view nshntarora/guidedreview --json
              stargazerCount
            </p>
            <p className="m-0 pl-4 text-opt-text">
              {starCount !== null
                ? `{ "stargazerCount": ${starCount} }`
                : `{ "stargazerCount": "open source, go check" }`}
            </p>
          </div>
        </WindowFrame>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-opt-border bg-opt-subtle/60 px-5 py-2.5 text-sm font-medium text-opt-text transition-colors hover:border-opt-accent/60 hover:bg-opt-subtle"
          >
            <GitHubIcon className="h-4 w-4" />
            {starCount !== null ? (
              <span>{formatStarCount(starCount)} stars on GitHub</span>
            ) : (
              <span>Open source on GitHub</span>
            )}
          </a>
          <span className="rounded-md border border-opt-border bg-opt-subtle/60 px-5 py-2.5 text-sm font-medium text-opt-text">
            Bring your own LLM key
          </span>
        </div>
      </div>
    </section>
  );
}

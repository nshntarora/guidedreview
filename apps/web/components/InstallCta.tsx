import { buttonClassName } from "@guided-review/ui";
import { CHROME_WEB_STORE_URL, GITHUB_URL } from "../lib/links";
import { GitHubIcon } from "./icons";

export function InstallCta() {
  return (
    <section
      id="install"
      className="relative mx-auto my-16 max-w-5xl overflow-hidden rounded-2xl border border-opt-border bg-opt-subtle px-6 py-14 sm:px-12"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_srgb,var(--opt-accent)_18%,transparent),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--opt-border)_18%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--opt-border)_18%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Get Guided Review</h2>
        <p className="mt-3 text-opt-muted">
          Install the Chrome extension, add an LLM API key in options, and open any GitHub pull
          request. Click{" "}
          <strong className="font-semibold text-opt-text">Start Guided Review</strong> to begin.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={CHROME_WEB_STORE_URL}
            className={buttonClassName({ size: "lg" })}
            target="_blank"
            rel="noopener noreferrer"
          >
            Install the extension
          </a>
          <a
            href={GITHUB_URL}
            className={buttonClassName({ variant: "secondary", size: "lg" })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon className="h-4 w-4" />
            Start on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

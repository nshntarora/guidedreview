import { buttonClassName } from "@guided-review/ui";

export function InstallCta() {
  return (
    <section
      id="install"
      className="mx-auto my-12 max-w-5xl rounded-2xl border border-opt-border bg-opt-subtle px-6 py-14 text-center sm:px-12"
    >
      <h2 className="m-0 text-2xl font-bold tracking-tight">Get Guided Review</h2>
      <p className="mx-auto mt-3 max-w-xl text-opt-muted">
        Install the Chrome extension, add an LLM API key in options, and open any GitHub pull
        request. Click <strong className="font-semibold text-opt-text">Start Guided Review</strong>{" "}
        to begin.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://github.com/nshntarora/guidedreview"
          className={buttonClassName({ size: "lg" })}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
        <a href="#features" className={buttonClassName({ variant: "secondary", size: "lg" })}>
          Explore features
        </a>
      </div>
      <p className="mt-6 text-sm text-opt-muted">
        Chrome Web Store listing coming soon. Developers can load the unpacked build from{" "}
        <code className="rounded bg-opt-bg px-1.5 py-0.5 text-sm">apps/extension/dist</code> in this
        monorepo.
      </p>
    </section>
  );
}

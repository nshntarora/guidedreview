import { buttonClassName } from "@guided-review/ui";
import { GitHubIcon } from "./icons";

export function InstallCta() {
  return (
    <section
      id="install"
      className="mx-auto my-16 max-w-5xl rounded-2xl border border-opt-border bg-opt-subtle px-6 py-14 sm:px-12"
    >
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
        <div className="text-center sm:text-left">
          <h2 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">Get Guided Review</h2>
          <p className="mt-3 text-opt-muted">
            Install the Chrome extension, add an LLM API key in options, and open any GitHub pull
            request. Click{" "}
            <strong className="font-semibold text-opt-text">Start Guided Review</strong> to begin.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <a
              href="https://github.com/nshntarora/guidedreview"
              className={buttonClassName({ size: "lg" })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon className="h-4 w-4" />
              View on GitHub
            </a>
            <a href="#features" className={buttonClassName({ variant: "secondary", size: "lg" })}>
              Explore features
            </a>
          </div>
          <p className="mt-6 text-sm text-opt-muted">Chrome Web Store listing coming soon.</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gr-border bg-gr-chrome text-left shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-gr-border bg-gr-bg px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gr-danger" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-gr-syntax-variable" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-gr-add-text" aria-hidden="true" />
            <span className="ml-2 font-mono text-xs text-gr-muted">terminal</span>
          </div>
          <pre className="m-0 overflow-x-auto p-4 font-mono text-sm leading-relaxed text-gr-text">
            <code>
              <span className="block">
                <span className="text-gr-add-text">$</span> git clone
                https://github.com/nshntarora/guidedreview.git
              </span>
              <span className="block">
                <span className="text-gr-add-text">$</span> cd guidedreview &amp;&amp; npm install
              </span>
              <span className="block">
                <span className="text-gr-add-text">$</span> npm run build:extension
              </span>
              <span className="mt-2 block text-gr-muted">
                # then load apps/extension/dist as an unpacked
              </span>
              <span className="block text-gr-muted"># extension at chrome://extensions</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

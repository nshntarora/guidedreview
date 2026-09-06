import { buttonClassName } from "@guided-review/ui";
import { CLI_INSTALL_COMMAND } from "@web/lib/links";
import { InstallButton, TryCliButton } from "./CtaButtons";
import { WindowFrame } from "./WindowFrame";

const steps = [
  {
    title: "Read the real diff",
    body: "The extension pulls the PR on GitHub; the CLI uses your local git scope (branch, commit, or working tree).",
  },
  {
    title: "Structure into review units",
    body: "Your LLM clusters related hunks and adds short summaries — or you walk one unit per file with no key.",
  },
  {
    title: "You walk the plan",
    body: "Keyboard-first navigation through the change. AI structures the walkthrough; you still decide.",
  },
] as const;

export function Surfaces() {
  return (
    <section id="surfaces" className="relative px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          Where you run it
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted text-balance sm:text-xl">
          Same review engine. Pick the host that matches the change you&apos;re reviewing.
        </p>

        <ul className="mt-14 m-0 grid list-none grid-cols-1 gap-5 p-0 sm:mt-20 md:grid-cols-2">
          <li className="flex">
            <WindowFrame
              label="chrome-extension.tsx"
              className="flex h-full w-full flex-col transition-colors duration-300 hover:border-primary/60"
              bodyClassName="flex flex-1 flex-col"
            >
              <p className="m-0 font-mono text-xs uppercase tracking-wide text-muted">
                Chrome extension
              </p>
              <h3 className="m-0 mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                GitHub pull requests
              </h3>
              <p className="mt-3 m-0 flex-1 text-base leading-relaxed text-muted sm:text-lg">
                Opens on the PR page. Clusters the real diff into review units, walk them
                keyboard-first, and optionally draft or submit the review without leaving GitHub.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <InstallButton location="surfaces" size="md" />
                <a
                  href="/docs/install#chrome-extension"
                  className={buttonClassName({ variant: "secondary", size: "md" })}
                >
                  Docs
                </a>
              </div>
            </WindowFrame>
          </li>

          <li className="flex">
            <WindowFrame
              label="cli.sh"
              className="flex h-full w-full flex-col transition-colors duration-300 hover:border-primary/60"
              bodyClassName="flex flex-1 flex-col"
            >
              <p className="m-0 font-mono text-xs uppercase tracking-wide text-muted">CLI</p>
              <h3 className="m-0 mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                Local branch, commit, or working tree
              </h3>
              <p className="mt-3 m-0 flex-1 text-base leading-relaxed text-muted sm:text-lg">
                Run <code className="font-mono text-sm text-foreground">{CLI_INSTALL_COMMAND}</code>{" "}
                to open a local browser UI. Same units and walkthrough; Structure with AI is opt-in.
                Notes stay local — no GitHub submit.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <TryCliButton location="surfaces" size="md" variant="primary" />
                <a
                  href="/docs/local-review"
                  className={buttonClassName({ variant: "secondary", size: "md" })}
                >
                  Docs
                </a>
              </div>
            </WindowFrame>
          </li>
        </ul>

        <div className="mt-14 sm:mt-20">
          <h3 className="m-0 text-center text-xl font-bold tracking-tight sm:text-2xl font-brand">
            How it works
          </h3>
          <ol className="mt-8 m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <WindowFrame
                  label={`${String(index + 1).padStart(2, "0")}.step`}
                  className="h-full"
                >
                  <h4 className="m-0 text-lg font-semibold tracking-tight">{step.title}</h4>
                  <p className="mt-2 m-0 text-base leading-relaxed text-muted">{step.body}</p>
                </WindowFrame>
              </li>
            ))}
          </ol>
          <p className="mt-6 m-0 text-center text-sm text-muted">
            <a href="/docs/how-it-works">Full pipeline →</a>
          </p>
        </div>
      </div>
    </section>
  );
}

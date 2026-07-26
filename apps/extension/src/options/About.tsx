import { SettingsCard } from "./SettingsCard";

const DOCS_URL = "https://guidedreview.dev/docs";
const PRIVACY_POLICY_URL = "https://guidedreview.dev/privacy";
const sectionBody = "m-0 text-base leading-relaxed text-opt-muted";
const textLink =
  "font-medium focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent";

/**
 * Explains what Guided Review does, how a review works, and where data goes.
 * Linked from Settings via the options shell nav (`#about`).
 */
export function About() {
  const version = chrome.runtime.getManifest().version;

  return (
    <main id="main-content">
      <header className="mb-8">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="m-0 font-brand text-2xl font-bold tracking-tight text-opt-text">About</h1>
          {version ? (
            <span className="rounded-full border border-opt-border bg-opt-subtle/60 px-2.5 py-px font-mono text-xs text-opt-muted tabular-nums">
              v{version}
            </span>
          ) : null}
        </div>
        <p className="mt-2 m-0 text-base leading-relaxed text-opt-muted text-balance">
          AI-structured review plans for GitHub pull requests
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SettingsCard title="What It Does" titleId="about-what">
          <p className={sectionBody}>
            Guided Review turns a PR diff into an ordered review plan. You step through logical
            units — schema and data model first, then core logic, call-sites, then tests — with
            short context and risk notes per step.
          </p>
        </SettingsCard>

        <SettingsCard title="How a Review Works" titleId="about-how">
          <ol className="m-0 list-decimal space-y-2 pl-5 text-base leading-relaxed text-opt-muted">
            <li>Open a pull request on GitHub.</li>
            <li>
              Click <strong className="font-semibold text-opt-text">Start Guided Review</strong> on
              the PR page (or use the extension icon while a PR tab is active).
            </li>
            <li>
              The extension fetches the PR diff and sends it to the AI provider you configured,
              which builds a structured review plan.
            </li>
            <li>
              Step through the plan in the overlay: description first, then each review unit with
              the real diff hunks resolved from the PR — the model plans structure and commentary
              only; it does not invent the code you see.
            </li>
          </ol>
        </SettingsCard>

        <SettingsCard title="Privacy" titleId="about-privacy">
          <p className={sectionBody}>
            Your API key is stored only in this browser via{" "}
            <code className="rounded bg-opt-bg/80 px-1 py-0.5 font-mono text-sm text-opt-text">
              chrome.storage.local
            </code>
            . Diffs and prompts go only to the provider you choose (Anthropic, OpenAI, or xAI).
            There is no Guided Review backend in the middle.
          </p>
          <p className={`${sectionBody} mt-3`}>
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={textLink}
            >
              Privacy policy
            </a>
          </p>
        </SettingsCard>
      </div>

      <p className="mt-6 m-0 text-sm text-opt-muted">
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={textLink}>
          Full docs
        </a>
        <span className="text-opt-muted"> · guidedreview.dev</span>
      </p>
    </main>
  );
}

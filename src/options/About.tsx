import { BrandHeader } from "./BrandHeader";

const sectionTitle = "mb-2 mt-0 text-[13px] font-semibold text-opt-text";
const bodyText = "m-0 text-[13px] leading-relaxed text-opt-muted";

/**
 * Explains what Guided Review does, how a walkthrough works, and where data goes.
 * Linked from the Settings (options) page via `#about`.
 */
export function About() {
  const version = chrome.runtime.getManifest().version;

  return (
    <div className="mx-auto max-w-[480px] px-6 py-8">
      <BrandHeader />
      <p className="mb-6 text-[13px] text-opt-muted">
        AI-structured walkthroughs for GitHub pull requests
        {version ? (
          <>
            {" "}
            · <span className="tabular-nums">v{version}</span>
          </>
        ) : null}
      </p>

      <section className="mb-6">
        <h2 className={sectionTitle}>What it does</h2>
        <p className={bodyText}>
          Guided Review turns a GitHub pull request diff into an ordered, AI-guided review.
          Instead of scrolling a flat file list, you walk through logical units — schema and
          data-model changes first, then the core logic that depends on them, then call-sites,
          then tests — with short context and risk flags for each step.
        </p>
      </section>

      <section className="mb-6">
        <h2 className={sectionTitle}>How a review works</h2>
        <ol className="m-0 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-opt-muted">
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
      </section>

      <section className="mb-6">
        <h2 className={sectionTitle}>Privacy</h2>
        <p className={bodyText}>
          Your AI API key and optional GitHub OAuth token are stored only in this browser via{" "}
          <code className="rounded bg-opt-subtle px-1 py-0.5 text-[12px] text-opt-text">
            chrome.storage.local
          </code>
          . Diffs and prompts go only to the AI provider you choose (Anthropic, OpenAI, or xAI).
          Connecting GitHub uses device sign-in so you can authorize API actions (such as
          submitting reviews) without pasting a personal access token. There is no Guided Review
          backend in the middle.
        </p>
      </section>

      <nav className="mt-8 border-t border-opt-border pt-6">
        <a
          href="#settings"
          className="text-[13px] font-semibold text-opt-muted no-underline hover:text-opt-text hover:underline"
        >
          ← Settings
        </a>
      </nav>
    </div>
  );
}

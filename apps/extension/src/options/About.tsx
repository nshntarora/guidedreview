const SITE_URL = "https://guidedreview.dev";
const DOCS_URL = `${SITE_URL}/docs`;
const PRIVACY_POLICY_URL = `${SITE_URL}/privacy`;
const TERMS_URL = `${SITE_URL}/terms`;
const GITHUB_REPO_URL = "https://github.com/nshntarora/guidedreview";

const textLink =
  "font-medium focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opt-accent";

const LINKS = [
  { href: SITE_URL, label: "Website" },
  { href: DOCS_URL, label: "Docs" },
  { href: GITHUB_REPO_URL, label: "GitHub" },
  { href: PRIVACY_POLICY_URL, label: "Privacy" },
  { href: TERMS_URL, label: "Terms" },
] as const;

/**
 * Minimal product overview — logomark, what it is, how a review works, privacy,
 * and outbound links. Linked from Settings via the options shell nav (`#about`).
 */
export function About() {
  const version = chrome.runtime.getManifest().version;
  const logomarkUrl = chrome.runtime.getURL("logomark.svg");

  return (
    <main id="main-content" className="mx-auto max-w-xl">
      <header className="text-center">
        <img
          src={logomarkUrl}
          alt=""
          width={343}
          height={172}
          className="mx-auto block h-12 w-auto sm:h-14"
          aria-hidden="true"
        />
        <h1 className="mt-5 m-0 font-brand text-2xl font-bold tracking-tight text-opt-text sm:text-3xl">
          Guided Review
        </h1>
        {version ? (
          <p className="mt-2 m-0 font-mono text-xs text-opt-muted tabular-nums">v{version}</p>
        ) : null}
        <p className="mt-5 m-0 text-base leading-relaxed text-opt-muted text-balance sm:text-lg">
          A Chrome extension that makes reading code better — clustered changes, short summaries,
          and a keyboard-first review overlay for GitHub pull requests.
        </p>
        <p className="mt-3 m-0 font-mono text-xs text-opt-muted">
          Free · Open source · Bring your own LLM key
        </p>
      </header>

      <section className="mt-12 text-left" aria-labelledby="about-how">
        <h2
          id="about-how"
          className="m-0 font-brand text-lg font-bold tracking-tight text-opt-text"
        >
          How it works
        </h2>
        <ol className="mt-4 m-0 list-decimal space-y-3 pl-5 text-base leading-relaxed text-opt-muted">
          <li>Open a pull request on GitHub.</li>
          <li>
            Click <strong className="font-semibold text-opt-text">Start Guided Review</strong> on
            the PR page.
          </li>
          <li>
            The extension fetches the diff and sends it to the AI provider you configured, which
            clusters related changes into an ordered review plan.
          </li>
          <li>
            Step through the plan in the overlay — real diff hunks, short context, you still judge
            the code.
          </li>
        </ol>
      </section>

      <section className="mt-12 text-left" aria-labelledby="about-privacy">
        <h2
          id="about-privacy"
          className="m-0 font-brand text-lg font-bold tracking-tight text-opt-text"
        >
          Privacy
        </h2>
        <p className="mt-4 m-0 text-base leading-relaxed text-opt-muted">
          Your code never touches our infrastructure — we don&apos;t have any. Diffs and prompts go
          only to the provider you choose. Your API key stays in this browser via{" "}
          <code className="rounded bg-opt-subtle px-1 py-0.5 font-mono text-sm text-opt-text">
            chrome.storage.local
          </code>
          .
        </p>
      </section>

      <nav
        className="mt-14 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
        aria-label="Product links"
      >
        {LINKS.map((link, i) => (
          <span key={link.href} className="inline-flex items-center gap-x-3">
            {i > 0 ? (
              <span className="text-opt-muted/50" aria-hidden="true">
                ·
              </span>
            ) : null}
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={textLink}>
              {link.label}
            </a>
          </span>
        ))}
      </nav>
    </main>
  );
}

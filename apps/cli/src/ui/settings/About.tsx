import pkg from "../../../package.json";

const SITE_URL = "https://guidedreview.dev";
const DOCS_URL = `${SITE_URL}/docs`;
const LOCAL_REVIEW_URL = `${DOCS_URL}/local-review`;
const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/pdnnimoajmnjpccboemeomoeomancodd";
const PRIVACY_POLICY_URL = `${SITE_URL}/privacy`;
const TERMS_URL = `${SITE_URL}/terms`;
const GITHUB_REPO_URL = "https://github.com/nshntarora/guidedreview";

const textLink =
  "font-medium focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const LINKS = [
  { href: SITE_URL, label: "Website" },
  { href: LOCAL_REVIEW_URL, label: "Docs" },
  { href: GITHUB_REPO_URL, label: "GitHub" },
  { href: PRIVACY_POLICY_URL, label: "Privacy" },
  { href: TERMS_URL, label: "Terms" },
] as const;

/**
 * Minimal product overview for the local CLI walkthrough, plus a pointer to the
 * Chrome extension. Linked from Settings via the settings shell nav (`#about`).
 */
export function About() {
  return (
    <main className="mx-auto max-w-xl">
      <header className="text-center">
        <img
          src="/logomark.svg"
          alt=""
          width={343}
          height={172}
          className="mx-auto block h-12 w-auto sm:h-14"
          aria-hidden="true"
        />
        <h1 className="mt-5 m-0 font-brand text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Guided Review
        </h1>
        {pkg.version ? (
          <p className="mt-2 m-0 font-mono text-xs text-muted tabular-nums">v{pkg.version}</p>
        ) : null}
        <p className="mt-5 m-0 text-base leading-relaxed text-muted text-balance sm:text-lg">
          Local walkthrough of a branch, commit, or working tree. Same engine as the Chrome
          extension. AI structures the plan — you still judge the code.
        </p>
        <p className="mt-3 m-0 font-mono text-xs text-muted">
          Free · Open source · Bring your own LLM key
        </p>
      </header>

      <section className="mt-12 text-left" aria-labelledby="about-how">
        <h2
          id="about-how"
          className="m-0 font-brand text-lg font-bold tracking-tight text-foreground"
        >
          How it works
        </h2>
        <ol className="mt-4 m-0 list-decimal space-y-3 pl-5 text-base leading-relaxed text-muted">
          <li>
            Run the CLI from a git repo. It binds{" "}
            <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-sm text-foreground">
              127.0.0.1
            </code>{" "}
            and opens the printed URL.
          </li>
          <li>Walk the change file by file — no model call yet.</li>
          <li>
            Click <strong className="font-semibold text-foreground">Structure with AI</strong> when
            you want related files clustered into review units with short context.
          </li>
          <li>You still read the code. Notes stay in this session until you copy them.</li>
        </ol>
      </section>

      <section className="mt-12 text-left" aria-labelledby="about-extension">
        <h2
          id="about-extension"
          className="m-0 font-brand text-lg font-bold tracking-tight text-foreground"
        >
          Chrome extension
        </h2>
        <p className="mt-4 m-0 text-base leading-relaxed text-muted">
          Same engine, on github.com. The{" "}
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={textLink}
          >
            Chrome extension
          </a>{" "}
          overlays a pull request: click{" "}
          <strong className="font-semibold text-foreground">Start Guided Review</strong>, then walk
          clustered review units mapped to the real diff.
        </p>
      </section>

      <section className="mt-12 text-left" aria-labelledby="about-privacy">
        <h2
          id="about-privacy"
          className="m-0 font-brand text-lg font-bold tracking-tight text-foreground"
        >
          Privacy
        </h2>
        <p className="mt-4 m-0 text-base leading-relaxed text-muted">
          Your code never touches Guided Review infrastructure — we don&apos;t have any. Diffs and
          prompts go only to the provider you choose. Your API key stays on this machine in{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-sm text-foreground">
            config.json
          </code>
          , or in a coding agent&apos;s own store.
        </p>
      </section>

      <nav
        className="mt-14 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
        aria-label="Product links"
      >
        {LINKS.map((link, i) => (
          <span key={link.href} className="inline-flex items-center gap-x-3">
            {i > 0 ? (
              <span className="text-muted/50" aria-hidden="true">
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

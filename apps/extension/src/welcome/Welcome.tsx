import { useEffect, useState, type ReactNode } from "react";
import { Button, buttonClassName } from "@guided-review/ui";

const SITE_URL = "https://guidedreview.dev";
const DOCS_URL = `${SITE_URL}/docs`;
const PRIVACY_URL = `${SITE_URL}/privacy`;
const TERMS_URL = `${SITE_URL}/terms`;
const GITHUB_REPO_URL = "https://github.com/nshntarora/guidedreview";
const GITHUB_PULLS_URL = "https://github.com/pulls";

const textLink =
  "font-medium focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const LINKS = [
  { href: SITE_URL, label: "Website" },
  { href: DOCS_URL, label: "Docs" },
  { href: GITHUB_REPO_URL, label: "GitHub" },
  { href: PRIVACY_URL, label: "Privacy" },
  { href: TERMS_URL, label: "Terms" },
] as const;

type PinState = "loading" | "pinned" | "unpinned" | "unknown";

async function readPinState(): Promise<PinState> {
  try {
    const settings = await chrome.action.getUserSettings();
    return settings.isOnToolbar ? "pinned" : "unpinned";
  } catch {
    return "unknown";
  }
}

/**
 * First-install welcome page. Short path to value: pin → connect provider → open a PR.
 */
export function Welcome() {
  const [pinState, setPinState] = useState<PinState>("loading");
  const logomarkUrl = chrome.runtime.getURL("logomark.svg");

  useEffect(() => {
    void readPinState().then(setPinState);
  }, []);

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-12 sm:py-16">
      <header className="text-center">
        <img
          src={logomarkUrl}
          alt=""
          width={343}
          height={172}
          className="mx-auto block h-11 w-auto sm:h-12"
          aria-hidden="true"
        />
        <h1 className="mt-8 m-0 font-brand text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Welcome
        </h1>
        <p className="mt-3 m-0 text-base leading-relaxed text-muted sm:text-lg">
          Here&apos;s how to get started.
        </p>
      </header>

      <ol className="mt-10 m-0 list-none space-y-0 divide-y divide-border rounded-lg border border-border bg-surface-raised/50 p-0">
        <Step n={1} title="Pin the extension" done={pinState === "pinned"}>
          {pinState === "pinned" ? (
            <p className="m-0 text-base leading-relaxed text-muted">
              Pinned to the toolbar — you&apos;re set.
            </p>
          ) : (
            <p className="m-0 text-base leading-relaxed text-muted">
              Open the puzzle-piece menu and pin Guided Review so it stays visible. Unpinned
              extensions are easy to forget.
            </p>
          )}
        </Step>

        <Step n={2} title="Connect an AI provider">
          <p className="m-0 text-base leading-relaxed text-muted">
            Paste a key for Claude, OpenAI, or Grok. Keys stay in this browser — we don&apos;t have
            servers in the middle.
          </p>
        </Step>

        <Step n={3} title="Start a review on a PR">
          <p className="m-0 text-base leading-relaxed text-muted">
            Open any GitHub pull request and click{" "}
            <strong className="font-semibold text-foreground">Start Guided Review</strong>. The
            extension clusters related changes so you walk the PR in a sensible order.
          </p>
        </Step>
      </ol>

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <Button onClick={openSettings} data-testid="welcome-connect-provider">
          Connect AI provider
        </Button>
        <a
          href={GITHUB_PULLS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({ variant: "secondary" })}
          data-testid="welcome-open-pulls"
        >
          Open GitHub pull requests
        </a>
      </div>

      <p className="mt-10 m-0 text-center text-sm leading-relaxed text-muted text-balance">
        Your code never touches our infrastructure. Diffs go only to the provider you choose.
      </p>

      <nav
        className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm"
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

function Step({
  n,
  title,
  children,
  done = false,
}: {
  n: number;
  title: string;
  children: ReactNode;
  done?: boolean;
}) {
  return (
    <li className="flex gap-4 px-5 py-5 text-left sm:px-6">
      <span
        className={
          done
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/15 font-mono text-sm font-semibold tabular-nums text-success"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-sm font-semibold tabular-nums text-foreground"
        }
        aria-hidden="true"
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="m-0 font-brand text-base font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  );
}

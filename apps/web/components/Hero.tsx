"use client";

import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
import { ProductPreview } from "./ProductPreview";
import { CHROME_WEB_STORE_URL, CLI_INSTALL_COMMAND } from "@web/lib/links";
import { CopyButton } from "@web/components/docs/CopyButton";

export function Hero() {
  return (
    <section
      className="relative overflow-hidden px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-28 sm:pt-24"
      data-testid="home-hero"
    >
      <div className="mx-auto max-w-5xl">
        <h1
          data-testid="home-heading"
          className="mx-auto max-w-3xl text-3xl leading-[1.35] font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.3] md:text-6xl font-brand"
        >
          <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
            Review AI-generated code
          </span>{" "}
          before you sign your name to it
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted text-balance sm:text-xl">
          Follow each change across files with AI-organized review units. Read the real diff, leave
          feedback, and decide what ships — locally or on GitHub.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <InstallButton location="hero" />
          <StarOnGitHubButton location="hero" />
        </div>
        <p className="mt-4 font-mono text-xs text-muted">
          Free · Open source · Bring your own LLM key
        </p>
        <p className="mt-3 text-sm text-muted">
          Your provider: <span className="text-foreground">Anthropic · OpenAI · Grok</span>
        </p>

        <dl className="mx-auto mt-10 grid max-w-4xl gap-4 rounded-lg border border-border bg-surface-raised/50 p-5 text-left sm:grid-cols-2 sm:gap-6">
          <div className="min-w-0">
            <dt className="flex items-center gap-2 font-mono text-xs text-muted">
              <img
                src="/assets/icon.png"
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0 rounded-sm"
              />
              Local changes
            </dt>
            <dd className="mx-0 mt-2 text-sm leading-relaxed">
              <div
                className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
                data-testid="hero-cli-command"
              >
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground sm:text-sm">
                  {CLI_INSTALL_COMMAND}
                </code>
                <CopyButton text={CLI_INSTALL_COMMAND} className="shrink-0" />
              </div>
              <a href="/docs/cli" className="mt-2 inline-block text-xs">
                View CLI docs →
              </a>
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 font-mono text-xs text-muted">
              <img
                src="/assets/chrome.svg"
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0"
              />
              GitHub pull requests
            </dt>
            <dd className="mx-0 mt-2 text-sm leading-relaxed">
              <div className="flex h-11 items-center">
                <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener noreferrer">
                  Install Chrome Extension
                </a>
              </div>
              <span className="mt-2 block text-xs text-muted">Opens the Chrome Web Store</span>
            </dd>
          </div>
        </dl>

        <ProductPreview />
      </div>
    </section>
  );
}

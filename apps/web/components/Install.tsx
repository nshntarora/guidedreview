import { buttonClassName } from "@guided-review/ui";
import { InstallExtensionButton } from "./CtaButtons";
import { InstallCommands } from "./InstallCommands";
import { WindowFrame } from "./WindowFrame";

const PRODUCT_SHOT = "/product-preview/thumbnail.webp";
const CHROME_TRIGGER_SHOT = "/chrome-extension-trigger.png";

export function Install() {
  return (
    <section
      id="install"
      className="relative px-4 py-16 sm:px-6 sm:py-28"
      data-testid="install-section"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          Install
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted text-balance sm:text-xl">
          Same review engine for local changes and GitHub pull requests.
        </p>

        <div className="mt-14 sm:mt-20">
          <WindowFrame label="install.sh" bodyClassName="flex flex-col gap-0 p-0 sm:p-0 md:p-0">
            <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
              <div
                id="install-cli"
                className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10"
                data-testid="install-cli"
              >
                <div className="min-w-0 md:flex-1">
                  <h3 className="m-0 text-2xl font-bold tracking-tight font-brand sm:text-3xl">
                    CLI
                  </h3>
                  <p className="mt-3 mb-0 text-lg leading-relaxed text-muted sm:text-xl">
                    When you're reviewing your own code.
                  </p>
                  <p className="mt-3 mb-0 leading-relaxed text-muted">
                    Review a local branch, commit, or working tree in the browser — before you open
                    a PR, or when there isn&apos;t one.
                  </p>
                  <div className="mt-6">
                    <InstallCommands />
                  </div>
                  <p className="mt-6 mb-0 text-base text-muted">
                    Full flags and scopes: <a href="/docs/cli">CLI docs →</a>
                  </p>
                </div>
                <InstallScreenshot
                  src={PRODUCT_SHOT}
                  alt="Guided Review CLI review UI showing clustered review units in the browser"
                  caption="Local browser UI — same units, same walkthrough"
                  width={1280}
                  height={720}
                />
              </div>

              <div className="my-8 border-t border-border sm:my-10" aria-hidden="true" />

              <div
                id="install-chrome"
                className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10"
                data-testid="install-chrome"
              >
                <div className="min-w-0 md:flex-1">
                  <h3 className="m-0 text-2xl font-bold tracking-tight font-brand sm:text-3xl">
                    Chrome Extension
                  </h3>
                  <p className="mt-3 mb-0 text-lg leading-relaxed text-muted sm:text-xl">
                    When you're reviewing pull requests on GitHub
                  </p>
                  <p className="mt-3 mb-0 leading-relaxed text-muted">
                    Add{" "}
                    <strong className="font-semibold text-foreground">Start Guided Review</strong>{" "}
                    on GitHub pull requests — walk the same plan on the real PR diff.
                  </p>
                  <figure className="m-0 mt-6">
                    <div className="overflow-hidden rounded-lg border border-border bg-background/60 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                      <img
                        src={CHROME_TRIGGER_SHOT}
                        alt="Start Guided Review button on a GitHub pull request page"
                        width={849}
                        height={181}
                        className="block h-auto w-full"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <figcaption className="m-0 mt-2 font-mono text-xs text-muted sm:text-sm">
                      What the trigger looks like on a GitHub PR
                    </figcaption>
                  </figure>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <InstallExtensionButton location="install" size="md" />
                    <a
                      href="/docs/chrome-extension"
                      className={buttonClassName({ variant: "secondary", size: "md" })}
                    >
                      Docs
                    </a>
                  </div>
                </div>
                <InstallScreenshot
                  src={PRODUCT_SHOT}
                  alt="Guided Review Chrome extension overlay on a GitHub pull request diff"
                  caption="On the real PR diff — keyboard-first review units"
                  width={1280}
                  height={720}
                />
              </div>
            </div>
          </WindowFrame>
        </div>
      </div>
    </section>
  );
}

function InstallScreenshot({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}) {
  return (
    <figure className="m-0 flex w-full flex-col gap-3 md:w-[min(48%,28rem)]">
      <div className="overflow-hidden rounded-lg border border-border bg-background/60 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption className="m-0 text-center font-mono text-xs text-muted sm:text-sm">
        {caption}
      </figcaption>
    </figure>
  );
}

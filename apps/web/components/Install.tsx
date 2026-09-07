"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import { buttonClassName, cn, Kbd } from "@guided-review/ui";
import { InstallExtensionButton } from "./CtaButtons";
import { ChromeIcon, TerminalIcon } from "./icons";
import { InstallCommands } from "./InstallCommands";
import { WindowFrame } from "./WindowFrame";

const PRODUCT_SHOT = "/product-preview/thumbnail.webp";
const CHROME_TRIGGER_SHOT = "/chrome-extension-trigger.png";

type InstallTab = "cli" | "chrome";

const TAB_HASH: Record<InstallTab, string> = {
  cli: "install-cli",
  chrome: "install-chrome",
};

const tabs: {
  id: InstallTab;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  shortcut: string;
}[] = [
  { id: "cli", label: "CLI", Icon: TerminalIcon, shortcut: "1" },
  { id: "chrome", label: "Chrome Extension", Icon: ChromeIcon, shortcut: "2" },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Map location hash → install tab. `#install` defaults to CLI. */
function tabFromHash(hash: string): InstallTab | null {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (id === TAB_HASH.cli || id === "install") return "cli";
  if (id === TAB_HASH.chrome) return "chrome";
  return null;
}

export function Install() {
  const [active, setActive] = useState<InstallTab>("cli");

  const selectTab = useCallback((id: InstallTab, syncUrl = true) => {
    setActive(id);
    if (!syncUrl || typeof window === "undefined") return;
    const next = `#${TAB_HASH[id]}`;
    if (window.location.hash !== next) {
      history.pushState(null, "", next);
    }
  }, []);

  // Keep the active tab in sync with the URL hash (nav deep links, back/forward).
  useLayoutEffect(() => {
    function syncFromHash() {
      const tab = tabFromHash(window.location.hash);
      if (tab) setActive(tab);
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);

    // Next.js <Link href="/#…"> and history.pushState update the hash without
    // firing hashchange. Patch so header deep links still select the right tab.
    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);
    function withHashNotify(method: typeof history.pushState): typeof history.pushState {
      return (data, unused, url) => {
        const prev = window.location.hash;
        const result = method(data, unused, url);
        if (window.location.hash !== prev) {
          window.dispatchEvent(new Event("hashchange"));
        }
        return result;
      };
    }
    history.pushState = withHashNotify(pushState);
    history.replaceState = withHashNotify(replaceState);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, []);

  // 1 → CLI tab, 2 → Chrome extension tab.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.repeat) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key;
      const match = tabs.find((tab) => tab.shortcut === key);
      if (!match) return;

      event.preventDefault();
      selectTab(match.id);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectTab]);

  return (
    <section id="install" className="relative px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          Install
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted text-balance sm:text-xl">
          Same review engine, two surfaces — pick the one that matches the change you&apos;re
          reviewing.
        </p>

        <div className="mt-14 sm:mt-20">
          <WindowFrame label="install.sh" bodyClassName="flex flex-col gap-0 p-0 sm:p-0 md:p-0">
            <div
              role="tablist"
              aria-label="Install options"
              className="flex gap-1 border-b border-border px-4 pt-1 sm:px-6 md:px-8"
            >
              {tabs.map((tab) => {
                const selected = active === tab.id;
                const { Icon } = tab;
                const hashId = TAB_HASH[tab.id];
                return (
                  <a
                    key={tab.id}
                    href={`#${hashId}`}
                    role="tab"
                    id={hashId}
                    aria-selected={selected}
                    aria-controls={`install-panel-${tab.id}`}
                    aria-keyshortcuts={tab.shortcut}
                    tabIndex={selected ? 0 : -1}
                    onClick={(event) => {
                      // Same-page hash links already update the URL; keep React state in sync
                      // without a full scroll jump when the tab is already nearby.
                      event.preventDefault();
                      selectTab(tab.id);
                    }}
                    className={cn(
                      "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-sm no-underline transition-colors sm:px-4 sm:text-base",
                      selected
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted hover:border-transparent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                    <Kbd aria-hidden="true" className="max-sm:hidden">
                      {tab.shortcut}
                    </Kbd>
                  </a>
                );
              })}
            </div>

            <div className="px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 md:px-8 md:pt-10 md:pb-8">
              {active === "cli" ? (
                <div
                  role="tabpanel"
                  id="install-panel-cli"
                  aria-labelledby={TAB_HASH.cli}
                  className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10"
                >
                  <div className="min-w-0 md:flex-1">
                    <h3 className="m-0 text-2xl font-bold tracking-tight font-brand sm:text-3xl">
                      CLI
                    </h3>
                    <p className="mt-3 mb-0 text-lg leading-relaxed text-muted sm:text-xl">
                      When you're reviewing your own code.
                    </p>
                    <p className="mt-3 mb-0 leading-relaxed text-muted">
                      Review a local branch, commit, or working tree in the browser — before you
                      open a PR, or when there isn&apos;t one.
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
              ) : (
                <div
                  role="tabpanel"
                  id="install-panel-chrome"
                  aria-labelledby={TAB_HASH.chrome}
                  className="flex flex-col gap-8 md:flex-row md:items-center md:gap-10"
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
              )}
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

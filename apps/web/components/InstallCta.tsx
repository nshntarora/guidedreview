import iconSvg from "@guided-review/ui/assets/icon.svg";
import { CLI_INSTALL_COMMAND } from "@web/lib/links";
import { InstallButton, TryCliButton } from "./CtaButtons";
import { WindowFrame } from "./WindowFrame";

const iconSrc = typeof iconSvg === "string" ? iconSvg : (iconSvg as { src: string }).src;

export function InstallCta() {
  return (
    <section id="get-started" className="mx-auto my-12 max-w-5xl px-4 sm:my-16 sm:px-6">
      <WindowFrame label="get-started.sh">
        <div className="mx-auto max-w-2xl text-center">
          <img
            src={iconSrc}
            alt=""
            className="mx-auto h-12 w-12 rounded-lg"
            width={512}
            height={512}
          />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl font-brand">
            Get Guided Review
          </h2>
          <p className="mt-3 text-lg text-muted">
            Run <code className="font-mono text-sm text-foreground">{CLI_INSTALL_COMMAND}</code> for
            local changes, or install the Chrome extension for GitHub PRs. Add an LLM API key, then
            walk the plan — AI structures it, you decide.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TryCliButton location="install_cta" variant="primary" />
            <InstallButton location="install_cta" />
          </div>
        </div>
      </WindowFrame>
    </section>
  );
}

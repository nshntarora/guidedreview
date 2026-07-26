import iconSvg from "@guided-review/ui/assets/icon.svg";
import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
import { WindowFrame } from "./WindowFrame";

const iconSrc = typeof iconSvg === "string" ? iconSvg : (iconSvg as { src: string }).src;

export function InstallCta() {
  return (
    <section id="install" className="mx-auto my-12 max-w-5xl px-4 sm:my-16 sm:px-6">
      <WindowFrame label="install.sh">
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
          <p className="mt-3 text-lg text-opt-muted">
            Install the Chrome extension, add an LLM API key in options, and open any GitHub pull
            request. Click{" "}
            <strong className="font-semibold text-opt-text">Start Guided Review</strong> to begin.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <InstallButton />
            <StarOnGitHubButton />
          </div>
        </div>
      </WindowFrame>
    </section>
  );
}

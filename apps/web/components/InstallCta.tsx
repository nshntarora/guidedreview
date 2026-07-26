import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
import { WindowFrame } from "./WindowFrame";

export function InstallCta() {
  return (
    <section id="install" className="mx-auto my-16 max-w-5xl px-6">
      <WindowFrame label="install.sh">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl font-brand">
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

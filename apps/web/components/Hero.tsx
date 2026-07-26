import type { CSSProperties } from "react";
import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
import { ProductVideo } from "./ProductVideo";

function riseDelay(seconds: number): CSSProperties {
  return { "--gr-delay": `${seconds}s` } as CSSProperties;
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
      <div className="mx-auto max-w-5xl">
        <h1
          className="gr-rise-in mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl font-brand"
          style={riseDelay(0.1)}
        >
          A better way for humans to review{" "}
          <span className="relative whitespace-nowrap">
            <span className="relative z-10 text-opt-text">AI generated code</span>
            <span
              className="absolute inset-x-0 bottom-0.5 -z-0 h-[0.35em] bg-opt-accent/70 sm:bottom-1.5"
              aria-hidden="true"
            />
          </span>
        </h1>

        <p
          className="gr-rise-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-opt-muted text-balance sm:text-xl"
          style={riseDelay(0.2)}
        >
          Guided Review is a browser extension that makes &ldquo;reading code&rdquo; wayyyy better
          with clustered file changes, summaries, and a keyboard-first experience.
        </p>

        <div
          className="gr-rise-in mt-10 flex flex-wrap items-center justify-center gap-3"
          style={riseDelay(0.3)}
        >
          <InstallButton />
          <StarOnGitHubButton />
        </div>
        <p className="gr-rise-in mt-4 font-mono text-xs text-opt-muted" style={riseDelay(0.35)}>
          Free · Open source · Bring your own LLM key
        </p>

        <div className="gr-rise-in" style={riseDelay(0.45)}>
          <ProductVideo />
        </div>
      </div>
    </section>
  );
}

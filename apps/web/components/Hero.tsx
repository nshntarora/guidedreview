import type { CSSProperties } from "react";
import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
// Video will be added once it is ready.
// import { ProductVideo } from "./ProductVideo";

function riseDelay(seconds: number): CSSProperties {
  return { "--gr-delay": `${seconds}s` } as CSSProperties;
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-28 sm:pt-24">
      <div className="mx-auto max-w-5xl">
        <h1
          className="gr-rise-in mx-auto max-w-3xl text-3xl leading-[1.35] font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.3] md:text-6xl font-brand"
          style={riseDelay(0.1)}
        >
          A better way for humans to{" "}
          <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
            review AI generated code
          </span>
        </h1>

        <p
          className="gr-rise-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted text-balance sm:text-xl"
          style={riseDelay(0.2)}
        >
          Guided Review is a Chrome extension that makes &ldquo;reading code&rdquo; wayyyy better
          with clustered file changes, summaries, and a keyboard-first experience.
        </p>

        <div
          className="gr-rise-in mt-10 flex flex-wrap items-center justify-center gap-3"
          style={riseDelay(0.3)}
        >
          <InstallButton location="hero" />
          <StarOnGitHubButton location="hero" />
        </div>
        <p className="gr-rise-in mt-4 font-mono text-xs text-muted" style={riseDelay(0.35)}>
          Free · Open source · Bring your own LLM key
        </p>

        {/* Video will be added once it is ready. */}
        {/* <div className="gr-rise-in" style={riseDelay(0.45)}>
          <ProductVideo />
        </div> */}
      </div>
    </section>
  );
}

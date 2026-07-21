import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
import { ProductVideo } from "./ProductVideo";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-20 text-center sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_srgb,var(--opt-accent)_18%,transparent),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(color-mix(in_srgb,var(--opt-border)_18%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--opt-border)_18%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl">
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl font-brand">
          A better way for humans to review{" "}
          <span className="bg-[linear-gradient(90deg,var(--opt-accent),color-mix(in_srgb,var(--opt-accent)_55%,var(--opt-text)))] bg-clip-text text-transparent">
            AI generated code
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-opt-muted text-balance">
          Guided Review is a browser extension that makes "reading code" wayyyy better with things
          like clustered file changes, summaries, and a keyboard first experience.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <InstallButton />
          <StarOnGitHubButton />
        </div>
        <p className="mt-4 font-mono text-xs text-opt-muted">
          Free · Open source · Bring your own LLM key
        </p>

        <ProductVideo />
      </div>
    </section>
  );
}

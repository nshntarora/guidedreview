"use client";

import { InstallButton, StarOnGitHubButton } from "./CtaButtons";
import { ProductVideo } from "./ProductVideo";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-28 sm:pt-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="mx-auto max-w-3xl text-3xl leading-[1.35] font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.3] md:text-6xl font-brand">
          <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
            Review AI-generated code
          </span>{" "}
          {/* <span className="ml-3 rounded-md bg-primary px-2 py-0.5 text-primary-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"> */}
          before you sign your name to it
          {/* </span> */}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted text-balance sm:text-xl">
          Turn your commits into a structured review that helps you catch AI-code issues before your
          teammates do.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <InstallButton location="hero" />
          <StarOnGitHubButton location="hero" />
        </div>
        <p className="mt-4 font-mono text-xs text-muted">
          Free · Open source · Bring your own LLM key
        </p>

        <ProductVideo />
      </div>
    </section>
  );
}

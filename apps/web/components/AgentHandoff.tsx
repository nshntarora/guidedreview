import { WindowFrame } from "./WindowFrame";

export function AgentHandoff() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="handoff-heading">
      <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <p className="m-0 font-mono text-xs uppercase tracking-widest text-primary">
            Local review → next iteration
          </p>
          <h2
            id="handoff-heading"
            className="mt-4 font-brand text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Turn review notes into the next coding prompt.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Read the diff. Leave notes on the lines that need work. Generate Prompt bundles your
            feedback with file paths, line ranges, and selected code.
          </p>
          <p className="text-lg leading-relaxed text-muted">
            Copy it into Claude Code, Codex, or your coding agent. You choose what to send and when
            to run it.
          </p>
          <a href="/docs/generate-prompt">How Generate Prompt works →</a>
        </div>
        <WindowFrame label="review-feedback.md">
          <p className="m-0 font-mono text-xs text-primary">
            Example prompt excerpt · from your note
          </p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed">
            <p className="m-0 font-mono break-all text-foreground">src/retry/backoff.ts:11</p>
            <p className="m-0 text-muted">
              Honor Retry-After when it exceeds the configured delay cap. Add a regression test for
              a long header value.
            </p>
          </div>
          <p className="mt-6 mb-0 border-t border-border pt-4 font-mono text-xs leading-relaxed text-muted">
            Built from your notes · Clipboard handoff · No extra LLM call
          </p>
        </WindowFrame>
      </div>
    </section>
  );
}

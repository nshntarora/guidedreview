import { WindowFrame } from "./WindowFrame";

const X_PROFILE_URL = "https://x.com/nshntarora";

export function Why() {
  return (
    <section id="why" className="relative px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-2xl font-bold tracking-tight text-primary font-brand sm:text-3xl">
          Why?
        </h2>
        <h3 className="m-0 mt-3 text-center text-xl font-bold tracking-tight text-foreground font-brand sm:text-2xl">
          Code review is hard,
          <br />
          and it&apos;s only getting harder
        </h3>

        <WindowFrame label="why.md" className="mt-10">
          <div className="grid gap-8 font-serif text-lg leading-relaxed text-muted sm:grid-cols-2 sm:gap-10 sm:text-xl">
            <div className="space-y-4">
              <p>AI agents are writing code for you, and you have PRs pending your review.</p>
              <p>
                When you installed the hot new code review agent, you imagined it would make the job
                easy. You&apos;d click &quot;approve&quot; and move on to the next PR.
              </p>
              <p>I wish it were true.</p>
              <p>
                Unfortunately,{" "}
                <strong className="font-semibold text-foreground">
                  code review agents are not a replacement for you
                </strong>{" "}
                (your job is safe, yay?).
              </p>
              <p>
                They&apos;re very useful for finding bugs and edge cases you&apos;ve missed, but
                they lack something only you have —{" "}
                <em className="italic text-foreground">&quot;taste.&quot;</em>
              </p>
              <p>
                You have more context. You know the people, the business, and the product better
                than any coding agent. You know when an abstraction is unnecessary. You know what
                needs a comment. You know where to break the rules.
              </p>
            </div>
            <div className="space-y-4">
              <p>And, for that...</p>
              <p className="font-semibold text-foreground">
                Nothing beats &quot;reading&quot; the code.
              </p>
              <p>
                Problem is, reading code is not easy. It&apos;s even harder if your tools are
                designed for storing code rather than reading it.
              </p>
              <p>
                AI has made writing code too easy. It&apos;s time we used it to make reading code
                easy too. We need an experience designed for humans — not to avoid AI, but to use it
                in just the right places (not too little, not too much).
              </p>
              <p>
                Reading the code matters more now because humans aren&apos;t writing it anymore.
              </p>
              <p>That&apos;s why I built Guided Review.</p>
              <p className="pt-2 text-right">
                —{" "}
                <a
                  href={X_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary"
                >
                  @nshntarora
                </a>
              </p>
            </div>
          </div>
        </WindowFrame>
      </div>
    </section>
  );
}

import { WindowFrame } from "./WindowFrame";

const X_PROFILE_URL = "https://x.com/nshntarora";
const MITCHELL_TWEET_URL = "https://x.com/mitchellh/status/2072738025344565262";
const MITCHELL_TWEET_IMG = "/mitchell-hashimoto-tweet.png";

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
              <p className="font-semibold text-foreground">
                Nothing beats &quot;reading&quot; the code.
              </p>
              <figure className="max-w-sm">
                <a
                  href={MITCHELL_TWEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block overflow-hidden rounded-lg border border-border shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <img
                    src={MITCHELL_TWEET_IMG}
                    alt='Mitchell Hashimoto (@mitchellh) on X: "I read the code"'
                    width={352}
                    height={135}
                    className="block h-auto w-full"
                    decoding="async"
                    loading="lazy"
                  />
                </a>
                <figcaption className="mt-2 font-mono text-xs leading-relaxed text-muted">
                  Mitchell Hashimoto, saying the quiet part out loud.{" "}
                  <a
                    href={MITCHELL_TWEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 transition-colors hover:underline"
                  >
                    Source
                  </a>
                </figcaption>
              </figure>
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
                  className="text-primary underline-offset-4 transition-colors hover:underline"
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

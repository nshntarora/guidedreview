import { WindowFrame } from "./WindowFrame";

export function Why() {
  return (
    <section id="why" className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-2xl font-bold tracking-tight text-opt-accent font-brand sm:text-3xl">
          Why?
        </h2>
        <h3 className="m-0 mt-3 text-center text-xl font-bold tracking-tight text-opt-text font-brand sm:text-2xl">
          Code review is hard,
          <br />
          and it&apos;s only getting harder
        </h3>

        <WindowFrame label="why.md" className="mt-10">
          <div className="grid gap-8 font-serif text-lg leading-relaxed text-opt-muted sm:grid-cols-2 sm:gap-10 sm:text-xl">
            <div className="space-y-4">
              <p>
                AI agents are writing code for you, and you have PRs pending your review. When you
                installed the new hot code review agent on GitHub, you imagined it would make the
                job easy. You&apos;d click &quot;approve&quot; and move on to the next PR.
              </p>
              <p>
                Unfortunately, agents writing code and agents reviewing code are not a replacement
                for you (congrats, your job is safe). You have more context. You know people,
                business, and the product better than your coding agent.
              </p>
              <p>
                End of the day, you are still going to have to read the code. You are still going to
                have to understand it, and then you have the final say.
              </p>
              <p className="italic">
                But... it&apos;s just too much code, and it&apos;s hard to review code.
              </p>
            </div>
            <div className="space-y-4">
              <p>What if we used AI to help us review code, and not review it for us?</p>
              <p>
                That&apos;s why I built Guided Review. It&apos;s an experience designed for humans,
                that uses AI in just the right places (not too little, not too much).
              </p>
              <p>Reading the code matters more than ever now that you didn&apos;t write it.</p>
            </div>
          </div>
        </WindowFrame>
      </div>
    </section>
  );
}

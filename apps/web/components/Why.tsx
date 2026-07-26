export function Why() {
  return (
    <>
      <h2 className="m-0 text-center text-2xl font-bold tracking-tight font-brand bg-[linear-gradient(90deg,var(--color-gr-accent),color-mix(in_srgb,var(--color-gr-accent)_55%,var(--color-gr-text)))] bg-clip-text text-transparent sm:text-3xl">
        Why?
      </h2>
      <h3 className="m-0 mt-3 text-center text-xl font-bold tracking-tight text-gr-text font-brand sm:text-2xl">
        Code review is hard,
        <br />
        and it&apos;s only getting harder
      </h3>

      <div className="mt-8 grid gap-8 text-base leading-relaxed text-gr-muted sm:grid-cols-2 sm:gap-10 sm:text-lg">
        <div className="space-y-4">
          <p>
            AI agents are writing code for you, and you have PRs pending your review. You had
            imagined when you installed the new hot code review agent on github, it is going to make
            the job easy for you. You&apos;ll just click &quot;approve&quot; and move on to the next
            PR.
          </p>
          <p>
            Unfortunately, agents writing code, and agents reviewing code are not a replacement for
            you (congrats, your job is safe). You have more context. You know people, business, and
            the product better than your coding agent.
          </p>
          <p>
            End of the day, you are still going to have to read the code. You are still going to
            have to understand it, and then you have the final say.
          </p>
          <p>But... it&apos;s just too much code, and it&apos;s hard to review code.</p>
        </div>
        <div className="space-y-4">
          <p>What if, we used AI to help us review code and not review it for us?</p>
          <p>
            That&apos;s why I built Guided Review. It gives you a brand new experience to review
            pull requests. An experience that&apos;s designed for humans, and uses AI in just the
            right places (not too little, not too much).
          </p>
          <p>
            Reading your code is more important than ever, now that you cannot trust the LLM loops
            creating the PR.
          </p>
        </div>
      </div>
    </>
  );
}

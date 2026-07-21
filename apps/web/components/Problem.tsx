export function Problem() {
  return (
    <section id="problem" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="m-0 text-center text-3xl! font-bold tracking-tight sm:text-3xl font-brand bg-[linear-gradient(90deg,var(--opt-accent),color-mix(in_srgb,var(--opt-accent)_55%,var(--opt-text)))] bg-clip-text text-transparent mb-4">
        Why?
      </h2>
      <h3 className="m-0 text-center text-2xl! font-bold tracking-tight sm:text-3xl font-brand">
        Code review is hard,
        <br />
        and it's only getting harder
      </h3>
      <p className="mx-auto mt-6 max-w-2xl text-left text-lg leading-relaxed text-gr-muted sm:text-lg">
        AI agents are writing code for you, and you have PRs pending your review. You had imagined
        when you installed the new hot code review agent on github, it is going to make the job easy
        for you. You'll just click "approve" and move on to the next PR.
        <br />
        <br />
        Unfortunately, agents writing code, and agents reviewing code are not a replacement for you
        (congrats, your job is safe). You have more context. You know people, business, and the
        product better than your coding agent.
        <br />
        <br />
        End of the day, you are still going to have to read the code. You are still going to have to
        understand it, and then you have the final say.
        <br />
        <br />
        But... it's just too much code, and it's hard to review code.
        <br />
        <br />
        What if, we used AI to help us review code and not review it for us?
        <br />
        <br />
        That's why I built Guided Review. It gives you a brand new experience to review pull
        requests. An experience that's designed for humans, and uses AI in just the right places
        (not too little, not too much).
        <br />
        <br />
        Reading your code is more important than ever, now that you cannot trust the LLM loops
        creating the PR.
      </p>

      {/* <p className="mx-auto mt-6 max-w-2xl text-left text-lg leading-relaxed sm:text-lg">
        You're using your coding agent to push more code than you did before, which is great!
        <br />
        <br />
        You've tried a few code review agents, you raise a PR and these pesky little bots flood it
        with comments.
        <br />
        <br />
        You scroll through them and fix issues the bot has identified (you'll close most of them,
        and won't tell anyone).
        <br />
        <br />
        But... a human still has to finally sign-off on your pull request.
        <br />
        <br />
        That human (who is not an AI), is not going to just click "approve" because the tests passed
        and the bot said it was good to do (I hope so)
        <br />
        <br />
        That human is going to "read the code". It is going to be their name on that PR too.
        <br />
        <br />
        But GitHub was not designed for humans to review so much code. It was designed for writing
        and storing code, it was designed for collaborating around the code, never to read code.
      </p> */}
    </section>
  );
}

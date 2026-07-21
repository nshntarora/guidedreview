const steps = [
  {
    title: "Install the extension",
    body: "Add Guided Review to Chrome and drop in an API key for Anthropic, OpenAI, or Grok.",
  },
  {
    title: "Open a pull request",
    body: "Navigate to any GitHub PR. A “Start Guided Review” button appears in the toolbar.",
  },
  {
    title: "Walk the ordered plan",
    body: "The diff is grouped into review units — schema, logic, call-sites, then tests — and streamed in as you go.",
  },
  {
    title: "Comment and submit",
    body: "Leave line comments while you walk the plan, then submit a real GitHub review without switching tabs.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="m-0 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        How it works
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-opt-muted">
        From install to a submitted review in four steps.
      </p>
      <ol className="relative m-0 mt-12 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-4 sm:gap-6">
        <div
          className="absolute left-0 right-0 top-5 hidden h-px bg-opt-border sm:block"
          aria-hidden="true"
        />
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="relative flex flex-col items-start gap-3 sm:items-center sm:text-center"
          >
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-opt-accent bg-opt-bg font-mono text-sm font-bold text-opt-text">
              {i + 1}
            </span>
            <div>
              <h3 className="m-0 text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 m-0 text-sm leading-relaxed text-opt-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

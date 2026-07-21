const features = [
  {
    title: "Schema → logic → call-sites → tests",
    body: "The model groups hunks into an ordered plan so you review foundations before consumers and coverage.",
  },
  {
    title: "Your code, real diffs",
    body: "The LLM plans structure and commentary only. The overlay always shows the actual parsed GitHub diff.",
  },
  {
    title: "Works with your LLM",
    body: "Bring Anthropic, OpenAI, or Grok. Keys stay in your browser; reviews stream as units arrive.",
  },
  {
    title: "Submit when ready",
    body: "Draft line comments while you walk the plan, then submit a GitHub review without leaving the flow.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="m-0 text-center text-2xl font-bold tracking-tight">
        Built for thorough PR review
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-opt-muted">
        Less scrolling a wall of files. More deliberate progress through the change.
      </p>
      <ul className="mt-12 m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2">
        {features.map((f) => (
          <li
            key={f.title}
            className="rounded-xl border border-opt-border bg-opt-subtle p-6 shadow-sm"
          >
            <h3 className="m-0 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 m-0 text-base leading-relaxed text-opt-muted">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

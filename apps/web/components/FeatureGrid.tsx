import type { ComponentType, SVGProps } from "react";
import { CheckShieldIcon, DiffIcon, LayersIcon, PlugIcon } from "./icons";

const features: { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; body: string }[] = [
  {
    icon: LayersIcon,
    title: "Schema → logic → call-sites → tests",
    body: "The model groups hunks into an ordered plan so you review foundations before consumers and coverage.",
  },
  {
    icon: DiffIcon,
    title: "Your code, real diffs",
    body: "The LLM plans structure and commentary only. The overlay always shows the actual parsed GitHub diff.",
  },
  {
    icon: PlugIcon,
    title: "Works with your LLM",
    body: "Bring Anthropic, OpenAI, or Grok. Keys stay in your browser; reviews stream as units arrive.",
  },
  {
    icon: CheckShieldIcon,
    title: "Submit when ready",
    body: "Draft line comments while you walk the plan, then submit a GitHub review without leaving the flow.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="m-0 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Built for thorough PR review
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-opt-muted">
        Less scrolling a wall of files. More deliberate progress through the change.
      </p>
      <ul className="mt-12 m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2">
        {features.map((f) => (
          <li
            key={f.title}
            className="group rounded-xl border border-opt-border bg-opt-subtle p-6 shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-opt-accent hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-opt-border bg-opt-bg text-opt-text transition-colors group-hover:border-opt-accent group-hover:text-opt-accent-on group-hover:bg-opt-accent">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="m-0 mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 m-0 text-base leading-relaxed text-opt-muted">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

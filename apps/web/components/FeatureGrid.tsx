import type { ComponentType, SVGProps } from "react";
import {
  ApprovedToolsIllustration,
  ClusteredChangesIllustration,
  KeyboardFirstIllustration,
  NoBackendIllustration,
  SummariesIllustration,
} from "./FeatureIllustrations";

type Feature = {
  title: string;
  body: string[];
  footnote?: string;
  Illustration: ComponentType<SVGProps<SVGSVGElement>>;
};

const features: Feature[] = [
  {
    Illustration: KeyboardFirstIllustration,
    title: "Read and navigate how you write",
    body: [
      "We've designed the whole code review experience to be keyboard first.",
      "You will not need to lift your hands from your keyboard to browse, comment, or review.",
    ],
  },
  {
    Illustration: ClusteredChangesIllustration,
    title: "Review changes, not files",
    body: [
      "Instead of showing just a diff of all the files that have changed in alphabetical order and letting you figure out how they connect, we use AI to cluster related changes together.",
      "If the author changed the config in two places, you'll find them together.",
    ],
  },
  {
    Illustration: SummariesIllustration,
    title: "Summaries (because AI)",
    body: [
      "You can choose not to read them. Sometimes they're really helpful; sometimes they may not be.",
      "Take them with a grain of salt.",
    ],
    footnote:
      "Model companies apparently block your API keys if you do not implement summarisation. Seriously.",
  },
  {
    Illustration: NoBackendIllustration,
    title: "We didn't even build a backend",
    body: [
      "There's no tracking. Your extension never pushes any code to our systems. You configure your API keys and the extension calls the APIs directly.",
      "You connect your GitHub account and it happens without hitting our servers.",
      "We don't even have servers. Not even the serverless servers (as of now).",
    ],
  },
  {
    Illustration: ApprovedToolsIllustration,
    title: "Tools corporate security has already approved",
    body: [
      "If you're allowed to access OpenAI, Anthropic, or xAI, you can use this. Just add your API key.",
      "If you do not trust the code, read it — or ask your AI agent to read it for you. It's open source, it's on GitHub.",
    ],
    footnote:
      "Please check with them if your employer is serious about these things. If you're a two-person startup, you're fine.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="m-0 text-center text-2xl font-bold tracking-tight sm:text-3xl font-brand">
        Features
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-opt-muted">
        Built for humans who still have to read the code.
      </p>

      <ul className="mt-12 m-0 flex list-none flex-col gap-6 p-0">
        {features.map((f) => (
          <li
            key={f.title}
            className="overflow-hidden rounded-xl border border-opt-border bg-opt-subtle shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-opt-accent hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-stretch">
              <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
                <h3 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl">{f.title}</h3>
                <div className="mt-3 space-y-3 text-base leading-relaxed text-opt-muted">
                  {f.body.map((paragraph) => (
                    <p key={paragraph} className="m-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {f.footnote ? (
                  <p className="mt-4 m-0 border-t border-opt-border pt-3 text-sm leading-relaxed text-opt-muted italic">
                    {f.footnote}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center justify-center border-t border-opt-border bg-opt-bg/60 px-4 py-6 sm:w-[min(42%,20rem)] sm:border-t-0 sm:border-l">
                <f.Illustration className="h-auto w-full max-w-[280px]" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

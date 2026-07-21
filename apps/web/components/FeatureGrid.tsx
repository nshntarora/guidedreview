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
      "You will not need to lift your hands from your keyboard to browse, comment, review.",
    ],
  },
  {
    Illustration: ClusteredChangesIllustration,
    title: "Review changes not files",
    body: [
      "Instead of showing just a diff of all the files that have changed in alphabetical order and letting you figure out how they connect together, we use AI to cluster related changes together.",
    ],
  },
  {
    Illustration: SummariesIllustration,
    title: "Summaries (because AI)",
    body: [
      "Get a 2 line overview of every change. Sometimes it's really helpful, sometimes it's not. Take it with a grain of salt.",
    ],
    footnote:
      "Model companies apparently block your API keys if you do not implement summarisation. Seriously.",
  },
  {
    Illustration: NoBackendIllustration,
    title: "We didn't even build a backend",
    body: [
      "Your extension never pushes any code to our systems. You configure your AI provider and the extension calls their APIs directly.",
      "You connect your GitHub account without hitting any of our APIs.",
    ],
    footnote: "We don't even have servers. Not even the serverless kind.",
  },
  {
    Illustration: ApprovedToolsIllustration,
    title: "Tools corporate security has already approved",
    body: [
      "Just add your already approved AI provider with an API key. Want to read the code? Add a custom AI provider? It's open source (without VC funding).",
    ],
    footnote:
      "Please check with your employer if they've policies about this. If you're a 2 person startup, you're (probably) fine.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
        Features
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-opt-muted">
        Built for humans who still have to read the code.
      </p>

      <ul className="mt-16 m-0 flex list-none flex-col gap-20 p-0 sm:mt-20 sm:gap-28">
        {features.map((f) => (
          <li key={f.title} className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-14">
            <div className="flex flex-1 flex-col justify-center">
              <h3 className="m-0 text-2xl font-semibold tracking-tight sm:text-3xl">{f.title}</h3>
              <div className="mt-4 space-y-4 text-lg leading-relaxed text-opt-muted sm:text-xl">
                {f.body.map((paragraph) => (
                  <p key={paragraph} className="m-0">
                    {paragraph}
                  </p>
                ))}
              </div>
              {f.footnote ? (
                <p className="mt-5 m-0 text-base leading-relaxed text-opt-muted italic">
                  {f.footnote}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center justify-center sm:w-[min(48%,24rem)]">
              <f.Illustration className="h-auto w-full max-w-[360px]" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

import type { ComponentType, SVGProps } from "react";
import { WindowFrame } from "./WindowFrame";
import {
  ApprovedToolsIllustration,
  ClusteredChangesIllustration,
  KeyboardFirstIllustration,
  SummariesIllustration,
} from "./FeatureIllustrations";

type Feature = {
  file: string;
  title: string;
  body: string[];
  footnote?: string;
  Illustration: ComponentType<SVGProps<SVGSVGElement>>;
};

const features: Feature[] = [
  {
    file: "clustered-changes.diff",
    Illustration: ClusteredChangesIllustration,
    title: "Review changes not files",
    body: [
      "Instead of showing just a diff of all the files that have changed in alphabetical order and letting you figure out how they connect together, we use AI to cluster related changes together.",
    ],
  },
  {
    file: "navigation.keys",
    Illustration: KeyboardFirstIllustration,
    title: "Read and navigate how you write",
    body: [
      "We've designed the whole code review experience to be keyboard first.",
      "You will not need to lift your hands from your keyboard to browse, comment, review.",
    ],
  },
  {
    file: "summaries.ai",
    Illustration: SummariesIllustration,
    title: "Summaries (because AI)",
    body: [
      "Get a 2 line overview of every change. Sometimes it's really helpful, sometimes it's not. Take it with a grain of salt.",
    ],
    footnote:
      "Model companies apparently block your API keys if you do not implement summarisation. Seriously.",
  },
  {
    file: "approved-tools.json",
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
  const [lead, ...rest] = features;
  const last = rest.pop();

  return (
    <section id="features" className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          Features
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-opt-muted text-balance sm:text-xl">
          Built for humans who still have to read the code.
        </p>

        <ul className="mt-14 m-0 grid list-none grid-cols-1 gap-5 p-0 sm:mt-20 md:grid-cols-2">
          {/* Lead feature spans the full width with a side-by-side layout. */}
          <li className="md:col-span-2">
            <FeatureCard feature={lead} wide />
          </li>
          {rest.map((f) => (
            <li key={f.title} className="flex">
              <FeatureCard feature={f} />
            </li>
          ))}
          {last ? (
            <li className="md:col-span-2">
              <FeatureCard feature={last} wide />
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

function FeatureCard({ feature: f, wide = false }: { feature: Feature; wide?: boolean }) {
  return (
    <WindowFrame
      label={f.file}
      className="group w-full transition-colors duration-300 hover:border-opt-accent/60"
      bodyClassName={`flex flex-col gap-6 ${wide ? "md:flex-row md:items-center md:gap-10" : ""}`}
    >
      <div className={`flex flex-col ${wide ? "md:flex-1" : ""}`}>
        <h3 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl">{f.title}</h3>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-opt-muted sm:text-lg">
          {f.body.map((paragraph) => (
            <p key={paragraph} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>
        {f.footnote ? (
          <p className="mt-4 m-0 text-sm italic leading-relaxed text-opt-muted/80">{f.footnote}</p>
        ) : null}
      </div>

      <div
        className={`flex items-center justify-center rounded-lg bg-opt-bg/60 p-6 ${
          wide ? "md:w-[min(46%,26rem)]" : "mt-auto"
        }`}
      >
        <f.Illustration className="h-auto w-full max-w-[320px]" />
      </div>
    </WindowFrame>
  );
}

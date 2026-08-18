import type { ComponentType, SVGProps } from "react";
import { cn } from "@guided-review/ui";
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
    title: "Review changes, not files",
    body: [
      "GitHub gives you every changed file in alphabetical order and leaves you to work out how they connect. We use AI to cluster related changes into review units, so you read the change, not the file list.",
    ],
  },
  {
    file: "navigation.keys",
    Illustration: KeyboardFirstIllustration,
    title: "Read and navigate how you write",
    body: [
      "Guided Review is keyboard-first. Browse units, comment, and submit without leaving the keys — same muscle memory as writing code.",
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
      "Model companies apparently block your API keys if you do not implement summarization. Seriously.",
  },
  {
    file: "approved-tools.json",
    Illustration: ApprovedToolsIllustration,
    title: "Tools corporate security has already approved",
    body: [
      "Bring the AI provider your company already approved — Claude, OpenAI, or Grok — and your own API key. Want to read the code that handles that key? It's open source (without VC funding), so you can read it, or fork it and point it somewhere else, or modify it for your own workflow.",
    ],
    footnote:
      "Please check with your employer if they've policies about this. If you're a 2 person startup, you're (probably) fine.",
  },
];

export function FeatureGrid() {
  const [lead, ...rest] = features;
  const last = rest.pop();

  return (
    <section id="features" className="relative px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          Features
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted text-balance sm:text-xl">
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
      className="group flex h-full w-full flex-col transition-colors duration-300 hover:border-primary/60"
      bodyClassName={cn(
        "flex flex-1 flex-col gap-6",
        wide && "md:flex-row md:items-center md:gap-10",
      )}
    >
      <div className={cn("flex flex-col", wide && "md:flex-1")}>
        <h3 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl">{f.title}</h3>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-muted sm:text-lg">
          {f.body.map((paragraph) => (
            <p key={paragraph} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>
        {f.footnote ? (
          <p className="mt-4 m-0 text-sm italic leading-relaxed text-muted/80">{f.footnote}</p>
        ) : null}
      </div>

      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-background/60 p-6",
          wide ? "md:w-[min(46%,26rem)]" : "mt-auto",
        )}
      >
        <f.Illustration className="h-auto w-full max-w-[360px]" />
      </div>
    </WindowFrame>
  );
}

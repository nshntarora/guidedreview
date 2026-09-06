import type { ReactNode } from "react";
import { CHROME_WEB_STORE_URL, GITHUB_REPO_URL } from "@web/lib/links";
import { WindowFrame } from "./WindowFrame";

type Faq = {
  question: string;
  answer: ReactNode[];
  /** Plain-text version of `answer`, used for FAQPage structured data. */
  plainAnswer: string;
};

function FaqLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const faqs: Faq[] = [
  {
    question: "So how does it actually work?",
    answer: [
      <>
        Two surfaces, same engine — see <a href="/#install">Install</a> above. The CLI (
        <code className="font-mono text-sm">npx @guided-review/cli</code>) reviews a local branch,
        commit, or working tree — see <a href="/docs/local-review">Review local changes</a>. The{" "}
        <FaqLink href={CHROME_WEB_STORE_URL}>Chrome extension</FaqLink> adds Start Guided Review on
        a <FaqLink href="https://github.com">GitHub</FaqLink> PR page.
      </>,
      "We read the real diff, optionally send it to your AI provider for review units and summaries, map those back to the hunks, and you walk the plan. AI structures; you decide.",
    ],
    plainAnswer:
      "Two surfaces, same engine. The CLI (npx @guided-review/cli) reviews a local branch, commit, or working tree. The Chrome extension adds Start Guided Review on a GitHub PR page. We read the real diff, optionally send it to your AI provider for review units and summaries, map those back to the hunks, and you walk the plan.",
  },
  {
    question: "Which AI providers work?",
    answer: [
      <>
        Claude (Anthropic), OpenAI, and Grok (xAI). Configure a key in the extension{" "}
        <a href="/docs/configure-provider">options page</a> or the CLI Settings / env. The CLI can
        also reuse Claude Code, Codex, or Grok already on the machine. We&apos;ll keep adding more
        providers — <FaqLink href={GITHUB_REPO_URL}>request one on the GitHub repo</FaqLink>, or
        open a PR that adds yours.
      </>,
    ],
    plainAnswer:
      "Claude (Anthropic), OpenAI, and Grok (xAI). Configure a key in the extension options page or the CLI Settings / env. The CLI can also reuse Claude Code, Codex, or Grok already on the machine. We'll keep adding more providers — request one on the GitHub repo, or open a PR that adds yours.",
  },
  {
    question: "Will this run up my API bill?",
    answer: [
      "Annotating makes one call per diff chunk to cluster changes into review units and summarize them. Cost scales with how big the diff is and which model you picked — a small change on a cheap model is fractions of a cent, a huge one on a frontier model is not. On the CLI that call only runs when you Structure with AI.",
      "You're paying your provider directly, so whatever it costs shows up on their dashboard, not ours. We never see it.",
    ],
    plainAnswer:
      "Annotating makes one call per diff chunk to cluster changes into review units and summarize them. Cost scales with how big the diff is and which model you picked. On the CLI that call only runs when you Structure with AI. You're paying your provider directly, so it shows up on their dashboard, not ours.",
  },
  {
    question: "So you don't track anything at all?",
    answer: [
      <>
        Almost. This marketing site uses an analytics service for page views and a few CTA clicks.
        That&apos;s it. The extension and CLI don&apos;t track anything and don&apos;t talk to any
        third-party servers other than your AI provider (and{" "}
        <FaqLink href="https://github.com">GitHub</FaqLink> for the extension).
      </>,
    ],
    plainAnswer:
      "Almost. This marketing site uses an analytics service for page views and a few CTA clicks. That's it. The extension and CLI don't track anything and don't talk to any third-party servers other than your AI provider (and GitHub for the extension).",
  },
  {
    question: "Is it free forever?",
    answer: [
      <>
        Forever is a long time. It is free until it can be maintained for free. If demand for the
        tool increases and it takes a lot of my bandwidth to maintain, I will introduce some way to
        be compensated for the extra time. But since it&apos;s{" "}
        <FaqLink href={GITHUB_REPO_URL}>open source</FaqLink>, you can fork it if you find I&apos;m
        not a good person.
      </>,
    ],
    plainAnswer:
      "Forever is a long time. It is free until it can be maintained for free. If demand for the tool increases and it takes a lot of my bandwidth to maintain, I will introduce some way to be compensated for the extra time. But since it's open source, you can fork it if you find I'm not a good person.",
  },
  {
    question: "Who are you?",
    answer: [
      <>
        I&apos;m Nishant, here&apos;s my <FaqLink href="https://nishantarora.org">website</FaqLink>,
        here&apos;s my <FaqLink href="https://x.com/nshntarora">Twitter/X</FaqLink> profile,
        here&apos;s my <FaqLink href="https://www.linkedin.com/in/aroranishant">LinkedIn</FaqLink>,
        and here&apos;s my credit card number - 4242 4242 4242 4242
      </>,
    ],
    plainAnswer:
      "I'm Nishant. Website: nishantarora.org. Twitter/X: @nshntarora. LinkedIn: aroranishant.",
  },
];

function faqJsonLd(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.plainAnswer,
      },
    })),
  };
}

export function Faqs() {
  return (
    <section id="faqs" className="relative px-4 py-16 sm:px-6 sm:py-28">
      {/* Static, locally-authored JSON (not user input) — safe to inject directly. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />

      <div className="mx-auto max-w-5xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          FAQs
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted text-balance sm:text-xl">
          The questions everyone asks before installing.
        </p>

        <WindowFrame label="faq.md" className="mt-14 sm:mt-20" bodyClassName="p-0">
          <ul className="m-0 list-none divide-y divide-border p-0">
            {faqs.map((faq) => (
              <li key={faq.question}>
                <details className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-base font-semibold tracking-tight transition-colors hover:text-primary sm:gap-4 sm:p-6 sm:text-lg md:p-8 md:text-xl">
                    {faq.question}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="space-y-3 px-4 pb-4 text-base leading-relaxed text-muted sm:px-6 sm:pb-6 sm:text-lg md:px-8 md:pb-8">
                    {faq.answer.map((paragraph, index) => (
                      <p key={index} className="m-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </WindowFrame>
      </div>
    </section>
  );
}

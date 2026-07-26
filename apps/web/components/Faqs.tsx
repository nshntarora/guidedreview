import type { ReactNode } from "react";
import { CHROME_WEB_STORE_URL, GITHUB_REPO_URL } from "../lib/links";

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
        Once the <FaqLink href={CHROME_WEB_STORE_URL}>Chrome extension</FaqLink> is installed, it
        injects a start review button on the <FaqLink href="https://github.com">GitHub</FaqLink> PR
        page, you click that it takes you to a different experience.
      </>,
      "We open the UI as an overlay on the GitHub review experience, read the diff that is generated in the PR, make an API call to your configured AI provider to get the review units/changes and summaries, map them to diffs and show them to you for review.",
    ],
    plainAnswer:
      "Once the Chrome extension is installed, it injects a start review button on the GitHub PR page. Clicking it opens the UI as an overlay on the GitHub review experience, reads the diff generated in the PR, calls your configured AI provider to get review units/changes and summaries, maps them to diffs, and shows them to you for review.",
  },
  {
    question: "So you don't track anything at all?",
    answer: [
      <>
        Yes, there&apos;s only an anonymous analytics script on this website, the extension
        doesn&apos;t track anything at all. It doesn&apos;t talk to any third party servers at all
        (other than <FaqLink href="https://github.com">GitHub</FaqLink> and your AI provider).
      </>,
    ],
    plainAnswer:
      "Yes, there's only an anonymous analytics script on this website — the extension doesn't track anything at all. It doesn't talk to any third party servers other than GitHub and your AI provider.",
  },
  {
    question: "Is it free forever?",
    answer: [
      <>
        Forever is a long time. It is free until it can be maintained for free, if demand for the
        tool increases and it takes a lot of my bandwidth to maintain, I will introduce some way to
        be compensated for the extra time, but since it&apos;s{" "}
        <FaqLink href={GITHUB_REPO_URL}>open source</FaqLink> you can fork it if you find I&apos;m
        not a good person.
      </>,
    ],
    plainAnswer:
      "Forever is a long time. It is free until it can be maintained for free — if demand increases and it takes a lot of bandwidth to maintain, some way to be compensated may be introduced. Since it's open source, you can fork it if needed.",
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
    <section id="faqs" className="relative overflow-hidden px-6 py-20 sm:py-28">
      {/* Static, locally-authored JSON (not user input) — safe to inject directly. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-24 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-opt-accent/6 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl">
        <h2 className="m-0 text-center text-3xl font-bold tracking-tight sm:text-4xl font-brand">
          FAQs
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-opt-muted text-balance">
          The questions everyone asks before installing.
        </p>

        <ul className="mt-14 m-0 grid list-none grid-cols-1 gap-4 p-0 sm:mt-20">
          {faqs.map((faq) => (
            <li key={faq.question}>
              <details className="group rounded-3xl border border-opt-border bg-opt-subtle/60 transition-all duration-300 hover:border-opt-accent/60 hover:bg-opt-subtle [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-lg font-semibold tracking-tight sm:p-8 sm:text-xl">
                  {faq.question}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 flex-shrink-0 text-opt-muted transition-transform duration-300 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className="space-y-3 px-6 pb-6 text-base leading-relaxed text-opt-muted sm:px-8 sm:pb-8 sm:text-lg">
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
      </div>
    </section>
  );
}

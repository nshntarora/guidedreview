import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@guided-review/ui";
import { JsonLd } from "@web/components/JsonLd";
import { CliCommand } from "@web/components/CliCommand";
import { InstallExtensionButton } from "@web/components/CtaButtons";
import { COMPARISONS } from "@web/config/compare";
import { openGraphSite, SITE_URL } from "@web/lib/site";
import Content from "@web/content/compare/index.mdx";

const title = "Compare AI code review tools";
const description =
  "Compare AI code review tools by workflow, setup, cost, and where code goes. Choose a human walkthrough, automated findings, or both.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compare" },
  openGraph: { ...openGraphSite, type: "website", url: "/compare" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20" data-testid="compare-index">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: `${SITE_URL}/compare`,
          hasPart: COMPARISONS.map((article) => ({
            "@type": "Article",
            headline: article.title,
            url: `${SITE_URL}${article.path}`,
          })),
        }}
      />

      <header className="grid items-end gap-6 border-b border-border pb-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div>
          <p className="mb-5 font-mono text-xs text-muted">
            Guided Review <span className="mx-2 text-primary">/</span> Compare tools
          </p>
          <h1 className="font-brand text-3xl font-bold leading-snug tracking-tight text-balance sm:text-5xl sm:leading-snug">
            Your review.
            <br />
            <span className="text-primary">Your kind of tool.</span>
          </h1>
        </div>
        <div>
          <p className="max-w-lg text-lg leading-relaxed text-muted">
            Compare AI code review tools by the work you need done: understanding a change, finding
            issues, or moving a PR through your team.
          </p>
          <a
            href="#at-a-glance"
            data-testid="compare-overview-link"
            className="mt-5 inline-block text-sm"
          >
            Compare setup &amp; cost <span aria-hidden="true">↓</span>
          </a>
        </div>
      </header>

      <section aria-labelledby="directory-heading" className="pt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="directory-heading" className="font-mono text-sm">
            Explore the comparisons
          </h2>
          <span className="font-mono text-xs text-muted">
            {COMPARISONS.length} tools / workflow, setup, tradeoffs
          </span>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {COMPARISONS.map((article, index) => (
            <li key={article.slug} className="flex">
              <Link
                href={article.path}
                data-testid={`article-${article.slug}`}
                className="group inline-flex w-full flex-col rounded-xl border border-border bg-surface p-6 text-foreground transition-colors hover:border-primary/60 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:p-7"
              >
                <div className="mb-9 flex h-10 items-center justify-between gap-3">
                  <img
                    src={article.toolLogo}
                    alt=""
                    width={180}
                    height={32}
                    className="h-8 w-44 max-w-full object-contain object-left"
                  />
                  <span aria-hidden="true" className="font-mono text-xs text-muted">
                    0{index + 1}
                  </span>
                </div>
                <p className="mb-3 font-mono text-xs text-muted">
                  {["Automated PR feedback", "Team review workflow", "Review inside GitHub"][index]}
                </p>
                <h3 className="font-brand text-xl font-semibold leading-relaxed">{article.tool}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {
                    [
                      "Automated findings, suggested fixes, and walkthroughs. Compare with a reading pass through the real diff.",
                      "AI review comments within a broader team workflow. Compare Graphite AI Reviews with a human-driven walkthrough.",
                      "Generated findings from a reviewer on your pull request. Compare with review units you read and assess yourself.",
                    ][index]
                  }
                </p>
                <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5 text-sm text-primary">
                  <span>
                    Guided Review vs{" "}
                    {article.tool === "GitHub Copilot"
                      ? "Copilot"
                      : article.tool === "Graphite Diamond"
                        ? "Graphite"
                        : article.tool}
                  </span>
                  <span
                    aria-hidden="true"
                    className="transition-transform motion-safe:group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <aside className="mt-5 grid gap-5 rounded-xl border border-primary/25 bg-primary/5 p-6 sm:p-7 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center">
        <div className="flex items-center gap-3">
          <img
            src="/assets/icon.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg"
          />
          <div>
            <p className="font-brand font-semibold">Guided Review</p>
            <p className="mt-1 text-xs text-muted">For the person reading the code</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Real diffs, ordered review units, and your own line notes. AI structures the review. You
          decide what ships.
        </p>
        <Link href="/docs/how-it-works" className="text-sm" data-testid="compare-how-it-works">
          How it works <span aria-hidden="true">↗</span>
        </Link>
      </aside>

      <section aria-labelledby="workflow-heading" className="py-14 sm:py-20">
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="workflow-heading" className="font-brand text-xl font-semibold sm:text-2xl">
            Start with the job.
          </h2>
          <p className="text-sm text-muted">These workflows can work together.</p>
        </div>
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "01 / Understand",
              "Read before approving",
              "Follow the contract, callers, and tests with Guided Review. Compare CodeRabbit’s walkthrough and Change Stack if you already use them.",
            ],
            [
              "02 / Find issues",
              "Get findings on a PR",
              "Evaluate CodeRabbit, Graphite AI Reviews, or Copilot code review. Guided Review leaves findings and review comments to you.",
            ],
            [
              "03 / Coordinate",
              "Move work through a team",
              "Evaluate merge queues and stacked-PR tools alongside the review interface. A Guided Review overlay doesn’t replace that process.",
            ],
            [
              "04 / Work locally",
              "Review before the PR",
              "Compare branch, staged, and working-tree changes with the local CLI. Request AI structure when you need it.",
            ],
          ].map(([label, heading, body]) => (
            <div key={label} className="border-t border-border pt-5">
              <p className="font-mono text-xs text-primary">{label}</p>
              <h3 className="mt-3 font-semibold">{heading}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-7 max-w-3xl text-sm leading-relaxed text-muted">
          You can keep an automated reviewer and use Guided Review for your own reading pass. A
          bot’s findings and your understanding of the implementation answer different questions.
        </p>
      </section>

      <section id="at-a-glance" aria-labelledby="overview-heading" className="scroll-mt-32">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-xs text-primary">Side by side</p>
            <h2 id="overview-heading" className="font-brand text-xl font-semibold sm:text-2xl">
              Setup, output &amp; cost.
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Published by Guided Review, built for the person reading the code. These are workflow
            comparisons, not bug-detection rankings or claims that one interface is faster. Sources
            link to vendor documentation.
          </p>
        </div>
        <p className="mb-3 text-xs text-muted lg:hidden">
          Scroll the table horizontally to compare all four columns.
        </p>
        <div
          tabIndex={0}
          role="region"
          aria-label="Tool setup and cost comparison"
          data-testid="compare-table"
          className="article-content rounded-xl border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-primary sm:p-6 [&_table]:min-w-3xl [&_table]:!mt-0 [&_td]:!p-4 [&_th]:!p-4 [&_p]:!text-xs"
        >
          <Content />
        </div>
      </section>

      <div className="grid gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="privacy-heading">
          <p className="mb-3 font-mono text-xs text-primary">01 / Data paths</p>
          <h2 id="privacy-heading" className="font-brand text-xl font-semibold">
            Check where the code goes.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Guided Review’s extension talks to GitHub and your configured provider. The CLI runs
            locally and sends a diff prompt to that provider when you request AI structuring. No
            Guided Review backend receives your code or keys.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            For every tool, check processing, retention, and your organization’s settings. “Local”
            doesn’t promise offline inference, and this comparison doesn’t establish a security
            ranking.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <Link href="/docs/privacy-and-data">Guided Review data paths ↗</Link>
            <a href="https://docs.coderabbit.ai/overview/architecture">CodeRabbit ↗</a>
            <a href="https://graphite.com/privacy">Graphite ↗</a>
            <a href="https://docs.github.com/en/copilot/responsible-use/agents">Copilot ↗</a>
          </div>
        </section>
        <section aria-labelledby="trial-heading">
          <p className="mb-3 font-mono text-xs text-primary">02 / Try a real change</p>
          <h2 id="trial-heading" className="font-brand text-xl font-semibold">
            Same patch. Different tools.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Pick a patch with a requirement you can state in one sentence. Can you follow the
            changed behavior, identify what the tests prove, and leave useful feedback?
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Use the same patch for each tool. Record setup and provider usage separately from
            reading time. For a small, obvious change, the normal GitHub diff may be enough.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <Link href="/compare/coderabbit-alternative#try-a-real-public-pull-request">
              Try a pinned public PR →
            </Link>
            <Link href="/guides/review-local-changes-before-pr#try-a-branch-with-an-uncommitted-test">
              Try local changes →
            </Link>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="try-heading"
        className="grid gap-8 rounded-xl border border-border bg-surface-raised p-6 sm:p-8 lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <h2 id="try-heading" className="font-brand text-2xl font-semibold">
            Start with your next diff.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Free, open source, and bring your own key. Your provider bills for AI usage. Reading
            files needs no key.
          </p>
          <Link
            href="/#install"
            data-testid="compare-start"
            className={`${buttonClassName({ size: "md" })} mt-6`}
          >
            Start Guided Review
          </Link>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted">Local repository / Node.js 22+</p>
          <CliCommand location="compare" />
          <div className="flex flex-wrap items-center gap-4">
            <InstallExtensionButton location="compare" size="md" />
            <Link href="/docs/cli" className="text-sm">
              CLI setup →
            </Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            On a GitHub PR, choose Start Guided Review after installing.{" "}
            <Link href="/docs/chrome-extension">Extension setup →</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

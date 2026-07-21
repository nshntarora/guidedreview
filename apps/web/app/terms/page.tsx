import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms governing use of the Guided Review extension and website.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="m-0 text-3xl font-bold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-opt-muted">Last updated: July 21, 2026</p>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-opt-text">
        <section>
          <h2 className="m-0 text-lg font-semibold">Acceptance</h2>
          <p className="mt-2 text-opt-muted">
            By installing or using Guided Review, you agree to these terms. If you do not agree, do
            not use the extension or this website.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">Service description</h2>
          <p className="mt-2 text-opt-muted">
            Guided Review helps structure GitHub pull request reviews using third-party language
            models you configure. The product is provided as-is without warranties of accuracy of
            AI-generated review plans.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">Your responsibilities</h2>
          <p className="mt-2 text-opt-muted">
            You are responsible for API keys you supply, compliance with GitHub and LLM provider
            terms, and for any review comments you submit. Do not use the product for unlawful
            purposes or to process data you are not authorized to share with your chosen providers.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">Limitation of liability</h2>
          <p className="mt-2 text-opt-muted">
            To the fullest extent permitted by law, Guided Review and its contributors are not
            liable for indirect, incidental, or consequential damages arising from use of the
            extension, including reliance on AI-generated guidance.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">Changes</h2>
          <p className="mt-2 text-opt-muted">
            These terms may be updated from time to time. Continued use after changes constitutes
            acceptance of the updated terms.
          </p>
        </section>
      </div>
    </article>
  );
}

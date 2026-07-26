import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Guided Review handles data, API keys, and pull request content.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="m-0 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-opt-muted">Last updated: July 21, 2026</p>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-opt-text">
        <section>
          <h2 className="m-0 text-lg font-semibold">Overview</h2>
          <p className="mt-2 text-opt-muted">
            Guided Review is a Chrome extension that helps you review GitHub pull requests with an
            AI-structured plan. This policy describes what data is processed and where it goes.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">API keys and settings</h2>
          <p className="mt-2 text-opt-muted">
            Provider API keys and preferences you enter in the extension options are stored locally
            in your browser via Chrome storage. They are not sent to Guided Review servers (the
            extension does not operate a backend for your keys).
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">Pull request content</h2>
          <p className="mt-2 text-opt-muted">
            When you start a guided review, the extension fetches the PR diff from GitHub and sends
            it to the LLM provider you configured (for example Anthropic, OpenAI, or xAI). That
            content is processed under that provider&apos;s terms and privacy policy.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">GitHub authentication</h2>
          <p className="mt-2 text-opt-muted">
            Optional GitHub device-flow authentication stores tokens in Chrome storage so the
            extension can submit reviews on your behalf. Tokens stay on your device except when used
            to call GitHub&apos;s API.
          </p>
        </section>

        <section>
          <h2 className="m-0 text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-opt-muted">
            For privacy questions about this product, open an issue on the project repository.
          </p>
        </section>
      </div>
    </article>
  );
}
